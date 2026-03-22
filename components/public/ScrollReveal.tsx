'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  /** Stagger delay in seconds */
  delay?: number;
  className?: string;
}

/**
 * Viewport-triggered reveal wrapper.
 * Uses IntersectionObserver to add `is-visible` once the element enters view.
 * CSS in globals.css handles the transition (opacity + translateY).
 */
export function ScrollReveal({ children, delay = 0, className = '' }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) el.style.transitionDelay = `${delay}s`;
          el.classList.add('is-visible');
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -48px 0px', threshold: 0.06 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`scroll-reveal-item ${className}`}>
      {children}
    </div>
  );
}
