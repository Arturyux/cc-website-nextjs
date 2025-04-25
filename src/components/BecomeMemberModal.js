// components/BecomeMemberModal.js
"use client";

import { useState } from "react"; // Keep for local UI state if needed, but remove fetch-related states
import { motion, AnimatePresence } from "framer-motion";
import {
  useQuery,
  useMutation,
  useQueryClient, // Hook to get the query client instance
} from "@tanstack/react-query";

// --- API Fetching Functions ---

// Fetches the verification list (used by useQuery)
const fetchVerificationList = async () => {
  // Fetch the public JSON file directly for checking
  const response = await fetch("/data/MemberVerefication.json", {
    cache: "no-store", // Ensure fresh data for this specific check if needed
    // Or rely on react-query's staleTime/cacheTime for caching
  });

  if (!response.ok) {
    // Handle case where file might not exist yet (e.g., 404)
    if (response.status === 404) {
      console.log(
        "Verification file not found, returning empty list.",
      );
      return []; // Return empty array if file doesn't exist
    }
    throw new Error(
      `Failed to fetch verification list: ${response.statusText}`,
    );
  }
  return response.json(); // Returns the array of { userID: "..." } objects
};

// Adds a user to the verification list (used by useMutation)
const addUserToVerification = async (userId) => {
  if (!userId) {
    throw new Error("User information not available.");
  }

  const response = await fetch("/api/user/userverification", { // Correct API route
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId: userId }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || `HTTP error! status: ${response.status}`,
    );
  }

  return result; // Return the success response from the API
};

// --- Component ---

export default function BecomeMemberModal({ isOpen, onClose, user }) {
  const queryClient = useQueryClient(); // Get query client instance

  // --- React Query Hooks ---

  // Query to fetch the verification list and check user status
  const {
    data: verificationList, // The array from MemberVerefication.json
    isLoading: isLoadingCheck, // Loading state for the query
    error: checkError, // Error object if the query fails
    // refetch, // Function to manually refetch the list if needed
  } = useQuery({
    queryKey: ["verificationList"], // Unique key for this query
    queryFn: fetchVerificationList, // The function to fetch data
    enabled: isOpen && !!user?.id, // Only run query when modal is open and user ID exists
    // Optional: Configure caching behavior if needed
    // staleTime: 1000 * 60 * 5, // e.g., data is fresh for 5 minutes
    // refetchOnWindowFocus: false, // Disable refetch on window focus if desired
  });

  // Calculate if the current user is in the list based on query data
  const isInList =
    !!user?.id &&
    !!verificationList && // Ensure list is loaded
    verificationList.some((entry) => entry.userID === user.id);

  // Mutation to add the user to the verification list
  const {
    mutate: submitVerification, // Function to trigger the mutation
    isPending: isLoadingAdd, // True if the mutation is in progress
    error: addError, // Error object if the mutation fails
  } = useMutation({
    mutationFn: addUserToVerification, // The function to execute
    onSuccess: () => {
      // When the mutation is successful, invalidate the query cache
      // This tells react-query to refetch the verification list automatically
      console.log("Verification added successfully, invalidating list cache.");
      queryClient.invalidateQueries({ queryKey: ["verificationList"] });
      // Optionally: Show a success toast notification here
      // onClose(); // Optionally close modal on success
    },
    onError: (err) => {
      // Handle mutation errors (e.g., show a toast notification)
      console.error("Error adding to verification list:", err);
    },
  });

  // --- Event Handlers ---

  const handleAddToVerification = () => {
    if (user?.id) {
      submitVerification(user.id); // Call the mutate function with user ID
    } else {
      console.error("Cannot submit verification: User ID is missing.");
      // Optionally set a local state error here if needed for UI feedback
    }
  };

  // Prevent closing modal when clicking inside content
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  // Determine the combined error message to display
  const displayError = addError?.message || checkError?.message || null;

  // --- Render Logic ---

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white rounded-xl shadow-2xl p-6 md:p-8 max-w-md w-full relative text-center"
            onClick={handleContentClick}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="Close modal"
            >
              {/* Close Icon SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-mainColor font-Header">
              Become a Member!
            </h2>
            <p className="text-gray-700 mb-4 text-base md:text-lg">
              Unlock exclusive benefits, event access, and become part of our
              vibrant community.
            </p>
            <p className="text-gray-600 mb-6 text-sm md:text-base">
              Click below to add yourself to the verification list. An admin
              will review your request.
            </p>

            {/* --- Verification Button --- */}
            <div className="mt-4 mb-4">
              {isLoadingCheck ? (
                <p className="text-gray-500">Checking status...</p>
              ) : (
                <button
                  onClick={handleAddToVerification}
                  disabled={isInList || isLoadingAdd} // Disable if already in list or adding
                  className={`inline-flex items-center justify-center w-full md:w-auto font-semibold py-2 px-6 rounded-lg transition-colors text-lg ${
                    isInList
                      ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                      : "bg-accentColor hover:bg-accentColor/90 text-white"
                  } ${isLoadingAdd ? "opacity-70 cursor-wait" : ""}`}
                >
                  {isLoadingAdd && ( // Show spinner when mutation is pending
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isLoadingAdd // Text reflects mutation state
                    ? "Processing..."
                    : isInList // Text reflects query state
                      ? "Request Sent (In Process)"
                      : "Add Me to Verification List"}
                </button>
              )}
            </div>
            {/* --- End Verification Button --- */}

            {displayError && ( // Show error from either query or mutation
              <p className="text-red-600 mt-2 text-sm">{displayError}</p>
            )}

            {/* Optional: Link to learn more */}
            <a
              href="/membership"
              className="text-blue-600 hover:text-blue-800 text-sm mt-4 inline-block"
              onClick={onClose}
            >
              Learn More about Membership
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
