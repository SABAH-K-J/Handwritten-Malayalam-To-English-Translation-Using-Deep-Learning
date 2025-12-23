import { useState } from "react";
import { UploadCard } from "../components/UploadCard";
import { Button } from "../components/ui/button";
import { Loader2, Copy, Languages, ScanText, FileText } from "lucide-react"; 
// Make sure you have installed these icons: npm install lucide-react

export function MalayalamScanner() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // New State for the 3 outputs
  const [rawText, setRawText] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [translation, setTranslation] = useState("");
  
  // State to toggle between tabs
  const [activeTab, setActiveTab] = useState<"corrected" | "translation" | "raw">("corrected");

  const handleUpload = async (file: File) => {
    // 1. Show Image Preview
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);

    // 2. Prepare for API Call
    setIsLoading(true);
    setRawText("");
    setCorrectedText("");
    setTranslation("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("https://confidential-produced-near-hereby.trycloudflare.com/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      // 3. Handle New Backend Response Format
      if (data.status === "success") {
        setRawText(data.raw_text || "No raw text found.");
        setCorrectedText(data.corrected_text || "No text detected.");
        setTranslation(data.translation || "Translation failed.");
        
        // Default to showing the corrected text first
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

  const copyToClipboard = () => {
    let textToCopy = "";
    if (activeTab === "corrected") textToCopy = correctedText;
    else if (activeTab === "translation") textToCopy = translation;
    else textToCopy = rawText;

    navigator.clipboard.writeText(textToCopy);
    alert("Copied to clipboard!");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Malayalam OCR Scanner</h1>
        <p className="text-muted-foreground">
          Upload handwritten Malayalam to digitize & translate instantly
        </p>
      </div>

      {!uploadedImage ? (
        <UploadCard
          onUpload={handleUpload}
          title="Upload Image"
          description="Supports JPG, PNG"
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Left Column: Image Preview */}
          <div className="flex flex-col gap-4">
            <div className="bg-muted/30 rounded-xl border border-border p-4 shadow-sm">
              <h3 className="font-semibold mb-3">Input Image</h3>
              <div className="rounded-lg overflow-hidden border bg-white">
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="w-full h-auto object-contain max-h-[500px]"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setUploadedImage(null);
                setRawText("");
                setCorrectedText("");
                setTranslation("");
              }}
              className="text-primary hover:underline text-sm self-start"
            >
              ← Upload a different image
            </button>
          </div>

          {/* Right Column: Results with Tabs */}
          <div className="flex flex-col h-full">
            <div className="bg-card rounded-xl border border-border shadow-lg flex-1 flex flex-col h-full min-h-[400px]">
              
              {/* Header with Tabs */}
              <div className="p-2 border-b border-border bg-muted/20 flex flex-wrap gap-2">
                 <Button 
                   variant={activeTab === "corrected" ? "default" : "ghost"} 
                   size="sm" 
                   onClick={() => setActiveTab("corrected")}
                   className="gap-2"
                 >
                   <FileText className="w-4 h-4" /> Corrected
                 </Button>
                 
                 <Button 
                   variant={activeTab === "translation" ? "default" : "ghost"} 
                   size="sm" 
                   onClick={() => setActiveTab("translation")}
                   className="gap-2"
                 >
                   <Languages className="w-4 h-4" /> English
                 </Button>

                 <Button 
                   variant={activeTab === "raw" ? "default" : "ghost"} 
                   size="sm" 
                   onClick={() => setActiveTab("raw")}
                   className="gap-2"
                 >
                   <ScanText className="w-4 h-4" /> Raw OCR
                 </Button>

                 {/* Spacer */}
                 <div className="flex-1" />

                 {/* Copy Button */}
                 {correctedText && !isLoading && (
                   <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
                     <Copy className="w-4 h-4" /> Copy
                   </Button>
                 )}
              </div>

              {/* Text Output Area */}
              <div className="p-6 flex-1 bg-white/50 relative">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p>Processing image...</p>
                    <p className="text-xs text-muted-foreground">Running OCR, Spell Check & Translation</p>
                  </div>
                ) : correctedText ? (
                  <div className="animate-in fade-in duration-300">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      {activeTab === "corrected" && "Malayalam (Corrected)"}
                      {activeTab === "translation" && "English Translation"}
                      {activeTab === "raw" && "Raw OCR Output"}
                    </h4>
                    
                    <p className="text-lg leading-relaxed text-foreground font-medium whitespace-pre-wrap">
                      {activeTab === "corrected" && correctedText}
                      {activeTab === "translation" && translation}
                      {activeTab === "raw" && rawText}
                    </p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic">
                    Waiting for server response...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}