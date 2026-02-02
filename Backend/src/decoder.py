from pyctcdecode import build_ctcdecoder
import numpy as np
import os
import logging

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

class IntelligentDecoder:
    def __init__(self, char_list, lm_path, lexicon_path):
        """
        Args:
            char_list (list): List of characters matching the model output.
            lm_path (str): Path to 'lm.binary'
            lexicon_path (str): Path to 'clean_lexicon.txt'
        """
        self.logger = logging.getLogger(__name__)
        
        # 1. READ THE LEXICON FILE INTO A LIST
        unigrams_list = []
        if os.path.exists(lexicon_path):
            Log.process(f"Reading Lexicon from {os.path.basename(lexicon_path)}...")
            try:
                with open(lexicon_path, "r", encoding="utf-8") as f:
                    # Read lines and strip whitespace
                    unigrams_list = [line.strip() for line in f if line.strip()]
                Log.info(f"Loaded {len(unigrams_list)} words into dictionary.")
            except Exception as e:
                Log.error(f"Failed to read lexicon file: {e}")
        else:
            Log.warn(f"Lexicon not found at {lexicon_path}")

        # Ensure blank token is handled correctly
        self.labels = char_list
        
        # 2. LOAD DECODER
        if os.path.exists(lm_path) and unigrams_list:
            Log.process(f"Loading KenLM from {os.path.basename(lm_path)}...")
            try:
                self.decoder = build_ctcdecoder(
                    self.labels,
                    kenlm_model_path=lm_path,
                    unigrams=unigrams_list,  # Pass the list!
                    alpha=0.5, 
                    beta=1.0,  
                )
                self.use_lm = True
                Log.success("Smart Decoder Loaded")
            except Exception as e:
                Log.error(f"Failed to load KenLM ({e}). Using Greedy Search.")
                self.use_lm = False
        else:
            Log.warn("Missing LM or Lexicon. Using Greedy Search.")
            self.use_lm = False

    def decode(self, logits):
        if self.use_lm:
            text = self.decoder.decode(logits)
        else:
            # Greedy Fallback
            # pyctcdecode handles greedy decoding gracefully if no LM is attached
            # but usually we want to explicit fallback if init failed.
            try:
                # Basic fallback if LM fails (requires manual mapping, but pyctcdecode helps)
                text = self.decoder.decode(logits) 
            except:
                # Absolute worst case manual greedy
                indexes = np.argmax(logits, axis=-1)
                text = "".join([self.labels[i] for i in indexes if i != 0]) # Very rough approx
        return text

def load_vocab(vocab_path):
    if not os.path.exists(vocab_path):
        raise FileNotFoundError(f"Vocab file not found: {vocab_path}")
        
    with open(vocab_path, "r", encoding="utf-8") as f:
        chars = f.read().splitlines()
        
    chars.insert(0, "") 
    return chars