import { useState } from "react";
import { UploadCard } from "@/components/UploadCard";
import { CameraCapture } from "@/components/CameraCapture";
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
  Zap
} from "lucide-react";

type TabType = "corrected" | "translation" | "raw";

export default function Scanner() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [copied, setCopied] = useState(false);

  const [rawText, setRawText] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [translation, setTranslation] = useState("");

  const [activeTab, setActiveTab] = useState<TabType>("corrected");

  const processImage = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsLoading(true);
    setRawText("");
    setCorrectedText("");
    setTranslation("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("https://embedded-gas-paradise-missile.trycloudflare.com/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.status === "success") {
        setRawText(data.raw_text || "No raw text found.");
        setCorrectedText(data.corrected_text || "No text detected.");
        setTranslation(data.translation || "Translation failed.");
        setActiveTab("corrected");
      } else {
        setCorrectedText("Error: " + data.message);
      }
    } catch (error) {
      console.error("OCR Failed:", error);
      setCorrectedText("Failed to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleCameraCapture = (file: File) => {
    setShowCamera(false);
    processImage(file);
  };

  const resetScanner = () => {
    setUploadedImage(null);
    setRawText("");
    setCorrectedText("");
    setTranslation("");
  };

  const getCurrentText = () => {
    switch (activeTab) {
      case "corrected": return correctedText;
      case "translation": return translation;
      case "raw": return rawText;
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(getCurrentText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: "corrected" as const, label: "Corrected", sublabel: "Malayalam", icon: FileText },
    { id: "translation" as const, label: "Translation", sublabel: "English", icon: Languages },
    { id: "raw" as const, label: "Raw OCR", sublabel: "Unprocessed", icon: ScanText },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 bg-background">
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!uploadedImage ? (
          /* Upload State */
          <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center">
            <div className="w-full max-w-3xl">
              {/* Header */}
              <div className="text-center mb-12 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
                  <Zap className="w-3.5 h-3.5" />
                  Ready to Scan
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
                  Upload Your Document
                </h1>
                <p className="text-muted-foreground text-lg">
                  Drop an image or use your camera to capture Malayalam text
                </p>
              </div>

              {/* Upload Options */}
              <div className="grid md:grid-cols-2 gap-6 animate-slide-up">
                {/* File Upload */}
                <label className="group relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="h-64 rounded-3xl border-2 border-dashed border-border bg-card hover:border-primary/50 hover:bg-accent/20 transition-all duration-300 flex flex-col items-center justify-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-lg text-foreground mb-1">
                      Upload File
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Drag & drop or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG up to 10MB
                    </p>
                  </div>
                </label>

                {/* Camera Capture */}
                <button
                  onClick={() => setShowCamera(true)}
                  className="group h-64 rounded-3xl border-2 border-dashed border-border bg-card hover:border-primary/50 hover:bg-accent/20 transition-all duration-300 flex flex-col items-center justify-center p-8"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-1">
                    Use Camera
                  </h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Take a photo directly
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Requires camera permission
                  </p>
                </button>
              </div>

              {/* Features */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "200ms" }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>AI Spell Check</span>
                </div>
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-primary" />
                  <span>English Translation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Instant Results</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Results State */
          <div className="animate-fade-in">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={resetScanner}
              className="mb-6 gap-2 text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              New Scan
            </Button>

            <div className="grid lg:grid-cols-5 gap-8">
              {/* Image Preview - 2 columns */}
              <div className="lg:col-span-2">
                <div className="sticky top-24">
                  <div className="bg-card rounded-3xl border border-border shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-display font-semibold text-sm text-foreground">Input Document</h3>
                          <p className="text-xs text-muted-foreground">Original image</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-muted/10">
                      <img
                        src={uploadedImage}
                        alt="Uploaded document"
                        className="w-full h-auto rounded-2xl object-contain max-h-[60vh]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Results - 3 columns */}
              <div className="lg:col-span-3 space-y-6">
                {/* Tab Selector */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 flex items-center gap-3 px-5 py-4 rounded-2xl border-2 transition-all duration-200 ${
                        activeTab === tab.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-primary/30 hover:bg-accent/20"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <tab.icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className={`font-semibold text-sm ${activeTab === tab.id ? "text-foreground" : "text-muted-foreground"}`}>
                          {tab.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{tab.sublabel}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Content Card */}
                <div className="bg-card rounded-3xl border border-border shadow-lg overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        {activeTab === "corrected" && <FileText className="w-4 h-4 text-primary" />}
                        {activeTab === "translation" && <Languages className="w-4 h-4 text-primary" />}
                        {activeTab === "raw" && <ScanText className="w-4 h-4 text-primary" />}
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-sm text-foreground">
                          {activeTab === "corrected" && "Corrected Malayalam"}
                          {activeTab === "translation" && "English Translation"}
                          {activeTab === "raw" && "Raw OCR Output"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {activeTab === "corrected" && "Spell-checked text"}
                          {activeTab === "translation" && "Translated to English"}
                          {activeTab === "raw" && "Direct OCR result"}
                        </p>
                      </div>
                    </div>
                    {correctedText && !isLoading && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="gap-2 rounded-xl"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-green-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="p-6 min-h-[300px]">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center h-64 space-y-6">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-4 border-muted animate-spin border-t-primary" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="font-display font-semibold text-foreground mb-1">Processing your document</p>
                          <p className="text-sm text-muted-foreground">
                            Running OCR, spell check & translation...
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    ) : correctedText ? (
                      <p className={`text-lg leading-relaxed text-foreground whitespace-pre-wrap ${
                        activeTab !== "translation" ? "font-malayalam" : ""
                      }`}>
                        {getCurrentText()}
                      </p>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <p className="italic">Waiting for server response...</p>
                      </div>
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
