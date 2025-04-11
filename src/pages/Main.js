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
      { opacity: 0, y: 100 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 100%",
          end: "bottom 20%",
          scrub: true,
        },
      }
    );
  }, []);

  return (
<div className=" p-2 md:ml-76 ml-30 grid grid-cols-3">
  {/* Left Column: Text Content */}
  <div className="mt-30">
    <h1 className="font-Header text-mainColor text-9xl font-bold">Culture</h1>
    <h1 className="font-Header text-mainColor text-9xl font-bold">Connection</h1>
    <button className="relative p-4 mt-10 text-white bg-baseColor rounded-full font-Header text-4xl">
      Get to Know Us
    </button>
  </div>
  
  {/* Right Column: Two Images */}
  <div className="col-span-2 mx-40 md:opacity-100 md:w-auto opacity-0 w-1">
    <img
      src="https://api2.cultureconnection.se/assets/crafts-pictures/1329877326598639678_1329877314674364548.jpg"
      className="absolute rounded-full ml-20 w-164 h-164 object-cover"
    />
    <img
      src="https://welcome.cultureconnection.se/assets/CCLogo-D0TRwCJL.png"
      className="absolute rounded-full mr-80 -top-10 w-82 h-82 object-cover"
    />
  </div>
</div>
  );
}