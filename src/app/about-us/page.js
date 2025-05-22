"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Header from "@/components/Header";
import CulturePictureSlider from "@/components/CulturePictureSlider";

export default function MainPage() {
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
    
  <>
  <Header />
  <div className=" p-2 bg-blue-200 mt-50 md:ml-56 ml-2 md:grid md:grid-cols-3 block">
    {/* Left Column: Text Content */}
    <div className="">
      <h1 className="font-Header text-mainColor md:text-9xl gap-2 text-8xl font-bold">About Us</h1>
      <p className="font-Main mb-10 text-xl">We are a fun and active association that strives for inclusiveness, bridging and building communities with our variety of non-alcohol based events.</p>
      <p className="font-Main  mb-10 text-xl">Come explore new hobbies with us. Our activities are beginner friendly, all levels are welcome, so let's discover your new favorite game, craft or sport! </p>
      <p className="font-Main text-xl">Check out our social media pages or events tab for more information. </p>
    </div>
    
      {/* Right Column: Two Images */}
      <div className="md:col-span-2 justify-center hidden md:flex">
       <CulturePictureSlider />
      </div>
  </div>
  </>
  );
}