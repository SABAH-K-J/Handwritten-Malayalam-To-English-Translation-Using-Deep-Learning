import React from 'react';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: 'glow' | 'lift' | 'shadow';
}

/**
 * Enhanced Card component with interactive hover effects
 * Maintains glass-card styling while adding smooth animations
 */
export const AnimatedCard = React.forwardRef<
  HTMLDivElement,
  AnimatedCardProps
>(({ children, className = '', hoverEffect = 'glow' }, ref) => {
  const getHoverEffect = () => {
    switch (hoverEffect) {
      case 'glow':
        return 'card-hover-glow';
      case 'lift':
        return 'btn-lift';
      case 'shadow':
        return 'shadow-lg';
      default:
        return 'card-hover-glow';
    }
  };

  return (
    <div
      ref={ref}
      className={`glass-card rounded-2xl p-8 transition-all duration-300 ${getHoverEffect()} ${className}`}
    >
      {children}
    </div>
  );
});

AnimatedCard.displayName = 'AnimatedCard';
