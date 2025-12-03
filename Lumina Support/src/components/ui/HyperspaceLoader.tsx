"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Starfield Canvas Component with copper/cyan color gradient
const StarfieldCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let stars: Star[] = [];
        const numStars = 800;
        let speed = 8; // Faster default speed for loading feel

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        
        class Star {
            x: number;
            y: number;
            z: number;
            pz: number;

            constructor() {
                this.x = Math.random() * canvas.width - canvas.width / 2;
                this.y = Math.random() * canvas.height - canvas.height / 2;
                this.z = Math.random() * canvas.width;
                this.pz = this.z;
            }

            update() {
                this.z = this.z - speed;
                if (this.z < 1) {
                    this.z = canvas.width;
                    this.x = Math.random() * canvas.width - canvas.width / 2;
                    this.y = Math.random() * canvas.height - canvas.height / 2;
                    this.pz = this.z;
                }
            }

            draw() {
                const sx = (this.x / this.z) * canvas.width / 2 + canvas.width / 2;
                const sy = (this.y / this.z) * canvas.height / 2 + canvas.height / 2;
                
                const r = Math.max(0.1, (1 - this.z / canvas.width) * 2.5);

                const px = (this.x / this.pz) * canvas.width / 2 + canvas.width / 2;
                const py = (this.y / this.pz) * canvas.height / 2 + canvas.height / 2;

                this.pz = this.z;

                // Determine color based on x position (left = copper, right = cyan)
                const centerX = canvas.width / 2;
                const normalizedX = sx / canvas.width; // 0 to 1
                
                // Copper: #c87d4a -> rgb(200, 125, 74)
                // Cyan: #00d9ff -> rgb(0, 217, 255)
                const copperR = 200, copperG = 125, copperB = 74;
                const cyanR = 0, cyanG = 217, cyanB = 255;
                
                // Blend based on x position
                const blendFactor = normalizedX; // 0 = left (copper), 1 = right (cyan)
                const red = Math.round(copperR + (cyanR - copperR) * blendFactor);
                const green = Math.round(copperG + (cyanG - copperG) * blendFactor);
                const blue = Math.round(copperB + (cyanB - copperB) * blendFactor);
                
                const alpha = 1 - this.z / canvas.width;

                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(sx, sy);
                ctx.lineWidth = r * 2;
                ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
                ctx.stroke();
            }
        }

        const init = () => {
            stars = [];
            for (let i = 0; i < numStars; i++) {
                stars.push(new Star());
            }
        };

        const animate = () => {
            ctx.fillStyle = 'rgba(15, 15, 18, 0.2)'; // Charcoal background
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            stars.forEach(star => {
                star.update();
                star.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseMove = (event: MouseEvent) => {
            const centerX = window.innerWidth / 2;
            const dist = Math.abs(event.clientX - centerX);
            const maxDist = window.innerWidth / 2;
            // The closer to the center, the faster the speed
            speed = 8 + (1 - dist / maxDist) * 25;
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);
        
        resizeCanvas();
        init();
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full" />;
};

interface HyperspaceLoaderProps {
    onLoadComplete?: () => void;
    minDuration?: number; // Minimum display time in ms
}

// The main loader component
const HyperspaceLoader: React.FC<HyperspaceLoaderProps> = ({ 
    onLoadComplete,
    minDuration = 3000 
}) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            // Wait for exit animation to complete
            setTimeout(() => {
                onLoadComplete?.();
            }, 800);
        }, minDuration);

        return () => clearTimeout(timer);
    }, [minDuration, onLoadComplete]);

    const fadeUpVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.15 + 0.3,
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94] as const,
            },
        }),
        exit: {
            opacity: 0,
            scale: 1.1,
            transition: {
                duration: 0.6,
                ease: [0.55, 0.06, 0.68, 0.19] as const,
            },
        },
    };

    const containerVariants = {
        visible: { opacity: 1 },
        exit: { 
            opacity: 0,
            transition: {
                duration: 0.8,
                ease: [0.42, 0, 0.58, 1] as const,
            }
        },
    };

    return (
        <motion.div 
            className="fixed inset-0 h-screen w-full bg-charcoal-900 flex flex-col items-center justify-center overflow-hidden z-[100]"
            variants={containerVariants}
            initial="visible"
            animate={isExiting ? "exit" : "visible"}
        >
            <StarfieldCanvas />
            
            {/* Gradient overlays for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-transparent to-charcoal-900 z-10 opacity-60"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-copper-500/5 via-transparent to-cyan-500/5 z-10"></div>

            {/* Centered Content */}
            <div className="relative z-20 text-center p-6">
                {/* Brand Name */}
                <motion.h1
                    custom={0}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate={isExiting ? "exit" : "visible"}
                    className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-6 font-heading"
                >
                    <span className="text-copper-500">क्रेता</span>
                    <span className="text-white">-</span>
                    <span className="text-cyan-400">बन्धु</span>
                </motion.h1>

                {/* Tagline */}
                <motion.p
                    custom={1}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate={isExiting ? "exit" : "visible"}
                    className="text-lg md:text-xl text-white/60 mb-8 font-light tracking-wide"
                >
                    Your AI-Powered Support Companion
                </motion.p>

                {/* Loading indicator */}
                <motion.div
                    custom={2}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate={isExiting ? "exit" : "visible"}
                    className="flex items-center justify-center gap-3"
                >
                    <div className="flex gap-1.5">
                        <motion.div 
                            className="w-2 h-2 rounded-full bg-copper-500"
                            animate={{ 
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5]
                            }}
                            transition={{ 
                                duration: 1,
                                repeat: Infinity,
                                delay: 0 
                            }}
                        />
                        <motion.div 
                            className="w-2 h-2 rounded-full bg-white"
                            animate={{ 
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5]
                            }}
                            transition={{ 
                                duration: 1,
                                repeat: Infinity,
                                delay: 0.2 
                            }}
                        />
                        <motion.div 
                            className="w-2 h-2 rounded-full bg-cyan-400"
                            animate={{ 
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5]
                            }}
                            transition={{ 
                                duration: 1,
                                repeat: Infinity,
                                delay: 0.4 
                            }}
                        />
                    </div>
                </motion.div>
            </div>

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-copper-500/20 to-transparent z-10 blur-2xl" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-cyan-500/20 to-transparent z-10 blur-2xl" />
        </motion.div>
    );
};

export default HyperspaceLoader;
