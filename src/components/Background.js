"use client";

const patterns = [
  "/patterns/patern.svg",
  "/patterns/pattern2.svg",
];

// Select a specific pattern from the array (for example, index 0)
const selectedPattern = patterns[0];
const selectedPattern1 = patterns[1];

export default function Background() {
  return (
    <>
    <div className="absolute w-full h-full">
      <div className="absolute md:w-[8%] w-[15%] md:top-45 md:left-30 top-35 left-0 md:rotate-0 rotate-45 -z-1">
        <img src={selectedPattern} alt="Background Pattern" />
      </div>
      <div className="absolute md:top-170 md:left-150 md:w-[20%] w-[70%] top-170 left-70 -z-1">
        <img src={selectedPattern1} alt="Background Pattern" />
      </div>
    </div>
    </>
  );
}