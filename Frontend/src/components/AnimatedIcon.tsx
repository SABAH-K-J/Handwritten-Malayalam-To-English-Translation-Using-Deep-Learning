import React from 'react';

interface AnimatedIconProps {
  children: React.ReactNode;
  animationType?: 'scale' | 'glow' | 'bounce' | 'rotate';
  className?: string;
}

/**
 * Wrapper component for icons with smooth animation effects
 * Supports: scale, glow, bounce, and rotate animations
 */
export const AnimatedIcon = React.forwardRef<
  HTMLDivElement,
  AnimatedIconProps
>(({ animationType = 'scale', className = '', children }, ref) => {
  const getAnimationClass = () => {
    switch (animationType) {
      case 'scale':
        return 'icon-hover-scale';
      case 'glow':
        return 'icon-hover-glow';
      case 'bounce':
        return 'icon-hover-bounce';
      case 'rotate':
        return 'icon-hover-rotate';
      default:
        return 'icon-hover-scale';
    }
  };

  return (
    <div
      ref={ref}
      className={`${getAnimationClass()} ${className}`}
    >
      {children}
    </div>
  );
});

AnimatedIcon.displayName = 'AnimatedIcon';
