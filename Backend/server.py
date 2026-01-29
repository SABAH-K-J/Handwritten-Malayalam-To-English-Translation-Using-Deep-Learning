import os
import io
import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

# --- PDF Generation Imports ---
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

# --- TTS Import ---
from gtts import gTTS

# --- IMPORTS FROM NEW STRUCTURE ---
from src.ocr_engine import MalayalamOCR
from src.config import TEMP_DIR
from src.preprocessor import get_document_corners

# 1. Initialize the App
app = FastAPI(title="Malayalam OCR API", description="Production Ready OCR Backend")

# 2. CORS Setup (Allow Frontend Access)
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class TranslationRequest(BaseModel):
    text: str

class PDFRequest(BaseModel):
    text: str

class TTSRequest(BaseModel):
    text: str
    lang: str  # 'en' for English, 'ml' for Malayalam

# 3. Load Model on Startup
ocr_engine = None

@app.on_event("startup")
def load_model():
    global ocr_engine
    print("-----------------------------------")
    print("PROCESS : Server starting...")
    print("PROCESS : Loading AI Models (YOLO + CRNN + KenLM + NLLB)")
    
    try:
        # Initializes the robust MalayalamOCR class from src/ocr_engine.py
        ocr_engine = MalayalamOCR()
        print(" SUCCESS : Models Loaded Successfully!")
        print("-----------------------------------")
    except Exception as e:
        print(f"CRITICAL ERROR : Could not load model.\n{e}")

# --- NEW ROUTE: Corner Detection for Auto-Crop ---
@app.post("/detect-corners")
async def detect_corners_endpoint(file: UploadFile = File(...)):
    """
    Returns normalized coordinates [[x,y], [x,y], [x,y], [x,y]]
    for the frontend editor to snap to the document.
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Handle EXIF rotation (Critical for mobile uploads)
        try:
            from PIL import Image, ImageOps
            pil_image = Image.open(io.BytesIO(contents))
            pil_image = ImageOps.exif_transpose(pil_image)
            image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        except:
            pass

        points = get_document_corners(image)
        return {"points": points}
        
    except Exception as e:
        print(f"Corner detection failed: {e}")
        # Default to a centered rectangle
        return {"points": [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]}

# 4. Image OCR Route (Updated for Cropping & Lens)
# ... (Keep all imports and previous routes like /detect-corners) ...

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    crop_points: str = Form(None)
):
    try:
        # 1. Save uploaded file temporarily
        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer:
            buffer.write(await file.read())

        # 2. Run OCR (Now returns only 3 values)
        try:
            full_text, corrected, translated = ocr_engine.run(temp_filename, crop_points=crop_points)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JSONResponse(status_code=500, content={"error": f"OCR Engine Failed: {str(e)}"})
        
        # 3. Cleanup
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

        return {
            "original_text": full_text,
            "corrected_text": corrected,
            "translated_text": translated
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

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

        # Re-use the PostProcessor logic directly
        # Note: 'process' returns (corrected, translation)
        corrected, translation = ocr_engine.post_processor.process(request.text)

        return JSONResponse(content={
            "status": "success",
            "original_input": request.text,
            "corrected_text": corrected,
            "translation": translation
        })

    except Exception as e:
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
    
    # Create the PDF object
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )

    # Styles
    styles = getSampleStyleSheet()
    story = []

    # Add Title
    story.append(Paragraph("Translated Document", styles['Title']))
    story.append(Spacer(1, 12))

    # Add Body Text (Handle newlines properly)
    formatted_text = request.text.replace("\n", "<br />")
    story.append(Paragraph(formatted_text, styles['Normal']))

    # Build PDF
    doc.build(story)
    
    # Move buffer position to beginning
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

        # Generate Audio
        # 'slow=False' makes it read at normal speed
        tts = gTTS(text=request.text, lang=request.lang, slow=False)
        
        # Save to in-memory buffer
        buffer = io.BytesIO()
        tts.write_to_fp(buffer)
        buffer.seek(0)
        
        return StreamingResponse(buffer, media_type="audio/mp3")

    except Exception as e:
        print(f"TTS Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# 8. Health Check
@app.get("/")
def home():
    return {"message": "Malayalam OCR & Translation API is Online & Optimized!"}

if __name__ == "__main__":
    import uvicorn
    # Run with: python main.py
    uvicorn.run(app, host="0.0.0.0", port=8000)