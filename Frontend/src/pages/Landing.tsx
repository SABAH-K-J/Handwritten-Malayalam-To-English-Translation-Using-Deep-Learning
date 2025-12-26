import { Link } from "react-router-dom";
import { ArrowRight, Scan, Languages, Sparkles, Zap, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const features = [
    {
      icon: Scan,
      title: "Advanced OCR",
      description: "State-of-the-art recognition for handwritten Malayalam text with high accuracy.",
    },
    {
      icon: Languages,
      title: "Instant Translation",
      description: "Get accurate English translations of your Malayalam documents in seconds.",
    },
    {
      icon: Sparkles,
      title: "AI Spell Check",
      description: "Intelligent spell correction powered by machine learning models.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process documents quickly with our optimized backend infrastructure.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your documents are processed securely and never stored on our servers.",
    },
    {
      icon: FileText,
      title: "Multiple Formats",
      description: "Upload images in JPG, PNG, or capture directly from your camera.",
    },
  ];

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Glow */}
        <div className="hero-glow -top-40 -right-40" />
        <div className="hero-glow -bottom-40 -left-40" />

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
              <Link to="/scanner">
                <Button size="lg" className="gap-2 text-lg px-8 py-6 rounded-xl shadow-glow">
                  Start Scanning
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="gap-2 text-lg px-8 py-6 rounded-xl">
                Learn More
              </Button>
            </div>
          </div>

          {/* Demo Preview */}
          <div className="mt-20 relative animate-scale-in" style={{ animationDelay: "300ms" }}>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="glass-card rounded-3xl p-4 sm:p-8 shadow-lg max-w-5xl mx-auto">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Input Preview */}
                <div className="bg-muted/50 rounded-2xl p-6 flex items-center justify-center min-h-[200px]">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground">Upload your document</p>
                  </div>
                </div>

                {/* Output Preview */}
                <div className="bg-card rounded-2xl p-6 border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded-full w-3/4" />
                    <div className="h-4 bg-muted rounded-full w-full" />
                    <div className="h-4 bg-muted rounded-full w-5/6" />
                    <div className="h-4 bg-primary/20 rounded-full w-2/3" />
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
              <div
                key={feature.title}
                className="glass-card rounded-2xl p-6 hover:shadow-md transition-all duration-300 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="hero-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Upload your first document and experience the power of AI-driven Malayalam OCR.
          </p>
          <Link to="/scanner">
            <Button size="lg" className="gap-2 text-lg px-10 py-6 rounded-xl shadow-glow">
              Try Scanner Now
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-primary" />
              <span className="font-display font-semibold">മലയാളംOCR</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with ❤️ for Malayalam language preservation
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
