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
  const [isVisible, setIsVisible] = useState(true); // Default to visible to test
  const keyboard = useRef<any>(null);

  // Sync the external text (OCR output) with the keyboard's internal memory
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

  // Custom Malayalam Layout (Inscript Standard)
  // Added '◌' to vowels so they render visibly on the keys
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
          /* FORCE BLACK TEXT ON KEYS */
          .hg-button {
            color: #000000 !important;
            font-family: 'Arial', sans-serif; /* Ensure font supports unicode */
            font-size: 1.2rem;
            font-weight: bold;
          }
          /* Fix Diacritic rendering issues */
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
                {isVisible ? "Hide Keyboard" : "Malayalam Keyboard"}
            </Button>
        </div>

        {/* The Keyboard */}
        {isVisible && (
            <div className="border rounded-xl p-2 bg-gray-100 shadow-lg animate-in fade-in slide-in-from-bottom-4">
                <Keyboard
                    keyboardRef={(r) => (keyboard.current = r)}
                    layoutName={layoutName}
                    layout={malayalamLayout}
                    onChange={(input) => {
                        onChange(input); // Send new text back to parent
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