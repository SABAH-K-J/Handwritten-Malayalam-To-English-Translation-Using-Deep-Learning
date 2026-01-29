import { useEffect, useRef, useState } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { Button } from "@/components/ui/button";
import { Keyboard as KeyboardIcon, X } from "lucide-react";

interface MalayalamKeyboardProps {
  onChange: (input: string) => void;
  inputName?: string;
  inputValue: string;
}

export function MalayalamKeyboard({ onChange, inputName, inputValue }: MalayalamKeyboardProps) {
  const [layoutName, setLayoutName] = useState("default");
  const [isVisible, setIsVisible] = useState(false);
  
  const keyboard = useRef<any>(null);

  // 1. Sync external text (OCR output) when it changes while keyboard is open
  useEffect(() => {
    if (keyboard.current) {
      keyboard.current.setInput(inputValue);
    }
  }, [inputValue]);

  const onKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{default}") {
      setLayoutName(layoutName === "default" ? "shift" : "default");
    }
  };

  const malayalamLayout = {
    default: [
      "ൊ ോ ൌ ാ ി ീ ു ൂ ൃ െ േ ൈ",
      "് അ ആ ഇ ഈ ഉ ഊ ഋ ഌ എ ഏ",
      "ഐ ഒ ഓ ഔ ക ഖ ഗ ഘ ങ ച ഛ",
      "ജ ഝ ഞ ട ഠ ഡ ഢ ണ ത ഥ ദ",
      "ധ ന പ ഫ ബ ഭ മ യ ര റ",
      "ല ള ഴ വ ശ ഷ സ ഹ ള ഴ റ",
      "{shift} {space} {bksp}"
    ],
    shift: [
      "ൃ ൄ ൌ ാ ി ീ ു ൂ ൃ െ േ ൈ",
      "് അ ആ ഇ ഈ ഉ ഊ ഋ ൠ എ ഏ",
      "ഐ ഒ ഓ ഔ ക ഖ ഗ ഘ ങ ച ഛ",
      "ജ ഝ ഞ ട ഠ ഡ ഢ ണ ത ഥ ദ",
      "ധ ന പ ഫ ബ ഭ മ യ ര റ",
      "ല ള ഴ വ ശ ഷ സ ഹ ള ഴ റ",
      "{default} {space} {bksp}"
    ]
  };

  return (
    <div className="relative">
        <style>{`
          .hg-theme-default {
            background-color: transparent !important;
            padding: 5px;
          }
          .hg-button {
            background-color: hsl(var(--card)) !important;
            border-bottom: 3px solid hsl(var(--border)) !important;
            color: hsl(var(--foreground)) !important;
            font-family: 'Arial', sans-serif;
            font-size: 1.1rem;
            font-weight: 500;
            transition: all 0.1s ease;
          }
          .hg-button:active {
            transform: translateY(2px);
            border-bottom: 1px solid hsl(var(--border)) !important;
            background-color: hsl(var(--accent)) !important;
          }
          .hg-functionBtn {
            background-color: hsl(var(--muted)) !important;
            color: hsl(var(--muted-foreground)) !important;
          }
          .hg-button span {
             pointer-events: none;
          }
        `}</style>

        {/* Toggle Button */}
        <div className="flex justify-end mb-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsVisible(!isVisible)}
                className={isVisible ? "bg-primary/10" : ""}
            >
                {isVisible ? <X className="w-4 h-4 mr-2" /> : <KeyboardIcon className="w-4 h-4 mr-2" />}
                {isVisible ? "Hide Keyboard" : "Show Malayalam Keyboard"}
            </Button>
        </div>

        {/* The Keyboard */}
        {isVisible && (
            <div className="border rounded-xl p-2 bg-muted/30 shadow-lg animate-in fade-in slide-in-from-bottom-4">
                <Keyboard
                    keyboardRef={(r) => {
                        keyboard.current = r;
                        // CRITICAL FIX: Force sync immediately when the keyboard mounts
                        if (r && inputValue) {
                            r.setInput(inputValue);
                        }
                    }}
                    layoutName={layoutName}
                    layout={malayalamLayout}
                    onChange={(input) => {
                        onChange(input);
                    }}
                    onKeyPress={onKeyPress}
                    inputName={inputName}
                    display={{
                        "{bksp}": "⌫",
                        "{space}": "Space",
                        "{shift}": "⇧ Shift",
                        "{default}": "⇩ Normal"
                    }}
                    theme={"hg-theme-default"}
                />
            </div>
        )}
    </div>
  );
}