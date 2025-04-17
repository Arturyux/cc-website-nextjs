"use client";

const patterns = [
  "/patterns/patern.svg",
  "/patterns/pattern2.svg",
  "/patterns/pattern3.svg"
];

const selectedPattern = patterns[0];
const selectedPattern1 = patterns[1];
const selectedPattern2 = patterns[2];

export default function Background() {
  return (
    <>
    <div className="absolute w-full h-full">
      <div className="absolute md:w-[8%] w-[15%] md:top-45 md:left-30 top-35 left-0 md:rotate-0 rotate-45 -z-1">
        <img src={selectedPattern} alt="Background Pattern" />
      </div>
      <div className="absolute md:top-170 md:left-150 md:w-[20%] w-[70%] top-150 left-70 -z-1">
        <img src={selectedPattern1} alt="Background Pattern" />
      </div>
      <div className="absolute md:top-380 md:left-280 md:w-[10%] w-[30%] top-350 left-90 -z-1 rotate-220">
        <img src={selectedPattern} alt="Background Pattern" />
      </div>
      <div className="absolute md:top-270 md:left-45 md:w-[20%] w-[70%] top-205 -left-15 -z-1 md:rotate-240 rotate-260">
        <img src={selectedPattern2} alt="Background Pattern" />
      </div>
    </div>
    </>
  );
}