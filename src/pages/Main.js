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
      className="p-2 mx-56"
    >
        <h1 className="font-Header text-mainColor text-9xl font-bold">Culture</h1>
        <h1 className="font-Header text-mainColor text-9xl font-bold">Connection</h1>
        <p className="mt-4">
          Aliqua mollit occaecat elit in mollit deserunt mollit et et enim. Reprehenderit adipisicing in deserunt ipsum. Ad eu duis occaecat adipisicing elit dolore cillum proident duis aute pariatur sunt ut ad.Est et officia exercitation ullamco consequat proident laborum quis. Sint Lorem ut ut duis exercitation exercitation. Nostrud anim proident do elit do. Nulla magna voluptate anim minim exercitation dolor ea ex cillum excepteur ad. Mollit aliqua sunt eu do ut ut sunt cillum ex dolore ex. Dolore ea dolore consectetur do nostrud reprehenderit occaecat elit. Proident amet occaecat ea et.

        </p>
    </div>
  );
}