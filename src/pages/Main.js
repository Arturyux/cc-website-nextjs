"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

// Register the ScrollTrigger plugin with GSAP
gsap.registerPlugin(ScrollTrigger);

export default function MainPage() {
  const { t } = useTranslation('common');
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
<div className=" p-2 md:ml-56 ml-2 md:grid md:grid-cols-3 block">
  {/* Left Column: Text Content */}
  <div className="">
    <h1 className="font-Header text-mainColor md:text-9xl text-8xl font-bold">Culture</h1>
    <h1 className="font-Header text-mainColor md:text-9xl text-8xl font-bold">Connection</h1>
    <p className="font-Main text-xl">{t('description')}</p>
    <button className="relative col-span-full p-4 mt-10 text-white bg-baseColor rounded-full font-Header text-4xl">
    {t('button')}
    </button>
  </div>
  
  {/* Right Column: Two Images */}
  <div className="col-span-2 justify-center md:block hidden">
    <img
      src="https://api2.cultureconnection.se/assets/crafts-pictures/1329877326598639678_1329877314674364548.jpg"
      className="absolute rounded-full left-210 w-154 h-154 object-cover"
    />
    <img
      src="https://welcome.cultureconnection.se/assets/CCLogo-D0TRwCJL.png"
      className="absolute rounded-full left-180 w-80 object-cover"
    />
  </div>
</div>
  );
}