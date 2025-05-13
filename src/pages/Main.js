"use client";

import Link from "next/link";

export default function MainPage() {

  return (
    <div
      className="p-2 md:ml-56 ml-2 md:grid md:grid-cols-4 block"
    >
      {/* Left Column: Text Content */}
      <div className="md:col-span-2">
        <h1 className="font-Header text-mainColor md:text-9xl text-8xl font-bold">
          Culture
        </h1>
        <h1 className="font-Header text-mainColor md:text-9xl text-8xl font-bold">
          Connection
        </h1>
        <p className="font-Main text-xl">
          We are a fun and active association that strives for inclusiveness,
          bridging and building communities with our variety of non-alcohol
          based events.
        </p>
        <Link
          href="/about-us"
          className="relative inline-block mt-10 px-10 p-4 text-white bg-baseColor rounded-full font-Header text-4xl hover:scale-110"
        >
          <p>About us</p>
        </Link>
      </div>

      {/* Right Column: Two Images */}
      <div className="md:col-span-2 justify-center hidden md:flex">
        <img
          src="https://api2.cultureconnection.se/assets/crafts-pictures/1329877326598639678_1329877314674364548.jpg"
          className="absolute rounded-full w-154 h-154 object-cover"
          alt="Crafts"
        />
        <img
          src="https://welcome.cultureconnection.se/assets/CCLogo-D0TRwCJL.png"
          className="absolute rounded-full left-180 w-80 object-cover"
          alt="Culture Connection Logo"
        />
      </div>
    </div>
  );
}
