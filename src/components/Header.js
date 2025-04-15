"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import SocialIcons from "./Socialmedia";

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const controls = useAnimation();
  const initialScrollRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const [isScrollDisabled, setIsScrollDisabled] = useState(false);

  useEffect(() => {
    if (isScrollDisabled || mobileMenuOpen) { // Also disable scroll if mobile menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isScrollDisabled, mobileMenuOpen]); // Add mobileMenuOpen dependency


  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  const dropdownVariants = {
    hidden: { y: -10, opacity: 0 }, // Adjusted starting position
    visible: { y: 0, opacity: 1 },
    exit: { y: -10, opacity: 0 },
  };

  const mobileMenuVariants = {
    hidden: { opacity: 0, y: "-100%" }, // Slide from top edge
    visible: { opacity: 1, y: "0%" },
    exit: { opacity: 0, y: "-100%" },
  };

  useEffect(() => {
    const handleScroll = () => {
      if (mobileMenuOpen) return;
      if (initialScrollRef.current === null) {
        initialScrollRef.current = window.scrollY;
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Reduced the scroll effect intensity
      const offset = Math.max(-5, Math.min(5, (window.scrollY - initialScrollRef.current) * 0.01));
      controls.start({ y: offset, transition: { duration: 0 } });
      scrollTimeoutRef.current = setTimeout(() => {
        controls.start({
          y: 0,
          transition: { type: "spring", stiffness: 300, damping: 25 }, // Adjusted damping
        });
        initialScrollRef.current = null;
      }, 200); // Increased timeout slightly
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [controls, mobileMenuOpen]);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    // setIsScrollDisabled(false); // Scroll is re-enabled by useEffect
  };

  return (
    <>
      <motion.header
        animate={controls}
        className={`fixed md:left-1/2 md:transform md:-translate-x-1/2 top-4 md:top-6 p-2 md:p-3 md:w-[75%] w-[90%] flex justify-center items-center bg-mainColor shadow-lg z-30 rounded-full mx-auto left-0 right-0`} // Adjusted z-index, top padding, width
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between w-full">
          <button
            onClick={handleScrollTop}
            className="md:block hidden font-Main text-xl lg:text-2xl text-white font-bold hover:text-gray-300 transition-colors" // Adjusted size
          >
            Home
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="md:block hidden font-Main text-xl lg:text-2xl font-bold text-white hover:text-gray-300 transition-colors" // Adjusted size
            >
              Linktree
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="exit" // Use exit variant
                  variants={dropdownVariants}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute z-20 top-12 md:top-14 left-1/2 transform -translate-x-1/2 mt-2 w-72 md:w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col items-center" // Adjusted z-index, width, padding, shadow
                >
                  <button
                    className="w-full bg-amber-300 mb-3 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5" // Adjusted spacing, hover effect
                    onClick={() => setDropdownOpen(false)}
                  >
                    <p className="text-lg font-bold">Option 1</p>
                  </button>
                  <button
                    className="w-full bg-violet-500 mb-3 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <p className="text-lg font-bold">Option 2</p>
                  </button>
                  <button
                    className="w-full bg-blue-500 mb-4 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <p className="text-lg font-bold">Option 3</p>
                  </button>
                  <p className="text-xl font-bold font-Main mb-2">Socialmedia</p>
                  <div className="bg-gray-100 rounded-xl border border-gray-200 shadow-inner p-2">
                    <SocialIcons />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/account"
              className="md:block hidden font-Main text-xl lg:text-2xl font-bold text-white hover:text-gray-300 transition-colors" // Adjusted size
            >
              Login
            </Link>
          </div>
        </div>
        <div className="md:block hidden relative ml-4" ref={langDropdownRef}> {/* Added margin */}
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex w-10 h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden border-2 border-white shadow-md" // Adjusted size, added border/shadow
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
                transition={{ duration: 0.2 }} 
                className="absolute z-20 top-12 md:top-14 left-1/2 transform -translate-x-1/2 mt-2 p-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col items-center w-28" // Adjusted z-index, width, padding, shadow
              >
                <button
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded"
                  onClick={() => setLangDropdownOpen(false)}
                >
                  English
                </button>
                <button
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded"
                  onClick={() => setLangDropdownOpen(false)}
                >
                  Swedish
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Navigation Trigger */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="text-white focus:outline-none p-2" 
            aria-label="Open menu"
          >
            <div className="space-y-1.5">
              <div className="w-6 h-0.5 bg-white rounded"></div>
              <div className="w-6 h-0.5 bg-white rounded"></div>
              <div className="w-6 h-0.5 bg-white rounded"></div>
            </div>
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={mobileMenuVariants}
            transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }} // Smooth tween animation
            className="fixed top-0 left-0 h-full w-full bg-mainColor z-40 overflow-y-auto flex flex-col" // Use z-40 (below modal z-50)
          >
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-white border-opacity-20 flex-shrink-0">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="relative w-10 h-10 rounded-full overflow-hidden border border-white border-opacity-50"
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
                    transition={{ duration: 0.2 }}
                    className="absolute top-16 left-4 mt-1 w-28 p-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col items-center z-50" // Ensure dropdown is above menu content
                  >
                    <button
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded"
                      onClick={() => { setLangDropdownOpen(false); /* Add language change logic  TODO*/  }}
                    >
                      English
                    </button>
                    <button
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded"
                      onClick={() => { setLangDropdownOpen(false); /* Add language change logic */ }}
                    >
                      Swedish
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={closeMobileMenu}
                className="text-white p-2"
                aria-label="Close menu"
              >
                {/* X Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Menu Content */}
            <div className="flex-grow flex flex-col items-center justify-center pb-16 px-4 space-y-6 overflow-y-auto">
              <Link
                href="/account"
                onClick={closeMobileMenu}
                className="text-6xl top-0 font-semibold text-white hover:text-gray-300 transition-colors"
              >
                Login
              </Link>
              <div className="w-full max-w-xs pt-6">
                 <button
                    className="w-full bg-amber-300 mb-3 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                    onClick={closeMobileMenu}
                  >
                    <p className="text-lg font-bold">Option 1</p>
                  </button>
                  <button
                    className="w-full bg-violet-500 mb-3 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                    onClick={closeMobileMenu}
                  >
                    <p className="text-lg font-bold">Option 2</p>
                  </button>
                  <button
                    className="w-full bg-blue-500 mb-4 text-center p-3 rounded border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                    onClick={closeMobileMenu}
                  >
                    <p className="text-lg font-bold">Option 3</p>
                  </button>
              </div>

              {/* Social Media Section */}
              <div className="pt-6">
                 <div className="bg-gray-100 rounded-4xl border border-gray-200 shadow-2xs mb-5">
                   <SocialIcons />
                 </div>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
