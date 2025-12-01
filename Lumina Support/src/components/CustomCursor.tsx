import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

const CustomCursor: React.FC = () => {
    const [isHovering, setIsHovering] = useState(false);

    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    const springConfig = { damping: 25, stiffness: 700 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'BUTTON' ||
                target.tagName === 'A' ||
                target.closest('button') ||
                target.closest('a')
            ) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener('mousemove', moveCursor);
        window.addEventListener('mouseover', handleMouseOver);

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            window.removeEventListener('mouseover', handleMouseOver);
        };
    }, [cursorX, cursorY]);

    return (
        <>
            {/* Main Dot - Sharp and precise */}
            <motion.div
                className="fixed top-0 left-0 w-2 h-2 rounded-full bg-copper-400 pointer-events-none z-[100]"
                style={{
                    x: cursorXSpring,
                    y: cursorYSpring,
                    translateX: '-50%',
                    translateY: '-50%',
                }}
            />

            {/* Outer Ring - Follows with delay */}
            <motion.div
                className="fixed top-0 left-0 w-8 h-8 rounded-full border border-copper-400/50 pointer-events-none z-[100]"
                style={{
                    x: cursorX,
                    y: cursorY,
                    translateX: '-50%',
                    translateY: '-50%',
                }}
                animate={{
                    scale: isHovering ? 1.5 : 1,
                    borderColor: isHovering ? '#00d9ff' : 'rgba(212, 165, 116, 0.5)',
                    borderWidth: isHovering ? '2px' : '1px',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />

            {/* Subtle Glow */}
            <motion.div
                className="fixed top-0 left-0 w-32 h-32 rounded-full bg-copper-400/10 blur-2xl pointer-events-none z-[99]"
                style={{
                    x: cursorX,
                    y: cursorY,
                    translateX: '-50%',
                    translateY: '-50%',
                }}
                animate={{
                    scale: isHovering ? 1.2 : 1,
                    backgroundColor: isHovering ? 'rgba(0, 217, 255, 0.1)' : 'rgba(212, 165, 116, 0.1)',
                }}
            />
        </>
    );
};

export default CustomCursor;
