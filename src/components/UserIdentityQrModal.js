// src/components/UserIdentityQrModal.js
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faIdBadge } from "@fortawesome/free-solid-svg-icons";

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export default function UserIdentityQrModal({ isOpen, onClose, userName }) {
  const [userQrToken, setUserQrToken] = useState(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  useEffect(() => {
    if (isOpen && !userQrToken && !isLoadingToken) {
      const fetchUserQrToken = async () => {
        setIsLoadingToken(true);
        setTokenError(null);
        try {
          const response = await fetch("/api/user/generate-identity-token");
          const data = await response.json();
          if (!response.ok) {
            throw new Error(
              data.message || "Failed to fetch user identity token",
            );
          }
          setUserQrToken(data.userQrToken);
        } catch (error) {
          console.error("Error fetching user identity QR token:", error);
          setTokenError(error.message);
          setUserQrToken(null);
        } finally {
          setIsLoadingToken(false);
        }
      };
      fetchUserQrToken();
    } else if (!isOpen) {
      // Reset when modal closes
      setUserQrToken(null);
      setTokenError(null);
      setIsLoadingToken(false);
    }
  }, [isOpen, userQrToken, isLoadingToken]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4"
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
          <div className="p-5 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FontAwesomeIcon icon={faIdBadge} className="text-indigo-600" />
              My Identity QR Code
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 z-20 bg-white rounded-full p-1 h-7 w-7 flex items-center justify-center"
              aria-label="Close modal"
            >
              <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 flex flex-col items-center justify-center flex-grow min-h-[300px]">
            {userName && (
              <p className="text-center text-gray-700 mb-1 font-medium">
                {userName}
              </p>
            )}
            <p className="text-center text-sm text-gray-500 mb-4">
              Admins or Committee members can scan this code to identify you for
              granting badges.
            </p>
            {isLoadingToken && <p>Loading your secure QR code...</p>}
            {tokenError && (
              <p className="text-red-500 text-center">
                Error: {tokenError}
              </p>
            )}
            {userQrToken && !isLoadingToken && !tokenError ? (
              <QRCodeCanvas
                id="user-identity-qr-code"
                value={userQrToken}
                size={240}
                level={"H"}
                includeMargin={true}
                className="mx-auto border bg-white p-2 rounded shadow-lg"
              />
            ) : (
              !isLoadingToken &&
              !tokenError && (
                <p className="text-red-500">Could not generate QR Code.</p>
              )
            )}
            <p className="text-xs text-gray-400 mt-4 text-center">
              This QR code is unique to you and may expire.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
