import React from "react";

/**
 * Feature interface representing backend capabilities
 * Maps to actual ML models and processing pipelines
 */
export interface Feature {
  icon: React.ComponentType<{ className: string }>;
  title: string;
  description: string;
  techStack: string[];
  category: "detection" | "recognition" | "processing" | "translation" | "infrastructure" | "privacy";
}

/**
 * FeatureCard Component
 *
 * Reusable card component for displaying backend capabilities
 * with technology stack badges and animated interactions.
 *
 * Features:
 * - Dynamic color coding based on feature category
 * - Animated icon with glow effect on hover
 * - Tech stack pills for transparency
 * - Smooth 300ms transitions
 * - Responsive design
 *
 * @param feature - Feature data object containing all necessary information
 * @param index - Index for staggered animation delays
 *
 * Backend Capabilities Represented:
 * - detection: YOLOv2 text detection
 * - recognition: CustomCRNN character recognition
 * - processing: SymSpell + KenLM spell correction
 * - translation: NLLB transformer translation
 * - infrastructure: FastAPI + PyTorch GPU acceleration
 * - privacy: Local processing architecture
 */
const FeatureCard = ({ feature, index }: { feature: Feature; index: number }) => {
  const categoryColors = {
    detection: "from-blue-400/20 to-cyan-400/20",
    recognition: "from-purple-400/20 to-pink-400/20",
    processing: "from-green-400/20 to-emerald-400/20",
    translation: "from-orange-400/20 to-yellow-400/20",
    infrastructure: "from-indigo-400/20 to-violet-400/20",
    privacy: "from-red-400/20 to-rose-400/20",
  };

  const categoryLabels = {
    detection: "Detection",
    recognition: "Recognition",
    processing: "Processing",
    translation: "Translation",
    infrastructure: "Infrastructure",
    privacy: "Privacy",
  };

  return (
    <div
      className="glass-card rounded-2xl p-6 transition-all duration-300 group hover:shadow-lg hover:scale-102 hover:-translate-y-1 depth-shift liquid-light glass-reflection"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Icon with dynamic glow based on category */}
      <div className="relative mb-4 inline-block">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${categoryColors[feature.category]} rounded-xl opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-300`}
        />
        <div className="relative w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 liquid-glow soft-scale">
          <feature.icon className="w-6 h-6 text-primary group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300" />
        </div>
      </div>

      {/* Title */}
      <h3 className="font-display font-semibold text-lg mb-2 group-hover:text-primary transition-colors duration-300">
        {feature.title}
      </h3>

      {/* Technical description */}
      <p className="text-muted-foreground text-sm group-hover:text-foreground/70 transition-colors duration-300 mb-4">
        {feature.description}
      </p>

      {/* Category badge and Tech Stack pills */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-primary/60 uppercase tracking-wide">
          {categoryLabels[feature.category]}
        </div>
        <div className="flex flex-wrap gap-2">
          {feature.techStack.map((tech) => (
            <span
              key={tech}
              className="inline-block text-xs px-2 py-1 rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:text-primary transition-all duration-300 font-medium whitespace-nowrap"
              title={`Technology: ${tech}`}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;
