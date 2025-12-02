"use client";

import React, { useEffect, useRef, FC } from "react";
import { Renderer, Program, Mesh, Triangle, OGLRenderingContext } from "ogl";
import { cn } from "../../utils/cn";

type RaysOrigin = 
  | "top-center" 
  | "top-left" 
  | "top-right" 
  | "right" 
  | "left" 
  | "bottom-center" 
  | "bottom-right" 
  | "bottom-left";

interface LightRaysProps {
  className?: string;
  raysOrigin?: RaysOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  noiseAmount?: number;
  distortion?: number;
}

export const LightRays: FC<LightRaysProps> = ({
  className,
  raysOrigin = "top-center",
  raysColor = "#ffffff",
  raysSpeed = 1,
  lightSpread = 0.5,
  rayLength = 1.0,
  pulsating = false,
  fadeDistance = 1.0,
  saturation = 1.0,
  followMouse = false,
  mouseInfluence = 0.5,
  noiseAmount = 0.0,
  distortion = 0.0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Convert hex color to RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16) / 255,
          parseInt(result[2], 16) / 255,
          parseInt(result[3], 16) / 255,
        ]
      : [1, 1, 1];
  };

  // Get origin position based on raysOrigin prop
  const getOriginPosition = (origin: RaysOrigin): [number, number] => {
    switch (origin) {
      case "top-left": return [-0.8, 1.2];
      case "top-center": return [0.0, 1.2];
      case "top-right": return [0.8, 1.2];
      case "left": return [-1.2, 0.0];
      case "right": return [1.2, 0.0];
      case "bottom-left": return [-0.8, -1.2];
      case "bottom-center": return [0.0, -1.2];
      case "bottom-right": return [0.8, -1.2];
      default: return [0.0, 1.2];
    }
  };

  const vert = /* glsl */ `
    precision highp float;
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const frag = /* glsl */ `
    precision highp float;

    uniform float iTime;
    uniform vec3 iResolution;
    uniform vec3 rayColor;
    uniform vec2 origin;
    uniform float spread;
    uniform float rayLen;
    uniform float fade;
    uniform float sat;
    uniform float noise;
    uniform float dist;
    uniform float pulse;
    uniform vec2 mouse;
    uniform float mouseInf;
    varying vec2 vUv;

    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      uv.x *= iResolution.x / iResolution.y;

      // Calculate ray origin with mouse influence
      vec2 rayOrigin = origin;
      if (mouseInf > 0.0) {
        vec2 mouseOffset = (mouse - 0.5) * 2.0 * mouseInf;
        rayOrigin += mouseOffset;
      }

      // Direction from origin to current pixel
      vec2 dir = uv - rayOrigin;
      float dist_to_origin = length(dir);
      dir = normalize(dir);

      // Angle from origin
      float angle = atan(dir.y, dir.x);
      
      // Add distortion
      if (dist > 0.0) {
        angle += sin(dist_to_origin * 5.0 + iTime * 2.0) * dist * 0.5;
      }

      // Create ray pattern
      float rays = 0.0;
      
      // Multiple ray layers for depth
      for (float i = 1.0; i <= 3.0; i++) {
        float freq = 8.0 * i;
        float speed = iTime * (0.3 + i * 0.1);
        float rayPattern = sin(angle * freq + speed) * 0.5 + 0.5;
        rayPattern = pow(rayPattern, 3.0 - spread * 2.0);
        rays += rayPattern / i;
      }
      rays /= 2.0;

      // Add noise
      if (noise > 0.0) {
        float n = snoise(uv * 3.0 + iTime * 0.5) * noise;
        rays += n * 0.3;
      }

      // Fade based on distance from origin
      float fadeFactor = 1.0 - smoothstep(0.0, rayLen * fade * 2.0, dist_to_origin);
      rays *= fadeFactor;

      // Pulsating effect
      if (pulse > 0.0) {
        float pulseVal = sin(iTime * 2.0) * 0.3 + 0.7;
        rays *= mix(1.0, pulseVal, pulse);
      }

      // Apply color with saturation
      vec3 col = rayColor;
      float gray = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(gray), col, sat);
      
      // Final color
      vec3 finalColor = col * rays;
      
      // Soft glow at origin
      float glow = exp(-dist_to_origin * 2.0) * 0.5;
      finalColor += col * glow;

      // Output with alpha based on intensity
      float alpha = max(rays, glow) * 0.8;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const renderer = new Renderer({ 
      alpha: true, 
      premultipliedAlpha: true,
      antialias: true 
    });
    const gl = renderer.gl as OGLRenderingContext;
    container.appendChild(gl.canvas as HTMLCanvasElement);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const [r, g, b] = hexToRgb(raysColor);
    const [originX, originY] = getOriginPosition(raysOrigin);

    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: [container.offsetWidth, container.offsetHeight, 1] },
        rayColor: { value: [r, g, b] },
        origin: { value: [originX, originY] },
        spread: { value: lightSpread },
        rayLen: { value: rayLength },
        fade: { value: fadeDistance },
        sat: { value: saturation },
        noise: { value: noiseAmount },
        dist: { value: distortion },
        pulse: { value: pulsating ? 1.0 : 0.0 },
        mouse: { value: [0.5, 0.5] },
        mouseInf: { value: followMouse ? mouseInfluence : 0.0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const geometry = new Triangle(gl);
    const mesh = new Mesh(gl, { geometry, program });

    const handleResize = () => {
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      renderer.setSize(width, height);
      program.uniforms.iResolution.value = [width, height, 1];
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!followMouse) return;
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = 1.0 - (e.clientY - rect.top) / rect.height;
    };

    window.addEventListener("resize", handleResize);
    if (followMouse) {
      container.addEventListener("mousemove", handleMouseMove);
    }
    handleResize();

    let startTime = performance.now();
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      program.uniforms.iTime.value = elapsed * raysSpeed;
      
      if (followMouse) {
        program.uniforms.mouse.value = [mouseRef.current.x, mouseRef.current.y];
      }

      renderer.render({ scene: mesh });
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("resize", handleResize);
      if (followMouse) {
        container.removeEventListener("mousemove", handleMouseMove);
      }
      if (container.contains(gl.canvas as HTMLCanvasElement)) {
        container.removeChild(gl.canvas as HTMLCanvasElement);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [raysOrigin, raysColor, raysSpeed, lightSpread, rayLength, pulsating, fadeDistance, saturation, followMouse, mouseInfluence, noiseAmount, distortion]);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 w-full h-full", className)}
      style={{ pointerEvents: followMouse ? "auto" : "none" }}
    />
  );
};

export default LightRays;
