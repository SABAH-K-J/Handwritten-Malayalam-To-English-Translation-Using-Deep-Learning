import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Code2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const LearnMore = () => {
  const [hoveredSkill, setHoveredSkill] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hoveredTechIndex, setHoveredTechIndex] = useState<number | null>(null);

  useEffect(() => {
    // Check initial dark mode
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    
    // Listen for dark mode changes
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Skills data based on codebase analysis
  // Frontend: ~65% TypeScript/TSX, ~15% CSS, ~20% Config/Other
  // Backend: ~85% Python, ~15% YAML/Config
  // Overall: ~45% Python, ~30% TypeScript, ~15% CSS, ~10% Config
  const skillsData = [
    { name: "PYTHON", percentage: 45, color: "#6366f1" },     // Indigo
    { name: "TYPESCRIPT/TSX", percentage: 30, color: "#a855f7" }, // Violet
    { name: "CSS/TAILWIND", percentage: 15, color: "#d946ef" },   // Plum
    { name: "CONFIG/OTHER", percentage: 10, color: "#1e1b4b" }    // Deep Navy
  ];

  // SVG Circle Chart Component
  const SkillsChart = () => {
    const radius = 100;
    const centerX = 120;
    const centerY = 120;
    const maxPercentage = 100;

    return (
      <div className="flex flex-col items-center">
        <svg width="240" height="240" viewBox="0 0 240 240" className="mb-8">
          {/* Background circle */}
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={radius + 10} 
            fill={isDarkMode ? "#1f2937" : "#f3f0ff"} 
            opacity={isDarkMode ? "0.7" : "0.5"} 
          />

          {/* Concentric rings */}
          {skillsData.map((skill, index) => {
            const currentRadius = radius - (index * 20);
            const circumference = 2 * Math.PI * currentRadius;
            const strokeDashoffset = circumference - (skill.percentage / 100) * circumference;

            return (
              <g key={index}>
                {/* Background ring */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={currentRadius}
                  fill="none"
                  stroke={isDarkMode ? "#374151" : "#e5e7eb"}
                  strokeWidth="2"
                />
                {/* Progress ring */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={currentRadius}
                  fill="none"
                  stroke={skill.color}
                  strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className={`transition-all duration-300 cursor-pointer chart-ring-hover ${
                    hoveredSkill === index ? "opacity-100" : "opacity-70"
                  }`}
                  onMouseEnter={() => setHoveredSkill(index)}
                  onMouseLeave={() => setHoveredSkill(0)}
                />
              </g>
            );
          })}

          {/* Center number */}
          <text
            x={centerX}
            y={centerY + 8}
            textAnchor="middle"
            className="font-bold text-4xl fill-slate-900 dark:fill-slate-100"
          >
            {skillsData[hoveredSkill].percentage}%
          </text>
          <text
            x={centerX}
            y={centerY + 28}
            textAnchor="middle"
            className="text-xs fill-slate-600 dark:fill-slate-300"
          >
            {skillsData[hoveredSkill].name}
          </text>
        </svg>

        {/* Legend */}
        <div className="space-y-3 w-full">
          {skillsData.map((skill, index) => (
            <div
              key={index}
              className="flex items-center gap-3 cursor-pointer transition-all duration-300 hover:scale-105 hover:translate-x-1"
              onMouseEnter={() => setHoveredSkill(index)}
              onMouseLeave={() => setHoveredSkill(0)}
            >
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0 transition-all duration-300 icon-hover-scale"
                style={{ backgroundColor: skill.color }}
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">
                {skill.name}
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {skill.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const techDetails = [
    {
      icon: Code2,
      title: "Frontend Architecture",
      description: "Built with React, TypeScript, and Tailwind CSS with modern responsive design patterns"
    },
    {
      icon: Database,
      title: "Backend Infrastructure",
      description: "FastAPI server with PyTorch deep learning models for robust OCR processing"
    }
  ];

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
              TECH STACK
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-slate-900 dark:text-slate-100">
            CODEBASE COMPOSITION
            <br />
            AND ARCHITECTURE
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl">
            Our Malayalam OCR application combines frontend interactivity with powerful backend AI, leveraging modern frameworks and deep learning models for seamless text recognition and translation.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-12 mb-20">
          
          {/* Left Column - Skills Chart */}
          <div className="glass-card rounded-2xl p-8 hover:shadow-md transition-all duration-300 animate-slide-up card-hover-glow" style={{ animationDelay: "100ms" }}>
            <h2 className="font-display text-2xl font-bold mb-8 text-slate-900 dark:text-slate-100">
              CODE DISTRIBUTION
            </h2>
            <SkillsChart />
          </div>

          {/* Right Column - Tech Details */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div>
              <h2 className="font-display text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">
                ARCHITECTURE OVERVIEW
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                The project is structured as a full-stack application with clear separation of concerns and modern development practices.
              </p>
            </div>

            {techDetails.map((tech, index) => {
              const IconComponent = tech.icon;
              return (
                <div
                  key={index}
                  className="glass-card rounded-2xl p-6 hover:shadow-md transition-all duration-300 group card-hover-glow"
                >
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors duration-300 icon-hover-scale">
                      <IconComponent className="w-6 h-6 text-primary icon-hover-glow" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-slate-100">
                        {tech.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">
                        {tech.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="mb-20">
          <h2 className="font-display text-3xl font-bold mb-12 text-center text-slate-900 dark:text-slate-100">
            COMPONENT BREAKDOWN
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Frontend */}
            <div className="glass-card rounded-2xl p-8 hover:shadow-md transition-all duration-300 card-hover-glow">
              <h3 className="font-semibold text-lg mb-6 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-violet-600 icon-hover-scale" />
                FRONTEND (TypeScript/React)
              </h3>
              <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-3 transition-all duration-300 hover:translate-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 icon-hover-scale" />
                  Components: UI library (Button, Card, Dialog, etc.)
                </li>
                <li className="flex items-center gap-3 transition-all duration-300 hover:translate-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 icon-hover-scale" />
                  Pages: Landing, Scanner, LearnMore
                </li>
                <li className="flex items-center gap-3 transition-all duration-300 hover:translate-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 icon-hover-scale" />
                  Utilities: Theme management, toast notifications
                </li>
                <li className="flex items-center gap-3 transition-all duration-300 hover:translate-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 icon-hover-scale" />
                  Styling: Tailwind CSS + custom animations
                </li>
              </ul>
            </div>

            {/* Backend */}
            <div className="glass-card rounded-2xl p-8 hover:shadow-md transition-all duration-300 card-hover-glow">
              <h3 className="font-semibold text-lg mb-6 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600 icon-hover-scale" />
                BACKEND (Python/FastAPI)
              </h3>
              <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-3 transition-all duration-300 hover:translate-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 icon-hover-scale" />
                  OCR Engine: YOLO v2 + Custom CRNN model
                </li>
                <li className="flex items-center gap-3 transition-all duration-300 hover:translate-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 icon-hover-scale" />
                  Processing: Preprocessing, decoding, translation
                </li>
                <li className="flex items-center gap-3 transition-all duration-300 hover:translate-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 icon-hover-scale" />
                  Models: KenLM, SymSpell, NLLB translator
                </li>
                <li className="flex items-center gap-3 transition-all duration-300 hover:translate-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 icon-hover-scale" />
                  API: FastAPI with CORS, file handling, TTS
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technologies Used */}
        <div className="glass-card rounded-2xl p-8 mb-20 hover:shadow-md transition-all duration-300 card-hover-glow">
          <h2 className="font-display text-2xl font-bold mb-8 text-slate-900 dark:text-slate-100">
            KEY TECHNOLOGIES
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: "PyTorch", category: "Deep Learning" },
              { label: "FastAPI", category: "Backend" },
              { label: "React 18+", category: "Frontend" },
              { label: "TypeScript", category: "Language" },
              { label: "Tailwind CSS", category: "Styling" },
              { label: "OpenCV", category: "Image Processing" },
              { label: "TensorFlow", category: "ML Models" },
              { label: "Docker", category: "Deployment" },
              { label: "CORS", category: "Security" }
            ].map((tech, index) => (
              <div 
                key={index} 
                className="flex gap-3 transition-all duration-300 hover:translate-x-1"
                onMouseEnter={() => setHoveredTechIndex(index)}
                onMouseLeave={() => setHoveredTechIndex(null)}
              >
                <span className={`w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 transition-all duration-300 ${hoveredTechIndex === index ? 'scale-125' : 'scale-100'}`} />
                <div>
                  <div className={`font-semibold text-slate-900 dark:text-slate-100 transition-all duration-300 ${hoveredTechIndex === index ? 'translate-x-1' : 'translate-x-0'}`}>{tech.label}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{tech.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Documentation Button */}
        <div className="flex justify-center mb-20">
          <Link to="/api-documentation">
            <Button 
              size="lg" 
              className="gap-2 shadow-glow btn-lift"
              aria-label="Navigate to API Documentation and Process Explanation"
            >
              API Documentation
              <ArrowRight className="w-5 h-5 icon-hover-bounce" />
            </Button>
          </Link>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-300 mb-8">Explore the complete workflow of our OCR system</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/">
              <Button variant="outline" size="lg" className="gap-2 btn-lift">
                <ArrowLeft className="w-5 h-5 icon-hover-rotate" />
                Back to Home
              </Button>
            </Link>
            <Link to="/scanner">
              <Button size="lg" className="gap-2 shadow-glow btn-lift">
                Start Scanning
                <ArrowRight className="w-5 h-5 icon-hover-bounce" />
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};


export default LearnMore;
