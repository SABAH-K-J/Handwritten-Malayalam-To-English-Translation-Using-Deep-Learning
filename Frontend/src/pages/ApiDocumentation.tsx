import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, FileText, Upload, Wand2, Globe, Download, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const ApiDocumentation = () => {
  const [hoveredEndpoint, setHoveredEndpoint] = useState<number | null>(null);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  // Process Flow Steps
  const processSteps = [
    {
      icon: Upload,
      title: "Image Upload",
      description: "User uploads handwritten Malayalam document (JPEG/PNG/WebP, max 10MB)"
    },
    {
      icon: Wand2,
      title: "Preprocessing",
      description: "Document corner detection, EXIF rotation handling, and perspective correction"
    },
    {
      icon: FileText,
      title: "Text Detection",
      description: "YOLO v2 model detects and localizes text regions in the document"
    },
    {
      icon: CheckCircle,
      title: "Character Recognition",
      description: "Custom CRNN model recognizes Malayalam characters with intelligent beam search decoding"
    },
    {
      icon: Globe,
      title: "Translation",
      description: "KenLM spell correction + NLLB-200 model translates Malayalam to English"
    },
    {
      icon: Download,
      title: "Output Generation",
      description: "Returns OCR text, corrected text, and English translation with PDF/TTS options"
    }
  ];

  // API Endpoints
  const apiEndpoints = [
    {
      method: "POST",
      endpoint: "/predict",
      purpose: "Main OCR Pipeline",
      description: "Processes uploaded image through complete OCR workflow",
      params: ["file: UploadFile", "crop_points: string (optional)"],
      response: ["original_text", "corrected_text", "translated_text"]
    },
    {
      method: "POST",
      endpoint: "/detect-corners",
      purpose: "Document Detection",
      description: "Detects document boundaries for auto-crop functionality",
      params: ["file: UploadFile"],
      response: ["points: [[x,y], [x,y], [x,y], [x,y]]"]
    },
    {
      method: "POST",
      endpoint: "/translate",
      purpose: "Text Translation",
      description: "Translates Malayalam text to English without image upload",
      params: ["text: string"],
      response: ["original_input", "corrected_text", "translation"]
    },
    {
      method: "POST",
      endpoint: "/generate-pdf",
      purpose: "PDF Export",
      description: "Generates downloadable PDF from translated text",
      params: ["text: string"],
      response: ["PDF file stream"]
    },
    {
      method: "POST",
      endpoint: "/tts",
      purpose: "Text-to-Speech",
      description: "Converts text to audio using Google TTS",
      params: ["text: string", "lang: string (en/ml)"],
      response: ["MP3 audio stream"]
    },
    {
      method: "GET",
      endpoint: "/",
      purpose: "Health Check",
      description: "Verifies API availability and status",
      params: [],
      response: ["message: string"]
    }
  ];

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950";
      case "POST": return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950";
      case "PUT": return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950";
      case "DELETE": return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950";
      default: return "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-950";
    }
  };

  return (
    <div className="min-h-screen pt-16">
      {/* Background Glow */}
      <div className="hero-glow -top-40 -right-40" />
      <div className="hero-glow -bottom-40 -left-40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
        
        {/* Header Section */}
        <div className="mb-20 animate-slide-up">
          <div className="mb-4">
            <span className="text-sm font-bold tracking-widest text-violet-600">
              DEVELOPER GUIDE
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-slate-900 dark:text-slate-100">
            API DOCUMENTATION
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl">
            Comprehensive guide to our FastAPI backend that powers handwritten Malayalam OCR, spell correction, and English translation.
          </p>
        </div>

        {/* Process Flow Section */}
        <div className="mb-20">
          <h2 className="font-display text-3xl font-bold mb-4 text-slate-900 dark:text-slate-100">
            SYSTEM WORKFLOW
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-12">
            End-to-end pipeline from image upload to translated output
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processSteps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div
                  key={index}
                  className="glass-card rounded-2xl p-6 hover:shadow-md transition-all duration-300 group card-hover-glow"
                  onMouseEnter={() => setHoveredStep(index)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300 icon-hover-scale">
                        <IconComponent className="w-6 h-6 text-primary icon-hover-glow" />
                      </div>
                      <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center transition-all duration-300 ${hoveredStep === index ? 'scale-110' : 'scale-100'}`}>
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-slate-100">
                        {step.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < processSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                      <ArrowRight className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* API Endpoints Section */}
        <div className="mb-20">
          <h2 className="font-display text-3xl font-bold mb-4 text-slate-900 dark:text-slate-100">
            AVAILABLE ENDPOINTS
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-12">
            RESTful API endpoints for OCR, translation, and file generation
          </p>

          <div className="space-y-4">
            {apiEndpoints.map((endpoint, index) => (
              <div
                key={index}
                className="glass-card rounded-xl p-6 hover:shadow-md transition-all duration-300 card-hover-glow"
                onMouseEnter={() => setHoveredEndpoint(index)}
                onMouseLeave={() => setHoveredEndpoint(null)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase flex-shrink-0 ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono text-primary font-semibold break-all">
                        {endpoint.endpoint}
                      </code>
                      <h3 className="font-semibold text-lg mt-2 mb-1 text-slate-900 dark:text-slate-100">
                        {endpoint.purpose}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">
                        {endpoint.description}
                      </p>
                      
                      {endpoint.params.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Parameters:
                          </span>
                          <div className="mt-1 space-y-1">
                            {endpoint.params.map((param, idx) => (
                              <code key={idx} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded block text-slate-700 dark:text-slate-300">
                                {param}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Response:
                        </span>
                        <div className="mt-1 space-y-1">
                          {endpoint.response.map((resp, idx) => (
                            <code key={idx} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded block text-slate-700 dark:text-slate-300">
                              {resp}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Stack */}
        <div className="glass-card rounded-2xl p-8 mb-20 hover:shadow-md transition-all duration-300 card-hover-glow">
          <h2 className="font-display text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">
            CORE TECHNOLOGIES
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: "YOLO v2", category: "Text Detection", detail: "Bounding box localization" },
              { label: "Custom CRNN", category: "Character Recognition", detail: "ResNet18 + BiLSTM + CTC" },
              { label: "KenLM", category: "Language Model", detail: "Statistical spell correction" },
              { label: "NLLB-200", category: "Translation", detail: "Meta's multilingual model" },
              { label: "FastAPI", category: "Backend Framework", detail: "Async Python web server" },
              { label: "PyTorch", category: "Deep Learning", detail: "Model inference engine" }
            ].map((tech, index) => (
              <div key={index} className="flex gap-3 transition-all duration-300 hover:translate-x-1">
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{tech.label}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">{tech.category}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{tech.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Request/Response Example */}
        <div className="mb-20">
          <h2 className="font-display text-3xl font-bold mb-4 text-slate-900 dark:text-slate-100">
            REQUEST/RESPONSE OVERVIEW
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-8">
            Example structure for the main OCR endpoint
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Request Example */}
            <div className="glass-card rounded-xl p-6 hover:shadow-md transition-all duration-300 card-hover-glow">
              <h3 className="font-semibold text-lg mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Request
              </h3>
              <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
{`POST /predict
Content-Type: multipart/form-data

{
  "file": <image_file>,
  "crop_points": "[[0.1,0.1],[0.9,0.1],
                  [0.9,0.9],[0.1,0.9]]"
}`}
              </pre>
            </div>

            {/* Response Example */}
            <div className="glass-card rounded-xl p-6 hover:shadow-md transition-all duration-300 card-hover-glow">
              <h3 className="font-semibold text-lg mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Response
              </h3>
              <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "original_text": "സ്വാതന്ത്ര്യം",
  "corrected_text": "സ്വാതന്ത്ര്യം",
  "translated_text": "Freedom"
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Configuration Notes */}
        <div className="glass-card rounded-xl p-6 mb-20 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-lg mb-3 text-slate-900 dark:text-slate-100">
            ⚙️ Configuration Notes
          </h3>
          <ul className="space-y-2 text-slate-600 dark:text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span><strong>Base URL:</strong> http://localhost:8000 (development)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span><strong>Max File Size:</strong> 10 MB per upload</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span><strong>Supported Formats:</strong> JPEG, PNG, BMP, WebP</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span><strong>CORS:</strong> Enabled for localhost:3000 and localhost:5173</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span><strong>Authentication:</strong> Not required (development mode)</span>
            </li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-300 mb-8">Ready to explore the system?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/learn-more">
              <Button variant="outline" size="lg" className="gap-2 btn-lift">
                <ArrowLeft className="w-5 h-5 icon-hover-rotate" />
                Back to Tech Stack
              </Button>
            </Link>
            <Link to="/scanner">
              <Button size="lg" className="gap-2 shadow-glow btn-lift">
                Try OCR Scanner
                <ArrowRight className="w-5 h-5 icon-hover-bounce" />
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ApiDocumentation;
