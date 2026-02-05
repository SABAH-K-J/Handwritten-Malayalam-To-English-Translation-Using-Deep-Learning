import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture"; 
import { MalayalamKeyboard } from "@/components/MalayalamKeyboard";
import { CropEditor } from "@/components/CropEditor";
import { Loader } from "@/components/Loader"; 
import { Button } from "@/components/ui/button";
import { 
  Camera, ArrowLeft, Sparkles, FileText, Languages, 
  ScanText, Copy, Check, Upload, Zap, AlertCircle, 
  Download, RefreshCw, Volume2, Loader2, Shield
} from "lucide-react";

type TabType = "corrected" | "translation" | "raw";

const BASE_URL = import.meta.env.VITE_API_URL || "https://researchers-pts-slides-instructors.trycloudflare.com";

export default function Scanner() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [tempFile, setTempFile] = useState<File | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCropper, setShowCropper] = useState(false); 
  const [showCamera, setShowCamera] = useState(false);
  
  const [isDownloading, setIsDownloading] = useState(false); 
  const [isRetranslating, setIsRetranslating] = useState(false); 
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);

  const [rawText, setRawText] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [translation, setTranslation] = useState("");
  const [initialCropPoints, setInitialCropPoints] = useState<number[][] | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("corrected");

  // --- 1. START CROP FLOW ---
  const startCropFlow = async (file: File) => {
    setTempFile(file);
    setInitialCropPoints(undefined);
    setPreviewImage(null); 
    
    const reader = new FileReader();
    reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setShowCropper(true);
    };
    reader.readAsDataURL(file);

    try {
        const formData = new FormData();
        formData.append("file", file);
        fetch(`${BASE_URL}/detect-corners`, { method: "POST", body: formData })
          .then(res => res.json())
          .then(data => { if(data.points) setInitialCropPoints(data.points); })
          .catch(e => console.warn("Auto-detect failed", e));
    } catch (e) {}
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) startCropFlow(file);
  };

  const handleCameraCapture = (file: File) => {
    setShowCamera(false);
    startCropFlow(file);
  };

  // --- 2. MAIN PROCESS ---
  const processImage = async (fileBlob: Blob, previewUrl: string, points?: number[][]) => {
    setShowCropper(false);
    setPreviewImage(previewUrl);
    setIsLoading(true);
    setErrorMsg(null);
    setRawText("");
    setCorrectedText("");
    setTranslation("");

    const formData = new FormData();
    formData.append("file", fileBlob, "original_image.jpg"); 
    if (points) formData.append("crop_points", JSON.stringify(points));

    try {
      const response = await fetch(`${BASE_URL}/predict`, { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || `Server Error: ${response.status}`);

      setRawText(data.original_text || "No text found.");
      setCorrectedText(data.corrected_text || "");
      setTranslation(data.translated_text || "");
      
      if (data.processed_image) {
         setPreviewImage(`data:image/jpeg;base64,${data.processed_image}`);
      }
      setActiveTab("corrected");
    } catch (error: any) {
      console.error("OCR Failed:", error);
      setErrorMsg(error.message || "Failed to connect to backend.");
      setCorrectedText("Could not process document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetranslate = async () => {
    if (!correctedText.trim()) return;
    setIsRetranslating(true);
    try {
      const response = await fetch(`${BASE_URL}/translate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: correctedText }), 
      });
      const data = await response.json();
      if (!response.ok) throw new Error("Translation Failed");
      setTranslation(data.translation);
      setActiveTab("translation"); 
    } catch (error) { alert("Failed to update translation."); } 
    finally { setIsRetranslating(false); }
  };

  const handleDownloadPDF = async () => {
    if (!translation) return;
    setIsDownloading(true);
    try {
      const response = await fetch(`${BASE_URL}/generate-pdf`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: translation }),
      });
      if (!response.ok) throw new Error("PDF Failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "translated_document.pdf";
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (error) { alert("Failed to download PDF."); } 
    finally { setIsDownloading(false); }
  };

  const handlePlayAudio = async () => {
    const textToRead = activeTab === "translation" ? translation : correctedText;
    const langCode = activeTab === "translation" ? "en" : "ml";
    if (!textToRead?.trim()) return;
    setIsPlayingAudio(true);
    try {
      const response = await fetch(`${BASE_URL}/tts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToRead, lang: langCode }),
      });
      if (!response.ok) throw new Error("Audio generation failed");
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlayingAudio(false);
      audio.play();
    } catch (error) { alert("Failed to play audio."); setIsPlayingAudio(false); }
  };

  const resetScanner = () => {
    setUploadedImage(null); setPreviewImage(null); setTempFile(null); 
    setErrorMsg(null); setRawText(""); setCorrectedText(""); setTranslation("");
  };

  const getCurrentText = () => {
    switch (activeTab) {
      case "corrected": return correctedText;
      case "translation": return translation;
      case "raw": return rawText;
      default: return "";
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(getCurrentText());
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: "corrected" as const, label: "Corrected", sublabel: "Malayalam", icon: FileText },
    { id: "translation" as const, label: "Translation", sublabel: "English", icon: Languages },
    { id: "raw" as const, label: "Raw OCR", sublabel: "Unprocessed", icon: ScanText },
  ];

  return (
    // FIX 1: overflow-x-hidden ensures no horizontal scrolling
    // FIX 2: min-h-screen ensures full height coverage
    <div className="min-h-screen pt-16 pb-12 px-4 overflow-x-hidden w-full max-w-[100vw] relative">
      {/* Background Glow */}
      <div className="hero-glow -top-40 -right-40" />
      <div className="hero-glow -bottom-40 -left-40" />

      <div className="relative z-10">
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
      
      {showCropper && uploadedImage && (
        <CropEditor 
          imageSrc={uploadedImage} 
          initialPoints={initialCropPoints} 
          onConfirm={processImage} 
          onCancel={() => { setShowCropper(false); setUploadedImage(null); }} 
        />
      )}

      <div className="max-w-7xl mx-auto w-full">
        {!uploadedImage || showCropper ? (
            /* --- UPLOAD SCREEN --- */
            <div className="min-h-[75vh] flex flex-col items-center justify-center relative w-full">
             
             {/* Removed duplicate decorative elements - using global hero-glow instead */}
             
             <div className="w-full max-w-4xl px-4">
               <div className="text-center mb-10 animate-fade-in relative">
                 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 text-primary text-sm font-semibold mb-6 shadow-sm backdrop-blur-sm">
                    <Sparkles className="w-4 h-4" /> 
                    Ready to digitize
                 </div>
                 <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                   Capture Your Moment
                 </h1>
                 <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                   Transform handwritten Malayalam notes into digital text instantly. <br className="hidden md:block"/>
                   Secure, fast, and accurate.
                 </p>
               </div>
               
               <div className="grid md:grid-cols-2 gap-6 animate-slide-up relative z-10 text-left">
                 {/* Upload Card */}
                 <label className="group relative cursor-pointer w-full">
                   <input type="file" accept="image/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                   <div className="h-64 rounded-3xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 ease-out flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                     {/* Animated background glow */}
                     <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-primary/3 group-hover:to-transparent transition-all duration-500" />
                     
                     <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 group-active:scale-95 transition-all duration-300 ease-out relative z-10">
                        <Upload className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300" />
                     </div>
                     <h3 className="font-display font-bold text-xl text-foreground mb-2 relative z-10">Upload Image</h3>
                     <p className="text-sm text-muted-foreground relative z-10 max-w-[200px] mx-auto">
                        Drag & drop or click to browse files
                     </p>
                     <div className="mt-4 flex gap-2 justify-center opacity-60 relative z-10">
                        <span className="text-[10px] bg-muted px-2 py-1 rounded">JPG</span>
                        <span className="text-[10px] bg-muted px-2 py-1 rounded">PNG</span>
                        <span className="text-[10px] bg-muted px-2 py-1 rounded">HEIC</span>
                     </div>
                   </div>
                 </label>

                 {/* Camera Card */}
                 <button onClick={() => setShowCamera(true)} className="group h-64 w-full rounded-3xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 ease-out flex flex-col items-center justify-center p-8 relative overflow-hidden">
                   {/* Animated background glow */}
                   <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-primary/3 group-hover:to-transparent transition-all duration-500" />
                   
                   <div className="w-20 h-20 rounded-2xl bg-secondary/80 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 group-active:scale-95 transition-all duration-300 ease-out relative z-10">
                     <Camera className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300" />
                   </div>
                   <h3 className="font-display font-bold text-xl text-foreground mb-2 relative z-10">Use Camera</h3>
                   <p className="text-sm text-muted-foreground relative z-10 max-w-[200px] mx-auto">
                     Capture directly from your device
                   </p>
                    <div className="mt-4 flex gap-2 justify-center opacity-60 relative z-10">
                        <span className="text-[10px] bg-muted px-2 py-1 rounded">Mobile</span>
                        <span className="text-[10px] bg-muted px-2 py-1 rounded">Webcam</span>
                    </div>
                 </button>
               </div>

                {/* Footer Info */}
               <div className="mt-12 flex justify-center gap-8 text-muted-foreground/60 text-sm animate-fade-in delay-200">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Secure Processing
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Instant OCR
                  </div>
               </div>

             </div>
           </div>
        ) : (
          /* --- RESULTS SCREEN --- */
          <div className="animate-fade-in w-full">
            <Button variant="ghost" onClick={resetScanner} className="mb-4 gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105 active:scale-95 transition-all duration-200 ease-out -ml-2"><ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" /> New Scan</Button>
            
            <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 w-full">
              
              {/* LEFT COLUMN: IMAGE PREVIEW */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-24">
                  <div className="bg-card rounded-3xl border border-border shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 ease-out overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-4 h-4 text-primary" /></div>
                        <div>
                            <h3 className="font-display font-semibold text-sm text-foreground">Input Document</h3>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-muted/10 flex justify-center">
                        <img 
                            src={previewImage || uploadedImage || ""} 
                            alt="Document" 
                            className="w-full h-auto rounded-xl object-contain max-h-[35vh] lg:max-h-[60vh]" 
                        />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: TEXT OUTPUT */}
              <div className="lg:col-span-3 space-y-4 lg:space-y-6 min-w-0"> {/* min-w-0 prevents flex items from overflowing */}
                  
                  {/* Tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-full">
                    {tabs.map((tab) => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-shrink-0 flex items-center gap-2 lg:gap-3 px-4 py-3 rounded-2xl border-2 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] ${activeTab === tab.id ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg"}`}>
                        <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${activeTab === tab.id ? "bg-primary text-primary-foreground scale-105" : "bg-muted text-muted-foreground group-hover:scale-110"}`}><tab.icon className="w-4 h-4 lg:w-5 lg:h-5 transition-transform duration-300" /></div>
                        <div className="text-left"><p className={`font-semibold text-xs lg:text-sm transition-colors duration-200 ${activeTab === tab.id ? "text-foreground" : "text-muted-foreground"}`}>{tab.label}</p></div>
                      </button>
                    ))}
                  </div>

                  {/* Output Area */}
                  <div className="bg-card rounded-3xl border border-border shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 ease-out overflow-hidden flex flex-col w-full">
                    <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0 flex-wrap gap-2">
                      <div className="flex items-center gap-3"><h3 className="font-display font-semibold text-sm text-foreground">{tabs.find(t => t.id === activeTab)?.label}</h3></div>
                      <div className="flex gap-2 ml-auto">
                          {(activeTab === "corrected" || activeTab === "translation") && !isLoading && !errorMsg && (
                            <Button variant="outline" size="sm" onClick={handlePlayAudio} disabled={isPlayingAudio} className="gap-2 rounded-xl h-8 text-xs hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 ease-out">
                              {isPlayingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                              {isPlayingAudio ? "Playing" : "Read"}
                            </Button>
                          )}
                          {activeTab === "corrected" && !isLoading && !errorMsg && (
                            <Button variant="outline" size="sm" onClick={handleRetranslate} disabled={isRetranslating} className="gap-2 rounded-xl h-8 text-xs border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40 hover:scale-105 hover:shadow-md hover:shadow-primary/20 active:scale-95 transition-all duration-200 ease-out">
                              <RefreshCw className={`w-3 h-3 transition-transform duration-300 ${isRetranslating ? 'animate-spin' : 'group-hover:rotate-180'}`} /> Update
                            </Button>
                          )}
                          {!isLoading && !errorMsg && getCurrentText() && (
                          <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2 rounded-xl h-8 hover:scale-105 hover:shadow-md active:scale-95 transition-all duration-200 ease-out">
                              {copied ? <Check className="w-3 h-3 text-green-500 scale-110" /> : <Copy className="w-3 h-3" />}
                          </Button>
                          )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-h-[50vh] lg:min-h-[400px] flex flex-col relative w-full">
                      {isLoading ? (
                        <div className="flex items-center justify-center h-64 m-auto">
                          <Loader message="Processing..." size="lg" />
                        </div>
                      ) : errorMsg ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center p-4 m-auto">
                          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                          <h3 className="text-lg font-semibold text-foreground">Error</h3>
                          <p className="text-muted-foreground">{errorMsg}</p>
                        </div>
                      ) : (
                        <>
                          <textarea
                            // FIX: text-base ensures iOS doesn't auto-zoom (min 16px)
                            className={`w-full flex-1 p-6 bg-transparent border-none resize-none focus:ring-0 text-base lg:text-lg leading-relaxed text-foreground ${activeTab !== "translation" ? "font-malayalam" : ""}`}
                            value={activeTab === "corrected" ? correctedText : activeTab === "translation" ? translation : rawText}
                            onChange={(e) => {
                              if (activeTab === "corrected") setCorrectedText(e.target.value);
                              if (activeTab === "translation") setTranslation(e.target.value);
                            }}
                            placeholder="No text detected."
                          />
                          {activeTab === "corrected" && (
                            <div className="border-t border-border bg-muted/10 p-4 animate-in slide-in-from-bottom-2 sticky bottom-0 z-10">
                              <MalayalamKeyboard onChange={setCorrectedText} inputName="malayalamInput" inputValue={correctedText} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}