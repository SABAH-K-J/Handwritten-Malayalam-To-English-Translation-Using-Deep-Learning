import cv2
import numpy as np
import torch
from PIL import Image
from ultralytics import YOLO
from src.config import *
from src.architecture import ResNetCRNN
from src.postprocessor import PostProcessor

class MalayalamOCR:
    def __init__(self):
        print(f"\n🚀 Initializing OCR Engine...")
        
        # Load Charset
        with open(CHARSET_PATH, 'r', encoding='utf-8') as f:
            self.itos = ['<BLANK>'] + [line.strip() for line in f if line.strip()]
        
        # Load CRNN
        self.crnn = ResNetCRNN(len(self.itos)).to(DEVICE)
        self.crnn.load_state_dict(torch.load(CRNN_PATH, map_location=DEVICE))
        self.crnn.eval()
        
        # Load YOLO
        self.yolo = YOLO(YOLO_PATH)
        
        # Load PostProcessor
        self.post_processor = PostProcessor()
        print("✅ System Ready!")

    def sort_boxes(self, boxes):
        """
        Sophisticated sorting: Groups boxes into lines based on vertical overlap,
        then sorts each line left-to-right.
        """
        if not boxes: return []
        
        # 1. Sort primarily by Y (Top to Bottom)
        boxes = sorted(boxes, key=lambda b: b[1]) 
        lines = []
        
        while boxes:
            ref_box = boxes.pop(0) 
            current_line = [ref_box]
            
            ref_y1, ref_y2 = ref_box[1], ref_box[3]
            ref_h = ref_y2 - ref_y1
            
            to_remove = []
            
            # Check remaining boxes to see if they belong on this same line
            for i, box in enumerate(boxes):
                y1, y2 = box[1], box[3]
                h = y2 - y1
                
                # Calculate Vertical Overlap
                inter_y1 = max(ref_y1, y1)
                inter_y2 = min(ref_y2, y2)
                intersection = max(0, inter_y2 - inter_y1)
                overlap_ratio = intersection / min(ref_h, h)
                
                # Check Center Alignment
                center_y = (y1 + y2) / 2
                is_center_aligned = (ref_y1 < center_y < ref_y2)
                
                # If significant overlap or center alignment, add to current line
                if overlap_ratio > 0.5 or is_center_aligned:
                    current_line.append(box)
                    to_remove.append(i)
            
            # Remove grouped boxes from the main list
            for i in reversed(to_remove):
                boxes.pop(i)
            
            # 2. Sort the current line by X (Left to Right)
            current_line.sort(key=lambda b: b[0])
            lines.append(current_line)
            
        # Flatten the list of lines back into a single list of boxes
        return [b for line in lines for b in line]

    def decode(self, logits):
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

    def predict_crop(self, crop):
        _, binary = cv2.threshold(crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        binary = cv2.bitwise_not(binary) 
        img_pil = Image.fromarray(binary)
        w, h = img_pil.size
        new_w = max(1, int(w * (IMG_H / h)))
        img_pil = img_pil.resize((new_w, IMG_H), Image.BILINEAR)
        
        if new_w < 32:
             canvas = Image.new('L', (32, 32), 0)
             canvas.paste(img_pil, (0, 0))
             img_pil = canvas
             
        img_arr = np.array(img_pil).astype(np.float32) / 255.0
        img_t = torch.from_numpy(img_arr).unsqueeze(0).unsqueeze(0).to(DEVICE)
        
        with torch.no_grad():
            logits = self.crnn(img_t)
            text = self.decode(logits)[0]
        return text

    def run(self, image_path):
        print(f"Processing: {image_path}")
        results = self.yolo.predict(image_path, conf=0.5, agnostic_nms=True, verbose=False)
        
        # Extract Boxes
        boxes = []
        for r in results:
            for box in r.boxes.xyxy.cpu().numpy():
                boxes.append(box.astype(int))
        
        if not boxes: return "No text", "", ""
        
        # Use the Robust Sorting Function
        boxes = self.sort_boxes(boxes)
        
        original = cv2.imread(image_path)
        gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        full_text = []
        
        for x1, y1, x2, y2 in boxes:
            pad = 2
            # Ensure crop is within bounds
            h_img, w_img = gray.shape
            y1_c, y2_c = max(0, y1-pad), min(h_img, y2+pad)
            x1_c, x2_c = max(0, x1-pad), min(w_img, x2+pad)
            
            crop = gray[y1_c:y2_c, x1_c:x2_c]
            full_text.append(self.predict_crop(crop))
            
        raw_text = " ".join(full_text)
        corrected, translated = self.post_processor.process(raw_text)
        
        return raw_text, corrected, translated