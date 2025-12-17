import os
import torch

# Base Directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Paths
MODELS_DIR = os.path.join(BASE_DIR, "models")
RESOURCES_DIR = os.path.join(BASE_DIR, "resources")
TEMP_DIR = os.path.join(BASE_DIR, "temp")

# File Paths
YOLO_PATH = os.path.join(MODELS_DIR, "best_3.pt")
CRNN_PATH = os.path.join(MODELS_DIR, "best_resnet_model.pth")
CHARSET_PATH = os.path.join(RESOURCES_DIR, "charset.txt")
VOCAB_PATH = os.path.join(RESOURCES_DIR, "malayalam_vocab.txt")

# Settings
IMG_H = 32
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Ensure temp dir exists
os.makedirs(TEMP_DIR, exist_ok=True)