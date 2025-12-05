import { useRef, useEffect, ReactNode, isValidElement, Children, cloneElement, ElementType } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

// Character sets for scrambling
const CHARS = {
  DEFAULT: '!@#$%^&*():{};|,.<>/?',
  UPPERCASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  LOWERCASE: 'abcdefghijklmnopqrstuvwxyz',
  NUMBERS: '0123456789',
};

// Get random character from a set
const getRandomChar = (charset: string) => charset[Math.floor(Math.random() * charset.length)];

// Check if character is Devanagari
const isDevanagari = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return code >= 0x0900 && code <= 0x097F;
};

// Properly segment text including Devanagari grapheme clusters
const segmentText = (text: string): string[] => {
  // Use Intl.Segmenter with Hindi locale for proper Devanagari handling
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('hi', { granularity: 'grapheme' });
    const segments = segmenter.segment(text);
    return Array.from(segments, (s) => s.segment);
  }
  
  // Fallback: simple character array
  return Array.from(text);
};

// Get appropriate random character based on original character type
const getScrambleChar = (originalChar: string): string => {
  if (originalChar === ' ') return ' ';
  if (isDevanagari(originalChar)) {
    // For Devanagari, use Devanagari consonants
    const devanagariChars = 'कखगघचछजझटठडढणतथदधनपफबभमयरलवशषसह';
    return devanagariChars[Math.floor(Math.random() * devanagariChars.length)];
  }
  if (/[A-Z]/.test(originalChar)) return getRandomChar(CHARS.UPPERCASE);
  if (/[a-z]/.test(originalChar)) return getRandomChar(CHARS.LOWERCASE);
  if (/[0-9]/.test(originalChar)) return getRandomChar(CHARS.NUMBERS);
  return getRandomChar(CHARS.DEFAULT);
};

interface TextShuffleProps {
  children: ReactNode;
  as?: ElementType;
  speed?: number;
  scrambleSpeed?: number;
  delay?: number;
  stagger?: number;
  trigger?: boolean;
  loop?: boolean;
  loopDelay?: number;
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

interface CharSpanProps {
  char: string;
  index: number;
}

// Component to render individual characters
const CharSpan = ({ char, index }: CharSpanProps) => (
  <span
    className="char"
    data-char={char}
    data-index={index}
    style={{ 
      display: 'inline-block',
      minWidth: char === ' ' ? '0.25em' : undefined 
    }}
  >
    {char}
  </span>
);

// Process children to wrap each grapheme in a span
const processChildren = (children: ReactNode): ReactNode => {
  return Children.map(children, (child) => {
    if (typeof child === 'string') {
      const graphemes = segmentText(child);
      return graphemes.map((grapheme, i) => (
        <CharSpan key={i} char={grapheme} index={i} />
      ));
    }
    
    if (isValidElement(child)) {
      const childProps = child.props as any;
      if (childProps.children) {
        return cloneElement(child, {
          ...childProps,
          children: processChildren(childProps.children),
        } as any);
      }
    }
    
    return child;
  });
};

export default function TextShuffle({
  children,
  as: Component = 'div',
  speed = 1,
  scrambleSpeed = 50,
  delay = 0,
  stagger = 0.05,
  trigger = true,
  loop = false,
  loopDelay = 2,
  onComplete,
  className = '',
  style,
}: TextShuffleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const scrambleIntervalsRef = useRef<Map<Element, number>>(new Map());
  const loopTimeoutRef = useRef<number | null>(null);

  // Cleanup scramble intervals
  const clearAllIntervals = () => {
    scrambleIntervalsRef.current.forEach((intervalId) => {
      window.clearInterval(intervalId);
    });
    scrambleIntervalsRef.current.clear();
  };

  // Start scrambling effect for a character
  const startScramble = (element: Element) => {
    const originalChar = element.getAttribute('data-char') || '';
    
    // Don't scramble spaces or already scrambling
    if (originalChar === ' ' || scrambleIntervalsRef.current.has(element)) {
      return;
    }
    
    const intervalId = window.setInterval(() => {
      element.textContent = getScrambleChar(originalChar);
    }, scrambleSpeed);
    
    scrambleIntervalsRef.current.set(element, intervalId);
  };

  // Stop scrambling and reveal original character
  const stopScramble = (element: Element) => {
    const originalChar = element.getAttribute('data-char') || '';
    const intervalId = scrambleIntervalsRef.current.get(element);
    
    if (intervalId) {
      window.clearInterval(intervalId);
      scrambleIntervalsRef.current.delete(element);
    }
    
    element.textContent = originalChar;
  };

  useGSAP(
    () => {
      if (!containerRef.current || !trigger) return;

      const chars = containerRef.current.querySelectorAll('.char');
      if (chars.length === 0) return;

      const playAnimation = () => {
        // Kill any existing timeline
        if (timelineRef.current) {
          timelineRef.current.kill();
          clearAllIntervals();
        }

        // Create new timeline
        const tl = gsap.timeline({
          delay,
          onComplete: () => {
            clearAllIntervals();
            onComplete?.();
            
            // Schedule next loop if enabled
            if (loop && trigger) {
              loopTimeoutRef.current = window.setTimeout(() => {
                // Reset all chars to hidden before next loop
                gsap.set(chars, { opacity: 0 });
                chars.forEach((char) => {
                  const originalChar = char.getAttribute('data-char') || '';
                  char.textContent = originalChar;
                });
                playAnimation();
              }, loopDelay * 1000);
            }
          },
        });

        // Initially hide all characters and start scrambling
        gsap.set(chars, { opacity: 0 });

        // Build the reveal animation
        chars.forEach((char, index) => {
          const originalChar = char.getAttribute('data-char') || '';
          
          // Skip spaces
          if (originalChar === ' ') {
            gsap.set(char, { opacity: 1 });
            return;
          }

          const charDelay = index * stagger;

          // Start scrambling before reveal
          tl.call(
            () => {
              gsap.set(char, { opacity: 1 });
              startScramble(char);
            },
            [],
            charDelay
          );

          // Stop scrambling and reveal after duration based on speed
          tl.call(
            () => {
              stopScramble(char);
            },
            [],
            charDelay + (0.3 / speed)
          );
        });

        timelineRef.current = tl;
      };

      playAnimation();
    },
    { 
      scope: containerRef, 
      dependencies: [trigger, speed, scrambleSpeed, delay, stagger, loop, loopDelay] 
    }
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllIntervals();
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      if (loopTimeoutRef.current) {
        window.clearTimeout(loopTimeoutRef.current);
      }
    };
  }, []);

  // Reset when trigger changes to false
  useEffect(() => {
    if (!trigger) {
      clearAllIntervals();
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      if (loopTimeoutRef.current) {
        window.clearTimeout(loopTimeoutRef.current);
      }
      // Reset all chars to hidden
      if (containerRef.current) {
        const chars = containerRef.current.querySelectorAll('.char');
        chars.forEach((char) => {
          gsap.set(char, { opacity: 0 });
          const originalChar = char.getAttribute('data-char') || '';
          char.textContent = originalChar;
        });
      }
    }
  }, [trigger]);

  const processedChildren = processChildren(children);

  const elementProps = {
    ref: containerRef,
    className,
    style,
    children: processedChildren
  };

  return <Component {...elementProps as any} />;
}
