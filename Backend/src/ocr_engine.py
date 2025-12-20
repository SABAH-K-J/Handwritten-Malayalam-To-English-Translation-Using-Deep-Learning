import cv2
import numpy as np
import torch
import os
from PIL import Image
from ultralytics import YOLO
from src.config import *
from src.architecture import ResNetCRNN
from src.postprocessor import PostProcessor

# --- BEAM SEARCH IMPORT ---
try:
    from pyctcdecode import build_ctcdecoder
    BEAM_SEARCH_AVAILABLE = True
except ImportError:
    print("⚠️ Warning: 'pyctcdecode' not found. Run 'pip install pyctcdecode'")
    BEAM_SEARCH_AVAILABLE = False

# ==========================================
# HELPER: ARPA READER
# ==========================================
def get_unigrams_safe(arpa_path):
    unigrams = []
    print(f"📖 Reading vocabulary from {arpa_path}...")
    try:
        with open(arpa_path, 'r', encoding='utf-8') as f:
            start_reading = False
            for line in f:
                line = line.strip()
                if line == "\\1-grams:":
                    start_reading = True
                    continue
                if line == "\\2-grams:":
                    break
                if start_reading and line:
                    parts = line.split('\t')
                    if len(parts) > 1:
                        word = parts[1]
                        if word not in ["<s>", "</s>", "<unk>"]:
                            unigrams.append(word)
        print(f"✅ Extracted {len(unigrams)} words successfully.")
        return unigrams
    except Exception as e:
        print(f"⚠️ Failed to read ARPA file: {e}")
        return None

# ==========================================
# MAIN OCR ENGINE
# ==========================================
class MalayalamOCR:
    def __init__(self):
        print(f"\n🚀 Initializing OCR Engine...")
        
        # 1. Load Charset
        # NOTE: Using '' for index 0 is safer for CTC Decoding than '<BLANK>'
        with open(CHARSET_PATH, 'r', encoding='utf-8') as f:
            self.itos = [''] + [line.strip() for line in f if line.strip()]
        
        # 2. Load CRNN & Handle Size Mismatch
        checkpoint = torch.load(CRNN_PATH, map_location=DEVICE)
        weight_keys = [k for k in checkpoint.keys() if "rnn.3.weight" in k or "rnn.2.weight" in k]
        actual_size = checkpoint[weight_keys[0]].shape[0] if weight_keys else len(self.itos)
        
        # Adjust vocab to match model weights if necessary
        if len(self.itos) < actual_size:
            self.itos += ["?"] * (actual_size - len(self.itos))
        elif len(self.itos) > actual_size:
            self.itos = self.itos[:actual_size]

        self.crnn = ResNetCRNN(len(self.itos)).to(DEVICE)
        self.crnn.load_state_dict(checkpoint)
        self.crnn.eval()
        
        # 3. Load YOLO
        self.yolo = YOLO(YOLO_PATH)
        
        # 4. Load Smart Decoder (KenLM) - THE KEY FIX
        self.decoder = None
        if BEAM_SEARCH_AVAILABLE and os.path.exists(LM_PATH):
            print(f"🧠 Loading KenLM: {LM_PATH}")
            unigrams = get_unigrams_safe(LM_PATH)
            if unigrams:
                self.decoder = build_ctcdecoder(
                    labels=self.itos,
                    kenlm_model_path=LM_PATH,
                    unigrams=unigrams,
                    alpha=1.0,  # Balanced Trust
                    beta=1.5    # OPTIMIZED: 1.5 (Prevents sticky words)
                )
                print("✅ Smart Decoder Active")
        
        # 5. Load PostProcessor
        self.post_processor = PostProcessor()
        print("✅ System Ready!")

    def sort_boxes(self, boxes):
        if not boxes: return []
        boxes = sorted(boxes, key=lambda b: b[1]) 
        lines = []
        while boxes:
            ref_box = boxes.pop(0) 
            current_line = [ref_box]
            ref_y1, ref_y2 = ref_box[1], ref_box[3]
            ref_h = ref_y2 - ref_y1
            to_remove = []
            for i, box in enumerate(boxes):
                y1, y2 = box[1], box[3]
                h = y2 - y1
                inter_y1 = max(ref_y1, y1)
                inter_y2 = min(ref_y2, y2)
                overlap = max(0, inter_y2 - inter_y1)
                if (overlap / min(ref_h, h)) > 0.5 or (ref_y1 < (y1+y2)/2 < ref_y2):
                    current_line.append(box)
                    to_remove.append(i)
            for i in reversed(to_remove): boxes.pop(i)
            current_line.sort(key=lambda b: b[0])
            lines.append(current_line)
        return [b for line in lines for b in line]

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

    def predict_crop(self, crop):
        # Preprocessing
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
            
            # 1. Greedy Decode (Fallback)
            raw_text = self.decode_greedy(logits)[0]
            smart_text = raw_text

            # 2. Smart Decode (Beam Search with Padding Fix)
            if self.decoder:
                logits_np = logits.squeeze(1).cpu().numpy()
                vocab_size = len(self.itos)
                model_output_size = logits_np.shape[1]
                
                # --- OPTIMIZED PADDING: -20.0 ---
                # Fixes sticky words without causing hallucinations
                if model_output_size < vocab_size:
                     padding = np.full((logits_np.shape[0], vocab_size - model_output_size), -20.0, dtype=np.float32)
                     logits_np = np.concatenate([logits_np, padding], axis=1)
                elif model_output_size > vocab_size:
                     logits_np = logits_np[:, :vocab_size]

                try:
                    smart_text = self.decoder.decode(logits_np, beam_width=100)
                except ValueError:
                    smart_text = raw_text
                    
        # Return Smart Text (KenLM) if available, else Raw
        return smart_text

    def run(self, image_path):
        print(f"Processing: {image_path}")
        results = self.yolo.predict(image_path, conf=0.5, agnostic_nms=True, verbose=False)
        
        boxes = []
        for r in results:
            for box in r.boxes.xyxy.cpu().numpy():
                boxes.append(box.astype(int))
        
        if not boxes: return "No text", "", ""
        
        boxes = self.sort_boxes(boxes)
        original = cv2.imread(image_path)
        gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        
        # We collect ONLY smart text now, as that's what we want to process
        full_text_list = []
        
        for x1, y1, x2, y2 in boxes:
            pad = 2
            h_img, w_img = gray.shape
            y1_c, y2_c = max(0, y1-pad), min(h_img, y2+pad)
            x1_c, x2_c = max(0, x1-pad), min(w_img, x2+pad)
            
            crop = gray[y1_c:y2_c, x1_c:x2_c]
            
            # predict_crop now returns the BEST (Smart) version directly
            text_segment = self.predict_crop(crop)
            full_text_list.append(text_segment)
            
        smart_sentence = " ".join(full_text_list)
        
        # Post-Process (Spell Check + Translation)
        corrected, translated = self.post_processor.process(smart_sentence)
        
        # Return format: Raw (Smart), Corrected, Translated
        return smart_sentence, corrected, translated