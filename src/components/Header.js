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

  const { user, isLoaded, isSignedIn } = useUser();
  const isAdmin = isLoaded && isSignedIn && user?.publicMetadata?.admin === true;
  const isCommittee =
    isLoaded && isSignedIn && user?.publicMetadata?.committee === true;
  const isMember =
    isLoaded && isSignedIn && user?.publicMetadata?.member === true;

  const isRegularUser =
    isLoaded && isSignedIn && !isMember && !isCommittee && !isAdmin;
  const isOnlyMember =
    isLoaded && isSignedIn && isMember && !isCommittee && !isAdmin;
  const isOnlyCommittee =
    isLoaded && isSignedIn && isCommittee && !isAdmin;

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
        !accountDropdownRef.current.contains(event.target) &&
        !event.target.closest(".user-button-trigger") && // Assuming UserButton has a class or identifiable parent
        !event.target.closest("button[aria-label='Open user menu']") // Clerk's default UserButton trigger
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

  const closeAllDesktopDropdowns = () => {
    setMenuDropdownOpen(false);
    setDropdownOpen(false);
    setAccountDropdownOpen(false);
  };

  const commonLinkStyles =
    "block w-full text-center text-2xl px-4 py-2 text-black hover:bg-gray-100 rounded";
  const highlightedLinkStyles = `${commonLinkStyles} font-semibold`;

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
                  className="absolute z-20 top-11 -right-16 mt-2 w-56 p-2 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col"
                >
                  <SignedOut>
                    <Link
                      href="/"
                      onClick={closeAllDesktopDropdowns}
                      className={commonLinkStyles}
                    >
                      Home
                    </Link>
                    <Link
                      href="/about-us"
                      onClick={closeAllDesktopDropdowns}
                      className={commonLinkStyles}
                    >
                      About us
                    </Link>
                    <Link
                      href="/events"
                      onClick={closeAllDesktopDropdowns}
                      className={commonLinkStyles}
                    >
                      Events
                    </Link>
                    <p className="px-4 py-2 text-sm text-gray-500 text-center">
                      More options when you login
                    </p>
                  </SignedOut>
                  <SignedIn>
                    {isLoaded && (
                      <>
                        <Link
                          href="/"
                          onClick={closeAllDesktopDropdowns}
                          className={commonLinkStyles}
                        >
                          Home
                        </Link>
                        <Link
                          href="/about-us"
                          onClick={closeAllDesktopDropdowns}
                          className={commonLinkStyles}
                        >
                          About us
                        </Link>
                        <Link
                          href="/events"
                          onClick={closeAllDesktopDropdowns}
                          className={commonLinkStyles}
                        >
                          Events
                        </Link>
                        {isRegularUser && (
                          <>
                            <Link
                              href="/membership"
                              onClick={closeAllDesktopDropdowns}
                              className={highlightedLinkStyles}
                            >
                              Become a member
                            </Link>
                            <p className="px-4 py-2 text-sm text-gray-500 text-center">
                              Become a member for more options
                            </p>
                          </>
                        )}
                        {(isMember || isCommittee || isAdmin) && (
                          <>
                            <Link
                              href="/membership"
                              onClick={closeAllDesktopDropdowns}
                              className={commonLinkStyles}
                            >
                              Discounts
                            </Link>
                            <Link
                              href="/achievements"
                              onClick={closeAllDesktopDropdowns}
                              className={commonLinkStyles}
                            >
                              Badges
                            </Link>
                            <Link
                              href="/flag-game"
                              onClick={closeAllDesktopDropdowns}
                              className={`${highlightedLinkStyles} text-blue-600 hover:bg-blue-50`}
                            >
                              Flag Game
                            </Link>
                          </>
                        )}
                      </>
                    )}
                  </SignedIn>
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
                          onClick={closeAllDesktopDropdowns}
                          className={commonLinkStyles}
                        >
                          Sign In
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button
                          onClick={closeAllDesktopDropdowns}
                          className={commonLinkStyles}
                        >
                          Sign Up
                        </button>
                      </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                      {isLoaded && user && (
                        <>
                          <div className="px-4 py-2 text-center text-lg font-semibold text-black border-b mb-2">
                            Welcome, {user.firstName || "User"}!
                          </div>
                          {isRegularUser && (
                            <>
                              <Link
                                href="/membership"
                                onClick={closeAllDesktopDropdowns}
                                className={commonLinkStyles}
                              >
                                Membership
                              </Link>
                              <button
                                onClick={() => {
                                  openBecomeMemberModal();
                                  closeAllDesktopDropdowns();
                                }}
                                className={`${highlightedLinkStyles} text-green-600 hover:bg-green-50`}
                              >
                                Become a Member
                              </button>
                            </>
                          )}
                          {isOnlyMember && (
                            <>
                              <Link
                                href="/membership"
                                onClick={closeAllDesktopDropdowns}
                                className={commonLinkStyles}
                              >
                                Membership
                              </Link>
                              <Link
                                href="/achievements"
                                onClick={closeAllDesktopDropdowns}
                                className={commonLinkStyles}
                              >
                                Badges
                              </Link>
                              <button
                                onClick={() => {
                                  openUserCardModal();
                                  closeAllDesktopDropdowns();
                                }}
                                className={commonLinkStyles}
                              >
                                View My Card
                              </button>
                            </>
                          )}
                          {(isOnlyCommittee || isAdmin) && (
                            <>
                              <Link
                                href="/admin"
                                onClick={closeAllDesktopDropdowns}
                                className={`${highlightedLinkStyles} text-purple-700 hover:bg-purple-50`}
                              >
                                Admin Panel
                              </Link>
                              <Link
                                href="/membership"
                                onClick={closeAllDesktopDropdowns}
                                className={commonLinkStyles}
                              >
                                Membership
                              </Link>
                              <Link
                                href="/achievements"
                                onClick={closeAllDesktopDropdowns}
                                className={commonLinkStyles}
                              >
                                Badges
                              </Link>
                              <button
                                onClick={() => {
                                  openUserCardModal();
                                  closeAllDesktopDropdowns();
                                }}
                                className={commonLinkStyles}
                              >
                                View My Card
                              </button>
                            </>
                          )}
                          <div className="border-t mt-1 pt-1">
                            <SignOutButton>
                              <button
                                onClick={closeAllDesktopDropdowns}
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
            <SignedIn>{isLoaded && <UserButton afterSignOutUrl="/" />}</SignedIn>
          </div>

          <div className="md:hidden flex items-center justify-between w-full">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="relative w-14 h-14 rounded-full overflow-hidden"
              aria-label="Open language menu"
            >
              <img
                src="/cc.svg"
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

            <div className="flex-grow flex flex-col items-center justify-center pb-16 px-4 space-y-4 overflow-y-auto">
              <SignedOut>
                <Link
                  href="/"
                  onClick={closeMobileMenu}
                  className="text-3xl font-semibold text-white hover:text-gray-300"
                >
                  Home
                </Link>
                <Link
                  href="/about-us"
                  onClick={closeMobileMenu}
                  className="text-3xl font-semibold text-white hover:text-gray-300"
                >
                  About us
                </Link>
                <Link
                  href="/events"
                  onClick={closeMobileMenu}
                  className="text-3xl font-semibold text-white hover:text-gray-300"
                >
                  Events
                </Link>
                <p className="text-gray-300 text-sm">
                  More options when you login
                </p>
                <div className="w-3/4 border-t border-white/20 my-3"></div>
                <SignInButton mode="modal">
                  <button
                    onClick={closeMobileMenu}
                    className="text-4xl font-semibold text-white hover:text-gray-300"
                  >
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    onClick={closeMobileMenu}
                    className="text-4xl font-semibold text-white hover:text-gray-300"
                  >
                    Sign Up
                  </button>
                </SignUpButton>
              </SignedOut>

              <SignedIn>
                {isLoaded && user && (
                  <>
                    <p className="text-white font-Header text-3xl mb-1">
                      Welcome, {user.firstName}!
                    </p>
                    <div className="inline-block mb-3">
                      <UserButton afterSignOutUrl="/" />
                    </div>

                    <Link
                      href="/"
                      onClick={closeMobileMenu}
                      className="text-3xl font-semibold text-white hover:text-gray-300"
                    >
                      Home
                    </Link>
                    <Link
                      href="/about-us"
                      onClick={closeMobileMenu}
                      className="text-3xl font-semibold text-white hover:text-gray-300"
                    >
                      About us
                    </Link>
                    <Link
                      href="/events"
                      onClick={closeMobileMenu}
                      className="text-3xl font-semibold text-white hover:text-gray-300"
                    >
                      Events
                    </Link>

                    {isRegularUser && (
                      <>
                        <Link
                          href="/membership"
                          onClick={closeMobileMenu}
                          className="text-3xl font-semibold text-purple-300 hover:text-purple-200"
                        >
                          Become a member
                        </Link>
                        <p className="text-gray-300 text-sm">
                          Become a member for more options
                        </p>
                      </>
                    )}
                    {(isMember || isCommittee || isAdmin) && (
                      <>
                        <Link
                          href="/membership"
                          onClick={closeMobileMenu}
                          className="text-3xl font-semibold text-white hover:text-gray-300"
                        >
                          Discounts
                        </Link>
                        <Link
                          href="/achievements"
                          onClick={closeMobileMenu}
                          className="text-3xl font-semibold text-white hover:text-gray-300"
                        >
                          Badges
                        </Link>
                        <Link
                          href="/flag-game"
                          onClick={closeMobileMenu}
                          className="text-3xl font-semibold text-blue-300 hover:text-blue-200"
                        >
                          Flag Game
                        </Link>
                      </>
                    )}

                    <div className="w-3/4 border-t border-white/20 my-3"></div>

                    {(isAdmin || (isCommittee && !isAdmin)) && (
                      <Link
                        href="/admin"
                        onClick={closeMobileMenu}
                        className="text-3xl font-semibold text-purple-300 hover:text-purple-200"
                      >
                        Admin Panel
                      </Link>
                    )}

                    {(isRegularUser ||
                      isOnlyMember ||
                      isOnlyCommittee ||
                      isAdmin) && (
                      <Link
                        href="/membership"
                        onClick={closeMobileMenu}
                        className="text-3xl font-semibold text-white hover:text-gray-300"
                      >
                        Membership
                      </Link>
                    )}

                    {isRegularUser && (
                      <button
                        onClick={() => {
                          openBecomeMemberModal();
                          closeMobileMenu();
                        }}
                        className="text-3xl font-semibold text-green-300 hover:text-green-200"
                      >
                        Become a Member
                      </button>
                    )}

                    {(isOnlyMember || isOnlyCommittee || isAdmin) && (
                      <>
                        <Link /* Mobile already has Badges in main nav, this is dashboard specific */
                          href="/achievements"
                          onClick={closeMobileMenu}
                          className="text-3xl font-semibold text-white hover:text-gray-300"
                        >
                          My Badges
                        </Link>
                        <button
                          onClick={() => {
                            openUserCardModal();
                            closeMobileMenu();
                          }}
                          className="text-3xl font-semibold text-white hover:text-gray-300"
                        >
                          View My Card
                        </button>
                      </>
                    )}

                    <div className="border-t border-white/20 mt-3 pt-3 w-3/4">
                      <SignOutButton>
                        <button
                          onClick={closeMobileMenu}
                          className="w-full text-center font-bold text-2xl text-red-300 hover:text-red-200"
                        >
                          Log Out
                        </button>
                      </SignOutButton>
                    </div>
                  </>
                )}
              </SignedIn>

              <div className="w-full max-w-xs pt-6">
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
