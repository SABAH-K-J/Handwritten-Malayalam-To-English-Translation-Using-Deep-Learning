import { Sparkles } from "lucide-react";

interface LoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function Loader({ message = "Processing...", size = "md" }: LoaderProps) {
  const sizeClasses = {
    sm: {
      container: "w-10 h-10",
      icon: "w-4 h-4",
      text: "text-xs",
    },
    md: {
      container: "w-16 h-16",
      icon: "w-6 h-6",
      text: "text-sm",
    },
    lg: {
      container: "w-20 h-20",
      icon: "w-8 h-8",
      text: "text-base",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in">
      {/* Premium Multi-Layer Loader */}
      <div className="relative">
        {/* Outer glow ring - pulsing */}
        <div 
          className={`${classes.container} rounded-full bg-primary/5 absolute inset-0 animate-ping`}
          style={{ animationDuration: "2s" }}
        />
        
        {/* Middle rotating ring */}
        <div className="relative">
          <div 
            className={`${classes.container} rounded-full border-4 border-muted/30 absolute inset-0 animate-spin`}
            style={{ animationDuration: "3s", animationDirection: "reverse" }}
          />
          
          {/* Inner spinning ring with gradient */}
          <div 
            className={`${classes.container} rounded-full border-4 border-transparent border-t-primary border-r-primary/50 animate-spin relative z-10`}
            style={{ animationDuration: "1.5s" }}
          />
          
          {/* Center icon - pulsing and rotating */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse">
              <Sparkles 
                className={`${classes.icon} text-primary`}
                style={{
                  animation: "spin 4s linear infinite reverse",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loading message */}
      {message && (
        <div className="text-center space-y-1 animate-pulse">
          <p className={`font-display font-semibold text-foreground ${classes.text}`}>
            {message}
          </p>
          {/* Animated dots */}
          <div className="flex justify-center gap-1">
            <div 
              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div 
              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div 
              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
