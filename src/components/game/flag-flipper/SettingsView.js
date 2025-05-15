// src/components/game/flag-flipper/SettingsView.jsx
"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

async function updateShowPublicNameSetting(showPublicName) {
  const response = await fetch("/api/user/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ showPublicName }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to update setting");
  }
  return response.json();
}

export function SettingsView({ onBackToMenu }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const queryClient = useQueryClient();
  const [showNameLocally, setShowNameLocally] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      if (typeof user.publicMetadata?.showPublicName === 'boolean') {
        setShowNameLocally(user.publicMetadata.showPublicName);
      } else {
        setShowNameLocally(true);
      }
    }
  }, [isLoaded, user]);

  const mutation = useMutation({
    mutationFn: updateShowPublicNameSetting,
    onSuccess: (data) => {
      toast.success("Preference updated!");
    },
    onError: (error, variables_showPublicName) => { 
      toast.error(`Error: ${error.message}`);
      setShowNameLocally(!variables_showPublicName);
    },
  });

  const handleToggleShowName = () => {
    if (!isSignedIn) { 
      toast.error("You must be signed in to change settings.");
      return;
    }
    const newShowNameState = !showNameLocally;
    setShowNameLocally(newShowNameState);
    mutation.mutate(newShowNameState);
  };

  if (!isLoaded) {
    return <p className="text-center text-slate-300">Loading settings...</p>;
  }

  if (!isSignedIn) {
    return (
        <div className="w-full max-w-md rounded-xl bg-slate-800 p-6 text-white shadow-2xl text-center">
            <p className="text-slate-300 mb-4">Please sign in to manage your display settings.</p>
            <button
              onClick={onBackToMenu}
              className="rounded-lg bg-blue-500 px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors duration-150 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-75"
            >
              Back to Menu
            </button>
        </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-slate-800 p-6 text-white shadow-2xl">
      <h2 className="mb-6 text-center text-3xl font-bold text-yellow-400">
        Display Settings
      </h2>
      <div className="mb-6 flex items-center justify-between rounded-lg bg-slate-700 p-4">
        <label htmlFor="showNameToggle" className="text-lg text-slate-200">
          Show my name publicly on scoreboard
        </label>
        <button
          id="showNameToggle"
          onClick={handleToggleShowName}
          disabled={mutation.isPending}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
            showNameLocally ? "bg-green-500" : "bg-slate-600"
          }`}
          role="switch"
          aria-checked={showNameLocally}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              showNameLocally ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      {mutation.isPending && <p className="text-sm text-sky-400 text-center">Updating...</p>}

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
