import os
import torch
import unicodedata
from transformers import pipeline
from src.config import VOCAB_PATH, DEVICE

# Import MLMorph (with safety check)
try:
    from mlmorph_spellchecker import SpellChecker
except ImportError:
    print("⚠️ Warning: mlmorph_spellchecker not found.")
    SpellChecker = None

class PostProcessor:
    def __init__(self):
        print("⚙️ Loading Post-Processor...")
        
        # 1. Load Spell Checker
        self.spell = None
        if SpellChecker:
            try:
                self.spell = SpellChecker()
                print("✅ MLMorph Active")
            except Exception as e:
                print(f"⚠️ MLMorph failed: {e}")

        # 2. Load Split-Word Vocab
        self.vocab = set()
        if os.path.exists(VOCAB_PATH):
            with open(VOCAB_PATH, 'r', encoding='utf-8') as f:
                self.vocab = {line.strip() for line in f}
        
        # 3. Load Translator
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

    def fix_split_words(self, words):
        if not self.vocab: return words
        fixed = []
        i = 0
        while i < len(words):
            word = words[i]
            if i + 1 < len(words):
                combined = word + words[i+1]
                if combined in self.vocab:
                    fixed.append(combined)
                    i += 2
                    continue
            fixed.append(word)
            i += 1
        return fixed

    def smart_correct(self, word):
        if not self.spell: return word
        if self.spell.spellcheck(word): return word
        candidates = self.spell.candidates(word)
        return candidates[0] if candidates else word

    def process(self, raw_text):
        if not raw_text.strip(): return raw_text, ""
        
        text = unicodedata.normalize('NFC', raw_text)
        words = text.split()
        
        if self.vocab: words = self.fix_split_words(words)
        if self.spell: words = [self.smart_correct(w) for w in words]
        
        corrected = " ".join(words)
        translation = ""
        
        if self.translator:
            try:
                out = self.translator(corrected, src_lang="mal_Mlym", tgt_lang="eng_Latn", max_length=256)
                translation = out[0]['translation_text']
            except:
                translation = "[Error]"
                
        return corrected, translation