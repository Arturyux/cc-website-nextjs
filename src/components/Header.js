"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import SocialIcons from "./Socialmedia";
import Linktree from "./Linktree";
import UserCardModal from "./UserCardModal";
import BecomeMemberModal from "./BecomeMemberModal";
import UserIdentityQrModal from "@/components/UserIdentityQrModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"; 
import { faQrcode } from "@fortawesome/free-solid-svg-icons";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  SignOutButton,
  useUser,
  UserButton,
} from "@clerk/nextjs";
import toast from "react-hot-toast";

const UserIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A18.75 18.75 0 0 1 12 22.5c-2.786 0-5.433-.608-7.499-1.688Z"
    />
  </svg>
);

const CloseIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);

  const [isDesktopSideMenuOpen, setIsDesktopSideMenuOpen] = useState(false);
  const desktopSideMenuRef = useRef(null);
  const desktopMenuTriggerRef = useRef(null);

  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);
  const authDropdownRef = useRef(null);
  const authIconTriggerRef = useRef(null);

  const [isUserCardModalOpen, setIsUserCardModalOpen] = useState(false);
  const [isBecomeMemberModalOpen, setIsBecomeMemberModalOpen] = useState(false);
  const [isUserIdentityModalOpen, setIsUserIdentityModalOpen] = useState(false);

  const controls = useAnimation();
  const initialScrollRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const [isScrollDisabled, setIsScrollDisabled] = useState(false);

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

  const openUserIdentityModal = () => {
    if (!user) {
      toast.error("Please sign in to view your QR code.");
      return;
    }
    setIsUserIdentityModalOpen(true);
  };

  const closeUserIdentityModal = () => {
    setIsUserIdentityModalOpen(false);
  };

  const userDisplayName = useMemo(() => {
    if (!user) return "";
    return (
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.username ||
      user.emailAddresses?.[0]?.emailAddress || 
      "User"
    );
  }, [user]);

  useEffect(() => {
    const bodyShouldLock =
      isUserCardModalOpen ||
      isBecomeMemberModalOpen ||
      mobileMenuOpen ||
      isDesktopSideMenuOpen ||
      isUserIdentityModalOpen ||
      isScrollDisabled;

    if (bodyShouldLock) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [
    isUserCardModalOpen,
    isBecomeMemberModalOpen,
    mobileMenuOpen,
    isDesktopSideMenuOpen,
    isUserIdentityModalOpen,
    isScrollDisabled,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(event.target) &&
        !event.target.closest("button[aria-label='Open language menu']") &&
        langDropdownOpen
      ) {
        setLangDropdownOpen(false);
      }

      if (
        authDropdownRef.current &&
        !authDropdownRef.current.contains(event.target) &&
        !authIconTriggerRef.current?.contains(event.target) &&
        isAuthDropdownOpen
      ) {
        setIsAuthDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [langDropdownOpen, isAuthDropdownOpen, isDesktopSideMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        mobileMenuOpen ||
        isUserCardModalOpen ||
        isBecomeMemberModalOpen ||
        isDesktopSideMenuOpen ||
        isUserIdentityModalOpen
      )
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
    isDesktopSideMenuOpen,
    isUserIdentityModalOpen,
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

  const desktopSideMenuVariants = {
    hidden: { x: "-100%" },
    visible: { x: "0%" },
    exit: { x: "-100%" },
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setLangDropdownOpen(false);
  };

  const closeDesktopSidePanel = () => {
    setIsDesktopSideMenuOpen(false);
  };

  const sidePanelLinkStyles =
    "text-3xl font-semibold text-white hover:text-gray-300 py-2 text-center w-full";
  const sidePanelHighlightedLinkStyles =
    "text-3xl font-semibold text-blue-700 hover:text-blue-400 py-2 text-center w-full";
  const authDropdownLinkStyles =
    "block w-full text-left px-4 py-2 text-base text-gray-700 hover:bg-gray-100 rounded";

  return (
    <>
      <motion.header
        animate={controls}
        className={`fixed md:left-1/2 left-0 right-0 md:transform md:-translate-x-1/2 top-4 md:top-6 p-2 md:p-3 md:w-[75%] w-[90%] flex justify-center items-center bg-mainColor shadow-lg z-30 rounded-full mx-auto`}
      >
        <div className="flex items-center justify-between w-full px-4 md:px-6">
          <div className="hidden md:flex items-center justify-between w-full">
            <button
              ref={desktopMenuTriggerRef}
              onClick={() => setIsDesktopSideMenuOpen(true)}
              className="font-Main text-xl lg:text-2xl text-white font-bold hover:text-gray-300 transition-colors"
            >
              Menu
            </button>

            <div className="relative">
              <SignedIn>
                {isLoaded && user && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={openUserIdentityModal}
                      className="text-white p-1.5 rounded-full hover:bg-white/20 transition-colors"
                      title="Show My QR Code"
                      aria-label="Show My QR Code"
                    >
                      <FontAwesomeIcon icon={faQrcode} className="w-6 h-6" />
                    </button>
                    <span className="text-white text-2xl font-medium font-Header">
                      Welcome, {userDisplayName}
                    </span>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                )}
              </SignedIn>
              <SignedOut>
                <div ref={authDropdownRef}>
                  <button
                    ref={authIconTriggerRef}
                    onClick={() => setIsAuthDropdownOpen(!isAuthDropdownOpen)}
                    className="text-white p-1.5 rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Open account menu"
                  >
                    <UserIcon className="w-7 h-7" />
                  </button>
                  <AnimatePresence>
                    {isAuthDropdownOpen && (
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={dropdownVariants}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className="absolute z-20 top-full right-0 mt-2 w-48 p-2 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col"
                      >
                        <SignInButton mode="modal">
                          <button
                            onClick={() => setIsAuthDropdownOpen(false)}
                            className={authDropdownLinkStyles}
                          >
                            Sign In
                          </button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                          <button
                            onClick={() => setIsAuthDropdownOpen(false)}
                            className={authDropdownLinkStyles}
                          >
                            Sign Up
                          </button>
                        </SignUpButton>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </SignedOut>
            </div>
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
            <AnimatePresence>
              {langDropdownOpen && (
                <motion.div
                  ref={langDropdownRef}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={dropdownVariants}
                  className="absolute top-16 left-0 mt-1 w-36 p-2 bg-white border rounded shadow-lg"
                >
                  <button className="block w-full text-left px-3 py-1 hover:bg-gray-100">
                    English
                  </button>
                  <button className="block w-full text-left px-3 py-1 hover:bg-gray-100">
                    Español
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

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
            className="fixed top-0 left-0 h-full w-full bg-mainColor z-40 overflow-y-auto flex flex-col md:hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white border-opacity-20 flex-shrink-0">
              <button
                onClick={closeMobileMenu}
                className="text-white p-2"
                aria-label="Close menu"
              >
                <CloseIcon className="h-7 w-7" />
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
                      Welcome, {userDisplayName}!
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
                          className="text-3xl font-semibold text-white hover:text-blue-200"
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
                        className="text-3xl font-semibold text-blue-700 hover:text-blue-400"
                      >
                        Admin Panel
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
                        <button
                          onClick={() => {
                            openUserIdentityModal();
                            closeMobileMenu();
                          }}
                          className="text-3xl font-semibold text-white hover:text-gray-300 flex items-center gap-2"
                        >
                          <FontAwesomeIcon icon={faQrcode} className="w-7 h-7" />
                          My QR Code
                        </button>
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

      <AnimatePresence>
        {isDesktopSideMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={closeDesktopSidePanel}
              className="fixed inset-0 bg-black/60 z-40 hidden md:block"
            />
            <motion.div
              ref={desktopSideMenuRef}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={desktopSideMenuVariants}
              transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 left-0 h-full w-80 lg:w-96 bg-mainColor z-50 overflow-y-auto flex-col shadow-2xl hidden md:flex"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/20 flex-shrink-0">
                <span className="text-white text-2xl font-bold font-Main">
                  Menu
                </span>
                <button
                  onClick={closeDesktopSidePanel}
                  className="text-white p-2 hover:bg-white/10 rounded-full"
                  aria-label="Close menu"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-grow flex flex-col items-center justify-start py-8 px-4 space-y-3 overflow-y-auto">
                <SignedOut>
                  <Link
                    href="/"
                    onClick={closeDesktopSidePanel}
                    className={sidePanelLinkStyles}
                  >
                    Home
                  </Link>
                  <Link
                    href="/about-us"
                    onClick={closeDesktopSidePanel}
                    className={sidePanelLinkStyles}
                  >
                    About us
                  </Link>
                  <Link
                    href="/events"
                    onClick={closeDesktopSidePanel}
                    className={sidePanelLinkStyles}
                  >
                    Events
                  </Link>
                  <p className="text-gray-300 text-sm py-2">
                    More options when you login
                  </p>
                  <div className="w-3/4 border-t border-white/20 my-3"></div>
                  <SignInButton mode="modal">
                    <button
                      onClick={closeDesktopSidePanel}
                      className={`${sidePanelLinkStyles} text-4xl`}
                    >
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button
                      onClick={closeDesktopSidePanel}
                      className={`${sidePanelLinkStyles} text-4xl`}
                    >
                      Sign Up
                    </button>
                  </SignUpButton>
                </SignedOut>

                <SignedIn>
                  {isLoaded && user && (
                    <>
                      <Link
                        href="/"
                        onClick={closeDesktopSidePanel}
                        className={sidePanelLinkStyles}
                      >
                        Home
                      </Link>
                      <Link
                        href="/about-us"
                        onClick={closeDesktopSidePanel}
                        className={sidePanelLinkStyles}
                      >
                        About us
                      </Link>
                      <Link
                        href="/events"
                        onClick={closeDesktopSidePanel}
                        className={sidePanelLinkStyles}
                      >
                        Events
                      </Link>

                      {isRegularUser && (
                        <>
                          <Link
                            href="/membership"
                            onClick={closeDesktopSidePanel}
                            className={sidePanelHighlightedLinkStyles}
                          >
                            Become a member
                          </Link>
                          <p className="text-gray-300 text-sm py-1">
                            Become a member for more options
                          </p>
                        </>
                      )}
                      {(isMember || isCommittee || isAdmin) && (
                        <>
                          <Link
                            href="/membership"
                            onClick={closeDesktopSidePanel}
                            className={sidePanelLinkStyles}
                          >
                            Discounts
                          </Link>
                          <Link
                            href="/achievements"
                            onClick={closeDesktopSidePanel}
                            className={sidePanelLinkStyles}
                          >
                            Badges
                          </Link>
                          <Link
                            href="/flag-game"
                            onClick={closeDesktopSidePanel}
                            className={`${sidePanelHighlightedLinkStyles} text-white hover:text-blue-200`}
                          >
                            Flag Game
                          </Link>
                        </>
                      )}

                      <div className="w-3/4 border-t border-white/20 my-3"></div>

                      {(isAdmin || (isCommittee && !isAdmin)) && (
                        <Link
                          href="/admin"
                          onClick={closeDesktopSidePanel}
                          className={`${sidePanelHighlightedLinkStyles} text-blue-700 hover:text-blue-400`}
                        >
                          Admin Panel
                        </Link>
                      )}

                      {isRegularUser && (
                        <button
                          onClick={() => {
                            openBecomeMemberModal();
                            closeDesktopSidePanel();
                          }}
                          className={`${sidePanelHighlightedLinkStyles} text-green-300 hover:text-green-200`}
                        >
                          Become a Member
                        </button>
                      )}

                      {(isOnlyMember || isOnlyCommittee || isAdmin) && (
                        <>
                          <button
                            onClick={() => {
                              openUserIdentityModal();
                              closeDesktopSidePanel();
                            }}
                            className={`${sidePanelLinkStyles} flex items-center justify-center gap-2`}
                          >
                            <FontAwesomeIcon icon={faQrcode} className="w-7 h-7" />
                            My QR Code
                          </button>
                          <button
                            onClick={() => {
                              openUserCardModal();
                              closeDesktopSidePanel();
                            }}
                            className={sidePanelLinkStyles}
                          >
                            View My Card
                          </button>
                        </>
                      )}

                      <div className="border-t border-white/20 mt-3 pt-3 w-3/4">
                        <SignOutButton>
                          <button
                            onClick={closeDesktopSidePanel}
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
            </motion.div>
          </>
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
      {/* Render the UserIdentityQrModal */}
      <UserIdentityQrModal
        isOpen={isUserIdentityModalOpen}
        onClose={closeUserIdentityModal}
        userName={userDisplayName}
      />
    </>
  );
}
