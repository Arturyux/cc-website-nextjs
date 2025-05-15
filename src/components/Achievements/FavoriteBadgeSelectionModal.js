"use client";

import { motion, AnimatePresence } from "framer-motion";
import AchievementBadge from "./AchievementBadge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faTrash } from "@fortawesome/free-solid-svg-icons";

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export default function FavoriteBadgeSelectionModal({
  isOpen,
  onClose,
  achievedBadges,
  onSelectBadge,
  onRemoveFavorite,
  currentSlot,
  currentFavoriteInSlot,
}) {
  if (!isOpen) return null;

  const handleSelect = (achievement) => {
    onSelectBadge(achievement, currentSlot);
    onClose();
  };

  const handleRemove = () => {
    if (onRemoveFavorite) {
      onRemoveFavorite(currentSlot);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalVariants}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-2xl w-full relative flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
          >
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                Select Favorite Badge for Slot {currentSlot}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 z-20 bg-white rounded-full p-1 h-7 w-7 flex items-center justify-center"
                aria-label="Close modal"
              >
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow">
              {achievedBadges && achievedBadges.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
                  {achievedBadges.map((ach) => (
                    <div key={ach.id} className="flex flex-col items-center">
                      <AchievementBadge
                        achievement={ach}
                        onOpenModal={() => handleSelect(ach)}
                      />
                      <p className="text-xs text-center mt-1 truncate w-28">
                        {ach.title}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  You have no achieved badges to select from.
                </p>
              )}
            </div>

            {currentFavoriteInSlot && onRemoveFavorite && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleRemove}
                  className="px-4 py-2 text-sm font-medium bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200 transition flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faTrash} /> Remove from this Slot
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
