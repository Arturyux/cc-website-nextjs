"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

// Register the ScrollTrigger plugin with GSAP
gsap.registerPlugin(ScrollTrigger);

export default function ScrollAnimation() {
  const animationRef = useRef(null);

  useEffect(() => {
    const el = animationRef.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          end: "bottom 20%",
          scrub: true,
        },
      }
    );
  }, []);

  return (
    <div
      ref={animationRef}
      className="p-8 bg-gray-200 rounded-lg shadow-lg max-w-3xl mx-auto mt-20"
    >
      <h2 className="text-2xl font-bold mb-4">Scroll Trigger Animation</h2>
      <p>
        This content fades in and moves upward as you scroll the page. GSAP's
        ScrollTrigger makes it smooth and easy to set up!
      </p>
    </div>
  );
}