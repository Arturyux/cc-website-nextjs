"use client";

import { useRef, useEffect } from "react";
import "../lib/noise";

const getNoise = (x, y) => {
  const noiseFn = window.noise?.simplex2;
  return typeof noiseFn === "function" ? noiseFn(x, y) : 0;
};

export default function Blop({
  x = 0,
  y = 0,
  size = 400,
  color1 = "#f5dab0",
  color2 = "#FFBE5A",
  noiseAmplitude = 40,
  noiseScale = 0.8,
  noiseSpeed = 0.005,
}) {
  const canvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const timeRef = useRef(0);
  const ctxRef = useRef(null);
  const animatedColorsRef = useRef({
    c1: color1,
    c2: color2,
  });

  useEffect(() => {
    animatedColorsRef.current.c1 = color1;
    animatedColorsRef.current.c2 = color2;
  }, [color1, color2]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext("2d");
      if (!ctxRef.current) {
        console.error("Failed to get 2D context");
        return;
      }
    }
    const ctx = ctxRef.current;
    const baseRadius = size / 2;
    const steps = 180;
    const cx = x;
    const cy = y;
    const draw = () => {
      if (!ctx) {
        animationFrameIdRef.current = requestAnimationFrame(draw);
        return;
      }

      timeRef.current += noiseSpeed;
      const t = timeRef.current;
      const clearRadius = baseRadius + noiseAmplitude + 10;
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(
        cx - clearRadius,
        cy - clearRadius,
        clearRadius * 2,
        clearRadius * 2,
      );
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const nx = Math.cos(angle) * noiseScale;
        const ny = Math.sin(angle) * noiseScale;
        const offset = getNoise(nx + t, ny + t) * noiseAmplitude;
        const r = baseRadius + offset;
        const pointX = cx + r * Math.cos(angle);
        const pointY = cy + r * Math.sin(angle);

        if (i === 0) {
          ctx.moveTo(pointX, pointY);
        } else {
          ctx.lineTo(pointX, pointY);
        }
      }
      ctx.closePath();

      const gradient = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        baseRadius + noiseAmplitude,
      );
      gradient.addColorStop(0, animatedColorsRef.current.c1);
      gradient.addColorStop(1, animatedColorsRef.current.c2);

      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
      animationFrameIdRef.current = requestAnimationFrame(draw);
    };

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const newWidth = rect.width;
      const newHeight = rect.height;
      canvas.width = Math.round(newWidth * dpr);
      canvas.height = Math.round(newHeight * dpr);
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
      if (!animationFrameIdRef.current) {
        console.log("Starting draw loop after resize.");
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }
        draw();
      }
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
        animationFrameIdRef.current = null;
      }
      ctxRef.current = null;
    };
  }, [x, y, size, noiseAmplitude, noiseScale, noiseSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute top-[0px] left-[0px] w-full h-full z-[-1] pointer-events-none bg-transparent`}
    />
  );
}
