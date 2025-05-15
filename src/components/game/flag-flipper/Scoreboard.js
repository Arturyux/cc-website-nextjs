"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";

async function fetchRawScores(gameName) {
  const response = await fetch(
    `/api/game/score?gameName=${encodeURIComponent(gameName)}&limit=10`,
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch scores");
  }
  return response.json();
}

async function fetchUsersDetails(userIds) {
  if (!userIds || userIds.length === 0) {
    return {};
  }
  const response = await fetch(`/api/user/details`, { // UPDATED URL HERE
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch user details");
  }
  return response.json();
}

export function Scoreboard({ onBackToMenu, gameName = "flag_flipper" }) {
  const {
    data: rawScores,
    isLoading: isLoadingScores,
    error: scoresError,
  } = useQuery({
    queryKey: ["rawGameScores", gameName],
    queryFn: () => fetchRawScores(gameName),
    enabled: true,
  });

  const userIdsToFetch = React.useMemo(() => {
    if (!rawScores || rawScores.length === 0) return [];
    return [...new Set(rawScores.map(s => s.user_id).filter(id => id))];
  }, [rawScores]);

  const {
    data: usersDetailsMap,
    isLoading: isLoadingUserDetails,
    error: userDetailsError,
  } = useQuery({
    queryKey: ["usersDetails", userIdsToFetch.join(",")],
    queryFn: () => fetchUsersDetails(userIdsToFetch),
    enabled: userIdsToFetch.length > 0,
  });

  const enrichedScores = React.useMemo(() => {
    if (!rawScores || !usersDetailsMap) return [];
    return rawScores.map(scoreItem => {
      const userData = usersDetailsMap[scoreItem.user_id];
      const displayName = (userData && userData.showPublicName)
        ? userData.name
        : "Anonymous Player";
      return {
        ...scoreItem,
        user_name: displayName || "Player",
      };
    });
  }, [rawScores, usersDetailsMap]);

  const isLoading = isLoadingScores || (userIdsToFetch.length > 0 && isLoadingUserDetails);
  const error = scoresError || userDetailsError;

  return (
    <div className="w-full max-w-md rounded-xl bg-slate-800 p-6 text-white shadow-2xl">
      <h2 className="mb-6 text-center text-3xl font-bold text-yellow-400">
        High Scores
      </h2>
      {isLoading && <p className="text-center text-slate-300">Loading scores...</p>}
      {error && (
        <p className="text-center text-red-400">
          Error loading scores: {error.message}
        </p>
      )}
      {!isLoading && !error && enrichedScores.length === 0 && (
        <p className="text-center text-slate-300">No scores recorded yet for this game.</p>
      )}
      {!isLoading && !error && enrichedScores.length > 0 && (
        <ul className="space-y-3">
          {enrichedScores.map((scoreItem, index) => (
            <li
              key={scoreItem.id || index}
              className="flex justify-between rounded-lg bg-slate-700 p-3 text-lg"
            >
              <span className="font-medium text-sky-300">
                {index + 1}. {scoreItem.user_name}
              </span>
              <span className="font-bold text-yellow-300">
                {scoreItem.score} pts
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 flex justify-center">
        <button
          onClick={onBackToMenu}
          className="rounded-lg bg-blue-500 px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors duration-150 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-75"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
