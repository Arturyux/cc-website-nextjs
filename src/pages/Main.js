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
<div className=" p-2 md:ml-76 ml-2 md:grid md:grid-cols-3 block">
  {/* Left Column: Text Content */}
  <div className="">
    <h1 className="font-Header text-mainColor md:text-9xl text-8xl font-bold">Culture</h1>
    <h1 className="font-Header text-mainColor md:text-9xl text-8xl font-bold">Connection</h1>
    <p className="font-Main text-xl">Veniam dolore labore irure mollit sunt cillum duis magna. In ipsum laboris cillum quis est. Aliqua mollit pariatur voluptate elit amet consectetur Lorem aliqua. Tempor consequat in consequat ut aute incididunt aliqua incididunt fugiat ex fugiat sint magna. Aute id excepteur duis et voluptate consectetur in incididunt commodo ea laboris nostrud.</p>
    <button className="relative col-span-full p-4 mt-10 text-white bg-baseColor rounded-full font-Header text-4xl">
      Get to Know Us
    </button>
  </div>
  
  {/* Right Column: Two Images */}
  <div className="col-span-2 justify-center md:block hidden">
    <img
      src="https://api2.cultureconnection.se/assets/crafts-pictures/1329877326598639678_1329877314674364548.jpg"
      className="absolute rounded-full left-260 w-154 h-154 object-cover"
    />
    <img
      src="https://welcome.cultureconnection.se/assets/CCLogo-D0TRwCJL.png"
      className="absolute rounded-full left-230 w-80 object-cover"
    />
  </div>
</div>
  );
}