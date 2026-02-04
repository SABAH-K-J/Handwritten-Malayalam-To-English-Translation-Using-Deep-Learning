import { useRef, useCallback } from 'react';

/**
 * Custom hook for managing interactive animations
 * Provides utilities for ripple effects, scale transforms, and smooth transitions
 */
export const useInteractiveAnimation = () => {
  const elementRef = useRef<HTMLElement | null>(null);

  /**
   * Creates a ripple effect from click position
   */
  const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple-effect');

    button.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => ripple.remove(), 600);
  }, []);

  /**
   * Add scale animation on element
   */
  const addScaleAnimation = useCallback((element: HTMLElement, duration = 300) => {
    element.style.transition = `transform ${duration}ms ease-out`;
    element.style.transform = 'scale(1.05)';
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, duration / 2);
  }, []);

  /**
   * Add bounce animation on element
   */
  const addBounceAnimation = useCallback((element: HTMLElement) => {
    element.style.animation = 'iconBounce 0.6s ease-out';
    
    setTimeout(() => {
      element.style.animation = '';
    }, 600);
  }, []);

  return {
    elementRef,
    createRipple,
    addScaleAnimation,
    addBounceAnimation,
  };
};

/**
 * Hook for managing hover state with animation
 */
export const useHoverAnimation = () => {
  const [isHovered, setIsHovered] = useRef(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered.current = false;
  }, []);

  return {
    isHovered: isHovered.current,
    handleMouseEnter,
    handleMouseLeave,
  };
};
