"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger);

export default function PaintBrushEffect() {
  const brushRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Define the motion path for the brush stroke.
    // Adjust these points to achieve the desired curve.
    const path = [
      { x: 50, y: 50 },
      { x: 150, y: 100 },
      { x: 250, y: 200 },
      { x: 350, y: 250 },
      { x: 450, y: 350 },
      { x: 550, y: 450 },
      { x: 650, y: window.innerHeight - 50 },
    ];

    // Animate the brush (the main image) along the defined path.
    gsap.to(brushRef.current, {
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
      motionPath: {
        path,
        autoRotate: true,
        alignOrigin: [0.5, 0.5],
      },
      ease: "none",
    });

    // Create a trail by cloning the brush element several times.
    // These clones will animate along the same path with a staggered delay and fading opacity.
    const clones = [];
    const numClones = 15; // Adjust for stroke density
    for (let i = 0; i < numClones; i++) {
      // Clone the brush element.
      const clone = brushRef.current.cloneNode(true);
      // Set the clone's initial style
      clone.style.position = "absolute";
      // Each subsequent clone is more transparent.
      clone.style.opacity = (0.9 - i * 0.05).toString();
      containerRef.current.appendChild(clone);
      clones.push(clone);
    }

    gsap.to(clones, {
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
      motionPath: {
        path,
        autoRotate: true,
        alignOrigin: [0.5, 0.5],
      },
      ease: "none",
      stagger: 0.1,
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 pointer-events-none"
    >
      {/* Main brush element - this uses your brush image */}
      <img
        ref={brushRef}
        src="/languageSv.jpeg"
        alt="Brush"
        className="w-16 h-16"
      />
    </div>
  );
}