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

# Import preprocessors
from src.preprocessor import manual_crop, preprocess_crop_for_ocr

TRAIN_LABEL_FILE = TRAIN_LABEL 
IMG_H = 32

class MalayalamOCR:
    def __init__(self):
        print(f"\nPROCESS : Initializing OCR Engine (Late Preprocessing Mode)")
        
        self.itos, self.stoi = self.build_vocab(TRAIN_LABEL_FILE)
        num_classes = len(self.itos)
        
        print(f"LOADING : {CRNN_PATH}")
        self.crnn = CustomCRNN(num_classes).to(DEVICE)
        
        if os.path.exists(CRNN_PATH):
            checkpoint = torch.load(CRNN_PATH, map_location=DEVICE)
            new_state_dict = {k.replace("module.", ""): v for k, v in checkpoint.items()}
            self.crnn.load_state_dict(new_state_dict)
            self.crnn.eval()
        else:
            print(f"CRITICAL ERROR: Model not found at {CRNN_PATH}")

        self.yolo = YOLO(YOLO_PATH)
        self.post_processor = PostProcessor()
        print(" SUCCESS : System Ready!")

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

    def decode_greedy(self, logits):
        probs = logits.softmax(2).argmax(2).cpu().numpy()
        results = []
        for seq in probs:
            res = []
            prev = 0
            for idx in seq:
                if idx != 0 and idx != prev: res.append(self.itos[idx])
                prev = idx
            results.append("".join(res))
        return results

    def predict_crop(self, crop_cv2, crop_id=0, debug=False, debug_dir="debug_output"):
        # 1. Convert to PIL
        img_pil = Image.fromarray(crop_cv2).convert('L')
        w, h = img_pil.size
        
        # 2. Resize with LANCZOS (High Quality)
        new_w = max(1, int(w * (IMG_H / h)))
        img_pil = img_pil.resize((new_w, IMG_H), Image.LANCZOS)
        
        # --- DEBUG: Save individual word crop ---
        if debug:
            try:
                crop_path = os.path.join(debug_dir, f"crop_{crop_id}.png")
                img_pil.save(crop_path)
            except Exception as e:
                pass

        # 3. Normalize & Invert
        img_arr = (np.array(img_pil).astype(np.float32) / 255.0)
        img_arr = 1.0 - img_arr 
        img_t = torch.from_numpy(img_arr).unsqueeze(0).unsqueeze(0).to(DEVICE)
        
        with torch.no_grad():
            return self.decode_greedy(self.crnn(img_t))[0]

    def run(self, image_path, crop_points=None, debug=True):
        print(f"Processing: {image_path}")
        original = cv2.imread(image_path)
        if original is None: return "Error loading image", "", ""

        # Setup Debug Directory
        debug_dir = "debug_output"
        if debug:
            if os.path.exists(debug_dir): shutil.rmtree(debug_dir)
            os.makedirs(debug_dir)

        # 1. APPLY MANUAL CROP (Only if user provided points)
        # We do this first so YOLO only looks at the area the user cares about.
        if crop_points:
            print("Using Manual Crop Points...")
            detection_input = manual_crop(original, crop_points)
        else:
            print("Using Full Image (Raw)...")
            detection_input = original

        # NO Global Preprocessing (Deskew/Binarize) - As requested!
        
        if debug:
            cv2.imwrite(os.path.join(debug_dir, "1_detection_input.jpg"), detection_input)

        # 2. YOLO DETECTION (On Raw/Colored Image)
        results = self.yolo.predict(detection_input, conf=0.5, verbose=False)
        boxes = []
        for r in results:
            for box in r.boxes.xyxy.cpu().numpy():
                boxes.append(box.astype(int))
        
        if not boxes: return "No text detected.", "", ""
        
        # 3. SORT BOXES
        boxes = self.sort_boxes(boxes) 
        
        if debug:
            debug_img = detection_input.copy()
            for i, (x1, y1, x2, y2) in enumerate(boxes):
                cv2.rectangle(debug_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.imwrite(os.path.join(debug_dir, "2_detected_boxes.jpg"), debug_img)

        # 4. RECOGNITION LOOP
        full_text_list = []
        
        for i, (x1, y1, x2, y2) in enumerate(boxes):
            pad = 2
            h_img, w_img = detection_input.shape[:2]
            
            # A. Crop from RAW image
            crop_raw = detection_input[max(0, y1-pad):min(h_img, y2+pad), max(0, x1-pad):min(w_img, x2+pad)]
            
            # B. Preprocess ONLY this crop (Clean -> Binarize)
            # This ensures the CRNN gets the high-contrast input it needs
            clean_crop = preprocess_crop_for_ocr(crop_raw)
            
            # C. Predict
            text = self.predict_crop(clean_crop, crop_id=i, debug=debug, debug_dir=debug_dir)
            full_text_list.append(text)
            
        smart_sentence = " ".join(full_text_list)
        
        # 5. Translation
        corrected, translated = self.post_processor.process(smart_sentence)
        
        return smart_sentence, corrected, translated