"use client";

import Blop from "@/components/Blop";
import ScrollAnimation from "@/pages/Page2";
import Main from "@/pages/Main";
import DropPath from "@/components/DropPath";


export default function Home() {
  return (
    <>
      <Blop />
      {/* <DropPath /> */}
      <div className="relative z-10 p-8 mt-50">
        <Main />
        <div className="h-[120vh]"></div>
        <ScrollAnimation />
        <div className="h-[120vh]"></div>
        
      </div>
    </>
  );
}