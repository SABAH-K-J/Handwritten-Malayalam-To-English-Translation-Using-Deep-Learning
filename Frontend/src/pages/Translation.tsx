import { useState } from "react";
import { TranslationCard } from "../components/TranslationCard";
import { UploadCard } from "../components/UploadCard";
import { Button } from "../components/ui/button";
import { ArrowRight } from "lucide-react";

export function Translation() {
  const [imageUpload, setImageUpload] = useState<string | null>(null);
  const [imageTranslation, setImageTranslation] = useState("");

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUpload(e.target?.result as string);
      // Mock translation
      setTimeout(() => {
        setImageTranslation("Welcome to Malayalam handwriting recognition");
      }, 1000);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-6 sm:mb-8">
        <h1 className="mb-2">Translation</h1>
        <p className="text-muted-foreground">
          Translate Malayalam text to English using text input or image upload
        </p>
      </div>

      {/* Text Translation Card */}
      <div className="mb-6 sm:mb-8">
        <TranslationCard
          title="Text Translation"
          inputLabel="Enter Malayalam text"
          outputLabel="English translation"
          placeholder="Type Malayalam text here..."
        />
      </div>

      {/* Image Translation Card */}
      <div className="bg-card rounded-lg border border-border p-4 sm:p-6 shadow-lg">
        <h3 className="mb-4 sm:mb-6">Image Translation</h3>
        <p className="text-muted-foreground mb-4 sm:mb-6">
          Upload an image with Malayalam text to extract and translate
        </p>

        {!imageUpload ? (
          <UploadCard
            onUpload={handleImageUpload}
            title="Upload Image"
            description="Drop an image with Malayalam text here"
          />
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              {/* Image Preview */}
              <div>
                <label className="block mb-2">Uploaded Image</label>
                <div className="bg-secondary/30 rounded-lg border border-border p-3 sm:p-4">
                  <img
                    src={imageUpload}
                    alt="Uploaded"
                    className="w-full h-auto rounded"
                  />
                </div>
              </div>

              {/* Translation Result */}
              <div>
                <label className="block mb-2">Extracted & Translated Text</label>
                <div className="bg-secondary/50 rounded-lg p-3 sm:p-4 min-h-[200px] flex flex-col justify-center border border-border">
                  {imageTranslation ? (
                    <>
                      <p className="mb-3 sm:mb-4 text-sm sm:text-base">
                        <span className="text-muted-foreground">Malayalam:</span> സ്വാഗതം മലയാളം
                      </p>
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <ArrowRight className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm sm:text-base">
                        <span className="text-muted-foreground">English:</span> {imageTranslation}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground italic">
                      Processing...
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setImageUpload(null);
                setImageTranslation("");
              }}
              className="text-primary hover:underline text-sm"
            >
              Upload a different image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}