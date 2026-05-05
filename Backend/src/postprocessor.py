"""Text cleanup and Malayalam-to-English translation post-processing."""

import os
import torch
import re
import unicodedata
import pickle
from symspellpy import SymSpell, Verbosity
from transformers import pipeline
from src.logger import Log

# Import configuration with a fallback so the module can still be imported in isolation.
try:
    from src.config import DICT_PATH, CACHE_DIR, TRANSLATOR_MODEL_PATH
except ImportError:
    DICT_PATH = "malayalam_dict.txt" 
    CACHE_DIR = "./cache"
    TRANSLATOR_MODEL_PATH = ""

class PostProcessor:
    def __init__(self):
        """Initialize the dictionary cache and translation pipeline."""

        Log.info("Initializing Integrated Malayalam Post-Processor...")
        
        # Load the SymSpell dictionary so future spelling cleanup can reuse the same cache.
        self.sym_spell = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
        self._load_dictionary_optimized()

        # Choose GPU when available, otherwise keep the translator on CPU.
        self.device = 0 if torch.cuda.is_available() else -1
        self.translator = None
        self._init_translator()

    def _init_translator(self):
        """Load the offline translation model or fall back to the hosted one."""

        try:
            Log.process("Initializing Translation Pipeline...")
            
            # Prefer the packaged offline model so translation works without network access.
            if os.path.exists(TRANSLATOR_MODEL_PATH):
                Log.info(f"Found Offline Model at: {os.path.basename(TRANSLATOR_MODEL_PATH)}")
                model_source = TRANSLATOR_MODEL_PATH
                offline_mode = True
            else:
                Log.warn("Offline model NOT found. Falling back to online (tiny) model.")
                model_source = "facebook/nllb-200-distilled-600M"
                offline_mode = False

            # Build a Hugging Face translation pipeline around the selected model.
            self.translator = pipeline(
                "translation", 
                model=model_source, 
                device=self.device,
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
        """Cache the dictionary on disk so startup does not rebuild it every time."""

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
        """Normalize Unicode and remove common OCR artifacts."""

        text = unicodedata.normalize('NFC', text)
        # Collapse repeated combining marks that often appear in OCR noise.
        text = re.sub(r'([ാ-ൃംഃ])\1+', r'\1', text)
        # Remove invisible joiners that can interfere with dictionary lookup and translation.
        text = text.replace('\u200D', '').replace('\u200C', '')
        return text

    def inject_punctuation(self, text):
        """Add simple sentence boundaries so the translation model gets a little context."""

        # Insert a period after common Malayalam sentence-ending words.
        text = re.sub(r'(ആണ്|അല്ല|ഉണ്ട്|ഇല്ല)(?=(\s|$))', r'\1. ', text)
        return text.strip()

    def process(self, raw_text):
        """Clean OCR text and produce both the corrected Malayalam and English translation."""

        if not raw_text or not raw_text.strip(): return "", ""
        
        # Step 1: Normalize the OCR output.
        text = self.normalize_and_clean(raw_text)
        
        # Step 2 is intentionally disabled because merging fragments can change meaning.
        # text = self.merge_split_words(text)
        
        # Step 3: Add punctuation so translation quality improves slightly.
        text_with_grammar = self.inject_punctuation(text)
        
        # Step 4: Translate the cleaned text if a translator is available.
        translation = ""
        if self.translator:
            try:
                # NLLB performs better when the sentence is explicitly terminated.
                inp = text_with_grammar if text_with_grammar.endswith(('.', '?', '!')) else text_with_grammar + "."
                out = self.translator(inp, src_lang="mal_Mlym", tgt_lang="eng_Latn", max_length=256)
                translation = out[0]['translation_text']
            except Exception as e:
                translation = f"[Error: {str(e)}]"
                Log.error(f"Translation Error: {e}")
        
        return text, translation