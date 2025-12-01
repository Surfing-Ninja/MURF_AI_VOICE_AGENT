import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function Particles({ count = 2000 }) {
    const points = useRef<THREE.Points>(null!);

    const positions = useMemo(() => {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 15;     // x
            positions[i * 3 + 1] = (Math.random() - 0.5) * 15; // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 15; // z
        }
        return positions;
    }, [count]);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (points.current) {
            points.current.rotation.x = time * 0.05;
            points.current.rotation.y = time * 0.03;

            // Gentle wave effect
            const positions = points.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < count; i++) {
                const x = positions[i * 3];
                const y = positions[i * 3 + 1];
                // positions[i * 3 + 1] = y + Math.sin(time + x) * 0.002; // Subtle wave
            }
            points.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <PointMaterial
                transparent
                color="#d4a574" // Copper
                size={0.03}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

function Connections() {
    // Placeholder for lines connecting particles - for now keeping it simple with just particles
    // to ensure performance. Can add LineSegments later if needed.
    return null;
}

const ParticleNetwork: React.FC = () => {
    return (
        <div className="absolute inset-0 -z-10 bg-charcoal-900">
            <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <Particles count={1500} />
                {/* Add a subtle cyan glow */}
                <pointLight position={[10, 10, 10]} color="#00d9ff" intensity={1} distance={20} />
                <pointLight position={[-10, -10, -10]} color="#d4a574" intensity={0.5} distance={20} />
            </Canvas>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-charcoal-900/50 to-charcoal-900 pointer-events-none" />
        </div>
    );
};

export default ParticleNetwork;
