import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';

interface AnimatedButtonProps extends ButtonProps {
  children: React.ReactNode;
  animationType?: 'ripple' | 'lift' | 'gradient' | 'glow';
}

/**
 * Enhanced Button component with built-in animations
 * Supports multiple animation types: ripple, lift, gradient shift, and glow
 */
export const AnimatedButton = React.forwardRef<
  HTMLButtonElement,
  AnimatedButtonProps
>(({ animationType = 'lift', className = '', ...props }, ref) => {
  const getAnimationClass = () => {
    switch (animationType) {
      case 'ripple':
        return 'btn-ripple';
      case 'lift':
        return 'btn-lift';
      case 'gradient':
        return 'btn-gradient-shift';
      case 'glow':
        return 'shadow-glow';
      default:
        return 'btn-lift';
    }
  };

  return (
    <Button
      ref={ref}
      className={`${getAnimationClass()} ${className}`}
      {...props}
    />
  );
});

AnimatedButton.displayName = 'AnimatedButton';
