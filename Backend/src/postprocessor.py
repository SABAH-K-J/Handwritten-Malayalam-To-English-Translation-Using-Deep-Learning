import os
import torch
import logging
import re
import unicodedata
import pickle
from symspellpy import SymSpell, Verbosity
from transformers import pipeline

# Mock config if src.config is missing
try:
    from src.config import DICT_PATH, CACHE_DIR
except ImportError:
    DICT_PATH = "malayalam_dict.txt"  # Default fallback
    CACHE_DIR = "./cache"

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PostProcessor:
    def __init__(self):
        print("PROCESS : Loading Dynamic Post-Processor (Suffix-Aware)...")
        
        # 1. Base -> Chillu Map (Standard Grammar)
        self.BASE_TO_CHILLU = {'ന': 'ൻ', 'ര': 'ർ', 'ല': 'ൽ', 'ള': 'ൾ'}

        # 2. Ligature Protection (The "Do Not Break" List)
        self.LIGATURE_EXCEPTIONS = {
            'ന': ['ന', 'ത', 'റ'], 
            'ല': ['ല'],            
            'ള': ['ള'],            
            'ര': ['ര'],            
        }

        # 3. Dynamic Suffix Rules (Pattern -> Replacement)
        self.SUFFIX_PATTERNS = [
            # --- Slang Fixes ---
            (r'ാടാ$', 'ാണ്'),    # "Enthinada" -> "Enthinanu"
            (r'ന്തി$', 'ന്ത'),    # "Thanthi" -> "Thantha"
            (r'ലെ$', 'ലേ'),      # "Alle" -> "Allé"
            (r'പ്പ$', 'പ്പോൾ'),   # "Ippo" -> "Ippol"
            
            # --- OCR Drop Fixes (The Fix for "Allenkila") ---
            (r'ല$', 'ൽ'),        # Fixes "അല്ലെങ്കില" -> "അല്ലെങ്കിൽ"
            (r'ള$', 'ൾ'),        # Fixes "അവള" -> "അവൾ"
            (r'ര$', 'ർ'),        # Fixes "അവര" -> "അവർ"
            (r'ന$', 'ൻ'),        # Fixes "അവന" -> "അവൻ"
            
            # --- Artifact Fixes ---
            (r'ല്$', 'ൽ'),       # Fix trailing 'l' artifact
            (r'ന്$', 'ൻ'),       # Fix trailing 'n' artifact
        ]

        # 4. Dictionary
        self.sym_spell = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
        self._load_dictionary_optimized()

        # 5. Translator
        self.device = 0 if torch.cuda.is_available() else -1
        self.translator = None
        try:
            logger.info(f"Loading Translator on device: {self.device}")
            self.translator = pipeline(
                "translation", 
                model="facebook/nllb-200-distilled-600M", 
                device=self.device,
                torch_dtype=torch.float16 if self.device == 0 else torch.float32,
                framework="pt"
            )
        except Exception as e:
            logger.warning(f"Translator failed to load: {e}")

    def _load_dictionary_optimized(self):
        if not os.path.exists(CACHE_DIR):
            os.makedirs(CACHE_DIR)
            
        cache_path = os.path.join(CACHE_DIR, "symspell_dict.pkl")
        
        # Try loading from cache
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "rb") as f: 
                    self.sym_spell = pickle.load(f)
                return
            except Exception: 
                logger.warning("Cache load failed, rebuilding dictionary...")

        # Load from text file
        if os.path.exists(DICT_PATH):
            if not self.sym_spell.load_dictionary(DICT_PATH, term_index=0, count_index=1, encoding="utf-8"):
                # Fallback manual load if standard load fails
                with open(DICT_PATH, 'r', encoding='utf-8') as f:
                    for line in f:
                        parts = line.strip().split()
                        if parts: self.sym_spell.create_dictionary_entry(parts[0], 1)
            
            # Save to cache
            try:
                with open(cache_path, "wb") as f: 
                    pickle.dump(self.sym_spell, f)
            except Exception: 
                pass
        else:
            logger.warning(f"Dictionary file not found at {DICT_PATH}")

    def normalize_structure(self, text):
        if not text: return ""
        text = unicodedata.normalize('NFC', text)
        
        # Dynamic Chillu Conversion (Internal)
        for base, chillu in self.BASE_TO_CHILLU.items():
            exceptions = "".join(self.LIGATURE_EXCEPTIONS.get(base, [base]))
            # Fix: Ensure exceptions are treated as characters set []
            pattern = f"{base}\u0D4D(?!([{exceptions}]|\u200D))"
            text = re.sub(pattern, chillu, text)

        text = re.sub(r'([ൻർൽൾൺ])\u0D4D', r'\1', text) 
        text = text.replace('\u0D4D\u0D4D', '\u0D4D')
        return text

    def standardize_slang(self, text):
        """
        Dynamically converts broken endings using pattern matching + dictionary check.
        """
        words = text.split()
        processed_words = []
        
        for word in words:
            # 1. If word is already valid, keep it! (Protects 'വില', 'തല' etc)
            if word in self.sym_spell.words:
                processed_words.append(word)
                continue
            
            # 2. If invalid, try patterns
            replaced = False
            for pattern, replacement in self.SUFFIX_PATTERNS:
                if re.search(pattern, word):
                    candidate = re.sub(pattern, replacement, word)
                    
                    # 3. Only accept if the NEW word is valid
                    if candidate in self.sym_spell.words:
                        processed_words.append(candidate)
                        replaced = True
                        break 
            
            if not replaced:
                processed_words.append(word)
                
        return " ".join(processed_words)

    def inject_grammar(self, text):
        q_starters = ['എന്തി', 'എന്താ', 'ആരാ', 'എവിടെ', 'എങ്ങനെ']
        if any(text.startswith(q) for q in q_starters) and '?' not in text:
            text = re.sub(r'(ന്നത്|ള്ളത്|ആണ്)\s', r'\1? ', text)

        text = re.sub(r'\s(കാരണം|പക്ഷേ)\s', r'. \1, ', text)
        # Fix: Ensure lookahead matches end of string or space
        text = re.sub(r'(ആണ്|അല്ല|ഉണ്ട്|ഇല്ല)(?=(\s|$))', r'\1. ', text)
        return text

    def spell_check(self, text):
        words = text.split()
        corrected = []
        for word in words:
            if word in self.sym_spell.words:
                corrected.append(word)
                continue
            
            suggestions = self.sym_spell.lookup(word, Verbosity.TOP, max_edit_distance=2, include_unknown=True)
            if suggestions:
                best = suggestions[0]
                # Fix: Ensure we don't correct short acronyms aggressively
                if len(word) > 3 and best.distance > 0:
                    corrected.append(best.term)
                else:
                    corrected.append(word)
            else:
                corrected.append(word)
        return " ".join(corrected)

    def process(self, raw_text):
        if not raw_text or not raw_text.strip(): return "", ""
        
        # 1. Fix Structure
        text = self.normalize_structure(raw_text)
        
        # 2. Fix Suffixes (The "Allenkila" Fix is here)
        text = self.standardize_slang(text)
        
        # 3. Spell Check
        corrected_text = self.spell_check(text)
        
        # 4. Inject Grammar
        text_for_trans = self.inject_grammar(corrected_text)
        
        # 5. Translate
        if self.translator:
            try:
                # Add punctuation for better translation context if missing
                inp = text_for_trans if text_for_trans[-1] in '.?!' else text_for_trans + "."
                out = self.translator(inp, src_lang="mal_Mlym", tgt_lang="eng_Latn", max_length=256)
                
                translation = out[0]['translation_text']
                # Remove artificial punctuation if source didn't have it
                if not text_for_trans.endswith('.') and translation.endswith('.'):
                    translation = translation[:-1]
                
                return corrected_text, translation
            except Exception as e:
                logger.error(f"Translation error: {e}")
                return corrected_text, "[Translation Failed]"
        
        return corrected_text, ""