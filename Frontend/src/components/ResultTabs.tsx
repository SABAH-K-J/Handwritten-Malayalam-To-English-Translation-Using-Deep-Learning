import { FileText, Languages, ScanText, Copy, Check } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

type TabType = "corrected" | "translation" | "raw";

interface ResultTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  correctedText: string;
  translation: string;
  rawText: string;
  isLoading: boolean;
}

export function ResultTabs({
  activeTab,
  onTabChange,
  correctedText,
  translation,
  rawText,
  isLoading,
}: ResultTabsProps) {
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: "corrected" as const, label: "Corrected", icon: FileText },
    { id: "translation" as const, label: "English", icon: Languages },
    { id: "raw" as const, label: "Raw OCR", icon: ScanText },
  ];

  const getCurrentText = () => {
    switch (activeTab) {
      case "corrected":
        return correctedText;
      case "translation":
        return translation;
      case "raw":
        return rawText;
    }
  };

  const copyToClipboard = async () => {
    const text = getCurrentText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden animate-scale-in">
      {/* Tab Header */}
      <div className="flex items-center gap-1 p-2 bg-muted/50 border-b border-border">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onTabChange(tab.id)}
            className={`gap-2 transition-all duration-200 ${
              activeTab === tab.id ? "shadow-sm" : "hover:bg-accent/50"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Button>
        ))}
        <div className="flex-1" />
        {correctedText && !isLoading && (
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="gap-2 transition-all duration-200"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-6 min-h-[200px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-muted animate-spin border-t-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground font-display">Processing image...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Running OCR, Spell Check & Translation
              </p>
            </div>
          </div>
        ) : correctedText ? (
          <div className="animate-fade-in">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {activeTab === "corrected" && "Malayalam (Corrected)"}
              {activeTab === "translation" && "English Translation"}
              {activeTab === "raw" && "Raw OCR Output"}
            </h4>
            <p
              className={`text-lg leading-relaxed text-foreground whitespace-pre-wrap ${
                activeTab !== "translation" ? "font-malayalam" : ""
              }`}
            >
              {getCurrentText()}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p className="italic">Waiting for server response...</p>
          </div>
        )}
      </div>
    </div>
  );
}
