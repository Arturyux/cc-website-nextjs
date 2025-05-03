"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import SocialIcons from "./Socialmedia";
import Linktree from "./Linktree";
import UserCardModal from "./UserCardModal";
import BecomeMemberModal from "./BecomeMemberModal";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  SignOutButton,
  useUser,
  UserButton,
} from "@clerk/nextjs";

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
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef(null);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const menuDropdownRef = useRef(null);
  const [isUserCardModalOpen, setIsUserCardModalOpen] = useState(false);
  const [isBecomeMemberModalOpen, setIsBecomeMemberModalOpen] = useState(false); 

  const { user, isLoaded } = useUser();
  const isAdmin = isLoaded && user?.publicMetadata?.admin === true;
  const isCommittee = isLoaded && user?.publicMetadata?.committee === true;
  const isMember = isLoaded && user?.publicMetadata?.member === true;
  const canShowUserCard = isLoaded && (isAdmin || isCommittee || isMember);
  const canShowBecomeMember =
    isLoaded && user && !isAdmin && !isCommittee && !isMember;

  const openUserCardModal = () => setIsUserCardModalOpen(true);
  const closeUserCardModal = () => setIsUserCardModalOpen(false);

  const openBecomeMemberModal = () => setIsBecomeMemberModalOpen(true);
  const closeBecomeMemberModal = () => setIsBecomeMemberModalOpen(false);

  useEffect(() => {
    if (isUserCardModalOpen || isBecomeMemberModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isUserCardModalOpen, isBecomeMemberModalOpen]);

  useEffect(() => {
    if (isScrollDisabled || mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else if (!isUserCardModalOpen && !isBecomeMemberModalOpen) {
      document.body.style.overflow = "";
    }
  }, [
    isScrollDisabled,
    mobileMenuOpen,
    isUserCardModalOpen,
    isBecomeMemberModalOpen, 
  ]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMenuDropdownOpen(false);
    closeMobileMenu();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target)
      ) {
        setLangDropdownOpen(false);
      }
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target)
      ) {
        setAccountDropdownOpen(false);
      }
      if (
        menuDropdownRef.current &&
        !menuDropdownRef.current.contains(event.target)
      ) {
        setMenuDropdownOpen(false);
      }
      if (
        mobileMenuOpen &&
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target) &&
        !event.target.closest("button[aria-label='Open language menu']")
      ) {
        setLangDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      if (mobileMenuOpen || isUserCardModalOpen || isBecomeMemberModalOpen)
        return;
      if (initialScrollRef.current === null) {
        initialScrollRef.current = window.scrollY;
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      const offset = Math.max(
        -5,
        Math.min(5, (window.scrollY - initialScrollRef.current) * 0.01),
      );
      controls.start({ y: offset, transition: { duration: 0 } });
      scrollTimeoutRef.current = setTimeout(() => {
        controls.start({
          y: 0,
          transition: { type: "spring", stiffness: 300, damping: 25 },
        });
        initialScrollRef.current = null;
      }, 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [
    controls,
    mobileMenuOpen,
    isUserCardModalOpen,
    isBecomeMemberModalOpen,
  ]);

  const dropdownVariants = {
    hidden: { y: -10, opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: -10, opacity: 0 },
  };

  const mobileMenuVariants = {
    hidden: { opacity: 0, y: "-100%" },
    visible: { opacity: 1, y: "0%" },
    exit: { opacity: 0, y: "-100%" },
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setLangDropdownOpen(false);
  };

  const closeAccountDropdown = () => setAccountDropdownOpen(false);

  return (
    <>
      <motion.header
        animate={controls}
        className={`fixed md:left-1/2 left-0 right-0 md:transform md:-translate-x-1/2 top-4 md:top-6 p-2 md:p-3 md:w-[75%] w-[90%] flex justify-center items-center bg-mainColor shadow-lg z-30 rounded-full mx-auto`}
      >
        <div className="flex items-center justify-between w-full px-4 md:px-6">
          <div className="hidden md:block relative" ref={menuDropdownRef}>
            <button
              onClick={() => setMenuDropdownOpen(!menuDropdownOpen)}
              className="font-Main text-xl lg:text-2xl text-white font-bold hover:text-gray-300 transition-colors"
            >
              Menu
            </button>
            <AnimatePresence>
              {menuDropdownOpen && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={dropdownVariants}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute z-20 top-11 -right-16 mt-2 w-48 p-2 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col"
                >
                  <Link
                    href="/"
                    onClick={closeAccountDropdown}
                    className="block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded"
                  >
                    Home
                  </Link>
                  <Link
                    href="/events"
                    onClick={closeAccountDropdown}
                    className="block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded"
                  >
                    Events
                  </Link>
                  <Link
                    href="/achievements"
                    onClick={closeAccountDropdown}
                    className="block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded"
                  >
                    Badges
                  </Link>
                  <button
                    onClick={() => scrollToSection("sponsors-section")}
                    className="block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded"
                  >
                    Sponsors
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden md:block relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="font-Main text-xl lg:text-2xl font-bold text-white hover:text-gray-300 transition-colors"
            >
              Linktree
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={dropdownVariants}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute z-20 top-11 left-1/2 transform -translate-x-1/2 mt-2 w-72 md:w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col items-center"
                >
                  <Linktree />
                  <div className="bg-gray-100 mt-6 rounded-4xl border border-gray-200 shadow-2xs mb-5">
                    <SocialIcons />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="relative" ref={accountDropdownRef}>
              <SignedOut>
                <button
                  onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                  className="font-Main text-xl lg:text-2xl font-bold text-white hover:text-gray-300 transition-colors"
                >
                  Account
                </button>
              </SignedOut>
              <SignedIn>
                {isLoaded && (
                  <button
                    onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                    className="font-Main text-xl lg:text-2xl font-bold text-white hover:text-gray-300 transition-colors"
                  >
                    Dashboard
                  </button>
                )}
              </SignedIn>
              <AnimatePresence>
                {accountDropdownOpen && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={dropdownVariants}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="absolute z-20 top-11 -right-16 mt-2 w-64 p-2 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col"
                  >
                    <SignedOut>
                      <SignInButton mode="modal">
                        <button
                          onClick={closeAccountDropdown}
                          className="block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded"
                        >
                          Sign In
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button
                          onClick={closeAccountDropdown}
                          className="block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded"
                        >
                          Sign Up
                        </button>
                      </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                      {isLoaded && user && (
                        <>
                          <div className="px-4 text-center text-4xl font-Header text-black border-b my-2">
                            Welcome, {user.firstName || "User"}!{" "}
                            <UserButton afterSignOutUrl="/" />
                          </div>
                          {isAdmin && (
                            <Link
                              href="/admin"
                              onClick={closeAccountDropdown}
                              className="block w-full text-center text-2xl px-4 py-2 text-purple-700 hover:bg-purple-50 rounded font-semibold"
                            >
                              Admin Panel
                            </Link>
                          )}
                          {canShowUserCard && (
                            <button
                              onClick={() => {
                                openUserCardModal();
                                closeAccountDropdown();
                              }}
                              className="block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded"
                            >
                              View My Card
                            </button>
                          )}
                          {canShowUserCard && (
                            <button
                              onClick={() => {
                                openUserCardModal();
                                closeAccountDropdown();
                              }}
                              className="block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded"
                            >
                              Membership
                            </button>
                          )}
                          {canShowBecomeMember && (
                            <button
                              onClick={() => {
                                openBecomeMemberModal();
                                closeAccountDropdown();
                              }}
                              className="block w-full text-center text-2xl px-4 py-2 text-green-600 hover:bg-green-50 rounded font-semibold"
                            >
                              Become a Member
                            </button>
                          )}
                          <div className="border-t mt-1 pt-1">
                            <SignOutButton>
                              <button
                                onClick={closeAccountDropdown}
                                className="w-full text-center text-2xl px-4 py-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                Log Out
                              </button>
                            </SignOutButton>
                          </div>
                        </>
                      )}
                    </SignedIn>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md"
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
                    className="absolute z-20 top-13 -right-12 mt-2 p-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col items-center"
                  >
                    <button
                      className="block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded"
                      onClick={() => setLangDropdownOpen(false)}
                    >
                      English
                    </button>
                    <button
                      className="block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded"
                      onClick={() => setLangDropdownOpen(false)}
                    >
                      Swedish
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="md:hidden flex items-center justify-between w-full">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="relative w-10 h-10 rounded-full overflow-hidden border border-white border-opacity-50"
              aria-label="Open language menu"
            >
              <img
                src="/languageSv.jpeg"
                alt="Language"
                className="w-full h-full object-cover"
              />
            </button>
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
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={mobileMenuVariants}
            transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
            className="fixed top-0 left-0 h-full w-full bg-mainColor z-40 overflow-y-auto flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white border-opacity-20 flex-shrink-0">
              <div className="relative" ref={langDropdownRef}>
                {" "}
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="relative w-12 h-12 rounded-full overflow-hidden border border-white border-opacity-50"
                  aria-label="Open language menu"
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
                      className="absolute top-14 left-0 mt-1 w-28 p-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col items-center z-50"
                    >
                      <button
                        className="w-full text-left px-3 py-1.5 text-sm text-black hover:bg-gray-100 rounded"
                        onClick={() => {
                          setLangDropdownOpen(false);
                        }}
                      >
                        English
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 text-sm text-black hover:bg-gray-100 rounded"
                        onClick={() => {
                          setLangDropdownOpen(false);
                        }}
                      >
                        Swedish
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={closeMobileMenu}
                className="text-white p-2"
                aria-label="Close menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center pb-16 px-4 space-y-6 overflow-y-auto">
              {" "}
              <div className="w-3/4 border-t border-white/20 my-4"></div>{" "}
              <SignedOut>
                <div className="flex flex-col items-center space-y-6">
                  <SignInButton mode="modal">
                    <button
                      onClick={closeMobileMenu}
                      className="text-5xl font-semibold text-white hover:text-gray-300 transition-colors"
                    >
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button
                      onClick={closeMobileMenu}
                      className="text-5xl font-semibold text-white hover:text-gray-300 transition-colors"
                    >
                      Sign Up
                    </button>
                  </SignUpButton>
                </div>
              </SignedOut>
              <SignedIn>
                {isLoaded && user && (
                  <div className="text-center space-y-4 w-full">
                    {" "}
                    <p className="text-white font-Header text-4xl md:text-5xl mb-2">
                      Welcome, {user.firstName}!
                    </p>
                    <div className="inline-block mb-4">
                      <UserButton />
                    </div>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={closeMobileMenu}
                        className="block w-full text-3xl md:text-4xl px-4 py-2 text-purple-800 hover:text-purple-200 text-center rounded font-semibold"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      href="/"
                      onClick={closeAccountDropdown}
                      className="block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded"
                    >
                      Home
                    </Link>
                    <Link
                      href="/events"
                      onClick={closeMobileMenu}
                      className="block w-full text-3xl md:text-4xl px-4 py-2 text-white hover:text-gray-300 text-center rounded"
                    >
                      Events
                    </Link>
                    <Link
                      href="/achievements"
                      onClick={closeMobileMenu}
                      className="block w-full text-3xl md:text-4xl px-4 py-2 text-white hover:text-gray-300 text-center rounded"
                    >
                      Badges
                    </Link>
                    {canShowUserCard && (
                      <button
                        onClick={() => {
                          openUserCardModal();
                          closeMobileMenu();
                        }}
                        className="block w-full text-3xl md:text-4xl text-center px-4 py-2 text-white hover:text-gray-300 rounded"
                      >
                        View My Card
                      </button>
                    )}
                    {canShowBecomeMember && (
                      <button
                        onClick={() => {
                          openBecomeMemberModal();
                          closeMobileMenu();
                        }}
                        className="block w-full text-3xl md:text-4xl text-center px-4 py-2 text-green-300 hover:text-green-200 rounded font-semibold"
                      >
                        Become a Member
                      </button>
                    )}
                    <div className="border-t border-white/20 mt-4 pt-4">
                      <SignOutButton>
                        <button
                          onClick={closeMobileMenu}
                          className="w-full text-center font-bold text-2xl px-4 py-2 text-red-300 hover:text-red-200 rounded"
                        >
                          Log Out
                        </button>
                      </SignOutButton>
                    </div>
                  </div>
                )}
              </SignedIn>
              <div className="w-full max-w-xs pt-4">
                <Linktree />
              </div>
              <div className="pt-4">
                <div className="bg-gray-100 rounded-4xl border border-gray-200 shadow-2xs mb-5">
                  <SocialIcons />
                </div>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {isLoaded && (
        <UserCardModal
          isOpen={isUserCardModalOpen}
          onClose={closeUserCardModal}
          user={user}
        />
      )}
      <BecomeMemberModal
        isOpen={isBecomeMemberModalOpen}
        onClose={closeBecomeMemberModal}
        user={user}
      />
    </>
  );
}
