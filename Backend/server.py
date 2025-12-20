import os
import shutil
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# --- IMPORTS FROM NEW STRUCTURE ---
from src.ocr_engine import MalayalamOCR
from src.config import TEMP_DIR

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

# 3. Define Input Model for Text Translation Route
class TranslationRequest(BaseModel):
    text: str

# 4. Load Model on Startup
ocr_engine = None

@app.on_event("startup")
def load_model():
    global ocr_engine
    print("-----------------------------------")
    print("🚀 Server starting...")
    print("⚙️ Loading AI Models (YOLO + CRNN + KenLM + NLLB)...")
    
    try:
        # Initializes the robust MalayalamOCR class from src/ocr_engine.py
        ocr_engine = MalayalamOCR()
        print("✅ Models Loaded Successfully!")
        print("-----------------------------------")
    except Exception as e:
        print(f"❌ CRITICAL ERROR: Could not load model.\n{e}")

# 5. Image OCR Route
@app.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    """
    Takes an IMAGE -> Returns Raw OCR, Corrected Malayalam, English Translation
    """
    try:
        # Ensure temp directory exists
        if not os.path.exists(TEMP_DIR):
            os.makedirs(TEMP_DIR)

        # Save uploaded file safely
        temp_path = os.path.join(TEMP_DIR, f"upload_{file.filename}")
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if ocr_engine:
            # Run the full pipeline: YOLO -> CRNN -> KenLM -> PostProcessor
            raw_text, corrected_text, translation = ocr_engine.run(temp_path)
        else:
            raise Exception("Model is not loaded.")

        # Cleanup: Remove the temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return JSONResponse(content={
            "status": "success",
            "filename": file.filename,
            "raw_text": raw_text,       # The Smart/KenLM output
            "corrected_text": corrected_text, # Spell Checked output
            "translation": translation  # English output
        })

    except Exception as e:
        return JSONResponse(content={
            "status": "error",
            "message": str(e)
        }, status_code=500)

# 6. Text-Only Translation Route
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

# 7. Health Check
@app.get("/")
def home():
    return {"message": "Malayalam OCR & Translation API is Online & Optimized!"}

if __name__ == "__main__":
    import uvicorn
    # Run with: python main.py
    uvicorn.run(app, host="0.0.0.0", port=8000)