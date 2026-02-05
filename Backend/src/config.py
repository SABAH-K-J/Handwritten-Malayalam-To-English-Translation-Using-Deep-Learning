import os
import torch

# ==========================================
# 1. DIRECTORY STRUCTURE
# ==========================================
# Points to the root folder (one level up from 'src')
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SRC_DIR)

# Folder Paths
MODELS_DIR = os.path.join(BASE_DIR, "models")
RESOURCES_DIR = os.path.join(BASE_DIR, "resources")
TEMP_DIR = os.path.join(BASE_DIR, "temp")
CACHE_DIR = os.path.join(BASE_DIR, "cache")

# Ensure directories exist
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

# ==========================================
# 2. FILE PATHS
# ==========================================

# Detection Model (YOLO)
YOLO_PATH = os.path.join(MODELS_DIR, "Yolo_v2.pt")

# Recognition Model (CRNN)
CRNN_PATH = os.path.join(MODELS_DIR, "CRNN_v6.pth")

# Character List / Vocabulary (For CRNN Output Mapping)
# Note: Ensure this file matches the vocab used to train 'CRNN_v6.pth'
VOCAB_PATH = os.path.join(RESOURCES_DIR, "malayalam_vocab.txt") 
# Fallback charset if needed
CHARSET_PATH = os.path.join(RESOURCES_DIR, "charset.txt")

# --- KENLM PATHS (For Intelligent Decoder) ---
# Your tree structure shows 'lm.binary' is inside 'models/'
LM_PATH = os.path.join(MODELS_DIR, "Kenlm_v2.binary")

# Your tree structure shows 'lexicon.lst' is inside 'resources/'
LEXICON_PATH = os.path.join(RESOURCES_DIR, "clean_lexicon.txt")

# And this one too (for the post-processor):
DICT_PATH = os.path.join(RESOURCES_DIR, "clean_lexicon.txt")

# Ground Truth (Optional, for validation)
TRAIN_LABEL = os.path.join(RESOURCES_DIR, "train_gt.txt")

# --- NEW: OFFLINE TRANSLATOR PATH ---
# This points to: Backend/models/translator_1.3B
TRANSLATOR_MODEL_PATH = os.path.join(MODELS_DIR, "translator_1.3B")
# ==========================================
# 3. MODEL PARAMETERS
# ==========================================
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Preprocessing
ANCHOR_MIN_AREA = 30   # Minimum pixel size to be considered a "Letter" (vs Noise)

# Recognition (CRNN)
IMG_H = 32             # Fixed height for CRNN input
BATCH_SIZE = 16        # Number of crops to process in parallel (Higher = Faster on GPU)

# ==========================================
# 4. DEBUG CONFIGURATION
# ==========================================
DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true"