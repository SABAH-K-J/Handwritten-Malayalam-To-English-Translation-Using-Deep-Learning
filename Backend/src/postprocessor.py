import os
import torch
import unicodedata
import difflib
from transformers import pipeline
from src.config import DICT_PATH, DEVICE

# Import MLMorph (with safety check)
try:
    from mlmorph_spellchecker import SpellChecker
    MLMORPH_AVAILABLE = True
except ImportError:
    print("⚠️ Warning: mlmorph_spellchecker not found.")
    MLMORPH_AVAILABLE = False

class PostProcessor:
    def __init__(self):
        print("⚙️ Loading Post-Processor...")
        
        # 1. Load Translator
        try:
            print("⏳ Loading Translator...")
            self.translator = pipeline(
                "translation", 
                model="facebook/nllb-200-distilled-600M", 
                torch_dtype=torch.float32,
                device=0 if torch.cuda.is_available() else -1
            )
            print("✅ Translator Ready")
        except Exception as e:
            print(f"⚠️ Translator failed: {e}")
            self.translator = None

        # 2. Load Dictionary (The "Golden List")
        self.valid_words = set()
        if os.path.exists(DICT_PATH):
            print(f"📚 Loading Dictionary: {DICT_PATH}")
            try:
                with open(DICT_PATH, 'r', encoding='utf-8') as f:
                    # Read only the first word if lines contain metadata
                    self.valid_words = {line.strip().split()[0] for line in f if line.strip()}
                print(f"✅ Loaded {len(self.valid_words)} words.")
            except Exception as e:
                print(f"⚠️ Error reading dictionary: {e}")
        else:
            print(f"⚠️ Dictionary not found at {DICT_PATH}")

        # 3. Load MLMorph (Optional Layer)
        self.spell = None
        if MLMORPH_AVAILABLE:
            try:
                self.spell = SpellChecker()
                print("✅ MLMorph Active")
            except Exception as e:
                print(f"⚠️ MLMorph failed: {e}")

    def fix_yolo_splits(self, text):
        """
        Aggressively merges suffixes detected as separate words.
        Logic-based merging is superior to list-based for Malayalam.
        """
        words = text.split()
        if not words: return ""
        merged = []
        i = 0
        while i < len(words):
            curr = words[i]
            if i + 1 < len(words):
                next_w = words[i+1]
                
                # MERGE RULE 1: Joiners/Suffixes (Starting with 'ള', 'ല്ല', 'ത്ത', 'രു', 'ട്ട', 'ന്ന')
                # These almost never start a word in Malayalam context
                if next_w.startswith(('ള', 'ല്ല', 'ത്ത', 'രു', 'ട്ട', 'ന്ന')):
                     curr += next_w
                     i += 1
                
                # MERGE RULE 2: Very Short Fragments (< 3 chars)
                elif len(next_w) < 3: 
                    curr += next_w
                    i += 1 
                    
            merged.append(curr)
            i += 1
        return " ".join(merged)

    def spell_check(self, text):
        """
        Multi-Layered Spell Check:
        1. Check Dictionary (Exact Match)
        2. Check MLMorph (Morphological Validity)
        3. Fuzzy Match against Dictionary (90% Confidence)
        """
        if not self.valid_words: return text
        words = text.split()
        corrected = []
        
        for w in words:
            # 1. Is it already valid?
            if (w in self.valid_words) or (self.spell and self.spell.spellcheck(w)):
                corrected.append(w)
                continue
            
            # 2. Try MLMorph Candidate Generation
            if self.spell:
                candidates = self.spell.candidates(w)
                if candidates:
                    corrected.append(candidates[0])
                    continue

            # 3. Fallback: Dictionary Fuzzy Match (Conservative)
            # Only replace if 90% sure, otherwise keep original
            matches = difflib.get_close_matches(w, self.valid_words, n=1, cutoff=0.90)
            if matches:
                corrected.append(matches[0])
            else:
                corrected.append(w)
                
        return " ".join(corrected)

    def process(self, raw_text):
        if not raw_text.strip(): return raw_text, ""
        
        # 1. Normalize Unicode
        text = unicodedata.normalize('NFC', raw_text)
        
        # 2. Fix Broken Words (YOLO Split Repair)
        text = self.fix_yolo_splits(text)
        
        # 3. Smart Spell Check
        text = self.spell_check(text)
        
        # 4. Translate
        translation = ""
        if self.translator:
            try:
                out = self.translator(
                    text, 
                    src_lang="mal_Mlym", 
                    tgt_lang="eng_Latn", 
                    max_length=256,
                    num_beams=4,
                    no_repeat_ngram_size=3
                )
                translation = out[0]['translation_text']
            except Exception:
                translation = "[Translation Error]"
                
        return text, translation