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
        print("PROCESS : Loading Dynamic Post-Processor (Suffix-Aware & OCR-Enhanced)...")
        
        # 1. Base -> Chillu Map (Standard Grammar)
        # Note: Removed 'ന' and 'ണ' because they often end in valid Chandrakkala (Dative 'nu', Copula 'aanu')
        # forcing them to Chillu 'n' or 'nn' changes the meaning (Meaning Change: Aunu -> Aun).
        self.BASE_TO_CHILLU = {'ര': 'ർ', 'ല': 'ൽ', 'ള': 'ൾ'}

        # 2. Ligature Protection (The "Do Not Break" List)
        # These are bases that SHOULD retain the virama if followed by specific chars
        self.LIGATURE_EXCEPTIONS = {
            'ല': ['ല', 'പ'],            
            'ള': ['ള'],            
            'ര': ['ര'],  
        }
        
        # 3. Visual Confusion Map (Specific to Malayalam OCR)
        # Swaps characters that look identical but are predicted wrong
        self.VISUAL_CONFUSIONS = {
            'പ്ര': 'ര',  # If 'Pra' is recognized as 'Ra' (Contextual) - Handled in patterns 
            'സ': 'സമ',   # Common splitting error
            'പ': 'വ',    # Pa vs Va confusion
            'മ': 'ധ',    # Ma vs Dha
            'ഭ': 'ദ',    # Bha vs Da
            'ൃ': 'ു',    # Vowel Sign Vocalic R vs U
            'ൗ': 'ൌ',    # Au Length mark variations
            'ക': 'ഷി',   # Ka vs Shi (rare but happens)
        }

        # 4. Dynamic Suffix Rules (Pattern -> Replacement)
        self.SUFFIX_PATTERNS = [
            # --- Slang/Conversation Fixes ---
            (r'ാടാ$', 'ാണ്'),    # "Enthinada" -> "Enthinanu"
            (r'ന്തി$', 'ന്ത'),    # "Thanthi" -> "Thantha"
            (r'ലെ$', 'ലേ'),      # "Alle" -> "Allé"
            (r'പ്പ$', 'പ്പോൾ'),   # "Ippo" -> "Ippol"
            (r'കൊ$', 'കൊണ്ട്'),   
            (r'ണ്ട$', 'ണ്ട്'),
            
            # --- OCR Drop Fixes (The Fix for "Allenkila") ---
            (r'ല$', 'ൽ'),        # Fixes "അല്ലെങ്കില" -> "അല്ലെങ്കിൽ"
            (r'ള$', 'ൾ'),        # Fixes "അവള" -> "അവൾ"
            (r'ര$', 'ർ'),        # Fixes "അവര" -> "അവർ"
            (r'ന$', 'ൻ'),        # Fixes "അവന" -> "അവൻ" (Note: Contextually 'Nu' is better but 'N' is common fix)
            (r'ണ$', 'ണ്'),       # Fixes "ആണ" -> "ആണ്" (Is) - prioritizing Copula over Chillu 'Aun' (Male)
            
            # --- Artifact Fixes ---
            (r'ല്$', 'ൽ'),       # Fix trailing 'l' artifact
            (r'ര്$', 'ർ'),
            (r'ള്$', 'ൾ'),
            # Removed (r'ന്$', 'ൻ') and (r'ണ്$', 'ൺ') to protect valid "nu" endings (Dative case & 'Aanu')
            
            # --- Missing Vowels ---
            (r'ഇത$', 'ഇത്'),     
            (r'അത$', 'അത്'),
            (r'ഒരു$', 'ഒരു'),    # Sometimes 'ഒര'
            (r'എന്മ$', 'എന്ന്'),
        ]

        # 5. Dictionary
        self.sym_spell = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
        self._load_dictionary_optimized()

        # 6. Translator
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

    def fix_repeated_signs(self, text):
        """Removes erroneously repeated vowel signs common in OCR artifacts."""
        # Fix double vowel signs like ാാ -> ാ
        text = re.sub(r'([ാ-ൃ])\1+', r'\1', text) 
        # Fix Anusvara repeats ംം -> ം
        text = re.sub(r'([ംഃ])\1+', r'\1', text)
        return text

    def normalize_structure(self, text):
        if not text: return ""
        text = unicodedata.normalize('NFC', text)
        
        # 1. Fix Repeated Signs
        text = self.fix_repeated_signs(text)
        
        # 2. Dynamic Chillu Conversion (Internal)
        # Looks for Base + Virama (Chandrakkala) NOT followed by a connecting base
        for base, chillu in self.BASE_TO_CHILLU.items():
            exceptions = "".join(self.LIGATURE_EXCEPTIONS.get(base, [base]))
            # Negative Lookahead: Match Base+Virama ONLY if NOT followed by an exception char or ZWJ/ZWNJ
            pattern = f"{base}\u0D4D(?!([{exceptions}]|\u200D|\u200C))"
            text = re.sub(pattern, chillu, text)

        # 3. Clean up broken chillu encodings
        text = re.sub(r'([ൻർൽൾൺ])\u0D4D', r'\1', text) 
        text = text.replace('\u0D4D\u0D4D', '\u0D4D')
        return text

    def standardize_slang(self, text):
        """
        Dynamically converts broken endings using pattern matching + dictionary check.
        Also applies visual confusion fixes.
        """
        words = text.split()
        processed_words = []
        
        for word in words:
            # 1. If word is already valid, keep it! (Protects 'വില', 'തല' etc)
            if word in self.sym_spell.words:
                processed_words.append(word)
                continue
            
            # 2. Try Suffix Patterns
            replaced = False
            candidate = word
            
            for pattern, replacement in self.SUFFIX_PATTERNS:
                if re.search(pattern, word):
                    cand = re.sub(pattern, replacement, word)
                    # Priority 1: Dictionary Match
                    if cand in self.sym_spell.words:
                        candidate = cand
                        replaced = True
                        break
                    # Priority 2: Heuristic Acceptance (if word length > 3)
                    elif len(cand) > 3:
                        candidate = cand
                        replaced = True # We tentatively accept it, SpellCheck might refine it later
            
            processed_words.append(candidate)
                
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
            
            # Check for numbers/English/Symbols -> Skip correction
            if re.match(r'^[0-9a-zA-Z\W]+$', word):
                 corrected.append(word)
                 continue

            suggestions = self.sym_spell.lookup(word, Verbosity.TOP, max_edit_distance=2, include_unknown=True)
            if suggestions:
                best = suggestions[0]
                # Smart Acceptance Logic
                # 1. Distance 0 is exact match (already handled)
                # 2. Distance 1 is usually safe for words > 3 chars
                # 3. Distance 2 is risky, requires longer words > 5 chars
                if best.distance == 1 and len(word) > 2:
                    corrected.append(best.term)
                elif best.distance == 2 and len(word) > 5:
                    corrected.append(best.term)
                else:
                    corrected.append(word) # Keep original if correction is too aggressive
            else:
                corrected.append(word)
        return " ".join(corrected)

    def process(self, raw_text):
        if not raw_text or not raw_text.strip(): return "", ""
        
        # 1. Fix Structure (Ligatures, Chillus, Repeated Signs)
        text = self.normalize_structure(raw_text)
        
        # 2. Fix Suffixes & Common mis-recognized endings
        text = self.standardize_slang(text)
        
        # 3. Spell Check with Context Awareness
        corrected_text = self.spell_check(text)
        
        # 4. Inject Grammar (Punctuation)
        text_for_trans = self.inject_grammar(corrected_text)
        
        # 5. Translate
        if self.translator:
            try:
                # Add punctuation for better translation context if missing
                inp = text_for_trans if text_for_trans.strip() and text_for_trans.strip()[-1] in '.?!' else text_for_trans + "."
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