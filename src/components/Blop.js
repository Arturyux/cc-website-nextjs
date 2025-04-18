"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap"; 
import "../lib/noise"; 

const getNoise = (x, y) => {
  const noiseFn = window.noise?.simplex2;
  return typeof noiseFn === "function" ? noiseFn(x, y) : 0;
};

export default function Blop({
  centerX: propCenterX,
  centerY: propCenterY,
}) {
  const canvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const timeRef = useRef(0); 

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get 2D context");
      return;
    }

    // --- Parameters ---
    const amplitude = 40;
    const noiseScale = 0.8;
    const steps = 360;

    // --- State Variables (managed within useEffect) ---
    let width;
    let height;
    let cx; 
    let cy; 
    let baseRadius;

    const draw = () => {
      if (!ctx || width === undefined || height === undefined) {
        animationFrameIdRef.current = requestAnimationFrame(draw);
        return;
      }

      timeRef.current += 0.005;
      const t = timeRef.current;
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();

      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const nx = Math.cos(angle) * noiseScale;
        const ny = Math.sin(angle) * noiseScale;
        const offset = getNoise(nx + t, ny + t) * amplitude;
        const r = baseRadius + offset;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      const gradient = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        baseRadius + amplitude,
      );
      gradient.addColorStop(0, "#f5dab0");
      gradient.addColorStop(1, "#FFBE5A");

      ctx.fillStyle = gradient;
      ctx.fill();

      // Schedule the next frame for continuous animation
      animationFrameIdRef.current = requestAnimationFrame(draw);
    };

    const handleResize = () => {
      // Update canvas dimensions
      width = window.innerWidth;
      height = window.innerHeight;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }

      baseRadius = Math.min(450, Math.min(width, height) * 0.25);
      cx = propCenterX ?? width / 2;
      cy = propCenterY ?? height / 2;
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    draw();
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (canvas) {
        gsap.killTweensOf(canvas);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // Fixed position, covers viewport, behind content, non-interactive
      className= {`absolute top-[0px] left-[0px] w-full h-full z-[-1] pointer-events-none bg-transparent`}
    />
  );
}
