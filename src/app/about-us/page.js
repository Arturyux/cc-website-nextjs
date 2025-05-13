"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Header from "@/components/Header";

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
      <h1 className="font-Header text-mainColor md:text-9xl text-8xl font-bold">About Us</h1>
      <p className="font-Main text-xl">Esse et aliquip deserunt veniam elit velit amet ut consectetur pariatur. Ullamco aute sunt sint proident mollit eu ullamco ea minim irure qui veniam officia nulla. Voluptate magna enim irure consectetur in non aliquip. Duis eiusmod velit culpa id ad ullamco amet sit culpa cillum. Consectetur quis occaecat Lorem amet ex proident.</p>
    </div>
    
    {/* Right Column: Two Images */}
    <div className="col-span-2 justify-center md:block hidden">
      <img
        src="https://welcome.cultureconnection.se/assets/CCLogo-D0TRwCJL.png"
        className="absolute rounded-full left-210 w-154 h-154 object-cover"
      />
      <img
        src="https://welcome.cultureconnection.se/assets/CCLogo-D0TRwCJL.png"
        className="absolute rounded-full left-180 w-80 object-cover"
      />
    </div>
  </div>
  <div className=" p-2 md:ml-56 ml-2 mr-150 bg-blue-200">
    <p className="font-Main text-xl">Esse et aliquip deserunt veniam elit velit amet ut consectetur pariatur. Ullamco aute sunt sint proident mollit eu ullamco ea minim irure qui veniam officia nulla. Voluptate magna enim irure consectetur in non aliquip. Duis eiusmod velit culpa id ad ullamco amet sit culpa cillum. Consectetur quis occaecat Lorem amet ex proident.</p>
  </div>
  <div className=" p-2 md:ml-56 ml-2 mr-20 mb-40 bg-blue-200">
    <p className="font-Main text-xl">Esse et aliquip deserunt veniam elit velit amet ut consectetur pariatur. Ullamco aute sunt sint proident mollit eu ullamco ea minim irure qui veniam officia nulla. Voluptate magna enim irure consectetur in non aliquip. Duis eiusmod velit culpa id ad ullamco amet sit culpa cillum. Consectetur quis occaecat Lorem amet ex proident.</p>
  </div>
  </>
  );
}