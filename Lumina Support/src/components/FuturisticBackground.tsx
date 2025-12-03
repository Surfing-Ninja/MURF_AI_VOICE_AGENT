import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FuturisticBackgroundProps {
    isConnected?: boolean;
    isProcessing?: boolean;
    audioLevel?: number;
}

// Glass Orb with fluid morphing effect - AI Nibble style
function GlassOrb({ audioLevel = 0 }) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const materialRef = useRef<THREE.ShaderMaterial>(null!);
    
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uAudioLevel: { value: 0 },
    }), []);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = time;
            materialRef.current.uniforms.uAudioLevel.value = audioLevel;
        }
        
        if (meshRef.current) {
            // Very gentle rotation
            meshRef.current.rotation.y = time * 0.08;
            meshRef.current.rotation.x = Math.sin(time * 0.15) * 0.05;
            meshRef.current.rotation.z = Math.cos(time * 0.1) * 0.03;
        }
    });

    const vertexShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vDisplacement;
        
        uniform float uTime;
        uniform float uAudioLevel;
        
        //	Simplex 3D Noise 
        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

        float snoise(vec3 v){ 
            const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
            const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 =   v - i + dot(i, C.xxx) ;

            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );

            vec3 x1 = x0 - i1 + 1.0 * C.xxx;
            vec3 x2 = x0 - i2 + 2.0 * C.xxx;
            vec3 x3 = x0 - 1. + 3.0 * C.xxx;

            i = mod(i, 289.0 ); 
            vec4 p = permute( permute( permute( 
                        i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

            float n_ = 1.0/7.0;
            vec3  ns = n_ * D.wyz - D.xzx;

            vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );

            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);

            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );

            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));

            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);

            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;

            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }
        
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            
            // Smooth, fluid distortion - gentler and rounder
            float audioBoost = 1.0 + uAudioLevel * 0.5;
            
            // Very slow, smooth large waves - reduced frequency for rounder look
            float wave1 = snoise(position * 0.5 + uTime * 0.08) * 0.12;
            // Gentle medium waves
            float wave2 = snoise(position * 0.8 + uTime * 0.12) * 0.08;
            // Soft flowing detail
            float wave3 = snoise(position * 1.2 - uTime * 0.1) * 0.05;
            
            // Smoother displacement with sine smoothing
            float rawDisplacement = (wave1 + wave2 + wave3) * audioBoost;
            float displacement = sin(rawDisplacement * 3.14159) * 0.15;
            vDisplacement = displacement;
            
            vec3 newPosition = position + normal * displacement;
            
            vPosition = newPosition;
            vWorldPosition = (modelMatrix * vec4(newPosition, 1.0)).xyz;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
    `;

    const fragmentShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vDisplacement;
        
        uniform float uTime;
        uniform float uAudioLevel;
        
        void main() {
            vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
            
            // Fresnel effect for glass-like rim lighting
            float fresnel = pow(1.0 - max(dot(viewDirection, vNormal), 0.0), 2.5);
            
            // Copper/Bronze color palette
            vec3 deepCopper = vec3(0.45, 0.22, 0.1);     // Dark copper interior
            vec3 brightCopper = vec3(0.85, 0.45, 0.2);   // Bright copper highlights
            vec3 lightGold = vec3(1.0, 0.75, 0.4);       // Light gold for edges
            vec3 roseGold = vec3(0.95, 0.6, 0.5);        // Rose gold accent
            vec3 white = vec3(1.0, 0.95, 0.85);          // Warm white highlights
            
            // Swirling internal patterns
            float pattern1 = sin(vPosition.x * 2.0 + vPosition.y * 1.5 + uTime * 0.3) * 0.5 + 0.5;
            float pattern2 = sin(vPosition.y * 2.5 - vPosition.z * 2.0 - uTime * 0.25) * 0.5 + 0.5;
            float pattern3 = sin(vPosition.z * 1.8 + vPosition.x * 2.0 + uTime * 0.35) * 0.5 + 0.5;
            
            // Mix base colors with swirling patterns
            vec3 baseColor = mix(deepCopper, brightCopper, pattern1 * 0.6);
            baseColor = mix(baseColor, roseGold, pattern2 * 0.3);
            
            // Add displacement-based color variation
            float dispColor = smoothstep(-0.3, 0.3, vDisplacement);
            baseColor = mix(baseColor, lightGold, dispColor * 0.4);
            
            // Strong fresnel edge glow
            vec3 edgeColor = mix(lightGold, white, fresnel * 0.5);
            vec3 color = mix(baseColor, edgeColor, fresnel * 0.7);
            
            // Add specular highlights
            vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            float specular = pow(max(dot(reflect(-lightDir, vNormal), viewDirection), 0.0), 32.0);
            color += white * specular * 0.4;
            
            // Inner glow effect
            float innerGlow = (1.0 - fresnel) * 0.3;
            color += brightCopper * innerGlow;
            
            // Glass-like transparency - more opaque at edges
            float alpha = 0.75 + fresnel * 0.25;
            
            // Audio reactivity - subtle brightness boost
            color += lightGold * uAudioLevel * 0.15;
            
            gl_FragColor = vec4(color, alpha);
        }
    `;

    return (
        <mesh ref={meshRef} position={[0, 0.3, 0]}>
            <sphereGeometry args={[1.5, 256, 256]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </mesh>
    );
}

// Scene
function Scene({ audioLevel = 0 }) {
    return (
        <>
            <GlassOrb audioLevel={audioLevel} />
            
            {/* Warm copper lighting */}
            <ambientLight intensity={0.4} />
            <pointLight position={[5, 5, 5]} color="#d4853a" intensity={0.8} distance={20} />
            <pointLight position={[-3, -2, 3]} color="#b87333" intensity={0.4} distance={15} />
            <pointLight position={[0, 3, 2]} color="#ffd4a8" intensity={0.3} distance={10} />
        </>
    );
}

const FuturisticBackground: React.FC<FuturisticBackgroundProps> = ({ 
    isConnected = false, 
    isProcessing = false,
    audioLevel = 0
}) => {
    return (
        <div className="fixed inset-0 -z-10">
            {/* Gradient background - copper/bronze theme */}
            <div 
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(180deg, #d4853a 0%, #8b4513 15%, #4a2810 30%, #2a1a0d 50%, #1a100a 70%, #0d0806 100%)'
                }}
            />
            
            {/* Three.js Canvas */}
            <Canvas 
                camera={{ position: [0, 0, 5.5], fov: 45 }}
                dpr={[1, 2]}
                gl={{ alpha: true, antialias: true }}
            >
                <Scene audioLevel={audioLevel} />
            </Canvas>
            
            {/* Subtle copper glow behind orb */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                    width: '60vmin',
                    height: '60vmin',
                    background: 'radial-gradient(circle, rgba(212,133,58,0.2) 0%, rgba(139,69,19,0.08) 50%, transparent 70%)',
                    filter: 'blur(30px)',
                    transform: 'translate(-50%, -45%)',
                }}
            />
        </div>
    );
};

export default FuturisticBackground;
