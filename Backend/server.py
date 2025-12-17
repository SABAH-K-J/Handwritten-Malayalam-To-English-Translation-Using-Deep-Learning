import os
import shutil
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# --- NEW IMPORTS (From your clean 'src' folder) ---
from src.ocr_engine import MalayalamOCR
from src.config import TEMP_DIR

# 1. Initialize the App
app = FastAPI(title="Malayalam OCR API", description="Backend for OCR Project")

# 2. CORS Setup (Allows Frontend to talk to Backend)
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

# 3. Define Input Model for Text Translation
class TranslationRequest(BaseModel):
    text: str

# 4. Load Model on Startup (Best Practice)
ocr_engine = None

@app.on_event("startup")
def load_model():
    global ocr_engine
    print("-----------------------------------")
    print("🚀 Server starting...")
    print("⚙️ Loading AI Models (YOLO + CRNN + MLMorph + NLLB)...")
    
    try:
        # This now loads from src/ocr_engine.py
        ocr_engine = MalayalamOCR()
        print("✅ Models Loaded Successfully!")
        print("-----------------------------------")
    except Exception as e:
        print(f"❌ CRITICAL ERROR: Could not load model.\n{e}")

# 5. Image OCR Route (Updated to use TEMP_DIR)
@app.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    """
    Takes an IMAGE -> Returns Raw OCR, Corrected Malayalam, English Translation
    """
    try:
        # Use the clean 'temp' folder defined in config.py
        temp_path = os.path.join(TEMP_DIR, f"upload_{file.filename}")
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if ocr_engine:
            # Run the full pipeline
            raw_text, corrected_text, translation = ocr_engine.run(temp_path)
        else:
            raise Exception("Model is not loaded.")

        # Cleanup: Remove the temp file after processing
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return JSONResponse(content={
            "status": "success",
            "filename": file.filename,
            "raw_text": raw_text,
            "corrected_text": corrected_text,
            "translation": translation
        })

    except Exception as e:
        return JSONResponse(content={
            "status": "error",
            "message": str(e)
        }, status_code=500)

# 6. Text Translation Route (Kept from your old code!)
@app.post("/translate")
async def translate_text_only(request: TranslationRequest):
    """
    Takes TEXT (Malayalam) -> Returns Corrected Malayalam, English Translation
    """
    try:
        if not ocr_engine:
            raise Exception("Model is not loaded.")

        # Re-use the PostProcessor logic directly!
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

# 7. Health Check
@app.get("/")
def home():
    return {"message": "Malayalam OCR & Translation API is Online!"}