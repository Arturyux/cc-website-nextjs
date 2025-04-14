"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
// Import noise so that it's attached to the global object
import "../lib/noise";

export default function Blop() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Register the GSAP ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    // Set up a scroll-triggered animation on the canvas element.
    // Here we simply animate its scale based on scroll progress.
    gsap.to(canvasRef.current, {
      scale: 0.8,
      scrollTrigger: {
        trigger: canvasRef.current,
        start: "top top",    // When the top of the canvas reaches the top of the viewport
        end: "bottom top",   // When the bottom of the canvas reaches the top of the viewport
        scrub: true,         // Smoothly animate the scale along scroll
      },
    });

    // Get the canvas and context
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Set canvas dimensions to match the viewport
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Blob parameters
    const cx = width / 2;     // Center X (adjusted for your layout)
    const cy = height / 2;    // Center Y
    const baseRadius = 450;     // Base radius of the blob
    const amplitude = 50;       // Maximum deviation (bumpiness)
    const noiseScale = 1.0;     // Noise sampling scale
    const steps = 360;          // Number of points around the blob

    let t = 0; // Time parameter for animation

    function draw() {
      ctx.clearRect(0, 0, width, height);

      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const nx = Math.cos(angle) * noiseScale;
        const ny = Math.sin(angle) * noiseScale;
        // Add a time offset to animate the noise field
        const offset = noise.simplex2(nx + t, ny + t) * amplitude;
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

      // Create a radial gradient fill for the blob
      const gradient = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        baseRadius + amplitude
      );
      gradient.addColorStop(0, "#f5dab0"); // inner color
      gradient.addColorStop(1, "#FFBE5A"); // outer color

      ctx.fillStyle = gradient;
      ctx.fill();

      // Increment time and schedule the next frame
      t += 0.005;
      requestAnimationFrame(draw);
    }

    draw();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute -bottom-70 -right-190 z-[-1] pointer-events-none bg-transparent"
    />
  );
}