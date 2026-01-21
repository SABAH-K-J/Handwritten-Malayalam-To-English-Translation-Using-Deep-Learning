import cv2
import numpy as np
import torch
import os
import shutil
from PIL import Image
from ultralytics import YOLO

# Imports
from src.config import *
from src.architecture import CustomCRNN
from src.postprocessor import PostProcessor
from src.preprocessor import run_preprocessing_pipeline

# --- CONFIGURATION ---
TRAIN_LABEL_FILE = TRAIN_LABEL 
IMG_H = 32

class MalayalamOCR:
    def __init__(self):
        print(f"\nPROCESS : Initializing OCR Engine (High-Res Mode)")
        
        # 1. Build Vocab from Train File
        self.itos, self.stoi = self.build_vocab(TRAIN_LABEL_FILE)
        num_classes = len(self.itos)
        
        # 2. Load Model
        print(f"LOADING : {CRNN_PATH}")
        self.crnn = CustomCRNN(num_classes).to(DEVICE)
        
        if os.path.exists(CRNN_PATH):
            checkpoint = torch.load(CRNN_PATH, map_location=DEVICE)
            
            # Fix keys if they have 'module.' prefix
            new_state_dict = {}
            for k, v in checkpoint.items():
                name = k.replace("module.", "")
                new_state_dict[name] = v
                
            self.crnn.load_state_dict(new_state_dict)
            self.crnn.eval()
        else:
            print(f"CRITICAL ERROR: Model not found at {CRNN_PATH}")

        # 3. Load YOLO & PostProcessor
        self.yolo = YOLO(YOLO_PATH)
        self.post_processor = PostProcessor()
        print(" SUCCESS : System Ready!")

    def build_vocab(self, label_file):
        """Reads the training labels to rebuild the exact character set."""
        if not os.path.exists(label_file):
            print(f"WARNING : Vocab file {label_file} not found! Using dummy.")
            return ['<BLANK>'], {}

        unique_chars = set()
        with open(label_file, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split('\t') if '\t' in line else line.strip().split(' ', 1)
                if len(parts) >= 2: unique_chars.update(list(parts[1]))
        
        chars = sorted(list(unique_chars))
        itos = ['<BLANK>'] + chars
        stoi = {c: i for i, c in enumerate(itos)}
        print(f" VOCAB   : {len(itos)} classes loaded.")
        return itos, stoi

    def sort_boxes(self, boxes):
        """Sorts boxes Top-to-Bottom, Left-to-Right (Reading Order)."""
        if not boxes: return []
        
        # Sort by Y first
        boxes = sorted(boxes, key=lambda b: b[1])
        lines = []
        
        while boxes:
            box = boxes.pop(0)
            box_y_center = (box[1] + box[3]) / 2
            
            found_line = False
            for line in lines:
                # Average Y of the line
                line_y_centers = [(b[1] + b[3]) / 2 for b in line]
                avg_line_y = sum(line_y_centers) / len(line_y_centers)
                
                # Average Height of the line
                line_heights = [b[3] - b[1] for b in line]
                avg_line_h = sum(line_heights) / len(line_heights)
                
                # Threshold: 50% of line height
                if abs(box_y_center - avg_line_y) < (avg_line_h * 0.5):
                    line.append(box)
                    found_line = True
                    break
            
            if not found_line:
                lines.append([box])
        
        # Sort each line by X
        sorted_boxes = []
        for line in lines:
            line.sort(key=lambda b: b[0])
            sorted_boxes.extend(line)
        return sorted_boxes

    def decode_greedy(self, logits):
        """Decodes model output to text."""
        probs = logits.softmax(2).argmax(2) # [Batch, Time]
        probs = probs.cpu().numpy()
        
        results = []
        for seq in probs:
            res = []
            prev = 0
            for idx in seq:
                if idx != 0 and idx != prev:
                    res.append(self.itos[idx])
                prev = idx
            results.append("".join(res))
        return results

    def predict_crop(self, crop_cv2, crop_id=0, debug=False, debug_dir="debug_output"):
        """Prepares crop for model (Resize -> Invert -> Normalize)."""
        # Convert to PIL Grayscale
        img_pil = Image.fromarray(crop_cv2).convert('L')
        w, h = img_pil.size
        
        # Resize Height to 32, maintain aspect ratio
        new_w = max(1, int(w * (IMG_H / h)))
        img_pil = img_pil.resize((new_w, IMG_H), Image.BILINEAR)
        
        # --- DEBUG: Save individual word/line crop ---
        if debug:
            crop_path = os.path.join(debug_dir, f"crop_{crop_id}.png")
            img_pil.save(crop_path)
        
        # Normalize (0-1)
        img_arr = np.array(img_pil).astype(np.float32) / 255.0
        
        # INVERT COLOR (White Text on Black BG)
        img_arr = 1.0 - img_arr 
        
        # To Tensor
        img_t = torch.from_numpy(img_arr).unsqueeze(0).unsqueeze(0).to(DEVICE)
        
        with torch.no_grad():
            logits = self.crnn(img_t)
            raw_text = self.decode_greedy(logits)[0]
            
        return raw_text

    def run(self, image_path, debug=True): # Default debug=True for now
        print(f"Processing: {image_path}")
        original = cv2.imread(image_path)
        if original is None: 
            return "Error loading image", "", ""

        # Setup Debug Directory
        debug_dir = "debug_output"
        if debug:
            if os.path.exists(debug_dir): shutil.rmtree(debug_dir)
            os.makedirs(debug_dir)

        # 1. Preprocessing
        processed_img = run_preprocessing_pipeline(original)
        
        if debug:
            cv2.imwrite(os.path.join(debug_dir, "1_preprocessed.jpg"), processed_img)

        # 2. YOLO Detection
        results = self.yolo.predict(processed_img, conf=0.5, verbose=False)
        boxes = []
        for r in results:
            for box in r.boxes.xyxy.cpu().numpy():
                boxes.append(box.astype(int))
        
        if not boxes: 
            return "No text detected.", "", ""
        
        # 3. Sort Boxes (Reading Order)
        boxes = self.sort_boxes(boxes) 
        
        # --- DEBUG: Draw Sorted Boxes ---
        if debug:
            debug_img = processed_img.copy()
            for i, (x1, y1, x2, y2) in enumerate(boxes):
                # Draw box
                cv2.rectangle(debug_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                # Draw reading order number
                cv2.putText(debug_img, str(i), (x1, y1 - 5), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            cv2.imwrite(os.path.join(debug_dir, "2_detected_boxes.jpg"), debug_img)
        
        # 4. Crop & Recognize
        gray = cv2.cvtColor(processed_img, cv2.COLOR_BGR2GRAY)
        full_text_list = []
        
        for i, (x1, y1, x2, y2) in enumerate(boxes):
            pad = 2
            h_img, w_img = gray.shape
            y1_c, y2_c = max(0, y1-pad), min(h_img, y2+pad)
            x1_c, x2_c = max(0, x1-pad), min(w_img, x2+pad)
            
            crop = gray[y1_c:y2_c, x1_c:x2_c]
            
            # Pass debug info to crop function
            text_segment = self.predict_crop(crop, crop_id=i, debug=debug, debug_dir=debug_dir)
            full_text_list.append(text_segment)
            
        smart_sentence = " ".join(full_text_list)
        
        # 5. Post-Process (Correction/Translation)
        corrected, translated = self.post_processor.process(smart_sentence)
        
        if debug:
            print(f"DEBUG: Saved visualization to '{debug_dir}/'")
        
        return smart_sentence, corrected, translated