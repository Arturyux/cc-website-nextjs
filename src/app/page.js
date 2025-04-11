"use client";

import Blop from "@/components/Blop";
import ScrollAnimation from "@/components/ScrollAnimation";
import DropPath from "@/components/DropPath";


export default function Home() {
  return (
    <>
      <Blop />
      {/* <DropPath /> */}
      <div className="relative z-10 p-8 mt-100">
        <h1 className="text-4xl font-bold">Welcome to Culture Connection Webpage!</h1>
        <p className="mt-4">
          Aliqua mollit occaecat elit in mollit deserunt mollit et et enim. Reprehenderit adipisicing in deserunt ipsum. Ad eu duis occaecat adipisicing elit dolore cillum proident duis aute pariatur sunt ut ad.Est et officia exercitation ullamco consequat proident laborum quis. Sint Lorem ut ut duis exercitation exercitation. Nostrud anim proident do elit do. Nulla magna voluptate anim minim exercitation dolor ea ex cillum excepteur ad. Mollit aliqua sunt eu do ut ut sunt cillum ex dolore ex. Dolore ea dolore consectetur do nostrud reprehenderit occaecat elit. Proident amet occaecat ea et.

        </p>
        <div className="h-[120vh]"></div>
        <ScrollAnimation />
        <div className="h-[120vh]"></div>
        
      </div>
    </>
  );
}