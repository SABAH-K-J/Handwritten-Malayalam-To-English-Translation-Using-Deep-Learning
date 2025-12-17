import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ScanText, Languages } from "lucide-react";

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Section */}
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="mb-3 sm:mb-4 px-4">
          Malayalam Handwriting Recognition & Translation
        </h1>
        <p className="text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
          Scan handwritten Malayalam text and translate it instantly. Powered
          by advanced OCR and translation technology.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center px-4">
          <Button
            size="lg"
            onClick={() => navigate("/scanner")}
            className="w-full sm:w-auto"
          >
            Start Scanning
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/translation")}
            className="w-full sm:w-auto"
          >
            Translate Text
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto mb-12 sm:mb-16">
        <div className="bg-card rounded-lg border border-border p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow hover:border-primary/50">
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
            <ScanText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <h3 className="mb-2">OCR Scanning</h3>
          <p className="text-muted-foreground">
            Upload images of handwritten Malayalam text and get accurate
            character recognition with bounding box detection.
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow hover:border-primary/50">
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
            <Languages className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <h3 className="mb-2">Malayalam → English Translation</h3>
          <p className="text-muted-foreground">
            Translate Malayalam text to English with high accuracy. Works with
            both typed and scanned text.
          </p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-card/50 rounded-lg border border-primary/20 p-6 sm:p-8 text-center max-w-4xl mx-auto">
        <h2 className="mb-2 sm:mb-3">How It Works</h2>
        <p className="text-muted-foreground">
          Simply upload an image of handwritten Malayalam text. Our OCR engine
          will detect and extract individual words with bounding boxes. Then,
          our translation model converts the Malayalam text to English. All
          processing happens instantly with visual feedback.
        </p>
      </div>
    </div>
  );
}