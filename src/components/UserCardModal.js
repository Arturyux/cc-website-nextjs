"use client";

import React, { useState, useEffect } from "react";
import Blop from "./Blop";

const getUserStatusInfo = (user) => {
  if (!user) return { text: "N/A", color: "gray", styleKey: "default" };
  if (user?.publicMetadata?.admin === true)
    return { text: "Board Member", color: "purple", styleKey: "admin" };
  if (user?.publicMetadata?.committee === true)
    return { text: "Committee", color: "orange", styleKey: "committee" };
  if (user?.publicMetadata?.member === true)
    return { text: "Member", color: "blue", styleKey: "member" };
  return { text: "User", color: "gray", styleKey: "default" };
};

const getStatusBadgeClass = (color) => {
  switch (color) {
    case "purple": return "bg-purple-200/80 text-purple-900";
    case "orange": return "bg-orange-200/80 text-orange-900";
    case "blue": return "bg-blue-200/80 text-blue-900";
    case "gray": default: return "bg-gray-300/80 text-gray-900";
  }
};

const getCardBackgroundStyle = (styleKey) => {
  switch (styleKey) {
    case "admin": return "bg-gradient-to-br from-yellow-400 to-amber-500 text-black";
    case "committee": return "bg-gradient-to-l from-orange-600 to-yellow-500 text-black";
    case "member": return "bg-gradient-to-br from-blue-400 to-indigo-500 text-black";
    case "default": default: return "bg-gray-100 text-gray-800";
  }
};

const getBlopProps = (styleKey) => {
  switch (styleKey) {
    case "admin": return { color1: "#fef9c3", color2: "#fef08a", noiseAmplitude: 30, noiseScale: 0.6 };
    case "committee": return { color1: "#ffedd5", color2: "#fed7aa", noiseAmplitude: 40, noiseScale: 0.8 };
    case "member": return { color1: "#dbeafe", color2: "#bfdbfe", noiseAmplitude: 35, noiseScale: 0.7 };
    default: return { color1: "#e5e7eb", color2: "#d1d5db", noiseAmplitude: 30, noiseScale: 1 };
  }
};

const MOBILE_BREAKPOINT = 768;

export default function UserCardModal({ isOpen, onClose, user }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (!isOpen) {
    return null;
  }

  const statusInfo = getUserStatusInfo(user);
  const cardBackgroundClass = getCardBackgroundStyle(statusInfo.styleKey);
  const blopBaseProps = getBlopProps(statusInfo.styleKey);
  const badgeClasses = getStatusBadgeClass(statusInfo.color);

  const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.emailAddresses?.[0]?.emailAddress || "Unknown User" : "N/A";
  const userEmail = user ? user.emailAddresses?.[0]?.emailAddress || "N/A" : "N/A";
  const isUserFreezed = user ? user.publicMetadata?.freezed === true : false;

  const blopSize = isMobile ? 350 : 450;
  const blopX = isMobile ? blopSize * 0.4 : blopSize * 0.35;
  const blopY = isMobile ? blopSize * 0.4 : blopSize * 0.35;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${
        isOpen ? "flex" : "hidden pointer-events-none"
      }`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[rgb(0,0,0,0.8)]"></div>
      <div
        className={`
          relative rounded-xl w-full
          max-w-4xl
          h-[60%] md:h-[350px]
          overflow-hidden shadow-2xl
          transition-all duration-300 ease-in-out transform
          rotate-0 origin-center
          ${isOpen ? "scale-100 flex" : "scale-95 hidden"}
          ${cardBackgroundClass}
        `}
        onClick={(e) => e.stopPropagation()}
      >
         <button
           onClick={onClose}
           className={`absolute top-3 right-3 z-30 p-1.5 rounded-full transition-colors ${
             statusInfo.styleKey === 'default'
               ? 'bg-gray-300/50 hover:bg-gray-400/70 text-gray-800'
               : 'bg-black/20 hover:bg-black/30 text-white'
           }`}
           aria-label="Close user details"
         >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
             <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
           </svg>
         </button>
        <div className={`relative w-full h-full flex items-center justify-center p-6 md:p-10 ${statusInfo.styleKey !== 'default' ? 'overflow-hidden' : ''}`}>
          {statusInfo.styleKey !== 'default' && user && (
            <div className="absolute inset-0 z-0">
              <Blop
                size={blopSize}
                x={blopX}
                y={blopY}
                color1={blopBaseProps.color1}
                color2={blopBaseProps.color2}
                noiseAmplitude={blopBaseProps.noiseAmplitude}
                noiseScale={blopBaseProps.noiseScale}
              />
            </div>
          )}
          {statusInfo.styleKey !== 'default' && (
            <img
              src="/cc.svg"
              alt="Logo"
              className="absolute top-4 left-4 md:top-6 md:left-6 z-10 w-16 h-16 md:w-20 md:h-20 opacity-70 pointer-events-none"
            />
          )}
          {statusInfo.styleKey !== 'default' && user && (
            <div className="relative z-20 bg-gray-300/50 rounded-lg p-6 text-center text-inherit space-y-3 w-full max-w-md px-4">
              <h2 id="user-modal-title" className="text-3xl md:text-4xl font-bold mb-4 drop-shadow-md">
                {userName}
              </h2>
              <div className="text-base md:text-xl drop-shadow-sm">
                <span className="font-medium">Email:</span> {userEmail}
              </div>
              <div className="text-base md:text-xl drop-shadow-sm">
                <span className="font-medium">Status:</span>{" "}
                <span className={`px-2.5 py-1 inline-flex text-lg leading-5 font-semibold rounded-full ${badgeClasses}`}>
                  {statusInfo.text}
                </span>
              </div>
              <div className="text-base md:text-xl drop-shadow-sm">
                <span className="font-medium">Account Freezed:</span>{" "}
                <span className={`font-semibold ${isUserFreezed ? "text-red-700" : "text-green-700"}`}>
                  {isUserFreezed ? "Yes" : "No"}
                </span>
              </div>
            </div>
          )}
          {statusInfo.styleKey === 'default' && (
            <div className="relative z-20 text-center px-4">
              <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">
                Become a Member!
              </h3>
              <p className="text-sm md:text-base text-gray-500 mb-6">
                Join our community to get your personalized member card.
              </p>
              <button
                onClick={() => { onClose(); }}
                className="px-5 py-2 md:px-6 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors text-sm md:text-base"
              >
                Sign Up / Learn More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
