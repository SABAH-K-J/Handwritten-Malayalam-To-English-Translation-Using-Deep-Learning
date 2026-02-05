import { Link } from "react-router-dom";
import { ArrowRight, Scan, Languages, Sparkles, Zap, Shield, FileText, Github, Brain, Lightbulb, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeatureCard, { Feature } from "@/components/FeatureCard";

// Feature Card Component is now imported from separate file for better modularity

export default function Landing() {
  const features: Feature[] = [
    {
      icon: Scan,
      title: "Intelligent Text Detection",
      description: "YOLOv2 neural network precisely locates handwritten text regions in images, achieving high accuracy even with complex layouts and multiple text blocks.",
      techStack: ["YOLOv2", "OpenCV", "PyTorch"],
      category: "detection",
    },
    {
      icon: Brain,
      title: "Character Recognition Engine",
      description: "CustomCRNN architecture with ResNet backbone recognizes individual Malayalam characters with frame-level accuracy, processing high-resolution character sequences.",
      techStack: ["CRNN", "ResNet", "LSTM"],
      category: "recognition",
    },
    {
      icon: Lightbulb,
      title: "Smart Spell Correction",
      description: "SymSpell algorithm with context-aware Malayalam dictionary corrects OCR errors and suggests contextually accurate alternative words using KenLM language model.",
      techStack: ["SymSpell", "KenLM", "Dictionary"],
      category: "processing",
    },
    {
      icon: Languages,
      title: "Advanced Translation",
      description: "NLLB (No Language Left Behind) transformer model delivers accurate Malayalam to English translation, understanding context and maintaining meaning through deep semantic understanding.",
      techStack: ["NLLB", "Transformers", "Hugging Face"],
      category: "translation",
    },
    {
      icon: Cpu,
      title: "GPU-Accelerated Processing",
      description: "FastAPI backend with PyTorch GPU inference achieves real-time processing speeds, supporting CUDA for NVIDIA GPUs and optimized CPU fallback for compatibility.",
      techStack: ["FastAPI", "CUDA", "PyTorch"],
      category: "infrastructure",
    },
    {
      icon: Shield,
      title: "Privacy-First Architecture",
      description: "All processing happens locally on your device or private server. No images are stored on external servers, ensuring complete data privacy and security compliance.",
      techStack: ["Local Processing", "No Cloud", "Secure"],
      category: "privacy",
    },
  ];

  // Reusable button component with micro-interactions
  const InteractiveButton = ({ 
    variant = "primary", 
    children, 
    to, 
    className = "",
    size = "lg",
  }: {
    variant?: "outline" | "default" | "destructive" | "secondary" | "ghost" | "link" | "primary";
    children: React.ReactNode;
    to: string;
    className?: string;
    size?: "lg" | "default" | "sm" | "icon";
  }) => {
    const baseClasses = "relative overflow-hidden group transition-all duration-300 ease-out glass-button liquid-glow elevation-lift";
    const buttonVariant = variant === "primary" ? "default" : (variant || "default");
    const variantClasses = variant === "outline" 
      ? `${className} gap-2 text-lg px-8 py-6 rounded-xl glass-shimmer`
      : `${className} gap-2 text-lg px-8 py-6 rounded-xl shadow-glow glass-shimmer`;

    return (
      <Link to={to}>
        <Button 
          variant={buttonVariant as "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"}
          size={size}
          className={`${baseClasses} ${variantClasses} hover:scale-105 active:scale-95`}
        >
          {/* Animated background gradient for primary buttons */}
          {variant === "primary" && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-shimmer" />
          )}
          
          {/* Ripple effect overlay */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-0 group-active:opacity-100 group-active:animate-ping pointer-events-none" />
          
          <span className="relative flex items-center gap-2">
            {children}
          </span>
        </Button>
      </Link>
    );
  };

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Glow */}
        <div className="hero-glow -top-40 -right-40 animate-glow-pulse" />
        <div className="hero-glow -bottom-40 -left-40 animate-glow-pulse" style={{animationDelay: "1s"}} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              AI-Powered Malayalam OCR
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
              Digitize Malayalam
              <br />
              <span className="gradient-text">Handwriting Instantly</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "100ms" }}>
              Transform handwritten Malayalam documents into editable digital text with our advanced OCR technology. Spell check and translate to English in one click.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
              <InteractiveButton to="/scanner">
                Start Scanning
                <ArrowRight className="w-5 h-5" />
              </InteractiveButton>
              <InteractiveButton variant="outline" to="/translation">
                <Languages className="w-5 h-5" />
                Translation
              </InteractiveButton>
              <InteractiveButton variant="outline" to="/learn-more">
                Learn More
              </InteractiveButton>
            </div>
          </div>

          {/* Demo Preview */}
          <div className="mt-20 relative animate-scale-in group depth-shift" style={{ animationDelay: "300ms" }}>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="glass-panel rounded-3xl p-4 sm:p-8 shadow-lg max-w-5xl mx-auto transition-all duration-300 group-hover:shadow-xl liquid-light">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Input Preview */}
                <div className="bg-muted/50 backdrop-blur-sm rounded-2xl p-6 flex items-center justify-center min-h-[200px] transition-all duration-300 group-hover:bg-muted/70 glass-reflection">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 liquid-glow soft-scale">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground">Upload your document</p>
                  </div>
                </div>

                {/* Output Preview */}
                <div className="bg-card/80 backdrop-blur-md rounded-2xl p-6 border border-border/50 transition-all duration-300 glass-card glass-reflection">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded-full w-3/4 group-hover:bg-muted/80 transition-colors duration-300" />
                    <div className="h-4 bg-muted rounded-full w-full group-hover:bg-muted/80 transition-colors duration-300" />
                    <div className="h-4 bg-muted rounded-full w-5/6 group-hover:bg-muted/80 transition-colors duration-300" />
                    <div className="h-4 bg-primary/20 rounded-full w-2/3 group-hover:bg-primary/30 transition-colors duration-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to digitize and translate Malayalam documents efficiently.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="hero-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-glow-pulse" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Upload your first document and experience the power of AI-driven Malayalam OCR.
          </p>
          <Link to="/scanner">
            <Button size="lg" className="relative overflow-hidden group gap-2 text-lg px-10 py-6 rounded-xl shadow-glow hover:scale-105 active:scale-95 transition-all duration-300 ease-out glass-button liquid-glow elevation-lift glass-shimmer">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-shimmer" />
              
              {/* Ripple effect */}
              <div className="absolute inset-0 opacity-0 group-active:opacity-100 group-active:animate-ping pointer-events-none" />
              
              <span className="relative flex items-center gap-2">
                Try Scanner Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/30 bg-muted/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img 
                  src="/1000161394.png" 
                  alt="Malayalam OCR Logo" 
                  className="w-8 h-8 rounded-lg object-contain"
                />
                <span className="font-display font-bold text-lg text-foreground">
                  മലയാളം<span className="text-primary">OCR</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                An open-source project for converting handwritten Malayalam to English text using Deep Learning.
              </p>
              <a 
                href="https://github.com/SABAH-K-J/Handwritten-Malayalam-To-English-Translation-Using-Deep-Learning" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline transition-all duration-300 hover:translate-x-0.5"
              >
                <Github className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" /> View Project on GitHub
              </a>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Developed By</h4>
              <ul className="grid sm:grid-cols-2 gap-3 text-sm">
                <li>
                  <a href="https://github.com/SABAH-K-J" className="flex items-center gap-2 hover:text-primary transition-all duration-300 text-muted-foreground hover:translate-x-1 group">
                    <Github className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" /> Sabah K J
                  </a>
                </li>
                <li>
                  <a href="https://github.com/farhan2977" className="flex items-center gap-2 hover:text-primary transition-all duration-300 text-muted-foreground hover:translate-x-1 group">
                    <Github className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" /> Mohammed Farhan
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 hover:text-primary transition-all duration-300 text-muted-foreground hover:translate-x-1 group">
                    <Github className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" /> Radhsyam Raghav K R
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-2 hover:text-primary transition-all duration-300 text-muted-foreground hover:translate-x-1 group">
                    <Github className="w-3 h-3 group-hover:rotate-12 transition-transform duration-300" /> Mohammed Nowfal K A
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-border/50 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Malayalam OCR. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
