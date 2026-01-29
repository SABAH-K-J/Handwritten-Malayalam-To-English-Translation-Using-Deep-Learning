import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture"; 
import { MalayalamKeyboard } from "@/components/MalayalamKeyboard";
import { CropEditor } from "@/components/CropEditor"; 
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  Languages, 
  ScanText, 
  Copy, 
  Check,
  Upload,
  Zap,
  AlertCircle,
  Download,
  RefreshCw,
  Volume2,
  Loader2
} from "lucide-react";

type TabType = "corrected" | "translation" | "raw";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Scanner() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // State to show the straightened/cropped result in the UI
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
    setPreviewImage(null); // Reset preview
    
    const reader = new FileReader();
    reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setShowCropper(true);
    };
    reader.readAsDataURL(file);

    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${BASE_URL}/detect-corners`, { method: "POST", body: formData });
        if (response.ok) {
            const data = await response.json();
            setInitialCropPoints(data.points);
        }
    } catch (e) {
        console.warn("Auto-detect failed", e);
    }
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
  // Updated: Now accepts the processed BLOB and the Preview URL from CropEditor
  const processImage = async (processedBlob: Blob, previewUrl: string) => {
    
    setShowCropper(false);
    
    // 1. Update UI to show the straightened image
    setPreviewImage(previewUrl);

    setIsLoading(true);
    setErrorMsg(null);
    setRawText("");
    setCorrectedText("");
    setTranslation("");

    // 2. Send the PROCESSED image to backend
    // Note: We don't need to send points anymore because the image is already cropped/warped
    const formData = new FormData();
    formData.append("file", processedBlob, "scanned_doc.jpg"); 

    try {
      const response = await fetch(`${BASE_URL}/predict`, { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || `Server Error: ${response.status}`);

      setRawText(data.original_text || "No text found.");
      setCorrectedText(data.corrected_text || "");
      setTranslation(data.translated_text || "");
      
      setActiveTab("corrected");

    } catch (error: any) {
      console.error("OCR Failed:", error);
      setErrorMsg(error.message || "Failed to connect to backend.");
      setCorrectedText("Could not process document.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. Features (Translate, PDF, Audio) ---
  const handleRetranslate = async () => {
    if (!correctedText.trim()) return;
    setIsRetranslating(true);
    try {
      const response = await fetch(`${BASE_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // --- UI Helpers ---
  const resetScanner = () => {
    setUploadedImage(null); 
    setPreviewImage(null);
    setTempFile(null); 
    setErrorMsg(null);
    setRawText(""); setCorrectedText(""); setTranslation("");
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
    <div className="min-h-screen pt-20 pb-12 bg-background">
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
      
      {showCropper && uploadedImage && (
        <CropEditor 
          imageSrc={uploadedImage} 
          initialPoints={initialCropPoints} 
          onConfirm={processImage} 
          onCancel={() => { setShowCropper(false); setUploadedImage(null); }} 
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!uploadedImage || showCropper ? (
            /* --- UPLOAD SCREEN --- */
            <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center">
             <div className="w-full max-w-3xl">
               <div className="text-center mb-12 animate-fade-in">
                 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-6"><Zap className="w-3.5 h-3.5" /> Ready to Scan</div>
                 <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">Upload Your Document</h1>
                 <p className="text-muted-foreground text-lg">Drop an image or use your camera to capture Malayalam text</p>
               </div>
               <div className="grid md:grid-cols-2 gap-6 animate-slide-up">
                 <label className="group relative cursor-pointer">
                   <input type="file" accept="image/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                   <div className="h-64 rounded-3xl border-2 border-dashed border-border bg-card hover:border-primary/50 hover:bg-accent/20 transition-all duration-300 flex flex-col items-center justify-center p-8">
                     <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20"><Upload className="w-8 h-8 text-primary" /></div>
                     <h3 className="font-display font-semibold text-lg text-foreground mb-1">Upload File</h3>
                     <p className="text-sm text-muted-foreground text-center">Drag & drop or click to browse</p>
                   </div>
                 </label>
                 <button onClick={() => setShowCamera(true)} className="group h-64 rounded-3xl border-2 border-dashed border-border bg-card hover:border-primary/50 hover:bg-accent/20 transition-all duration-300 flex flex-col items-center justify-center p-8">
                   <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20"><Camera className="w-8 h-8 text-primary" /></div>
                   <h3 className="font-display font-semibold text-lg text-foreground mb-1">Use Camera</h3>
                   <p className="text-sm text-muted-foreground text-center">Take a photo directly</p>
                 </button>
               </div>
             </div>
           </div>
        ) : (
          /* --- RESULTS SCREEN --- */
          <div className="animate-fade-in">
            <Button variant="ghost" onClick={resetScanner} className="mb-6 gap-2 text-muted-foreground hover:text-foreground -ml-2"><ArrowLeft className="w-4 h-4" /> New Scan</Button>
            <div className="grid lg:grid-cols-5 gap-8">
              
              {/* LEFT COLUMN: IMAGE PREVIEW */}
              <div className="lg:col-span-2">
                <div className="sticky top-24">
                  <div className="bg-card rounded-3xl border border-border shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-4 h-4 text-primary" /></div>
                        <div>
                            <h3 className="font-display font-semibold text-sm text-foreground">Input Document</h3>
                            <p className="text-xs text-muted-foreground">{previewImage ? "Straightened Scan" : "Original Image"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-muted/10">
                        {/* Displays the straightened preview if available */}
                        <img 
                            src={previewImage || uploadedImage || ""} 
                            alt="Document" 
                            className="w-full h-auto rounded-2xl object-contain max-h-[60vh]" 
                        />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: TEXT OUTPUT */}
              <div className="lg:col-span-3 space-y-6">
                 
                 {/* Tabs */}
                 <div className="flex gap-3 overflow-x-auto pb-2">
                   {tabs.map((tab) => (
                     <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-shrink-0 flex items-center gap-3 px-5 py-4 rounded-2xl border-2 transition-all duration-200 ${activeTab === tab.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"}`}>
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><tab.icon className="w-5 h-5" /></div>
                       <div className="text-left"><p className={`font-semibold text-sm ${activeTab === tab.id ? "text-foreground" : "text-muted-foreground"}`}>{tab.label}</p><p className="text-xs text-muted-foreground">{tab.sublabel}</p></div>
                     </button>
                   ))}
                 </div>

                 {/* Output Area */}
                 <div className="bg-card rounded-3xl border border-border shadow-lg overflow-hidden flex flex-col">
                   <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
                     <div className="flex items-center gap-3"><h3 className="font-display font-semibold text-sm text-foreground">{tabs.find(t => t.id === activeTab)?.label}</h3></div>
                     <div className="flex gap-2">
                         {(activeTab === "corrected" || activeTab === "translation") && !isLoading && !errorMsg && (
                           <Button variant="outline" size="sm" onClick={handlePlayAudio} disabled={isPlayingAudio} className="gap-2 rounded-xl">
                             {isPlayingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                             {isPlayingAudio ? "Playing..." : "Read"}
                           </Button>
                         )}
                         {activeTab === "corrected" && !isLoading && !errorMsg && (
                           <Button variant="outline" size="sm" onClick={handleRetranslate} disabled={isRetranslating} className="gap-2 rounded-xl border-primary/20 text-primary hover:bg-primary/5">
                             <RefreshCw className={`w-4 h-4 ${isRetranslating ? 'animate-spin' : ''}`} /> Update
                           </Button>
                         )}
                         {activeTab === "translation" && !isLoading && !errorMsg && (
                           <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isDownloading} className="gap-2 rounded-xl">
                             {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
                           </Button>
                         )}
                         {!isLoading && !errorMsg && getCurrentText() && (
                         <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2 rounded-xl">
                             {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                         </Button>
                         )}
                     </div>
                   </div>
                   
                   <div className="flex-1 min-h-[400px] flex flex-col relative">
                     {isLoading ? (
                       <div className="flex flex-col items-center justify-center h-64 space-y-6 m-auto">
                         <div className="relative"><div className="w-16 h-16 rounded-full border-4 border-muted animate-spin border-t-primary" /><div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-6 h-6 text-primary animate-pulse" /></div></div>
                         <p className="font-display font-semibold text-foreground mb-1">Processing...</p>
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
                           className={`w-full flex-1 p-6 bg-transparent border-none resize-none focus:ring-0 text-lg leading-relaxed text-foreground ${activeTab !== "translation" ? "font-malayalam" : ""}`}
                           value={activeTab === "corrected" ? correctedText : activeTab === "translation" ? translation : rawText}
                           onChange={(e) => {
                             if (activeTab === "corrected") setCorrectedText(e.target.value);
                             if (activeTab === "translation") setTranslation(e.target.value);
                           }}
                           placeholder="No text detected."
                         />
                         {activeTab === "corrected" && (
                           <div className="border-t border-border bg-muted/10 p-4 animate-in slide-in-from-bottom-2">
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
  );
}