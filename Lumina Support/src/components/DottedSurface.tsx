import { cn } from '../utils/cn';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const sceneRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        particles: THREE.Points;
    } | null>(null);

    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = {
                x: (e.clientX / window.innerWidth) * 2 - 1,
                y: -(e.clientY / window.innerHeight) * 2 + 1
            };
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        // Cleanup any existing children to prevent duplicates
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }

        const SEPARATION = 100;
        const AMOUNTX = 50;
        const AMOUNTY = 50;

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0f0f12, 2000, 10000);

        const camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            1,
            10000,
        );
        camera.position.set(0, 355, 1220);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);

        containerRef.current.appendChild(renderer.domElement);

        const positions: number[] = [];
        const colors: number[] = [];
        const originalPositions: number[] = [];

        // Vibrant Colors
        const color1 = new THREE.Color(0xff6b00); // Vibrant Copper
        const color2 = new THREE.Color(0x00ffff); // Vibrant Cyan

        for (let ix = 0; ix < AMOUNTX; ix++) {
            for (let iy = 0; iy < AMOUNTY; iy++) {
                const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
                const y = 0;
                const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

                positions.push(x, y, z);
                originalPositions.push(x, y, z);

                // Depth-based gradient for initial state
                // iy goes from 0 to AMOUNTY. 
                // We want Copper (color1) at near (iy=AMOUNTY) and Cyan (color2) at far (iy=0).
                // depthFactor should be 0 at near, 1 at far for lerp(color1, color2, t)
                // t = 1 - (iy / AMOUNTY) -> iy=AMOUNTY => t=0 (Copper), iy=0 => t=1 (Cyan)

                const depthFactor = 1 - (iy / AMOUNTY);
                const mixedColor = color1.clone().lerp(color2, depthFactor * 0.6); // Max 60% Cyan at back
                colors.push(mixedColor.r, mixedColor.g, mixedColor.b);
            }
        }

        const geometry = new THREE.BufferGeometry();

        const positionAttribute = new THREE.Float32BufferAttribute(positions, 3);
        positionAttribute.setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute('position', positionAttribute);

        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 8,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        let count = 0;

        const animate = () => {
            const positionAttribute = geometry.attributes.position;
            const colorAttribute = geometry.attributes.color;
            const positions = positionAttribute.array as Float32Array;
            const colors = colorAttribute.array as Float32Array;

            // Mouse projection
            const mouseX3D = mouseRef.current.x * 2000;
            const mouseZ3D = -mouseRef.current.y * 1000;

            let i = 0;
            for (let ix = 0; ix < AMOUNTX; ix++) {
                for (let iy = 0; iy < AMOUNTY; iy++) {
                    const index = i * 3;
                    const px = originalPositions[index];
                    const pz = originalPositions[index + 2];

                    // Organic Wave Movement
                    const wave1 = Math.sin(ix * 0.1 + count) * 0.5 + Math.sin(iy * 0.1 + count) * 0.5;
                    const wave2 = Math.sin(ix * 0.3 + count * 2) * 0.2 + Math.sin(iy * 0.3 + count * 1.5) * 0.2;
                    let py = (wave1 + wave2) * 100;

                    // Mouse Interaction
                    const dx = px - mouseX3D;
                    const dz = pz - mouseZ3D;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    const radius = 600;

                    if (dist < radius) {
                        const force = (1 - dist / radius);
                        py += Math.sin(force * Math.PI) * 150;
                    }

                    positions[index + 1] = py;

                    // Dynamic Colors
                    const heightFactor = (py + 100) / 300;

                    // Depth-based gradient
                    const depthFactor = 1 - (iy / AMOUNTY);
                    const baseColor = color1.clone().lerp(color2, depthFactor * 0.6);

                    // Add height highlight (Cyan/White mix)
                    const finalColor = baseColor.lerp(color2, Math.max(0, heightFactor * 0.5));

                    colors[index] = finalColor.r;
                    colors[index + 1] = finalColor.g;
                    colors[index + 2] = finalColor.b;

                    i++;
                }
            }

            positionAttribute.needsUpdate = true;
            colorAttribute.needsUpdate = true;

            renderer.render(scene, camera);
            count += 0.05;

            animationFrameIdRef.current = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        // Start animation
        animate();

        sceneRef.current = {
            scene,
            camera,
            renderer,
            particles,
        };

        return () => {
            window.removeEventListener('resize', handleResize);

            if (animationFrameIdRef.current !== null) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }

            if (sceneRef.current) {
                sceneRef.current.scene.traverse((object) => {
                    if (object instanceof THREE.Points) {
                        object.geometry.dispose();
                        if (Array.isArray(object.material)) {
                            object.material.forEach((material) => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });

                sceneRef.current.renderer.dispose();
                // Force context loss to be safe
                sceneRef.current.renderer.forceContextLoss();

                if (containerRef.current && containerRef.current.contains(sceneRef.current.renderer.domElement)) {
                    containerRef.current.removeChild(sceneRef.current.renderer.domElement);
                }

                sceneRef.current = null;
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn('pointer-events-none fixed inset-0 -z-10', className)}
            {...props}
        />
    );
}
