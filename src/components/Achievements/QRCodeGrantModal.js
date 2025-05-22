// src/components/Achievements/QRCodeGrantModal.js
import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faQrcode,
  faUsers,
  faCheck,
  faMinus,
  faPlus,
  faFloppyDisk,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

const html5QrCodeScannerId = "html5qr-code-full-region";

function QRCodeGrantModal({
  isOpen,
  onClose,
  achievementData,
  patchUserMutation,
  isAdmin,
  usersData = [],
  isLoadingUsers = false,
  isUsersError = false,
  usersError = null,
}) {
  const [activeTab, setActiveTab] = useState("qr");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserIdForAction, setSelectedUserIdForAction] = useState(null);
  const [selectedUserNameForAction, setSelectedUserNameForAction] =
    useState(null);
  const [manualActionStatus, setManualActionStatus] = useState({
    message: "",
    error: false,
  });
  const [userViewFilter, setUserViewFilter] = useState("all");
  const [scoreInput, setScoreInput] = useState("");
  const [optimisticSelectedUserStatus, setOptimisticSelectedUserStatus] =
    useState(null);

  const [qrCodeValue, setQrCodeValue] = useState(null);
  const [isLoadingQrToken, setIsLoadingQrToken] = useState(false);
  const [qrTokenError, setQrTokenError] = useState(null);

  const [isScanningUserQrInGrantTab, setIsScanningUserQrInGrantTab] =
    useState(false);
  const [userScanMessageInGrantTab, setUserScanMessageInGrantTab] =
    useState("");
  const html5QrCodeRef = useRef(null);

  const achievementIdForQr = achievementData?.id;
  const achievementTitle = achievementData?.title;
  const isAttendance = achievementData?.attendanceCounter === true;
  const attendanceNeedForDisplay = achievementData?.attendanceNeed;
  const isScoreEnabled = achievementData?.onScore === true;
  const isLeveledAchievement =
    achievementData?.level_config && achievementData.level_config.length > 0;

  useEffect(() => {
    if (isOpen && activeTab === "qr" && achievementIdForQr) {
      if (!qrCodeValue || achievementData?.id !== achievementIdForQr) {
        const fetchQrToken = async () => {
          setIsLoadingQrToken(true);
          setQrTokenError(null);
          setQrCodeValue(null);
          try {
            const response = await fetch("/api/qr/generate-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ achievementId: achievementIdForQr }),
            });
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.message || "Failed to fetch QR token");
            }
            setQrCodeValue(data.qrToken);
          } catch (error) {
            setQrTokenError(error.message);
            setQrCodeValue(null);
          } finally {
            setIsLoadingQrToken(false);
          }
        };
        fetchQrToken();
      }
    } else if (!isOpen) {
      setQrCodeValue(null);
      setQrTokenError(null);
      setIsLoadingQrToken(false);
      setActiveTab("qr");
      setSearchTerm("");
      setSelectedUserIdForAction(null);
      setSelectedUserNameForAction(null);
      setManualActionStatus({ message: "", error: false });
      setUserViewFilter("all");
      setScoreInput("");
      setOptimisticSelectedUserStatus(null);
      setIsScanningUserQrInGrantTab(false);
      setUserScanMessageInGrantTab("");
      if (html5QrCodeRef.current?.getState()) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    } else if (activeTab !== "qr") {
      setQrCodeValue(null);
      setQrTokenError(null);
      setIsLoadingQrToken(false);
      setIsScanningUserQrInGrantTab(false);
      setUserScanMessageInGrantTab("");
      if (html5QrCodeRef.current?.getState()) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    }
  }, [isOpen, activeTab, achievementIdForQr, achievementData?.id]);

  const handleGrantAfterUserScan = async (targetUserId, targetUserName) => {
    if (!achievementIdForQr || !patchUserMutation || patchUserMutation.isPending) {
      setUserScanMessageInGrantTab("System busy or achievement data missing.");
      return;
    }

    setUserScanMessageInGrantTab(
      `User ${targetUserName} identified. Processing action for '${achievementTitle}'...`,
    );

    let payload = {
      achievementId: achievementIdForQr,
      targetUserId: targetUserId,
    };
    let actionDescription = "";

    if (isAttendance) {
      payload.action = "updateCount";
      payload.countChange = 1;
      actionDescription = "Updating progress";
    } else {
      payload.action = "setAchieved";
      payload.achieved = true;
      actionDescription = "Granting badge";
    }

    try {
      await patchUserMutation.mutateAsync(payload);
      setUserScanMessageInGrantTab(
        `${actionDescription} successful for ${targetUserName} on '${achievementTitle}'.`,
      );
    } catch (error) {
      setUserScanMessageInGrantTab(
        `Error: ${error.message || `Failed to ${actionDescription.toLowerCase()}`}`,
      );
    }
  };

  useEffect(() => {
    if (isScanningUserQrInGrantTab && isOpen && activeTab === "qr") {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(html5QrCodeScannerId, {
          verbose: false,
        });
      }
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      html5QrCodeRef.current
        .start(
          { facingMode: "environment" },
          config,
          async (decodedText, decodedResult) => {
            if (html5QrCodeRef.current?.getState()) {
              html5QrCodeRef.current.stop().catch(console.error);
            }
            setIsScanningUserQrInGrantTab(false);
            setUserScanMessageInGrantTab("Verifying user...");
            try {
              const response = await fetch("/api/qr/verify-user-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userToken: decodedText }),
              });
              const data = await response.json();
              if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to verify user token.");
              }
              // Immediately attempt to grant/update progress
              await handleGrantAfterUserScan(data.userId, data.userName);
            } catch (error) {
              setUserScanMessageInGrantTab(`Error: ${error.message}`);
            }
          },
          (errorMessage) => {
            /* console.warn(errorMessage) */
          },
        )
        .catch((err) => {
          setUserScanMessageInGrantTab(
            `Scanner Error: ${err.message || err}`,
          );
          setIsScanningUserQrInGrantTab(false);
        });
    } else if (!isScanningUserQrInGrantTab && html5QrCodeRef.current?.getState()) {
      html5QrCodeRef.current.stop().catch(console.error);
    }
    return () => {
      if (html5QrCodeRef.current?.getState()) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [isScanningUserQrInGrantTab, isOpen, activeTab, achievementIdForQr, achievementTitle, isAttendance, patchUserMutation]);

  const userStatusMap = useMemo(() => {
    const map = new Map();
    achievementData?.userHas?.forEach((u) => {
      map.set(u.userID, {
        achieved: u.achived,
        count: u.attendanceCount || 0,
        score: u.score,
      });
    });
    return map;
  }, [achievementData]);

  const filteredUsers = useMemo(() => {
    if (!usersData) return [];
    let usersToFilter = usersData;
    if (userViewFilter === "achieved") {
      usersToFilter = usersData.filter(
        (user) =>
          userStatusMap.has(user.id) && userStatusMap.get(user.id).achieved,
      );
    }
    if (!searchTerm) return usersToFilter;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return usersToFilter.filter(
      (user) =>
        user.username?.toLowerCase().includes(lowerSearchTerm) ||
        user.firstName?.toLowerCase().includes(lowerSearchTerm) ||
        user.lastName?.toLowerCase().includes(lowerSearchTerm) ||
        user.primaryEmailAddress?.toLowerCase().includes(lowerSearchTerm),
    );
  }, [usersData, searchTerm, userViewFilter, userStatusMap]);

  const selectedUserDisplayStatus = useMemo(() => {
    if (!selectedUserIdForAction) return null;
    if (
      optimisticSelectedUserStatus &&
      optimisticSelectedUserStatus.userId === selectedUserIdForAction
    ) {
      return optimisticSelectedUserStatus.status;
    }
    return userStatusMap.get(selectedUserIdForAction) || {
      achieved: false,
      count: 0,
      score: null,
    };
  }, [selectedUserIdForAction, userStatusMap, optimisticSelectedUserStatus]);

  const handleManualAction = async (actionType) => {
    if (
      !selectedUserIdForAction ||
      !achievementIdForQr ||
      !patchUserMutation ||
      patchUserMutation.isPending
    )
      return;

    setManualActionStatus({ message: "", error: false });
    let action;
    let payload = {
      achievementId: achievementIdForQr,
      targetUserId: selectedUserIdForAction,
    };
    let predictedStatus = { ...selectedUserDisplayStatus };

    if (actionType === "grant") {
      action = "setAchieved";
      payload.action = action;
      payload.achieved = true;
      predictedStatus.achieved = true;
    } else if (actionType === "revoke") {
      action = "setAchieved";
      payload.action = action;
      payload.achieved = false;
      predictedStatus.achieved = false;
      predictedStatus.count = 0;
      predictedStatus.score = null;
    } else if (actionType === "increment") {
      action = "updateCount";
      payload.action = action;
      payload.countChange = 1;
      const newCount = (predictedStatus.count || 0) + 1;
      predictedStatus.count = newCount;
    } else if (actionType === "decrement") {
      action = "updateCount";
      payload.action = action;
      payload.countChange = -1;
      predictedStatus.count = Math.max(0, (predictedStatus.count || 0) - 1);
    } else if (actionType === "setScore") {
      const scoreValue = scoreInput === "" ? 0 : parseInt(scoreInput, 10);
      if (isNaN(scoreValue)) {
        setManualActionStatus({ message: "Invalid score value.", error: true });
        return;
      }
      action = "updateScore";
      payload.action = action;
      payload.score = scoreValue;
      predictedStatus.score = scoreValue;
    } else {
      setManualActionStatus({ message: "Invalid action type.", error: true });
      return;
    }

    setOptimisticSelectedUserStatus({
      userId: selectedUserIdForAction,
      status: predictedStatus,
    });

    try {
      await patchUserMutation.mutateAsync(payload);
      setManualActionStatus({
        message: `Action '${actionType}' sent for ${
          selectedUserNameForAction || selectedUserIdForAction
        }.`,
        error: false,
      });
    } catch (error) {
      setManualActionStatus({
        message: error.message || `Failed to ${actionType}`,
        error: true,
      });
      setOptimisticSelectedUserStatus(null);
    }
  };

  useEffect(() => {
    if (selectedUserDisplayStatus) {
      setScoreInput(selectedUserDisplayStatus.score ?? "");
    } else {
      setScoreInput("");
    }
  }, [selectedUserDisplayStatus]);

  useEffect(() => {
    setOptimisticSelectedUserStatus(null);
  }, [achievementData, selectedUserIdForAction]);

  const handleSelectUserFromList = (user) => {
    setSelectedUserIdForAction(user.id);
    setSelectedUserNameForAction(
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.username ||
        user.primaryEmailAddress,
    );
    setOptimisticSelectedUserStatus(null);
    setManualActionStatus({ message: "", error: false });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden p-0 relative border-2 border-gray-300 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors z-20 h-7 w-7 flex items-center justify-center bg-white/50 rounded-full"
              aria-label="Close modal"
            >
              <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
            </button>

            <div className="p-5 border-b border-gray-300 bg-white/30">
              <h2 className="text-xl font-bold text-center mb-3 text-gray-800">
                {achievementTitle || "Achievement"}
              </h2>
              <div className="flex justify-center border-b border-gray-300">
                <button
                  onClick={() => {
                    setActiveTab("qr");
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "qr"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <FontAwesomeIcon icon={faQrcode} /> Grant Options
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setActiveTab("manual");
                      setIsScanningUserQrInGrantTab(false); // Ensure scanner stops if switching
                    }}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "manual"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <FontAwesomeIcon icon={faUsers} /> Manual Action
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-grow">
              {activeTab === "qr" && (
                <div className="text-center">
                  <div className="mb-6">
                    <h3 className="text-md font-semibold text-gray-700 mb-2">
                      Admin: Grant to User via QR Scan
                    </h3>
                    <button
                      onClick={() => {
                        setIsScanningUserQrInGrantTab(
                          !isScanningUserQrInGrantTab,
                        );
                        setUserScanMessageInGrantTab(
                          !isScanningUserQrInGrantTab
                            ? "Point camera at user's QR code..."
                            : "",
                        );
                      }}
                      className="px-3 py-2 text-sm bg-teal-500 hover:bg-teal-600 text-white rounded shadow flex items-center gap-2 mx-auto"
                      disabled={patchUserMutation?.isPending}
                    >
                      <FontAwesomeIcon icon={faQrcode} />
                      {isScanningUserQrInGrantTab
                        ? "Cancel Scan"
                        : "Scan User QR to Grant"}
                    </button>
                    {isScanningUserQrInGrantTab && (
                      <div className="my-4 p-2 border rounded bg-gray-50 max-w-xs mx-auto">
                        <div
                          id={html5QrCodeScannerId}
                          style={{ width: "100%", minHeight: "180px" }}
                        ></div>
                      </div>
                    )}
                    {userScanMessageInGrantTab && (
                      <p className="text-center text-sm mt-2 text-gray-700">
                        {userScanMessageInGrantTab}
                      </p>
                    )}
                  </div>

                  <hr className="my-6" />

                  <div>
                    <h3 className="text-md font-semibold text-gray-700 mb-2">
                      User: Scan this QR to Get Badge
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {isAttendance
                        ? `Scan to add +1 progress ${
                            isLeveledAchievement ? "(Leveled)" : ""
                          } ${
                            attendanceNeedForDisplay && !isLeveledAchievement
                              ? `(Need ${attendanceNeedForDisplay})`
                              : ""
                          }`
                        : "Scan to grant this badge"}
                    </p>
                    {isLoadingQrToken && <p>Loading secure QR code...</p>}
                    {qrTokenError && (
                      <p className="text-red-500">Error: {qrTokenError}</p>
                    )}
                    {qrCodeValue && !isLoadingQrToken && !qrTokenError ? (
                      <QRCodeCanvas
                        id={`qr-code-modal-${achievementIdForQr}`}
                        value={qrCodeValue}
                        size={180}
                        level={"H"}
                        includeMargin={true}
                        className="mx-auto border bg-white p-2 rounded shadow"
                      />
                    ) : (
                      !isLoadingQrToken &&
                      !qrTokenError && (
                        <p className="text-red-500">
                          Could not generate Grant QR Code.
                        </p>
                      )
                    )}
                  </div>
                </div>
              )}

              {activeTab === "manual" && isAdmin && (
                <div>
                  <h3 className="text-lg font-semibold text-center mb-1 text-gray-700">
                    {selectedUserNameForAction
                      ? `Actions for: ${selectedUserNameForAction}`
                      : "Select User and Action"}
                  </h3>

                  {isLoadingUsers && (
                    <p className="text-center text-gray-500">
                      Loading users...
                    </p>
                  )}
                  {isUsersError && (
                    <p className="text-center text-red-500">
                      Error loading users:{" "}
                      {usersError?.message || "Unknown error"}
                    </p>
                  )}

                  {!isLoadingUsers && !isUsersError && usersData && (
                    <div className="space-y-4 mt-3">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <input
                          type="text"
                          placeholder="Search user..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setSelectedUserIdForAction(null);
                            setSelectedUserNameForAction(null);
                            setOptimisticSelectedUserStatus(null);
                            setManualActionStatus({ message: "", error: false });
                          }}
                          className="flex-grow px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-medium text-gray-600">
                            View:
                          </span>
                          <label className="flex items-center gap-1 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name="userViewFilter"
                              value="all"
                              checked={userViewFilter === "all"}
                              onChange={() => setUserViewFilter("all")}
                              className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                            />{" "}
                            All
                          </label>
                          <label className="flex items-center gap-1 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name="userViewFilter"
                              value="achieved"
                              checked={userViewFilter === "achieved"}
                              onChange={() => setUserViewFilter("achieved")}
                              className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                            />{" "}
                            Achieved
                          </label>
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto border rounded bg-white p-2 space-y-1">
                        {filteredUsers.length === 0 && (
                          <p className="text-center text-gray-500 italic p-2">
                            No users match criteria.
                          </p>
                        )}
                        {filteredUsers.map((user) => {
                          const baseStatus = userStatusMap.get(user.id);
                          const isUserSelected =
                            selectedUserIdForAction === user.id;
                          const isUserPending =
                            patchUserMutation?.isPending &&
                            patchUserMutation?.variables?.targetUserId ===
                              user.id;
                          const displayStatus = isUserSelected
                            ? selectedUserDisplayStatus
                            : baseStatus || {
                                achieved: false,
                                count: 0,
                                score: null,
                              };
                          const displayHasBadge = displayStatus?.achieved;
                          const displayCount = displayStatus?.count ?? 0;
                          const displayScore = displayStatus?.score ?? "-";

                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleSelectUserFromList(user)}
                              className={`w-full text-left p-2 rounded flex justify-between items-center transition-colors ${
                                isUserSelected
                                  ? "bg-indigo-100 ring-1 ring-indigo-300"
                                  : "hover:bg-gray-50"
                              } ${
                                isUserPending ? "opacity-50 cursor-wait" : ""
                              }`}
                              disabled={isUserPending}
                            >
                              <div>
                                <span className="font-medium text-sm">
                                  {`${user.firstName || ""} ${
                                    user.lastName || ""
                                  }` || user.username}
                                </span>
                                <span className="block text-xs text-gray-500">
                                  {user.primaryEmailAddress}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2 text-xs">
                                {isAttendance && (
                                  <span className="text-gray-600">
                                    Count: {displayCount}
                                  </span>
                                )}
                                {isScoreEnabled && (
                                  <span className="text-gray-600">
                                    Score: {displayScore}
                                  </span>
                                )}
                                {displayHasBadge && (
                                  <FontAwesomeIcon
                                    icon={faCheck}
                                    className="text-green-500 h-4 w-4"
                                    title="Has Badge"
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedUserIdForAction &&
                    selectedUserDisplayStatus &&
                    activeTab === "manual" && ( // Ensure action panel only shows in manual tab
                      <div className="bg-gray-50 p-4 rounded border space-y-3 mt-4">
                        <p className="text-sm font-medium text-center text-gray-700">
                          Actions for:{" "}
                          <span className="font-semibold">
                            {selectedUserNameForAction ||
                              selectedUserIdForAction}
                          </span>
                          <span
                            className={`ml-2 text-xs ${
                              patchUserMutation?.isPending &&
                              patchUserMutation?.variables?.targetUserId ===
                                selectedUserIdForAction
                                ? "italic text-orange-600"
                                : "text-gray-600"
                            }`}
                          >
                            (Status:{" "}
                            {selectedUserDisplayStatus.achieved
                              ? "Achieved"
                              : "Not Achieved"}
                            {isAttendance
                              ? `, Count: ${
                                  selectedUserDisplayStatus.count ?? 0
                                }`
                              : ""}
                            {isScoreEnabled
                              ? `, Score: ${
                                  selectedUserDisplayStatus.score ?? "-"
                                }`
                              : ""}
                            {patchUserMutation?.isPending &&
                            patchUserMutation?.variables?.targetUserId ===
                              selectedUserIdForAction
                              ? " - Pending..."
                              : ""}
                            )
                          </span>
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {!isAttendance && (
                            <>
                              <button
                                onClick={() => handleManualAction("grant")}
                                disabled={
                                  patchUserMutation?.isPending ||
                                  selectedUserDisplayStatus.achieved
                                }
                                className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Grant Badge
                              </button>
                              <button
                                onClick={() => handleManualAction("revoke")}
                                disabled={
                                  patchUserMutation?.isPending ||
                                  !selectedUserDisplayStatus.achieved
                                }
                                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Revoke Badge
                              </button>
                            </>
                          )}
                          {isAttendance && (
                            <>
                              <button
                                onClick={() => handleManualAction("increment")}
                                disabled={patchUserMutation?.isPending}
                                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FontAwesomeIcon
                                  icon={faPlus}
                                  className="mr-1"
                                />{" "}
                                Count
                              </button>
                              <button
                                onClick={() => handleManualAction("decrement")}
                                disabled={
                                  patchUserMutation?.isPending ||
                                  (selectedUserDisplayStatus.count ?? 0) <= 0
                                }
                                className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FontAwesomeIcon
                                  icon={faMinus}
                                  className="mr-1"
                                />{" "}
                                Count
                              </button>
                              <button
                                onClick={() => handleManualAction("revoke")}
                                disabled={
                                  patchUserMutation?.isPending ||
                                  (!selectedUserDisplayStatus.achieved &&
                                    (selectedUserDisplayStatus.count ?? 0) ===
                                      0)
                                }
                                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FontAwesomeIcon
                                  icon={faRotateLeft}
                                  className="mr-1"
                                />{" "}
                                Revoke/Reset
                              </button>
                            </>
                          )}
                        </div>
                        {isScoreEnabled && (
                          <div className="flex items-center justify-center gap-2 pt-3 border-t">
                            <label
                              htmlFor="manual-score"
                              className="text-sm font-medium text-gray-700"
                            >
                              Set Score:
                            </label>
                            <input
                              type="number"
                              id="manual-score"
                              value={scoreInput}
                              onChange={(e) => setScoreInput(e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Score"
                              disabled={patchUserMutation?.isPending}
                            />
                            <button
                              onClick={() => handleManualAction("setScore")}
                              disabled={patchUserMutation?.isPending}
                              className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
                            >
                              <FontAwesomeIcon
                                icon={faFloppyDisk}
                                className="mr-1"
                              />{" "}
                              Set
                            </button>
                          </div>
                        )}
                        {manualActionStatus.message && (
                          <p
                            className={`text-xs text-center pt-2 ${
                              manualActionStatus.error
                                ? "text-red-600"
                                : "text-green-700"
                            }`}
                          >
                            {manualActionStatus.message}
                          </p>
                        )}
                      </div>
                    )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default QRCodeGrantModal;
