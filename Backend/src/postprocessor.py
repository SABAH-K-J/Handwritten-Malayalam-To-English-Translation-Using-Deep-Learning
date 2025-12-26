import os
import torch
import unicodedata
import pickle
import logging
import re  # Added for pattern matching
from symspellpy import SymSpell, Verbosity
from transformers import pipeline
from src.config import DICT_PATH, CACHE_DIR

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import MLMorph
try:
    from mlmorph_spellchecker import SpellChecker
    MLMORPH_AVAILABLE = True
except ImportError:
    print("⚠️ Warning: mlmorph_spellchecker not found.")
    MLMORPH_AVAILABLE = False

class PostProcessor:
    def __init__(self):
        print("⚙️ Loading Post-Processor (with Glyph & Noise Fixes)...")
        
        # 0. Visual Confusion Map (Updated)
        self.CONFUSION_MAP = {
            'ണ്': 'ന', 'റ': 'ര', 'ഴ': 'ജ', 'ം': 'ൻ', 
            'ല്': 'ൽ', 'ങ്ക': 'ങ്ങ', 'ക്ക': 'ക', 'റ്റ': 'ററ',
            'ഞാന്ാ': 'ഞാൻ', 'ഞാന്': 'ഞാൻ', 'ഞാനൊരു': 'ഞാനൊരു', 
            
            # --- NEW FIXES FOR YOU ---
            'ര്ു': 'മ്മ',   # Fixes 'നര്ുുടെ' -> 'നമ്മുടെ'
            'ററ്': 'റ്റ',    # Common glyph split
            'ഇൗ': 'ഈ',      # Common vowel split
        }

        self.INDEPENDENT_VOWELS = set(['അ', 'ആ', 'ഇ', 'ഈ', 'ഉ', 'ഊ', 'ഋ', 'എ', 'ഏ', 'ഐ', 'ഒ', 'ഓ', 'ഔ'])

        # 1. SymSpell
        self.sym_spell = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
        self._load_dictionary_optimized()

        # 2. MLMorph
        self.mlmorph = None
        if MLMORPH_AVAILABLE:
            try:
                self.mlmorph = SpellChecker()
            except Exception:
                pass

        # 3. Translator (NLLB)
        self.device = 0 if torch.cuda.is_available() else -1
        self.translator = None
        try:
            print("⏳ Loading NLLB Translator...")
            self.translator = pipeline(
                "translation", 
                model="facebook/nllb-200-distilled-600M", 
                device=self.device,
                torch_dtype=torch.float16 if self.device == 0 else torch.float32,
                framework="pt"
            )
            print("✅ Translator Ready")
        except Exception as e:
            print(f"⚠️ Translator failed to load: {e}")

    def _load_dictionary_optimized(self):
        cache_path = os.path.join(CACHE_DIR, "symspell_dict.pkl")
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "rb") as f:
                    self.sym_spell = pickle.load(f)
                return
            except Exception:
                pass 

        if os.path.exists(DICT_PATH):
            if not self.sym_spell.load_dictionary(DICT_PATH, term_index=0, count_index=1, encoding="utf-8"):
                with open(DICT_PATH, 'r', encoding='utf-8') as f:
                    for line in f:
                        word = line.strip().split()[0]
                        self.sym_spell.create_dictionary_entry(word, 1)
            try:
                if not os.path.exists(CACHE_DIR): os.makedirs(CACHE_DIR)
                with open(cache_path, "wb") as f:
                    pickle.dump(self.sym_spell, f)
            except Exception:
                pass

    def clean_artifacts(self, text):
        """
        NEW: Removes OCR noise like trailing viramas on Chillu letters.
        Ex: 'ക്ലാസിൽ്' -> 'ക്ലാസിൽ'
        """
        # 1. Remove '്' (Virama) if it follows a Chillu letter (Grammatically illegal)
        # Chillu letters: ൻ, ർ, ൽ, ൾ, ൺ
        text = re.sub(r'([ൻർൽൾൺ])്', r'\1', text)
        
        # 2. Remove double viramas (്് -> ്)
        text = text.replace('്്', '്')
        
        # 3. Remove virama if it is the very last character of a word
        # (Malayalam words rarely end in raw virama unless it's 'u' sound representation, 
        # but modern OCR usually mistakes it for end-noise)
        words = text.split()
        cleaned_words = []
        for w in words:
            if len(w) > 1 and w.endswith('്'):
                # Check if removing it makes it a valid word
                stripped = w[:-1]
                if stripped in self.sym_spell.words:
                    cleaned_words.append(stripped)
                    continue
            cleaned_words.append(w)
            
        return " ".join(cleaned_words)

    def apply_visual_correction(self, word):
        if word in self.CONFUSION_MAP: return self.CONFUSION_MAP[word]
        if word in self.sym_spell.words: return word
        
        for wrong, right in self.CONFUSION_MAP.items():
            if wrong in word:
                candidate = word.replace(wrong, right)
                if candidate in self.sym_spell.words: return candidate
        
        if word.endswith('ന്'):
            candidate = word[:-2] + 'ൻ'
            if candidate in self.sym_spell.words: return candidate
            
        return word

    def fix_yolo_splits(self, text):
        words = text.split()
        if not words: return ""
        merged = []
        i = 0
        while i < len(words):
            curr = words[i]
            if i + 1 < len(words):
                next_w = words[i+1]
                
                # Vowel Guard
                if next_w[0] in self.INDEPENDENT_VOWELS:
                    merged.append(curr); i += 1; continue
                
                # Check Validity
                next_is_valid = (next_w in self.sym_spell.words) or (self.mlmorph and self.mlmorph.spellcheck(next_w))
                
                # Don't merge if next word is valid (unless it's a number like 'നാല്')
                # We relax the rule slightly for numbers if needed, but usually strict is safer.
                if next_is_valid and len(next_w) > 1:
                    merged.append(curr); i += 1; continue

                combined = curr + next_w
                if combined in self.sym_spell.words or (self.mlmorph and self.mlmorph.spellcheck(combined)):
                    merged.append(combined); i += 2; continue

            merged.append(curr)
            i += 1
        return " ".join(merged)

    def spell_check(self, text):
        words = text.split()
        corrected = []
        for word in words:
            word = self.apply_visual_correction(word)
            if word in self.sym_spell.words:
                corrected.append(word); continue
            
            suggestions = self.sym_spell.lookup(word, Verbosity.TOP, max_edit_distance=2, include_unknown=True)
            if suggestions:
                best = suggestions[0]
                if len(word) <= 4 and best.distance > 1: corrected.append(word)
                elif best.distance > 2: corrected.append(word)
                else: corrected.append(best.term)
            else:
                corrected.append(word)
        return " ".join(corrected)

    def translate_text(self, text):
        if not self.translator or not text.strip():
            return ""
        try:
            out = self.translator(
                text, 
                src_lang="mal_Mlym", 
                tgt_lang="eng_Latn", 
                max_length=256,
            )
            return out[0]['translation_text']
        except Exception as e:
            print(f"Translation Error: {e}")
            return "[Translation Failed]"

    def process(self, raw_text):
        if not raw_text.strip(): return raw_text, ""
        
        # 1. Normalize
        normalized_raw = unicodedata.normalize('NFC', raw_text)
        
        # 2. Clean Artifacts (NEW STEP: Fixes 'ക്ലാസിൽ്')
        cleaned_text = self.clean_artifacts(normalized_raw)
        
        # 3. Merge (Strict)
        merged_text = self.fix_yolo_splits(cleaned_text)
        
        # 4. Spell Check (Fixes 'നര്ുുടെ' via Map)
        processed_text = self.spell_check(merged_text)
        
        # 5. Translate
        translation = self.translate_text(processed_text)
        
        return processed_text, translation