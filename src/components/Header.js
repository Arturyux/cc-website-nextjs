"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Language dropdown state and ref
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Close dropdowns if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setLangDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Framer Motion variants for the Linktree dropdown (dropping animation)
  const dropdownVariants = {
    hidden: { y: -50 },
    visible: { y: 0 },
    exit: { y: -50 },
  };

  return (
    <header className="fixed left-1/2 transform -translate-x-1/2 top-10 p-3 w-[75%] flex justify-center items-center bg-mainColor shadow-md z-50 rounded-full mx-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between w-full">
        {/* Home Button */}
        <button
          onClick={handleScrollTop}
          className="font-Main text-3xl text-white font-bold hover:text-gray-600"
        >
          Home
        </button>

        {/* Linktree Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="font-Main text-3xl font-bold text-white hover:text-gray-600"
          >
            Linktree
          </button>
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial="hidden"
                animate="visible"
                exit={{ y: -10, opacity: 0 }}
                variants={dropdownVariants}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute -z-1 top-16 left-1/2 transform -translate-x-1/2 mt-2 w-110 p-2 bg-white border border-gray-200 rounded shadow-lg flex flex-col items-center"
              >
                <button
                  className="sm:w-96 w-[95%] bg-amber-300 mt-6 text-center p-4 rounded py-3 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 hover:translate-y-1"
                  onClick={() => setDropdownOpen(false)}
                >
                  <p className="text-xl font-bold">Option 1</p>
                </button>
                <button
                  className="sm:w-96 w-[95%] bg-violet-500 mt-6 text-center p-4 rounded py-3 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 hover:translate-y-1"
                  onClick={() => setDropdownOpen(false)}
                >
                  <p className="text-xl font-bold">Option 2</p>
                </button>
                <button
                  className="sm:w-96 w-[95%] bg-blue-500 my-6 text-center p-4 rounded py-3 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 hover:translate-y-1"
                  onClick={() => setDropdownOpen(false)}
                >
                  <p className="text-xl font-bold">Option 3</p>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Language and Login container */}
        <div className="flex items-center gap-4">
          {/* Account/Login Link (now on the left) */}
          <Link
            href="/account"
            className="absolute right-30 font-Main items-c text-3xl font-bold text-white hover:text-gray-600"
          >
            Login
          </Link>
          {/* Language Dropdown Button */}

        </div>
      </div>
      <div className="relative" ref={langDropdownRef}>
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex w-20 h-20 rounded-full overflow-hidden border-transperant"
            >
              <img
                src="/languageSv.jpeg"
                alt="Language"
                className="w-full h-full object-cover"
              />
            </button>
            <AnimatePresence>
              {langDropdownOpen && (
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute -z-1 top-16 left-1/2 transform -translate-x-1/2 mt-7 p-1 bg-white border border-gray-200 rounded shadow-lg flex flex-col items-center"
                >
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                    onClick={() => setLangDropdownOpen(false)}
                  >
                    English
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                    onClick={() => setLangDropdownOpen(false)}
                  >
                    Spanish
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                    onClick={() => setLangDropdownOpen(false)}
                  >
                    French
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
    </header>
  );
}