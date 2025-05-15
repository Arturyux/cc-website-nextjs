// app/flag-game/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FlagFlipperGame } from "@/components/game/flag-flipper/FlagFlipperGame";
import { Scoreboard } from "@/components/game/flag-flipper/Scoreboard";
// import { SettingsView } from "@/components/game/flag-flipper/SettingsView"; 
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
} from "@clerk/nextjs";

export default function FlagGamePage() {
  const [currentView, setCurrentView] = useState("menu");
  const [lastGameScore, setLastGameScore] = useState(null);
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    let timerId;
    if (currentView === "countdown" && countdown > 0) {
      timerId = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (currentView === "countdown" && countdown === 0) {
      setCurrentView("game");
    }
    return () => clearTimeout(timerId);
  }, [currentView, countdown]);

  const handleStartGamePress = () => {
    setLastGameScore(null);
    setCountdown(3);
    setCurrentView("countdown");
  };

  const handleShowScoreboard = () => {
    setCurrentView("scoreboard");
  };

  // const handleShowSettings = () => {
  //   setCurrentView("settings");
  // };

  const handleBackToMenu = () => {
    setCurrentView("menu");
  };

  const handleGameEnd = (score) => {
    setLastGameScore(score);
    setCurrentView("menu");
  };

  const renderView = () => {
    if (!isLoaded || !isSignedIn) {
      return <p className="text-center text-xl text-slate-300">Loading...</p>;
    }

    let userNameForDisplay = "Player";
    let userIdForDisplay = null;
    if (user) {
      const firstName = user.firstName || "";
      const lastName = user.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      userNameForDisplay = fullName || firstName || "Player";
      userIdForDisplay = user.id;
    }

    switch (currentView) {
      case "countdown":
        return (
          <div className="flex flex-col items-center text-center">
            <p className="mb-2 text-3xl font-semibold text-sky-300">
              Get ready, {userNameForDisplay}!
            </p>
            {userIdForDisplay && (
              <p className="mb-6 text-sm text-slate-400">ID: {userIdForDisplay}</p>
            )}
            <p className="text-9xl font-bold text-yellow-400 animate-ping" style={{ animationDuration: '1s' }}>
              {countdown > 0 ? countdown : "Go!"}
            </p>
          </div>
        );
      case "game":
        return <FlagFlipperGame onGameEnd={handleGameEnd} />;
      case "scoreboard":
        return <Scoreboard onBackToMenu={handleBackToMenu} />;
      // case "settings": 
      //   return <SettingsView onBackToMenu={handleBackToMenu} />;
      case "menu":
      default:
        return (
          <div className="flex flex-col items-center space-y-6">
            {userNameForDisplay !== "Player" && (
              <p className="mb-8 text-2xl font-semibold text-sky-300">
                Welcome, {userNameForDisplay}!
              </p>
            )}
            {/* {userIdForDisplay && (
              <p className="mb-3 text-xs text-slate-400">
                ID: {userIdForDisplay}
              </p>
            )} */}
            {lastGameScore !== null && (
              <p className="mb-4 text-xl text-yellow-300">
                Your last score: {lastGameScore}
              </p>
            )}
            <button
              onClick={handleStartGamePress}
              className="w-64 rounded-lg bg-green-500 px-8 py-4 text-xl font-bold text-white shadow-lg transition-transform duration-150 hover:scale-105 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-opacity-75"
            >
              Start Game
            </button>
            <button
              onClick={handleShowScoreboard}
              className="w-64 rounded-lg bg-sky-500 px-8 py-4 text-xl font-bold text-white shadow-lg transition-transform duration-150 hover:scale-105 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-opacity-75"
            >
              Scoreboard
            </button>
            {/* <button 
              onClick={handleShowSettings}
              className="w-64 rounded-lg bg-gray-500 px-8 py-4 text-xl font-bold text-white shadow-lg transition-transform duration-150 hover:scale-105 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-75"
            >
              Settings
            </button> */}
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-sky-800 p-4 text-white">
      <header className="mb-8 text-center">
        <h1 className="mb-2 text-5xl font-bold text-yellow-400">
          Flag Flipper Challenge!
        </h1>
        {isLoaded && isSignedIn && (currentView === "menu" || currentView === "countdown" || currentView === "settings") && (
          <p className="text-lg text-slate-300">
            Test your flag knowledge. 15 seconds on the clock!
          </p>
        )}
      </header>
      <SignedIn>{renderView()}</SignedIn>
      <SignedOut>
        {isLoaded && (
          <div className="mt-8 flex flex-col items-center rounded-lg bg-slate-800 p-8 shadow-xl">
            <p className="mb-4 text-xl text-slate-200">Redirecting...</p>
            <p className="mb-6 text-slate-300">
              You need to be signed in to play. If you are not redirected,
              please
              <SignInButton mode="modal" afterSignInUrl="/flag-game">
                <button className="ml-1 text-sky-400 underline hover:text-sky-300">
                  sign in
                </button>
              </SignInButton>
              .
            </p>
          </div>
        )}
        {!isLoaded && (
          <p className="text-center text-xl text-slate-300">
            Loading authentication...
          </p>
        )}
      </SignedOut>
    </div>
  );
}
