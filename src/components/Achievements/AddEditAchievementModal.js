// src/components/Achievements/AddEditAchievementModal.js
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const modalVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: 20, transition: { duration: 0.15 } },
};

const ADD_NEW_CATEGORY_VALUE = "__ADD_NEW__";

export default function AddEditAchievementModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
  error = null,
  availableCategories = [],
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [achiveDescription, setAchiveDescription] = useState("");
  const [imgurl, setImgurl] = useState("");
  const [category, setCategory] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [attendanceCounter, setAttendanceCounter] = useState(false);
  const [attendanceNeed, setAttendanceNeed] = useState(null);
  const [onScore, setOnScore] = useState(false);
  const [formError, setFormError] = useState("");

  const isEditing = !!initialData;
  const showNewCategoryInput = category === ADD_NEW_CATEGORY_VALUE;

  useEffect(() => {
    setFormError(error);
  }, [error]);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialData) {
        setTitle(initialData.title || "");
        setDescription(initialData.description || "");
        setAchiveDescription(initialData.achiveDescription || initialData.description || "");
        setImgurl(initialData.imgurl || "");
        setCategory(initialData.category || "");
        setIsEnabled(typeof initialData.isEnabled === 'boolean' ? initialData.isEnabled : true);
        setAttendanceCounter(typeof initialData.attendanceCounter === 'boolean' ? initialData.attendanceCounter : false);
        setAttendanceNeed(initialData.attendanceNeed || null);
        setOnScore(typeof initialData.onScore === 'boolean' ? initialData.onScore : false);
      } else {
        setTitle("");
        setDescription("");
        setAchiveDescription("");
        setImgurl("");
        setCategory("");
        setIsEnabled(true);
        setAttendanceCounter(false);
        setAttendanceNeed(null);
        setOnScore(false);
      }
      setNewCategoryInput("");
      setFormError("");
    }
  }, [isOpen, initialData, isEditing]);

  const handleCategoryChange = (e) => {
    const selectedValue = e.target.value;
    setCategory(selectedValue);
    if (selectedValue !== ADD_NEW_CATEGORY_VALUE) {
      setNewCategoryInput("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!title || !description || !imgurl) {
      setFormError("Title, Description, and Image URL are required.");
      return;
    }
    if (attendanceCounter && (!attendanceNeed || attendanceNeed <= 0)) {
        setFormError("Attendance Needed must be a positive number when counter is enabled.");
        return;
    }

    let finalCategory = "";
    if (category === ADD_NEW_CATEGORY_VALUE) {
        finalCategory = newCategoryInput.trim();
        if (!finalCategory) {
            setFormError("Please enter a name for the new category.");
            return;
        }
    } else {
        finalCategory = category;
    }


    const achievementData = {
      title,
      description,
      achiveDescription: achiveDescription || description,
      imgurl,
      category: finalCategory || "Uncategorized",
      isEnabled,
      attendanceCounter,
      attendanceNeed: attendanceCounter ? parseInt(attendanceNeed, 10) : null,
      onScore: onScore,
    };

    if (isEditing) {
      achievementData.id = initialData.id;
    }

    onSubmit(achievementData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
          initial="hidden" animate="visible" exit="exit" variants={modalVariants}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-lg w-full relative max-h-[90vh]"
            onClick={(e) => e.stopPropagation()} variants={modalVariants}
          >
            <form onSubmit={handleSubmit}>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
                <h2 className="text-xl font-semibold mb-4">
                  {isEditing ? "Edit Achievement" : "Add New Achievement"}
                </h2>

                {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}

                <div><label htmlFor="ach-title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input type="text" id="ach-title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required /></div>
                <div><label htmlFor="ach-desc" className="block text-sm font-medium text-gray-700 mb-1">Description (How to get) *</label><textarea id="ach-desc" rows="2" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required></textarea></div>
                <div><label htmlFor="ach-achive-desc" className="block text-sm font-medium text-gray-700 mb-1">Achieved Description (Optional)</label><textarea id="ach-achive-desc" rows="2" value={achiveDescription} onChange={(e) => setAchiveDescription(e.target.value)} placeholder="Defaults to main description if empty" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea></div>
                <div><label htmlFor="ach-imgurl" className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label><input type="url" id="ach-imgurl" value={imgurl} onChange={(e) => setImgurl(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required /></div>

                <div>
                  <label htmlFor="ach-category-select" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    id="ach-category-select"
                    value={category}
                    onChange={handleCategoryChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">-- Select Category (Optional) --</option>
                    {availableCategories.map((catName) => (
                      <option key={catName} value={catName}>{catName}</option>
                    ))}
                    <option value={ADD_NEW_CATEGORY_VALUE}>-- Add New Category --</option>
                  </select>
                </div>

                {showNewCategoryInput && (
                  <div className="pl-4 mt-2">
                    <label htmlFor="ach-new-category" className="block text-sm font-medium text-gray-700 mb-1">New Category Name *</label>
                    <input
                      type="text"
                      id="ach-new-category"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Enter new category name"
                      required={showNewCategoryInput}
                    />
                  </div>
                )}

                <div className="flex items-center pt-2 border-t">
                    <input id="ach-enabled" type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                    <label htmlFor="ach-enabled" className="ml-2 block text-sm font-medium text-gray-900">Enabled (Visible to Users)</label>
                </div>

                <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center">
                        <input id="ach-att-counter" type="checkbox" checked={attendanceCounter} onChange={(e) => setAttendanceCounter(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor="ach-att-counter" className="ml-2 block text-sm text-gray-900">Track Attendance Count</label>
                    </div>
                    {attendanceCounter && (
                        <div className="pl-6">
                            <label htmlFor="ach-att-need" className="block text-sm font-medium text-gray-700 mb-1">Attendance Needed *</label>
                            <input type="number" id="ach-att-need" value={attendanceNeed ?? ''} onChange={(e) => setAttendanceNeed(parseInt(e.target.value, 10) || null)} min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required={attendanceCounter} />
                        </div>
                    )}
                </div>

                 <div className="flex items-center pt-2 border-t">
                    <input id="ach-onscore" type="checkbox" checked={onScore} onChange={(e) => setOnScore(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                    <label htmlFor="ach-onscore" className="ml-2 block text-sm font-medium text-gray-900">Enable Scoring</label>
                </div>

              </div>
              <div className="p-4 bg-gray-50 flex justify-end space-x-3 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition" disabled={isLoading}>Cancel</button>
                <button type="submit" className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition ${ isLoading ? "opacity-50 cursor-not-allowed" : "" }`} disabled={isLoading}>
                  {isLoading ? "Saving..." : (isEditing ? "Save Changes" : "Create Achievement")}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
