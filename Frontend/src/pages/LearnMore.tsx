import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Brain, Globe, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const LearnMore = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
        
        {/* Header */}
        <div className="text-center space-y-6">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            How It <span className="text-primary">Works</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the technology behind our AI-powered Malayalam handwriting recognition system.
          </p>
        </div>

        {/* Content Sections */}
        <div className="grid gap-8 md:grid-cols-2">
          
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold mb-3">AI & Deep Learning</h3>
            <p className="text-muted-foreground">
              Our system utilizes advanced convolutional neural networks (CNNs) specifically trained on thousands of handwritten Malayalam characters. This allows it to recognize diverse handwriting styles with high accuracy.
            </p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold mb-3">Translation Engine</h3>
            <p className="text-muted-foreground">
              Beyond just recognizing text, we integrate with powerful translation APIs to provide instant Malayalam to English translation, bridging communication gaps effectively.
            </p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold mb-3">Spell Correction</h3>
            <p className="text-muted-foreground">
              Handwriting can be messy. Our post-processing algorithms suggest corrections for recognized words, ensuring the final digital text is grammatically correct and coherent.
            </p>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold mb-3">Privacy First</h3>
            <p className="text-muted-foreground">
              We value your privacy. Your uploaded documents are processed in real-time and are not permanently stored on our servers. Once you close the session, the data is gone.
            </p>
          </div>

        </div>

        {/* Call to Action */}
        <div className="text-center pt-8">
           <Link to="/">
            <Button variant="outline" size="lg" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default LearnMore;
