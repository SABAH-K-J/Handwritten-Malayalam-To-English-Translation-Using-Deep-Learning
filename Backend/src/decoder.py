"""CTC decoding helpers that combine the character model with a KenLM language model."""

from pyctcdecode import build_ctcdecoder
import numpy as np
import os
from src.logger import Log

class IntelligentDecoder:
    def __init__(self, char_list, lm_path, lexicon_path):
        """
        Args:
            char_list (list): List of characters matching the model output.
            lm_path (str): Path to 'lm.binary'
            lexicon_path (str): Path to 'clean_lexicon.txt'
        """
        # Load a unigram list so the decoder can bias toward known Malayalam words.
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

        # Keep the character labels in the same order as the model output layer.
        self.labels = char_list
        
        # Build the decoder only when both the language model and lexicon are available.
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
        """Decode a single CRNN output tensor into text."""

        if self.use_lm:
            text = self.decoder.decode(logits)
        else:
            # If LM-based decoding is unavailable, fall back to a simple argmax pass.
            try:
                text = self.decoder.decode(logits) 
            except:
                # Worst-case fallback when the decoder object is unusable.
                indexes = np.argmax(logits, axis=-1)
                text = "".join([self.labels[i] for i in indexes if i != 0]) # Very rough approx
        return text

def load_vocab(vocab_path):
    """Load a character vocabulary file and prepend the CTC blank token."""

    if not os.path.exists(vocab_path):
        raise FileNotFoundError(f"Vocab file not found: {vocab_path}")
        
    with open(vocab_path, "r", encoding="utf-8") as f:
        chars = f.read().splitlines()
        
    chars.insert(0, "") 
    return chars