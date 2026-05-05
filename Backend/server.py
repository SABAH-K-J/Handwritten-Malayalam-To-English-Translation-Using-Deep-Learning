"""FastAPI application that exposes OCR, translation, PDF, and TTS endpoints."""

import os
import io
import numpy as np
import cv2
import uuid
import shutil
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

# --- Configuration & Security ---
# File uploads are capped so the server does not keep unbounded image payloads in memory.
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/bmp", "image/webp"]
TEMP_UPLOAD_DIR = "temp"

# Ensure the upload directory exists before any request handler tries to write into it.
if not os.path.exists(TEMP_UPLOAD_DIR):
    os.makedirs(TEMP_UPLOAD_DIR, mode=0o700) # Only owner can read/write

# --- PDF Generation Imports ---
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

# --- TTS Import ---
from gtts import gTTS

# --- Imports from the internal OCR pipeline ---
from src.logger import Log
from src.ocr_engine import MalayalamOCR
from src.config import TEMP_DIR, DEBUG_MODE
from src.preprocessor import get_document_corners

# 1. Initialize the App
# Swagger/ReDoc are disabled outside debug mode to reduce public exposure.
app = FastAPI(
    title="Malayalam OCR API", 
    description="Production Ready OCR Backend",
    docs_url="/docs" if DEBUG_MODE else None,
    redoc_url="/redoc" if DEBUG_MODE else None
)

# 2. CORS Setup (Allow Frontend Access)
# In production, specific origins should be defined via environment variables.
env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    origins = [origin.strip() for origin in env_origins.split(",")]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:80", 
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"], # Limit methods
    allow_headers=["*"],
)

# --- Data Models ---
class TranslationRequest(BaseModel):
    """Request payload for the text-only translation endpoint."""

    text: str

class PDFRequest(BaseModel):
    """Request payload for PDF generation."""

    text: str

class TTSRequest(BaseModel):
    """Request payload for text-to-speech generation."""

    text: str
    lang: str  # 'en' for English, 'ml' for Malayalam

# 3. Load Model on Startup
ocr_engine = None

@app.on_event("startup")
def load_model():
    """Load the OCR pipeline once when the API process starts."""

    global ocr_engine
    print("\n" + "="*50)
    Log.process("Server starting...")
    Log.process("Loading AI Models (YOLO + CRNN + KenLM + NLLB)")
    
    try:
        # Initializes the robust MalayalamOCR class from src/ocr_engine.py
        ocr_engine = MalayalamOCR()
        Log.success("Models Loaded Successfully!")
        print("="*50 + "\n")
    except Exception as e:
        Log.error(f"CRITICAL ERROR : Could not load model.\n{e}")

# --- New Route: Corner Detection for Auto-Crop ---
@app.post("/detect-corners")
async def detect_corners_endpoint(file: UploadFile = File(...)):
    """
    Returns normalized coordinates [[x,y], [x,y], [x,y], [x,y]]
    for the frontend editor to snap to the document.
    """
    try:
           # Reject unsupported formats before doing any expensive image work.
        if file.content_type not in ALLOWED_IMAGE_TYPES:
             return JSONResponse(status_code=400, content={"error": "Invalid file type."})

           # Read the uploaded image once so the same bytes can be reused for decoding.
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
             return JSONResponse(status_code=413, content={"error": "File too large (Max 10MB)"})

           # OpenCV gets the raw bytes first; PIL is used to correct EXIF rotation when present.
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
           # Handle EXIF rotation so mobile uploads are detected in the right orientation.
        try:
            from PIL import Image, ImageOps
            pil_image = Image.open(io.BytesIO(contents))
            pil_image = ImageOps.exif_transpose(pil_image)
            image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        except:
            pass

        points = get_document_corners(image)
        Log.info("Document corners detected.")
        return {"points": points}
        
    except Exception as e:
        Log.warn(f"Corner detection failed: {e}")
        # Fall back to a centered rectangle if contour detection fails.
        return {"points": [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]}

# 4. Image OCR Route (Updated for Cropping & Lens)
@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    crop_points: str = Form(None)
):
    """Run OCR on an uploaded image and return raw, corrected, and translated text."""

    temp_file_path = None
    try:
        # 1. Validate the upload before touching disk.
        if file.content_type not in ALLOWED_IMAGE_TYPES:
             return JSONResponse(status_code=400, content={"error": "Invalid file type. Only images allowed."})
        
        # 2. Save the upload with a random filename so user input cannot control the path.
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else "jpg"
        filename_secure = f"{uuid.uuid4()}.{file_ext}"
        temp_file_path = os.path.join(TEMP_UPLOAD_DIR, filename_secure)
        
        file_size = 0
        with open(temp_file_path, "wb") as buffer:
            while True:
                # Stream in chunks to avoid loading large uploads into memory at once.
                chunk = await file.read(1024 * 1024) # 1MB chunks
                if not chunk:
                    break
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    buffer.close()
                    os.remove(temp_file_path)
                    return JSONResponse(status_code=413, content={"error": "File too large (Max 10MB)"})
                buffer.write(chunk)

        # 3. Run OCR through the shared engine.
        try:
            full_text, corrected, translated = ocr_engine.run(temp_file_path, crop_points=crop_points, debug=DEBUG_MODE)
        except Exception as e:
            import traceback
            traceback.print_exc()
            Log.error(f"OCR Engine Failed: {str(e)}")
            return JSONResponse(status_code=500, content={"error": f"OCR Engine Failed: {str(e)}"})
        
        return {
            "original_text": full_text,
            "corrected_text": corrected,
            "translated_text": translated
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        Log.error(f"Prediction Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
        
    finally:
        # 4. Remove the temporary upload regardless of success or failure.
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except:
                pass

# 5. Text-Only Translation Route
@app.post("/translate")
async def translate_text_only(request: TranslationRequest):
    """
    Takes TEXT (Malayalam) -> Returns Corrected Malayalam, English Translation
    Useful for manual testing or chatbot features.
    """
    try:
        if not ocr_engine:
            raise Exception("Model is not loaded.")

        # Re-use the post-processor directly so text-only requests follow the same cleanup path.
        # Note: 'process' returns (corrected, translation).
        corrected, translation = ocr_engine.post_processor.process(request.text)

        return JSONResponse(content={
            "status": "success",
            "original_input": request.text,
            "corrected_text": corrected,
            "translation": translation
        })

    except Exception as e:
        Log.error(f"Translation API Error: {e}")
        return JSONResponse(content={
            "status": "error",
            "message": str(e)
        }, status_code=500)

# 6. PDF Generation Route
@app.post("/generate-pdf")
async def generate_pdf_endpoint(request: PDFRequest):
    """
    Generates a PDF file from the provided text.
    """
    buffer = io.BytesIO()
    
    # Build the PDF in memory so the endpoint can stream the result back immediately.
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )

    # Use the default ReportLab styles for a simple document layout.
    styles = getSampleStyleSheet()
    story = []

    # Add a title block before the translated content.
    story.append(Paragraph("Translated Document", styles['Title']))
    story.append(Spacer(1, 12))

    # Convert newlines to HTML breaks because ReportLab Paragraph renders basic markup.
    formatted_text = request.text.replace("\n", "<br />")
    story.append(Paragraph(formatted_text, styles['Normal']))

    # Finalize the document into the in-memory buffer.
    doc.build(story)
    
    # Rewind so the response reads from the start of the generated file.
    buffer.seek(0)
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": "attachment; filename=translation.pdf"}
    )

# 7. Text-to-Speech Route
@app.post("/tts")
async def tts_endpoint(request: TTSRequest):
    """
    Generates MP3 audio from text using Google TTS.
    """
    try:
        if not request.text.strip():
            raise Exception("No text provided")

        # Generate audio at normal reading speed.
        tts = gTTS(text=request.text, lang=request.lang, slow=False)
        
        # Write the MP3 directly into memory so no temporary file is needed.
        buffer = io.BytesIO()
        tts.write_to_fp(buffer)
        buffer.seek(0)
        
        return StreamingResponse(buffer, media_type="audio/mp3")

    except Exception as e:
        Log.error(f"TTS Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# 8. Health Check
@app.get("/")
def home():
    """Simple health check that confirms the API process is alive."""

    return {"message": "Malayalam OCR & Translation API is Online & Optimized!"}

if __name__ == "__main__":
    import uvicorn
    # Run this file directly for local development.
    uvicorn.run(app, host="0.0.0.0", port=8000)