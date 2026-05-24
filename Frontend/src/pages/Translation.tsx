import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MalayalamKeyboard } from "@/components/MalayalamKeyboard";
import { Loader } from "@/components/Loader";
import { 
  Languages, Copy, Check, Volume2, Loader2, 
  ArrowRight, Sparkles, RotateCcw, FileText 
} from "lucide-react";

const rawApiUrl = import.meta.env.VITE_API_URL || "";
const BASE_URL = rawApiUrl.replace(/\/+$/, ""); // Ensure no double slashes

export default function Translation() {
  const [malayalamText, setMalayalamText] = useState("");
  const [englishText, setEnglishText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!malayalamText.trim()) {
      setError("Please enter Malayalam text to translate");
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: malayalamText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Translation failed");
      }

      setEnglishText(data.translation || "");
    } catch (err: any) {
      console.error("Translation error:", err);
      setError(err.message || "Failed to connect to translation service");
      setEnglishText("");
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!englishText.trim()) return;

    setIsPlayingAudio(true);

    try {
      const response = await fetch(`${BASE_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: englishText, lang: "en" }),
      });

      if (!response.ok) throw new Error("Audio generation failed");

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play();
    } catch (err) {
      console.error("TTS error:", err);
      alert("Failed to play audio");
      setIsPlayingAudio(false);
    }
  };

  const copyToClipboard = async () => {
    if (!englishText.trim()) return;
    
    await navigator.clipboard.writeText(englishText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setMalayalamText("");
    setEnglishText("");
    setError(null);
  };

  return (
    <div className="min-h-screen pt-16 pb-12 px-4 overflow-x-hidden w-full max-w-[100vw] relative">
      {/* Background Glow */}
      <div className="hero-glow -top-40 -right-40 animate-glow-pulse" />
      <div className="hero-glow -bottom-40 -left-40 animate-glow-pulse" style={{animationDelay: "1.5s"}} />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Simplified Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-3">
            Translation
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Malayalam to English
          </p>
        </div>

        {/* Unified Translation Container */}
        <div className="bg-card rounded-3xl border border-border shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 ease-out overflow-hidden animate-slide-up group glass-card depth-shift">
          
          {/* Malayalam Input Section */}
          <div className="border-b border-border">
            <div className="p-4 bg-muted/20 backdrop-blur-sm border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center liquid-glow">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-sm text-foreground">Malayalam</h3>
                </div>
              </div>
            </div>

            <div className="p-6">
              <textarea
                value={malayalamText}
                onChange={(e) => setMalayalamText(e.target.value)}
                placeholder="നിങ്ങളുടെ മലയാളം വാചകം ഇവിടെ നൽകുക..."
                className="w-full bg-transparent border-none resize-none focus:ring-0 text-lg leading-relaxed text-foreground font-malayalam placeholder:text-muted-foreground/50 focus:placeholder:text-muted-foreground/30 transition-all duration-200 min-h-[120px] focus-visible:outline-none"
              />
              
              {/* Malayalam Keyboard - Compact */}
              <div className="border-t border-border/50 pt-4 mt-2 glass-elevated backdrop-blur-md rounded-lg p-2">
                <MalayalamKeyboard 
                  onChange={setMalayalamText} 
                  inputName="malayalamTranslationInput" 
                  inputValue={malayalamText} 
                />
              </div>
            </div>
          </div>

          {/* Translation Action Bar */}
          <div className="px-6 py-3 bg-muted/10 backdrop-blur-sm border-y border-border/50 flex items-center justify-between">
            <div className="flex-1" />
            <Button
              onClick={handleTranslate}
              disabled={isTranslating || !malayalamText.trim()}
              size="sm"
              className="relative overflow-hidden group gap-2 rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all duration-300 ease-out disabled:opacity-50 disabled:hover:scale-100 glass-button liquid-glow elevation-lift"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
              <span className="relative flex items-center gap-2">
                <Languages className="w-4 h-4" />
                {isTranslating ? "Translating..." : "Translate"}
              </span>
            </Button>
            <div className="flex-1 flex justify-end">
              <Button
                onClick={handleReset}
                variant="ghost"
                size="sm"
                className="gap-2 rounded-xl hover:scale-105 active:scale-95 transition-all duration-200 ease-out glass-button"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* English Output Section */}
          <div>
            <div className="p-4 bg-muted/20 backdrop-blur-sm border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/80 flex items-center justify-center liquid-glow">
                    <Languages className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-sm text-foreground">English</h3>
                </div>
                
                {/* TTS and Copy Buttons */}
                {englishText && !isTranslating && (
                  <div className="flex gap-2 animate-fade-in">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handlePlayAudio} 
                      disabled={isPlayingAudio}
                      className="gap-2 rounded-xl hover:scale-105 hover:bg-muted/50 active:scale-95 transition-all duration-200 ease-out glass-button elevation-lift"
                    >
                      {isPlayingAudio ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={copyToClipboard}
                      className="gap-2 rounded-xl hover:scale-105 hover:bg-muted/50 active:scale-95 transition-all duration-200 ease-out glass-button elevation-lift"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500 scale-110" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 min-h-[200px] flex items-center justify-center">
              {isTranslating ? (
                <Loader message="Translating..." size="md" />
              ) : error ? (
                <div className="flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">Translation Error</h3>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
              ) : englishText ? (
                <div className="w-full animate-fade-in">
                  <p className="text-lg leading-relaxed text-foreground whitespace-pre-wrap">
                    {englishText}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                  <ArrowRight className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Translation will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
