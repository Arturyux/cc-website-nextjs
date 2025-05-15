"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import * as FlagDataModule from "@/lib/flag-data";
const { flags, getRandomFlag, getRandomOptions } = FlagDataModule;

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useMutation } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

const GAME_DURATION = 15;
const WRONG_ANSWER_FREEZE_DURATION = 1000;

export function FlagFlipperGame({ onGameEnd }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const [currentFlag, setCurrentFlag] = useState(null);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [internalGameState, setInternalGameState] = useState("loading");
  const [feedback, setFeedback] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const gameContainerRef = useRef(null);
  const wrongAnswerFreezeTimeoutRef = useRef(null);

  const { mutate: saveScore, isPending: isSavingScore } = useMutation({
    mutationFn: async (gameResult) => {
      const { score: finalScore, userId: clientUserId } = gameResult;
      console.log("Mutation: saveScore called with score:", finalScore, "and clientUserId:", clientUserId);
      if (!clientUserId) {
        console.error("Mutation: Client-side userId is MISSING when trying to save score.");
        throw new Error("User ID missing on client for saving score");
      }
      const response = await fetch("/api/game/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: finalScore,
          gameName: "flag_flipper",
          userId: clientUserId,
        }),
      });
      console.log("Mutation: API response status:", response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
        console.error("Mutation: API error response data:", errorData);
        throw new Error(errorData.message || "Failed to save score");
      }
      const responseData = await response.json();
      console.log("Mutation: API success response data:", responseData);
      return responseData;
    },
    onSuccess: (data) => {
      console.log("Mutation: onSuccess triggered with data:", data);
      toast.success("Score saved successfully!");
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    },
    onError: (error) => {
      console.error("Mutation: onError triggered:", error.message, error);
      toast.error(`Error saving score: ${error.message}`);
    },
  });

  const setupNewRound = useCallback(() => {
    setFeedback("");
    if (typeof getRandomFlag === "function" && typeof getRandomOptions === "function") {
      const newFlag = getRandomFlag(flags);
      if (newFlag) {
        setCurrentFlag(newFlag);
        const newOptions = getRandomOptions(newFlag, flags, 2);
        setOptions(newOptions);
      } else {
        console.error("Failed to get a new flag.");
        setInternalGameState("over");
      }
    } else {
      console.error("Flag utility functions are missing.");
      setInternalGameState("over");
    }
    setIsTransitioning(false);
  }, []);

  const handleAnswer = useCallback((chosenName) => {
    if (internalGameState !== "playing" || isTransitioning || !currentFlag) {
      return;
    }
    setIsTransitioning(true);
    if (chosenName === currentFlag.name) {
      setScore((prevScore) => prevScore + 1);
      setFeedback("Correct!");
      if (timeLeft > 0) {
        setupNewRound();
      } else {
        setInternalGameState("over");
        setIsTransitioning(false);
      }
    } else {
      setFeedback("Wrong!");
      if (wrongAnswerFreezeTimeoutRef.current) {
        clearTimeout(wrongAnswerFreezeTimeoutRef.current);
      }
      wrongAnswerFreezeTimeoutRef.current = setTimeout(() => {
        if (timeLeft > 0 && internalGameState === "playing") {
          setupNewRound();
        } else {
          setInternalGameState("over");
          setIsTransitioning(false);
        }
      }, WRONG_ANSWER_FREEZE_DURATION);
    }
  }, [internalGameState, isTransitioning, currentFlag, timeLeft, setupNewRound]);

  useEffect(() => {
    return () => {
      if (wrongAnswerFreezeTimeoutRef.current) {
        clearTimeout(wrongAnswerFreezeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setTimeLeft(GAME_DURATION);
    setScore(0);
    setFeedback("");
    setCurrentFlag(null);
    setOptions([]);
    gameContainerRef.current?.focus();
    setIsTransitioning(true);
    setupNewRound();
    setInternalGameState("playing");
  }, [setupNewRound]);

  useEffect(() => {
    if (internalGameState !== "playing" || timeLeft <= 0) {
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timerId);
          setInternalGameState("over");
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [internalGameState, timeLeft]);

  useEffect(() => {
    if (internalGameState === "over") {
      console.log("Game Over Effect: Final Score:", score, "User from useUser():", JSON.stringify(user), "isLoaded:", isLoaded, "isSignedIn:", isSignedIn);
      if (wrongAnswerFreezeTimeoutRef.current) {
        clearTimeout(wrongAnswerFreezeTimeoutRef.current);
      }
      if (score > 0 && !isSavingScore) {
        if (isLoaded && isSignedIn && user && user.id) {
          console.log("Game Over Effect: Attempting to save score:", score, "for userId:", user.id);
          saveScore({ score: score, userId: user.id });
        } else {
          console.error("Game Over Effect: Cannot save score, client-side user session issue.", { userId: user?.id, isLoaded, isSignedIn });
          toast.error("Could not save score: User session issue. Please refresh or sign in again.");
        }
      } else if (score <= 0) {
        console.log("Game Over Effect: Score is 0 or less, not saving.");
      } else if (isSavingScore) {
        console.log("Game Over Effect: Already attempting to save score.");
      }
      setIsTransitioning(false);
      if (onGameEnd) {
        console.log("Game Over Effect: Calling onGameEnd callback.");
        onGameEnd(score);
      }
    }
  }, [internalGameState, score, saveScore, onGameEnd, isSavingScore, user, isLoaded, isSignedIn]);


  useEffect(() => {
    const handleKeyDown = (event) => {
      if (internalGameState !== "playing" || isTransitioning || options.length < 2) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleAnswer(options[0]);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleAnswer(options[1]);
      }
    };
    if (internalGameState === "playing") {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [internalGameState, isTransitioning, options, handleAnswer]);

  if (internalGameState === "loading" || (internalGameState === "playing" && isTransitioning && !feedback)) {
    return (
      <div
        ref={gameContainerRef}
        tabIndex={-1}
        className="w-full max-w-2xl text-center text-xl text-slate-300 outline-none"
      >
        Loading next flag...
      </div>
    );
  }

  if (internalGameState === "over") {
    return (
      <div className="flex flex-col items-center rounded-lg bg-slate-800 p-8 text-center shadow-xl">
        <h2 className="mb-4 text-4xl font-bold text-yellow-400">Game Over!</h2>
        <p className="mb-2 text-2xl text-slate-200">
          Your final score: <span className="font-bold">{score}</span>
        </p>
        {isSavingScore && <p className="text-lg text-sky-400">Saving your score...</p>}
      </div>
    );
  }

  return (
    <div
      ref={gameContainerRef}
      tabIndex={-1}
      className="w-full max-w-2xl rounded-xl bg-slate-800 p-6 shadow-2xl md:p-8 outline-none"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="text-2xl font-semibold text-sky-400">
          Score: <span className="text-yellow-400">{score}</span>
        </div>
        <div className="text-2xl font-semibold text-red-400">
          Time: <span className="text-yellow-400">{timeLeft}s</span>
        </div>
      </div>
      {currentFlag && options.length === 2 && (
        <>
          <div className="mb-6 flex h-48 items-center justify-center rounded-lg bg-slate-700 p-4 md:h-64">
            <img
              src={currentFlag.imageUrl}
              alt="Country Flag"
              className="max-h-full max-w-full rounded-md object-contain shadow-lg"
            />
          </div>
          {feedback && (
            <div
              className={`mb-4 rounded p-3 text-center text-lg font-semibold ${
                feedback === "Correct!"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {feedback}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <button
              onClick={() => handleAnswer(options[0])}
              disabled={isTransitioning}
              className="group flex h-24 transform flex-col items-center justify-center rounded-lg bg-slate-700 p-4 text-center text-lg font-medium text-slate-100 shadow-md transition-all duration-150 hover:bg-sky-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 disabled:cursor-not-allowed disabled:opacity-60 md:h-32 md:text-xl"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mb-2 text-2xl text-sky-400 transition-transform duration-150 group-hover:scale-110 md:text-3xl"/>
              <span>{options[0]}</span>
            </button>
            <button
              onClick={() => handleAnswer(options[1])}
              disabled={isTransitioning}
              className="group flex h-24 transform flex-col items-center justify-center rounded-lg bg-slate-700 p-4 text-center text-lg font-medium text-slate-100 shadow-md transition-all duration-150 hover:bg-sky-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 disabled:cursor-not-allowed disabled:opacity-60 md:h-32 md:text-xl"
            >
              <FontAwesomeIcon icon={faArrowRight} className="mb-2 text-2xl text-sky-400 transition-transform duration-150 group-hover:scale-110 md:text-3xl"/>
              <span>{options[1]}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
