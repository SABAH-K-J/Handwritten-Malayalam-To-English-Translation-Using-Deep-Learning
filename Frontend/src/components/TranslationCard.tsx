import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ArrowRight } from "lucide-react";

interface TranslationCardProps {
  title: string;
  inputLabel: string;
  outputLabel: string;
  placeholder?: string;
}

export function TranslationCard({
  title,
  inputLabel,
  outputLabel,
  placeholder = "Enter text here...",
}: TranslationCardProps) {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");

  const handleTranslate = () => {
    // Mock translation
    setOutputText(
      `[Translated from ${inputLabel}] ${inputText || "No text to translate"}`
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 sm:p-6 shadow-lg">
      <h3 className="mb-4 sm:mb-6">{title}</h3>
      <div className="space-y-4">
        <div>
          <label className="block mb-2 text-sm sm:text-base">{inputLabel}</label>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={placeholder}
            className="min-h-[100px] sm:min-h-[120px] resize-none bg-input-background text-sm sm:text-base"
          />
        </div>

        <div className="flex justify-center">
          <Button onClick={handleTranslate} className="gap-2 w-full sm:w-auto">
            Translate
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {outputText && (
          <div className="border-t border-border pt-4">
            <label className="block mb-2 text-sm sm:text-base">{outputLabel}</label>
            <div className="bg-secondary/50 rounded-lg p-3 sm:p-4 min-h-[100px] sm:min-h-[120px] border border-border">
              <p className="text-sm sm:text-base">{outputText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}