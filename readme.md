# 📝 Malayalam Handwriting Recognition & Translation System

A Deep Learning-based OCR system that detects, recognizes, corrects, and translates handwritten Malayalam text into English.

![Project Status](https://img.shields.io/badge/Status-Completed-success)
![Python](https://img.shields.io/badge/Backend-FastAPI%20%7C%20PyTorch-blue)
![React](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB)

## 🌟 Key Features

* **Text Detection:** Uses **YOLOv8** to locate handwritten text lines in an image.
* **Handwriting Recognition:** Custom **ResNet-CRNN** architecture (CNN + BiLSTM + CTC) to read Malayalam words.
* **Intelligent Post-Processing:** * **Morphological Correction:** Integrated **`mlmorph`** to fix spelling based on Malayalam grammar rules.
    * **Split-Word Fixing:** Automatically merges broken words.
* **Translation:** Uses Meta's **NLLB-200** (No Language Left Behind) model to translate corrected Malayalam to English.
* **Full Stack App:** Interactive React frontend with a FastAPI backend.

---

## 🛠️ Tech Stack

### **Backend**
* **Framework:** FastAPI
* **Deep Learning:** PyTorch, Ultralytics YOLO
* **NLP:** MLMorph, HuggingFace Transformers (NLLB)
* **Image Processing:** OpenCV, PIL

### **Frontend**
* **Framework:** React (Vite)
* **Styling:** CSS Modules / Tailwind (depending on your setup)

---

## 📂 Project Structure

```text
OCR_PROJECT/
├── BACKEND/
│   ├── models/                # Trained Weights (YOLO .pt, CRNN .pth)
│   ├── src/                   # Source Code
│   │   ├── ocr_engine.py      # Main Pipeline logic
│   │   ├── architecture.py    # ResNet-CRNN Model Definition
│   │   ├── postprocessor.py   # Spell Checker & Translator
│   │   └── config.py          # Paths & Settings
│   ├── server.py              # FastAPI Entry Point
│   └── requirements.txt       # Python Dependencies
│
├── FRONTEND/
│   ├── src/                   # React Components
│   └── package.json           # Node Dependencies
│
└── README.md                  # This file