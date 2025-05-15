"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

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
  const response = await fetch(`/api/user/details`, {
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

async function deleteScoresForGame(gameName) {
  const response = await fetch(
    `/api/game/score?gameName=${encodeURIComponent(gameName)}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || "Failed to delete scores for the game",
    );
  }
  return response.json();
}

export function Scoreboard({ onBackToMenu, gameName = "flag_flipper" }) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const queryClient = useQueryClient();

  const isAdmin = isUserLoaded && user?.publicMetadata?.admin === true;

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
    return [...new Set(rawScores.map((s) => s.user_id).filter((id) => id))];
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

  const resetScoreboardMutation = useMutation({
    mutationFn: deleteScoresForGame,
    onSuccess: (data) => {
      toast.success(data.message || "Scoreboard reset successfully!");
      queryClient.invalidateQueries({ queryKey: ["rawGameScores", gameName] });
    },
    onError: (error) => {
      toast.error(`Error resetting scoreboard: ${error.message}`);
    },
  });

  const handleResetScoreboard = () => {
    if (
      window.confirm(
        `Are you sure you want to reset all scores for "${gameName}"? This action cannot be undone.`,
      )
    ) {
      resetScoreboardMutation.mutate(gameName);
    }
  };

  const enrichedScores = React.useMemo(() => {
    if (!rawScores || !usersDetailsMap) return [];
    return rawScores.map((scoreItem) => {
      const userData = usersDetailsMap[scoreItem.user_id];
      return {
        ...scoreItem,
        user_name: userData ? userData.name : "Player",
      };
    });
  }, [rawScores, usersDetailsMap]);

  const isLoading =
    isLoadingScores || (userIdsToFetch.length > 0 && isLoadingUserDetails);
  const error = scoresError || userDetailsError;

  return (
    <div className="w-full max-w-md rounded-xl bg-slate-800 p-6 text-white shadow-2xl">
      <h2 className="mb-6 text-center text-3xl font-bold text-yellow-400">
        High Scores
      </h2>
      {isLoading && (
        <p className="text-center text-slate-300">Loading scores...</p>
      )}
      {error && (
        <p className="text-center text-red-400">
          Error loading scores: {error.message}
        </p>
      )}
      {!isLoading && !error && enrichedScores.length === 0 && (
        <p className="text-center text-slate-300">
          No scores recorded yet for this game.
        </p>
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
      <div className="mt-8 flex flex-col items-center space-y-4">
        <button
          onClick={onBackToMenu}
          className="w-full max-w-xs rounded-lg bg-blue-500 px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors duration-150 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-75"
        >
          Back to Menu
        </button>
        {isAdmin && (
          <button
            onClick={handleResetScoreboard}
            disabled={resetScoreboardMutation.isPending}
            className="w-full max-w-xs rounded-lg bg-red-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors duration-150 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resetScoreboardMutation.isPending
              ? "Resetting..."
              : "Reset Scoreboard (Admin)"}
          </button>
        )}
      </div>
    </div>
  );
}
