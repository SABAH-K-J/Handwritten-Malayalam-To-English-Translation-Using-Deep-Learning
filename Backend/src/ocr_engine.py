import cv2
import numpy as np
import torch
import os
import shutil
import json
from PIL import Image, ImageOps
from ultralytics import YOLO

# Imports
from src.config import *
from src.architecture import CustomCRNN
from src.postprocessor import PostProcessor
from src.decoder import IntelligentDecoder 
from src.preprocessor import manual_crop, preprocess_crop_for_ocr

# --- LOGGING ---
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
        Log.process("Initializing OCR Engine (Training-Matched Mode)")
        
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
                new_state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
                self.crnn.load_state_dict(new_state_dict)
                self.crnn.eval()
                Log.success("CRNN Weights Loaded")
            except Exception as e:
                Log.error(f"Failed to load weights: {e}")
        else:
            Log.error(f"Model file missing at {CRNN_PATH}")

        # 3. Initialize Decoder
        Log.process("Initializing Intelligent Decoder...")
        decoder_vocab = list(self.itos)
        if decoder_vocab[0] == '<BLANK>': decoder_vocab[0] = "" 
        self.decoder = IntelligentDecoder(
            char_list=decoder_vocab,
            lm_path=LM_PATH,
            lexicon_path=LEXICON_PATH
        )

        # 4. Load YOLO
        Log.process("Loading YOLO & Post-Processor...")
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

    def predict_batch(self, crop_batch):
        """
        Runs batch inference on a tensor of crops.
        crop_batch: (Batch, 1, H, W) float tensor
        Returns: list of text strings
        """
        with torch.no_grad():
            preds = self.crnn(crop_batch)
            # preds shape: (Batch, SequenceLength, NumClasses)
            preds_np = preds.cpu().detach().numpy()
            
            results = []
            for logits in preds_np:
                # Decode each item in the batch
                text = self.decoder.decode(logits)
                results.append(text)
            return results

    def smart_manual_crop(self, image, points_json, scale_factor=1.0):
        try:
            pts = np.array(json.loads(points_json), dtype="float32")
            h, w = image.shape[:2]
            if np.max(pts) <= 1.0:
                pts[:, 0] *= w
                pts[:, 1] *= h
            else:
                pts *= scale_factor
            return manual_crop(image, json.dumps(pts.tolist()))
        except:
            return image

    def run(self, image_path, crop_points=None, debug=False):
        Log.info(f"Processing Image: {os.path.basename(image_path)}")
        
        # 1. Load Image
        try:
            pil_image = Image.open(image_path)
            pil_image = ImageOps.exif_transpose(pil_image) 
            original = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        except:
            original = cv2.imread(image_path)
        
        if original is None: return "Error loading image", "", ""

        # 2. Scale Guard (Keep original high res for YOLO)
        h, w = original.shape[:2]
        target_width = 1800
        scale_factor = 1.0
        if w < target_width:
            scale_factor = target_width / w
            scale_factor = min(scale_factor, 4.0) 
            original = cv2.resize(original, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_CUBIC)

        # 3. Crop
        if crop_points:
            detection_input = self.smart_manual_crop(original, crop_points, scale_factor)
        else:
            detection_input = original

        # Setup Debug
        debug_dir = "debug_output"
        if debug:
            if os.path.exists(debug_dir): shutil.rmtree(debug_dir)
            os.makedirs(debug_dir)
            cv2.imwrite(os.path.join(debug_dir, "0_input.jpg"), detection_input)

        # 4. Detect (YOLO)
        # Feed the RAW, COLOR image to YOLO (Best for detection)
        results = self.yolo.predict(detection_input, conf=0.5, verbose=False)
        boxes = []
        for r in results:
            for box in r.boxes.xyxy.cpu().numpy():
                boxes.append(box.astype(int))
        
        if not boxes: return "No text detected.", "", ""
        
        # 5. Recognize (CRNN) - Optimized Batch Processing
        boxes = self.sort_boxes(boxes) 
        Log.info(f"Detected {len(boxes)} words. Running batched inference...")

        crop_tensors = []
        
        for i, (x1, y1, x2, y2) in enumerate(boxes):
            pad = 5
            h_img, w_img = detection_input.shape[:2]
            y1_safe, y2_safe = max(0, y1-pad), min(h_img, y2+pad)
            x1_safe, x2_safe = max(0, x1-pad), min(w_img, x2+pad)
            
            # Crop RAW image
            crop_raw = detection_input[y1_safe:y2_safe, x1_safe:x2_safe]
            
            # Use the NEW Training-Matched Preprocessor
            processed_crop = preprocess_crop_for_ocr(crop_raw, target_h=IMG_H, target_w=128)
            
            # Invert colors (Background 1.0 -> 0.0)
            img_arr = 1.0 - processed_crop
            crop_tensors.append(img_arr)
            
            if debug:
                visual_check = (processed_crop * 255).astype(np.uint8)
                cv2.imwrite(os.path.join(debug_dir, f"crop_{i}.png"), visual_check)
            
        # Run Batch Inference
        full_text_list = []
        if crop_tensors:
            # Stack into (N, 1, H, W)
            batch_np = np.array(crop_tensors, dtype=np.float32)
            batch_tensor = torch.from_numpy(batch_np).unsqueeze(1).to(DEVICE)
            
            # Process in mini-batches to match BATCH_SIZE config
            total_items = len(crop_tensors)
            for start_idx in range(0, total_items, BATCH_SIZE):
                batch_slice = batch_tensor[start_idx : start_idx + BATCH_SIZE]
                texts = self.predict_batch(batch_slice)
                full_text_list.extend(texts)
            
        smart_sentence = " ".join(full_text_list)
        
        # 6. Translate
        corrected, translated = self.post_processor.process(smart_sentence)
        
        return smart_sentence, corrected, translated