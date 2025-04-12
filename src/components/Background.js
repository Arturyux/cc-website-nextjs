"use client";

import { useEffect, useState } from "react";

// Define an array of SVG patterns (these are React elements)
const patterns = [

  (<svg
    version="1.0"
    xmlns="http://www.w3.org/2000/svg"
    width="91.000000pt"
    height="199.000000pt"
    viewBox="0 0 91.000000 199.000000"
    preserveAspectRatio="xMidYMid meet"
  >
    <metadata>
      Created by potrace 1.10, written by Peter Selinger 2001-2011
    </metadata>
    <g
      transform="translate(0.000000,199.000000) scale(0.100000,-0.100000)"
      fill="#7FB3C5"
      stroke="none"
    >
      <path d="M210 1967 c-31 -15 -69 -82 -63 -108 7 -25 84 -103 120 -122 15 -8
        65 -35 109 -61 45 -25 87 -46 93 -46 6 0 11 -4 11 -9 0 -5 12 -16 28 -24 15
        -8 57 -30 94 -49 37 -20 69 -34 72 -31 2 2 15 -1 28 -8 12 -7 27 -12 32 -11 4
        2 18 -3 30 -10 38 -25 83 -22 111 6 30 30 32 69 5 96 -11 11 -20 22 -20 25 0
        13 -167 165 -181 165 -5 0 -9 5 -9 10 0 6 -6 10 -14 10 -8 0 -16 7 -20 15 -3
        8 -12 15 -20 15 -8 0 -16 3 -18 8 -7 15 -218 122 -241 122 -8 0 -17 3 -21 7
        -13 13 -101 13 -126 0z m121 -23 c135 -40 331 -165 460 -293 31 -31 64 -67 73
        -82 14 -23 14 -27 0 -47 -8 -12 -24 -22 -35 -22 -21 0 -185 52 -215 69 -11 5
        -68 39 -129 74 -60 35 -142 82 -181 105 -79 46 -124 91 -124 126 0 39 43 83
        86 85 6 1 35 -6 65 -15z"/>
      <path d="M431 1355 c-41 -14 -58 -49 -35 -72 44 -45 268 -71 307 -36 9 9 17
        25 17 36 0 21 -34 56 -57 58 -7 1 -16 2 -20 3 -8 2 -109 15 -153 20 -14 2 -40
        -2 -59 -9z m146 -26 c91 -21 98 -24 98 -44 0 -17 -9 -21 -60 -26 -67 -6 -161
        13 -185 37 -13 14 -13 17 4 30 24 17 78 18 143 3z"/>
      <path d="M259 1116 c-2 -2 -26 -7 -54 -9 -68 -8 -122 -32 -162 -74 -31 -31
        -34 -39 -31 -83 3 -30 12 -59 26 -78 21 -27 26 -28 90 -25 37 1 83 5 102 8 19
        3 58 7 85 10 28 2 73 7 100 10 28 4 61 8 75 10 54 7 86 14 115 25 28 11 71 20
        104 22 25 2 71 50 71 73 0 30 -57 85 -89 86 -71 3 -129 8 -156 14 -34 7 -270
        16 -276 11z m321 -40 c25 -3 63 -8 85 -11 24 -3 49 -15 64 -29 22 -23 23 -26
        9 -47 -22 -33 -215 -81 -378 -94 -46 -4 -87 -8 -91 -11 -3 -2 -46 -6 -95 -10
        -104 -7 -128 5 -139 67 -11 63 58 124 160 140 54 8 310 5 385 -5z"/>
      <path d="M713 758 c-13 -6 -23 -15 -23 -20 0 -4 -5 -8 -11 -8 -20 0 -103 -44
        -122 -65 -27 -29 -49 -74 -42 -85 20 -33 124 -48 133 -20 2 5 10 10 17 10 8 0
        20 8 27 18 7 9 32 32 55 50 36 28 42 38 39 63 -3 27 -31 70 -45 68 -3 0 -16
        -5 -28 -11z m37 -42 c15 -19 7 -33 -57 -89 -58 -50 -83 -62 -119 -53 -53 14
        -18 69 78 120 73 39 81 41 98 22z"/>
      <path d="M790 528 c-14 -17 -35 -42 -48 -56 -27 -32 -154 -283 -147 -290 3 -3
        1 -10 -5 -17 -8 -10 -15 -74 -11 -115 1 -21 64 -43 100 -35 39 8 55 29 81 100
        12 33 29 78 37 100 16 43 60 194 68 235 3 14 8 36 11 49 4 17 -1 28 -18 39
        -33 24 -40 23 -68 -10z m48 -21 c16 -19 -61 -295 -123 -439 -6 -16 -34 -30
        -60 -33 -24 -2 -55 28 -55 55 0 42 54 180 111 285 18 32 103 144 110 145 4 0
        11 -6 17 -13z"/>
    </g>
  </svg>),
];

export default function BackgroundPatterns() {
  const [selectedPattern, setSelectedPattern] = useState(null);

  useEffect(() => {
    // Randomly pick one pattern from the array when the component mounts
    const randomIndex = Math.floor(Math.random() * patterns.length);
    setSelectedPattern(patterns[randomIndex]);
  }, []);

  return (
    <div className="absolute md:m-50 inset-0 -z-1">
      {selectedPattern}
    </div>
  );
}