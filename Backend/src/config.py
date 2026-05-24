"""Central configuration for model paths, runtime settings, and preprocessing constants."""

import os
import torch

# ==========================================
# 1. DIRECTORY STRUCTURE
# ==========================================
# Resolve the package root once so the rest of the project can use stable absolute paths.
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SRC_DIR)

# Folder paths used by the OCR pipeline and cached translation assets.
MODELS_DIR = os.path.join(BASE_DIR, "models")
RESOURCES_DIR = os.path.join(BASE_DIR, "resources")
TEMP_DIR = os.path.join(BASE_DIR, "temp")
CACHE_DIR = os.path.join(BASE_DIR, "cache")

# Create working directories up front so startup code can assume they exist.
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

# ==========================================
# 2. FILE PATHS
# ==========================================

# Detection model used to locate word regions in the page image.
YOLO_PATH = os.path.join(MODELS_DIR, "Yolo_v2.pt")

# Recognition model that converts cropped word images into character sequences.
CRNN_PATH = os.path.join(MODELS_DIR, "CRNN_v6.pth")

# Character list / vocabulary used to map model outputs back into text.
# This file must match the vocabulary used during CRNN training.
VOCAB_PATH = os.path.join(RESOURCES_DIR, "malayalam_vocab.txt") 
# Fallback charset if the primary vocabulary file is not used.
CHARSET_PATH = os.path.join(RESOURCES_DIR, "charset.txt")

# --- KENLM PATHS (For Intelligent Decoder) ---
# Language model used by the CTC decoder to prefer valid word sequences.
LM_PATH = os.path.join(MODELS_DIR, "Kenlm_v2.binary")

# Lexicon of valid words passed as unigrams to the decoder.
LEXICON_PATH = os.path.join(RESOURCES_DIR, "clean_lexicon.txt")

# Dictionary source used by the post-processor's spell-correction cache.
DICT_PATH = os.path.join(RESOURCES_DIR, "clean_lexicon.txt")

# Training labels used to build a character vocabulary when needed.
TRAIN_LABEL = os.path.join(RESOURCES_DIR, "train_gt.txt")

# Offline translation model packaged with the backend.
TRANSLATOR_MODEL_PATH = os.path.join(MODELS_DIR, "translator_1.3B")
# ==========================================
# 3. MODEL PARAMETERS
# ==========================================
# Choose CUDA when available because OCR inference is much faster on GPU.
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Minimum connected-component area treated as a real character rather than noise.
ANCHOR_MIN_AREA = 30   # Minimum pixel size to be considered a "Letter" (vs Noise)

# Fixed height used when resizing character crops for the CRNN.
IMG_H = 32             # Fixed height for CRNN input
# Batch size for OCR recognition inference.
BATCH_SIZE = 16        # Number of crops to process in parallel (Higher = Faster on GPU)

# ==========================================
# 4. DEBUG CONFIGURATION
# ==========================================
# Toggle extra debug output and intermediate artifacts from the environment.
DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true"