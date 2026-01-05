import cv2
import numpy as np
import torch
import os
import shutil
from PIL import Image
from ultralytics import YOLO

# --- YOUR IMPORTS ---
from src.config import *
from src.architecture import ResNetCRNN
from src.postprocessor import PostProcessor
from src.preprocessor import run_preprocessing_pipeline

try:
    from pyctcdecode import build_ctcdecoder
    BEAM_SEARCH_AVAILABLE = True
except ImportError:
    print("⚠️ Warning: 'pyctcdecode' not found.")
    BEAM_SEARCH_AVAILABLE = False

class MalayalamOCR:
    def __init__(self):
        print(f"\n🚀 Initializing OCR Engine...")
        with open(CHARSET_PATH, 'r', encoding='utf-8') as f:
            self.itos = [''] + [line.strip() for line in f if line.strip()]
        
        checkpoint = torch.load(CRNN_PATH, map_location=DEVICE)
        weight_keys = [k for k in checkpoint.keys() if "rnn.3.weight" in k or "rnn.2.weight" in k]
        actual_size = checkpoint[weight_keys[0]].shape[0] if weight_keys else len(self.itos)
        if len(self.itos) < actual_size:
            self.itos += ["?"] * (actual_size - len(self.itos))
        elif len(self.itos) > actual_size:
            self.itos = self.itos[:actual_size]

        self.crnn = ResNetCRNN(len(self.itos)).to(DEVICE)
        self.crnn.load_state_dict(checkpoint)
        self.crnn.eval()
        self.yolo = YOLO(YOLO_PATH)
        
        self.decoder = None
        if BEAM_SEARCH_AVAILABLE and os.path.exists(LM_PATH):
            from src.utils import get_unigrams_safe # Ensure utils exists or move this helper here
            # Assuming get_unigrams_safe is available or inline it here
            self.decoder = build_ctcdecoder(
                labels=self.itos,
                kenlm_model_path=LM_PATH,
                alpha=1.0, beta=1.5
            )
        self.post_processor = PostProcessor()
        print("✅ System Ready!")

    def scan_image(self, image, debug=False):
        """Delegates to the clean preprocessor module."""
        try:
            processed_bgr = run_preprocessing_pipeline(image)
            if debug:
                cv2.imwrite("debug_scanner_output.jpg", processed_bgr)
            return processed_bgr
        except Exception as e:
            print(f"⚠️ Scanner failed: {e}")
            return image

    def sort_boxes(self, boxes):
        if not boxes: return []
        boxes = sorted(boxes, key=lambda b: b[1])
        lines = []
        while boxes:
            box = boxes.pop(0)
            box_y_center = (box[1] + box[3]) / 2
            found_line = False
            for line in lines:
                line_y_centers = [(b[1] + b[3]) / 2 for b in line]
                avg_line_y = sum(line_y_centers) / len(line_y_centers)
                line_heights = [b[3] - b[1] for b in line]
                avg_line_h = sum(line_heights) / len(line_heights)
                
                if abs(box_y_center - avg_line_y) < (avg_line_h * 0.5):
                    line.append(box)
                    found_line = True
                    break
            if not found_line:
                lines.append([box])
        
        sorted_boxes = []
        for line in lines:
            line.sort(key=lambda b: b[0])
            sorted_boxes.extend(line)
        return sorted_boxes

    def decode_greedy(self, logits):
        probs = logits.softmax(2).argmax(2).transpose(0, 1)
        results = []
        for seq in probs:
            res = []
            prev = 0
            for idx in seq:
                idx = idx.item()
                if idx != 0 and idx != prev: res.append(self.itos[idx])
                prev = idx
            results.append("".join(res))
        return results

    def predict_crop(self, crop, crop_id=0, debug=False):
        _, binary = cv2.threshold(crop, 127, 255, cv2.THRESH_BINARY)
        binary = cv2.bitwise_not(binary) 
        
        img_pil = Image.fromarray(binary)
        w, h = img_pil.size
        new_w = max(1, int(w * (IMG_H / h)))
        img_pil = img_pil.resize((new_w, IMG_H), Image.BILINEAR)
        
        if new_w < 32:
            canvas = Image.new('L', (32, 32), 0)
            canvas.paste(img_pil, (0, 0))
            img_pil = canvas

        if debug:
            debug_dir = "debug_crops"
            os.makedirs(debug_dir, exist_ok=True)
            img_pil.save(f"{debug_dir}/crop_{crop_id}.png")
            
        img_arr = np.array(img_pil).astype(np.float32) / 255.0
        img_t = torch.from_numpy(img_arr).unsqueeze(0).unsqueeze(0).to(DEVICE)
        
        with torch.no_grad():
            logits = self.crnn(img_t)
            raw_text = self.decode_greedy(logits)[0]
            smart_text = raw_text

            if self.decoder:
                logits_np = logits.squeeze(1).cpu().numpy()
                vocab_size = len(self.itos)
                if logits_np.shape[1] < vocab_size:
                     padding = np.full((logits_np.shape[0], vocab_size - logits_np.shape[1]), -20.0, dtype=np.float32)
                     logits_np = np.concatenate([logits_np, padding], axis=1)
                try:
                    smart_text = self.decoder.decode(logits_np, beam_width=100)
                except:
                    smart_text = raw_text
                    
        return smart_text

    def run(self, image_path, debug=False):
        print(f"Processing: {image_path}")
        original = cv2.imread(image_path)
        if original is None: return "Error loading image", "", ""

        # Pass debug flag
        processed_img = self.scan_image(original, debug=debug)
        
        results = self.yolo.predict(processed_img, conf=0.5, iou=0.4, agnostic_nms=True, verbose=False)
        boxes = []
        for r in results:
            for box in r.boxes.xyxy.cpu().numpy():
                boxes.append(box.astype(int))
        
        if not boxes: 
            return "No text detected.", "", ""
        
        boxes = self.sort_boxes(boxes)

        if debug:
            debug_box_img = processed_img.copy()
            for (x1, y1, x2, y2) in boxes:
                cv2.rectangle(debug_box_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.imwrite("debug_yolo_boxes.jpg", debug_box_img)
        
        gray = cv2.cvtColor(processed_img, cv2.COLOR_BGR2GRAY)
        if debug and os.path.exists("debug_crops"): shutil.rmtree("debug_crops")
        
        full_text_list = []
        for i, (x1, y1, x2, y2) in enumerate(boxes):
            pad = 4 
            h_img, w_img = gray.shape
            y1_c, y2_c = max(0, y1-pad), min(h_img, y2+pad)
            x1_c, x2_c = max(0, x1-pad), min(w_img, x2+pad)
            
            crop = gray[y1_c:y2_c, x1_c:x2_c]
            text_segment = self.predict_crop(crop, crop_id=i, debug=debug)
            full_text_list.append(text_segment)
            
        smart_sentence = " ".join(full_text_list)
        corrected, translated = self.post_processor.process(smart_sentence)
        
        return smart_sentence, corrected, "Translation not implemented"