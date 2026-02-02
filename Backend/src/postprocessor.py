import os
import torch
import logging
import re
import unicodedata
import pickle
from symspellpy import SymSpell, Verbosity
from transformers import pipeline

# Mock config
try:
    from src.config import DICT_PATH, CACHE_DIR
except ImportError:
    DICT_PATH = "malayalam_dict.txt" 
    CACHE_DIR = "./cache"

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

class PostProcessor:
    def __init__(self):
        Log.info("Initializing Integrated Malayalam Post-Processor...")
        
        # 1. Dictionary Setup
        self.sym_spell = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
        self._load_dictionary_optimized()

        # 2. Translation Pipeline
        self.device = 0 if torch.cuda.is_available() else -1
        self.translator = None
        self._init_translator()

    def _init_translator(self):
        try:
            # Import the path from config
            from src.config import TRANSLATOR_MODEL_PATH
            
            Log.process("Initializing Translation Pipeline...")
            
            # 1. Check if the offline model exists
            if os.path.exists(TRANSLATOR_MODEL_PATH):
                Log.info(f"Found Offline Model at: {os.path.basename(TRANSLATOR_MODEL_PATH)}")
                model_source = TRANSLATOR_MODEL_PATH
                offline_mode = True
            else:
                Log.warn("Offline model NOT found. Falling back to online (tiny) model.")
                model_source = "facebook/nllb-200-distilled-600M"
                offline_mode = False

            # 2. Load the Pipeline
            self.translator = pipeline(
                "translation", 
                model=model_source, 
                device=self.device,
                # Use float16 if on GPU (device=0), else float32 for CPU
                dtype=torch.float16 if self.device == 0 else torch.float32,
                framework="pt"
            )
            
            if offline_mode:
                Log.success("Translator Loaded (OFFLINE - 1.3B Model)")
            else:
                Log.success("Translator Loaded (ONLINE - 600M Model)")
            
        except Exception as e:
            Log.error(f"Translator failed to load: {e}")

    def _load_dictionary_optimized(self):
        if not os.path.exists(CACHE_DIR): os.makedirs(CACHE_DIR)
        cache_path = os.path.join(CACHE_DIR, "symspell_dict.pkl")
        
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "rb") as f: 
                    self.sym_spell = pickle.load(f)
                Log.success("Dictionary loaded from cache")
                return
            except: 
                Log.warn("Cache corrupted. Rebuilding...")

        if os.path.exists(DICT_PATH):
            Log.process(f"Building Dictionary from {os.path.basename(DICT_PATH)}...")
            self.sym_spell.load_dictionary(DICT_PATH, term_index=0, count_index=1, encoding="utf-8")
            with open(cache_path, "wb") as f: pickle.dump(self.sym_spell, f)
            Log.success("Dictionary Built & Cached")
        else:
            Log.error(f"Dictionary path not found! ({DICT_PATH})")

    def normalize_and_clean(self, text):
        """Pure Unicode normalization and artifact removal."""
        text = unicodedata.normalize('NFC', text)
        # Fix repeated signs (OCR noise)
        text = re.sub(r'([ാ-ൃംഃ])\1+', r'\1', text)
        # Remove invisible joiners that break string matching
        text = text.replace('\u200D', '').replace('\u200C', '')
        return text

    def merge_split_words(self, text):
        """Merges fragmented Malayalam words based on dictionary validity."""
        words = text.split()
        if len(words) < 2: return text

        merged = []
        i = 0
        while i < len(words):
            current = words[i]
            if i + 1 < len(words):
                next_word = words[i+1]
                combined = current + next_word
                
                # Logic: Merge if combined word is real, or if 'current' is a tiny fragment
                if combined in self.sym_spell.words or len(current) == 1:
                    merged.append(combined)
                    i += 2
                    continue
            
            merged.append(current)
            i += 1
        return " ".join(merged)

    def inject_punctuation(self, text):
        """Adds logical sentence breaks for the translator."""
        # Simple end-of-sentence markers
        text = re.sub(r'(ആണ്|അല്ല|ഉണ്ട്|ഇല്ല)(?=(\s|$))', r'\1. ', text)
        return text.strip()

    def process(self, raw_text):
        if not raw_text or not raw_text.strip(): return "", ""
        
        # Step 1: Normalize
        text = self.normalize_and_clean(raw_text)
        
        # Step 2: Merge fragments
        text = self.merge_split_words(text)
        
        # Step 3: Punctuation for translation context
        text_with_grammar = self.inject_punctuation(text)
        
        # Step 4: Translation
        translation = ""
        if self.translator:
            try:
                # NLLB context works better with a trailing period
                inp = text_with_grammar if text_with_grammar.endswith(('.', '?', '!')) else text_with_grammar + "."
                out = self.translator(inp, src_lang="mal_Mlym", tgt_lang="eng_Latn", max_length=256)
                translation = out[0]['translation_text']
            except Exception as e:
                translation = f"[Error: {str(e)}]"
                Log.error(f"Translation Error: {e}")
        
        return text, translation