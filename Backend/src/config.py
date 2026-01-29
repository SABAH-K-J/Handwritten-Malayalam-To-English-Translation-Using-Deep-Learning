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
YOLO_PATH = os.path.join(MODELS_DIR, "best_3.pt")
CRNN_PATH = os.path.join(MODELS_DIR, "best_custom_model_finetuned.pth")
CHARSET_PATH = os.path.join(RESOURCES_DIR, "charset.txt")
VOCAB_PATH = os.path.join(RESOURCES_DIR, "malayalam_vocab.txt")
TRAIN_LABEL = os.path.join(RESOURCES_DIR, "train_gt.txt")
# Language Model & Dictionary (for Post-Processor)
LM_PATH = os.path.join(RESOURCES_DIR, "malayalam_lm.arpa")
DICT_PATH = os.path.join(RESOURCES_DIR, "malayalam_dict.txt")

# ==========================================
# 3. MODEL PARAMETERS
# ==========================================
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Preprocessing
ANCHOR_MIN_AREA = 30   # Minimum pixel size to be considered a "Letter" (vs Noise)

# Recognition (CRNN)
IMG_H = 32             # Fixed height for CRNN input
BATCH_SIZE = 16        # Number of crops to process in parallel (Higher = Faster on GPU)