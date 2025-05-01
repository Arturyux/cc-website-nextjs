// src/components/Achievements/ManageAchievementUsersModal.js
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const modalVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.15 } },
};

const formatDate = (isoDateString) => {
    if (!isoDateString) return null;
    try {
        const dateObj = new Date(isoDateString);
        if (isNaN(dateObj.getTime())) return "Invalid Date";
        return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return "Error formatting date"; }
};

const fetchAllUsers = async () => {
    const response = await fetch('/api/user');
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
        throw new Error(errorData.message || "Failed to fetch users");
    }
    return response.json();
};

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}


export default function ManageAchievementUsersModal({
  isOpen,
  onClose,
  achievementData,
  patchUserMutation,
  isAdmin,
}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingChanges, setPendingChanges] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const { data: allUsers = [], isLoading: isLoadingUsers, isError: isUsersError, error: usersError } = useQuery({
      queryKey: ['allUsers'],
      queryFn: fetchAllUsers,
      enabled: isOpen,
      staleTime: 5 * 60 * 1000,
  });

  const originalStatusMap = useMemo(() => {
    const map = new Map();
    achievementData?.userHas?.forEach(u => {
        map.set(u.userID, { achieved: u.achived, count: u.attendanceCount || 0, date: u.date, score: u.score });
    });
    return map;
  }, [achievementData]);

  useEffect(() => {
    if (isOpen) {
      setPendingChanges({});
      setSaveError(null);
    }
  }, [isOpen, achievementData]);


  const handleSetAchieved = (targetUserId, shouldAchieve) => {
    setPendingChanges(prev => {
        const original = originalStatusMap.get(targetUserId) || { achieved: false, count: 0, score: null };
        const currentPending = prev[targetUserId] || {};
        return {
            ...prev,
            [targetUserId]: {
                ...currentPending,
                achieved: shouldAchieve,
                originalStatus: original
            }
        };
    });
  };

  const handleUpdateCount = (targetUserId, change) => {
     const original = originalStatusMap.get(targetUserId) || { achieved: false, count: 0, score: null };
     const currentPending = pendingChanges[targetUserId];
     const currentCount = currentPending?.count ?? original.count;
     const neededCount = achievementData?.attendanceNeed;
     const newCount = Math.max(0, currentCount + change);

     if (change > 0 && typeof neededCount === 'number' && newCount > neededCount) {
         return;
     }

     setPendingChanges(prev => ({
        ...prev,
        [targetUserId]: {
            ...prev[targetUserId],
            count: newCount,
            originalStatus: original
        }
     }));
  };

  const handleScoreChange = (targetUserId, value) => {
      const original = originalStatusMap.get(targetUserId) || { achieved: false, count: 0, score: null };
      setPendingChanges(prev => ({
          ...prev,
          [targetUserId]: {
              ...prev[targetUserId],
              scoreInput: value,
              originalStatus: original
          }
      }));
  };

  const triggerUpdateScore = (targetUserId, value) => {
      const scoreValue = parseInt(value, 10);
      if (!isNaN(scoreValue)) {
          patchUserMutation.mutate({
              achievementId: achievementData.id,
              targetUserId,
              action: 'updateScore',
              score: scoreValue,
          });
      } else if (value === '') {
            patchUserMutation.mutate({
              achievementId: achievementData.id,
              targetUserId,
              action: 'updateScore',
              score: 0,
          });
      }
  };

  const debouncedUpdateScore = useMemo(() => debounce(triggerUpdateScore, 750), [achievementData?.id, patchUserMutation]);


  const handleSaveChanges = async () => {
      setIsSaving(true);
      setSaveError(null);
      const mutationsToRun = [];

      for (const userId in pendingChanges) {
          const changes = pendingChanges[userId];
          const original = changes.originalStatus;

          if (changes.hasOwnProperty('achieved') && changes.achieved !== original.achieved) {
              mutationsToRun.push(
                  patchUserMutation.mutateAsync({
                      achievementId: achievementData.id,
                      targetUserId: userId,
                      action: 'setAchieved',
                      achieved: changes.achieved,
                  })
              );
          }

          if (changes.hasOwnProperty('count') && changes.count !== original.count) {
               mutationsToRun.push(
                  patchUserMutation.mutateAsync({
                      achievementId: achievementData.id,
                      targetUserId: userId,
                      action: 'updateCount',
                      countChange: changes.count - original.count,
                  })
              );
          }

          if (changes.hasOwnProperty('scoreInput')) {
              const newScoreValue = changes.scoreInput === '' ? 0 : parseInt(changes.scoreInput, 10);
              const originalScoreValue = original.score ?? null;

              if (!isNaN(newScoreValue) && newScoreValue !== originalScoreValue) {
                  mutationsToRun.push(
                      patchUserMutation.mutateAsync({
                          achievementId: achievementData.id,
                          targetUserId: userId,
                          action: 'updateScore',
                          score: newScoreValue,
                      })
                  );
              }
          }
      }

      if (mutationsToRun.length === 0) {
          setIsSaving(false);
          return;
      }

      try {
          const results = await Promise.allSettled(mutationsToRun);
          const failedMutations = results.filter(r => r.status === 'rejected');
          if (failedMutations.length > 0) {
              const errorMessages = failedMutations.map(f => f.reason?.message || 'Unknown error').join(', ');
              setSaveError(`Some updates failed: ${errorMessages}`);
              console.error("Some mutations failed:", failedMutations);
          } else {
              setPendingChanges({});
          }
          queryClient.invalidateQueries({ queryKey: ['achievements'] });

      } catch (error) {
          console.error("Error saving changes:", error);
          setSaveError(error.message || "An unexpected error occurred during save.");
      } finally {
          setIsSaving(false);
      }
  };


  const filteredUserList = useMemo(() => {
      if (!allUsers) return [];
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      if (!lowerCaseSearchTerm) return allUsers;
      return allUsers.filter(user =>
        user.fullName.toLowerCase().includes(lowerCaseSearchTerm) ||
        user.id.toLowerCase().includes(lowerCaseSearchTerm)
      );
  }, [allUsers, searchTerm]);


  if (!isOpen || !achievementData) return null;

  const isCounterAchievement = achievementData.attendanceCounter && typeof achievementData.attendanceNeed === 'number';
  const isScoreAchievement = achievementData.onScore === true;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4"
          initial="hidden" animate="visible" exit="exit" variants={modalVariants}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-3xl w-full relative max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()} variants={modalVariants}
          >
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Manage Users for: {achievementData.title}</h2>
              {isCounterAchievement && (
                <p className="text-sm text-gray-600 mt-1">
                    Attendance Needed: <span className="font-semibold">{achievementData.attendanceNeed}</span>
                </p>
              )}
              {isScoreAchievement && ( <p className="text-sm text-gray-600 mt-1"> Scoring Enabled </p> )}
              <input
                type="text"
                placeholder="Search Users by Name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="p-5 overflow-y-auto flex-grow">
              {saveError && <p className="text-red-500 text-sm mb-3">Save Error: {saveError}</p>}
              {isLoadingUsers && <p className="text-center text-gray-500">Loading users...</p>}
              {isUsersError && <p className="text-center text-red-500">Error loading users: {usersError.message}</p>}

              {!isLoadingUsers && !isUsersError && filteredUserList.length === 0 && (
                <p className="text-gray-500 italic text-center">
                    {searchTerm ? 'No users match your search.' : 'No users found.'}
                </p>
              )}

              {!isLoadingUsers && !isUsersError && filteredUserList.length > 0 && (
                <ul className="space-y-2">
                  {filteredUserList.map((user) => {
                    const originalStatus = originalStatusMap.get(user.id) || { achieved: false, count: 0, date: null, score: null };
                    const pending = pendingChanges[user.id] || {};
                    const displayStatus = { ...originalStatus, ...pending };

                    const isProcessing = patchUserMutation.isPending && patchUserMutation.variables?.targetUserId === user.id;
                    const achievedDate = formatDate(displayStatus.date);
                    const disableIncrement = isProcessing || isSaving || (isCounterAchievement && displayStatus.count >= achievementData.attendanceNeed);
                    const scoreInputValue = pending.hasOwnProperty('scoreInput') ? pending.scoreInput : (displayStatus.score ?? '');

                    const requirementMet = isCounterAchievement &&
                                           !displayStatus.achieved &&
                                           displayStatus.count >= achievementData.attendanceNeed;
                    let liBgClass = 'bg-white';
                    if (requirementMet) {
                        liBgClass = 'bg-green-100';
                    }
                    if (isProcessing || isSaving) {
                        liBgClass = 'bg-gray-100 opacity-50';
                    }


                    return (
                      <li key={user.id} className={`p-3 border rounded-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors ${liBgClass}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate" title={user.id}>
                            {user.fullName || `User ID: ${user.id}`}
                          </p>
                          {displayStatus.achieved && achievedDate && <p className="text-xs text-green-600">Achieved: {achievedDate}</p>}
                          {displayStatus.achieved && isScoreAchievement && displayStatus.score !== null && ( <p className="text-xs text-blue-600">Score: {displayStatus.score}</p> )}
                           {requirementMet && (
                               <p className="text-xs text-green-700 font-medium mt-0.5">Requirement Met!</p>
                           )}
                        </div>

                        <div className="flex items-center justify-end flex-wrap gap-2 pt-2 sm:pt-0">
                          {isScoreAchievement && (
                              <div className="flex items-center space-x-1">
                                  <label htmlFor={`score-${user.id}`} className="text-xs font-medium text-gray-600">Score:</label>
                                  <input
                                      type="number"
                                      id={`score-${user.id}`}
                                      value={scoreInputValue}
                                      onChange={(e) => handleScoreChange(user.id, e.target.value)}
                                      disabled={isProcessing || isSaving}
                                      className="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                      placeholder="-"
                                  />
                              </div>
                          )}

                          {achievementData.attendanceCounter && (
                            <div className="flex items-center space-x-1 border border-gray-300 rounded px-1.5 py-0.5">
                              <button type="button" onClick={() => handleUpdateCount(user.id, -1)} disabled={isProcessing || isSaving} className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Decrement count"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Z" clipRule="evenodd" /></svg> </button>
                              <span className="text-sm font-mono w-6 text-center">{displayStatus.count}</span>
                              <button type="button" onClick={() => handleUpdateCount(user.id, 1)} disabled={disableIncrement || isSaving} className="text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Increment count"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg> </button>
                            </div>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleSetAchieved(user.id, !displayStatus.achieved)}
                              disabled={isProcessing || isSaving}
                              className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                         ${displayStatus.achieved ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'}`}
                            >
                              {isProcessing ? '...' : (displayStatus.achieved ? 'Revoke' : 'Grant')}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="p-4 bg-gray-50 flex justify-end border-t space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition" disabled={isSaving}>Cancel</button>
              <button
                type="button"
                onClick={handleSaveChanges}
                className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition ${isSaving || Object.keys(pendingChanges).length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isSaving || Object.keys(pendingChanges).length === 0}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
