"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const formatDate = (isoDateString) => {
  if (!isoDateString) return null;
  try {
    const dateObj = new Date(isoDateString);
    if (isNaN(dateObj.getTime())) return "Invalid Date";
    return dateObj.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    return "Error formatting date";
  }
};
const placeholderImg =
  "https://api2.cultureconnection.se/assets/achievments-badges/5b765b8d-b7af-4c4b-9a85-c6ace210faca.png";

export default function AchievementModal({
  isOpen,
  onClose,
  achievementData,
  isAdminOrCommittee = false,
  onEdit = () => {},
  onDelete = () => {},
  onOpenQrCodeModal = () => {},
}) {
  if (!isOpen || !achievementData) return null;

  const hasAchieved = achievementData.currentUserAchieved;
  const achievedDate = formatDate(achievementData.currentUserAchievedDate);
  const totalAchieved = achievementData.totalAchievedCount || 0;
  const isScoreEnabled = achievementData.onScore === true;
  const highestScore = achievementData.highestScore;
  const userScore = achievementData.currentUserScore;

  const isLeveled =
    achievementData.level_config && achievementData.level_config.length > 0;
  const progressNeededForDisplay = achievementData.attendanceNeed; // This is already the next level's need or max level's need from API
  const currentProgress = achievementData.currentUserProgress;
  const isMaxLevel = achievementData.isMaxLevel;

  const showProgressBar =
    achievementData.attendanceCounter &&
    !isMaxLevel && // Don't show if max level is achieved
    progressNeededForDisplay > 0 &&
    (!hasAchieved || (isLeveled && !isMaxLevel)); // Show if not achieved OR leveled and not max

  let progressBarWidth = 0;
  if (showProgressBar && progressNeededForDisplay > 0) {
    progressBarWidth = Math.min(
      100,
      (currentProgress / progressNeededForDisplay) * 100,
    );
  } else if (isMaxLevel && achievementData.attendanceCounter) {
    progressBarWidth = 100; // Fill bar if max level
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalVariants}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
          >
            <div className="p-6 flex flex-col items-center flex-grow">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 z-20 bg-white rounded-full p-1 h-7 w-7 flex items-center justify-center"
                aria-label="Close modal"
              >
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>

              <div className={`w-full h-full items-center ${hasAchieved}`}>
                {hasAchieved ? (
                  <img
                    src={achievementData.imgurl || placeholderImg}
                    alt={achievementData.title || "Achievement Badge"}
                    className={"w-64 h-64 mx-auto object-cover"}
                    onError={(e) => {
                      e.currentTarget.src = placeholderImg;
                    }}
                  />
                ) : (
                  <img
                    src={achievementData.imgurl || placeholderImg}
                    alt={achievementData.title || "Achievement Badge"}
                    className={`w-64 h-64 mx-auto grayscale`}
                    onError={(e) => {
                      e.currentTarget.src = placeholderImg;
                    }}
                  />
                )}
              </div>
              <div className="mb-2">
                <h2
                  className={`text-xl md:text-2xl font-semibold text-center ${
                    hasAchieved ? "text-amber-900" : "text-gray-800"
                  }`}
                >
                  {achievementData.title || "Achievement"}
                </h2>
                <p className="text-xs text-center text-gray-500">
                  Achieved by:{" "}
                  <span className="font-medium">{totalAchieved}</span>{" "}
                  {totalAchieved === 1 ? "person" : "people"}
                </p>
                {isScoreEnabled && highestScore !== null && (
                  <p className="text-xs text-center text-gray-500">
                    Highest Score:{" "}
                    <span className="font-medium">{highestScore}</span>
                  </p>
                )}
              </div>
              <p className="text-sm md:text-base text-center text-gray-600 mb-3">
                {achievementData.currentUserAchievedDescription}
              </p>

              <div className="text-xs text-center text-gray-500 mt-1 space-y-0.5">
                {hasAchieved && achievedDate && (
                  <p>Badge Achieved: {achievedDate}</p>
                )}

                {isScoreEnabled &&
                  hasAchieved &&
                  typeof userScore === "number" && (
                    <p>
                      Your Score: <span className="font-medium">{userScore}</span>
                    </p>
                  )}
              </div>

              {(showProgressBar || (isMaxLevel && achievementData.attendanceCounter)) && (
                <div className="w-3/4 bg-gray-200 rounded-full h-2.5 mt-4">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{
                      width: `${progressBarWidth}%`,
                    }}
                  ></div>
                  {isMaxLevel ? (
                     <p className="text-xs text-center text-green-600 mt-1 font-semibold">Max Level Achieved! ({currentProgress})</p>
                  ) : (
                    <p className="text-xs text-center text-gray-500 mt-1">
                      Progress: {currentProgress} / {progressNeededForDisplay}
                    </p>
                  )}
                </div>
              )}
            </div>

            {isAdminOrCommittee && (
              <div className="p-4 bg-gray-100 border-t border-gray-200 flex flex-wrap justify-center gap-2">
                <button
                  onClick={onOpenQrCodeModal}
                  className="px-3 py-1.5 text-xs font-medium bg-cyan-100 text-cyan-700 border border-cyan-300 rounded hover:bg-cyan-200 transition"
                >
                  QR Code / Grant
                </button>
                <button
                  onClick={onEdit}
                  className="px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300 rounded hover:bg-yellow-200 transition"
                >
                  Edit Details
                </button>
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200 transition"
                >
                  Delete Badge
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
