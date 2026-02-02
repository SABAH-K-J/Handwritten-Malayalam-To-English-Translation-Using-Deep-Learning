import cv2
import numpy as np
import torch
import os
import shutil
import sys
from PIL import Image
from ultralytics import YOLO

# Imports
from src.config import *
from src.architecture import CustomCRNN
from src.postprocessor import PostProcessor
from src.decoder import IntelligentDecoder 
from src.preprocessor import manual_crop, preprocess_crop_for_ocr

# --- COLOR LOGGING HELPER ---
class Log:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"

    @staticmethod
    def process(msg): print(f"{Log.CYAN}{Log.BOLD}[PROCESS]{Log.RESET} {msg}")
    @staticmethod
    def info(msg):    print(f"{Log.BLUE}[INFO]{Log.RESET}    {msg}")
    @staticmethod
    def success(msg): print(f"{Log.GREEN}{Log.BOLD}[SUCCESS]{Log.RESET} {msg}")
    @staticmethod
    def warn(msg):    print(f"{Log.YELLOW}[WARN]{Log.RESET}    {msg}")
    @staticmethod
    def error(msg):   print(f"{Log.RED}{Log.BOLD}[ERROR]{Log.RESET}   {msg}")

class MalayalamOCR:
    def __init__(self):
        print("\n" + "="*50)
        Log.process("Initializing OCR Engine (Smart Mode)")
        
        # 1. Load Vocab
        self.itos, self.stoi = self.build_vocab(TRAIN_LABEL)
        num_classes = len(self.itos)
        
        # 2. Load CRNN Model
        Log.process(f"Loading CRNN Model from: {os.path.basename(CRNN_PATH)}")
        self.crnn = CustomCRNN(num_classes).to(DEVICE)
        
        if os.path.exists(CRNN_PATH):
            try:
                checkpoint = torch.load(CRNN_PATH, map_location=DEVICE)
                if isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
                     state_dict = checkpoint['state_dict']
                else:
                     state_dict = checkpoint
                
                # Clean 'module.' prefix if present
                new_state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
                self.crnn.load_state_dict(new_state_dict)
                self.crnn.eval()
                Log.success("CRNN Weights Loaded")
            except Exception as e:
                Log.error(f"Failed to load weights: {e}")
        else:
            Log.error(f"Model file missing at {CRNN_PATH}")

        # 3. Initialize Smart Decoder (KenLM)
        Log.process("Initializing Intelligent Decoder (KenLM)...")
        
        # Validate Lexicon quietly
        if not os.path.exists(LEXICON_PATH):
            Log.error(f"Lexicon missing at {LEXICON_PATH}")
        
        decoder_vocab = list(self.itos)
        if decoder_vocab[0] == '<BLANK>':
            decoder_vocab[0] = "" 
            
        self.decoder = IntelligentDecoder(
            char_list=decoder_vocab,
            lm_path=LM_PATH,
            lexicon_path=LEXICON_PATH
        )

        # 4. Load YOLO & Post-Processor
        Log.process("Loading YOLO & Post-Processor...")
        # Suppress YOLO verbose output
        self.yolo = YOLO(YOLO_PATH)
        self.post_processor = PostProcessor()
        
        Log.success("OCR Engine Ready!")
        print("="*50 + "\n")

    def build_vocab(self, label_file):
        if not os.path.exists(label_file): return ['<BLANK>'], {}
        unique_chars = set()
        with open(label_file, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split('\t') if '\t' in line else line.strip().split(' ', 1)
                if len(parts) >= 2: unique_chars.update(list(parts[1]))
        chars = sorted(list(unique_chars))
        itos = ['<BLANK>'] + chars
        stoi = {c: i for i, c in enumerate(itos)}
        return itos, stoi

    def sort_boxes(self, boxes):
        if not boxes: return []
        boxes = sorted(boxes, key=lambda b: b[1])
        lines = []
        while boxes:
            box = boxes.pop(0)
            box_y = (box[1] + box[3]) / 2
            found = False
            for line in lines:
                line_y = sum([(b[1] + b[3]) / 2 for b in line]) / len(line)
                line_h = sum([b[3] - b[1] for b in line]) / len(line)
                if abs(box_y - line_y) < (line_h * 0.5):
                    line.append(box)
                    found = True
                    break
            if not found: lines.append([box])
        
        sorted_boxes = []
        for line in lines:
            line.sort(key=lambda b: b[0])
            sorted_boxes.extend(line)
        return sorted_boxes

    def predict_crop(self, crop_cv2, crop_id=0, debug=False, debug_dir="debug_output"):
        # 1. Grayscale
        if len(crop_cv2.shape) == 3:
            gray = cv2.cvtColor(crop_cv2, cv2.COLOR_BGR2GRAY)
        else:
            gray = crop_cv2
            
        # 2. Resize maintaining aspect ratio to fixed height
        h, w = gray.shape
        new_w = max(1, int(w * (IMG_H / h)))
        resized_gray = cv2.resize(gray, (new_w, IMG_H), interpolation=cv2.INTER_CUBIC)
        
        # 3. Normalize & Tensor Setup
        img_arr = resized_gray.astype(np.float32) / 255.0
        img_arr = 1.0 - img_arr 
        img_t = torch.from_numpy(img_arr).unsqueeze(0).unsqueeze(0).to(DEVICE)
        
        if debug:
            cv2.imwrite(os.path.join(debug_dir, f"crop_{crop_id}.png"), resized_gray)
        
        # 4. Inference
        with torch.no_grad():
            preds = self.crnn(img_t) 
            logits = preds.cpu().detach().numpy()[0]
            # Smart Decode
            text = self.decoder.decode(logits)
            return text

    def run(self, image_path, crop_points=None, debug=False):
        Log.info(f"Processing Image: {os.path.basename(image_path)}")
        
        original = cv2.imread(image_path)
        if original is None: 
            Log.error("Could not read image file.")
            return "Error loading image", "", ""

        # Setup Debug
        debug_dir = "debug_output"
        if debug:
            if os.path.exists(debug_dir): shutil.rmtree(debug_dir)
            os.makedirs(debug_dir)
            cv2.imwrite(os.path.join(debug_dir, "0_original.jpg"), original)

        # 1. Crop
        if crop_points:
            Log.info("Applying Manual Crop...")
            detection_input = manual_crop(original, crop_points)
        else:
            detection_input = original

        if debug:
            cv2.imwrite(os.path.join(debug_dir, "1_detection_input.jpg"), detection_input)

        # 2. Detect (YOLO)
        results = self.yolo.predict(detection_input, conf=0.5, verbose=False)
        boxes = []
        for r in results:
            for box in r.boxes.xyxy.cpu().numpy():
                boxes.append(box.astype(int))
        
        if not boxes: 
            Log.warn("No text detected by YOLO.")
            return "No text detected.", "", ""
        
        # 3. Recognize (CRNN + KenLM)
        boxes = self.sort_boxes(boxes) 
        full_text_list = []
        
        Log.info(f"Detected {len(boxes)} text regions. Starting Recognition...")

        if debug:
            debug_img = detection_input.copy()
            for (x1, y1, x2, y2) in boxes:
                cv2.rectangle(debug_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.imwrite(os.path.join(debug_dir, "2_boxes.jpg"), debug_img)

        for i, (x1, y1, x2, y2) in enumerate(boxes):
            pad = 5
            h_img, w_img = detection_input.shape[:2]
            
            # Crop
            crop_raw = detection_input[max(0, y1-pad):min(h_img, y2+pad), max(0, x1-pad):min(w_img, x2+pad)]
            
            # Preprocess (Fix Pixelation)
            clean_crop = preprocess_crop_for_ocr(crop_raw)
            
            # Predict
            text = self.predict_crop(clean_crop, crop_id=i, debug=debug, debug_dir=debug_dir)
            full_text_list.append(text)
            
        smart_sentence = " ".join(full_text_list)
        Log.success("Recognition Complete.")
        
        # 4. Translate
        corrected, translated = self.post_processor.process(smart_sentence)
        Log.success(f"Final Output: {translated[:50]}...")
        
        return smart_sentence, corrected, translated