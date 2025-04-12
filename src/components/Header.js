"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Language dropdown state and ref
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const controls = useAnimation();
  const initialScrollRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

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
  // Framer Motion variants for the mobile menu (drops down from top)
  const mobileMenuVariants = {
    hidden: { opacity: 0, y: -100 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -100 },
  };

  // Update header position based on scroll.
  useEffect(() => {
    const handleScroll = () => {
      if (initialScrollRef.current === null) {
        initialScrollRef.current = window.scrollY;
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      const offset = (window.scrollY - initialScrollRef.current) * 0.025;
      controls.start({ y: offset, transition: { duration: 0 } });

      scrollTimeoutRef.current = setTimeout(() => {
        controls.start({
          y: 0,
          transition: { type: "spring", stiffness: 300, damping: 20 },
        });
        initialScrollRef.current = null;
      }, 150);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [controls]);

  return (
    <motion.header
      animate={controls}
      className="fixed md:left-1/2 md:transform md:-translate-x-1/2 top-10 p-3 md:w-[75%] w-38 flex justify-center items-center bg-mainColor shadow-md z-50 rounded-full mx-10"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between w-full">
        {/* Home Button */}
        <button
          onClick={handleScrollTop}
          className="md:block hidden font-Main text-3xl text-white font-bold hover:text-gray-600"
        >
          Home
        </button>

        {/* Linktree Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="md:block hidden font-Main text-3xl font-bold text-white hover:text-gray-600"
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
        <div className="flex items-center gap-4">
          <Link
            href="/account"
            className="md:block hidden absolute right-30 font-Main text-3xl font-bold text-white hover:text-gray-600"
          >
            Login
          </Link>
        </div>
      </div>
      <div className="md:block hidden relative" ref={langDropdownRef}>
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
      {/* Mobile Navigation (visible on screens smaller than md) */}
      <div className="md:hidden flex items-center justify-between px-4 py-4">
        {/* Burger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-white focus:outline-none mx-auto"
        >
          <div className="space-y-1">
            <div className="w-8 h-0.5 bg-white"></div>
            <div className="w-8 h-0.5 bg-white"></div>
            <div className="w-8 h-0.5 bg-white"></div>
          </div>
        </button>
        <img
          src="/languageSv.jpeg"
          alt="Language"
          className="absolute w-16 h-16 left-1 rounded-full overflow-hidden object-cover"
        />
      </div>
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={mobileMenuVariants}
            transition={{ duration: 0.3 }}
            className="md:hidden flex fixed inset-0 bg-mainColor shadow-md z-40"
          >
            <div className="flex flex-col items-center py-8 mx-auto">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl text-white mt-8"
              >
                <div className="space-y-1 p-6 my-10">
                  <div className="w-8 h-0.5 bg-white"></div>
                  <div className="w-8 h-0.5 bg-white"></div>
                  <div className="w-8 h-0.5 bg-white"></div>
                </div>
              </button>
              <button
                onClick={handleScrollTop}
                className="text-3xl text-white font-bold hover:text-gray-300 mb-4"
              >
                Home
              </button>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="text-3xl text-white font-bold hover:text-gray-300 mb-4"
              >
                Linktree
              </button>
              <Link
                href="/account"
                className="text-3xl font-bold text-white hover:text-gray-300 mb-4"
              >
                Login
              </Link>
              <div className="relative" ref={langDropdownRef}>
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="w-16 h-16 rounded-full overflow-hidden border-2 border-white"
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
                      className="absolute right-0 mt-2 w-40 p-2 bg-white border border-gray-200 rounded shadow-lg flex flex-col items-center"
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
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}