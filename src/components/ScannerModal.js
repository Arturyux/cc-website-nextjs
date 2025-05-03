// src/components/ScannerModal.js
"use client";

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const SCANNER_ELEMENT_ID = "modal-qr-reader-container"; // Use a container ID

function ScannerModal({ isOpen, onClose, onScanSuccess, onScanError }) {
  // Ref to store the Html5Qrcode instance, not the Scanner UI version
  const html5QrCodeRef = useRef(null);
  const processingFlag = useRef(false);
  const [cameraError, setCameraError] = useState(null); // State for camera errors

  const startScanner = useCallback(async () => {
    processingFlag.current = false; // Reset flag when starting
    setCameraError(null); // Clear previous errors

    // Ensure container exists
    const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);
    if (!scannerElement) {
        console.error("Scanner container element not found.");
        if(onScanError) onScanError("Scanner UI container not found.");
        return;
    }
    // Ensure it's empty before starting
    scannerElement.innerHTML = "";

    // Create instance if it doesn't exist
    if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, false); // verbose=false
        console.log("Html5Qrcode instance created.");
    }

    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        if (processingFlag.current) {
            console.log("Ignoring rapid re-scan detection.");
            return;
        }
        processingFlag.current = true;
        console.log(`Modal Scan successful: ${decodedText}`);

        // Stop scanning AFTER processing the result
        if (html5QrCodeRef.current) {
            html5QrCodeRef.current.stop()
                .then(() => console.log("Scanner stopped successfully."))
                .catch(err => console.error("Error stopping scanner:", err))
                .finally(() => {
                    // Call parent callback regardless of stop success/failure
                    if (onScanSuccess) {
                        onScanSuccess(decodedText);
                    }
                    // Instance might be cleared in cleanup, reset flag here too
                    processingFlag.current = false;
                });
        } else if (onScanSuccess) {
             onScanSuccess(decodedText); // Fallback if ref somehow cleared
             processingFlag.current = false;
        }
    };

    const qrCodeErrorCallback = (errorMessage) => {
        // console.warn(`QR error = ${errorMessage}`);
        // Don't stop the scanner on typical "QR code not found" errors
    };

    // Configuration for the scanner
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
    };

    try {
        console.log("Attempting to start scanner...");
        // Use start() method from the core class
        await html5QrCodeRef.current.start(
            { facingMode: "environment" }, // prefer back camera
            config,
            qrCodeSuccessCallback,
            qrCodeErrorCallback
        );
        console.log("Scanner started successfully.");
    } catch (err) {
        console.error("Error starting scanner:", err);
        setCameraError(err.message || "Could not start QR Scanner. Check camera permissions or availability.");
        if(onScanError) onScanError(err.message || "Could not start QR Scanner.");
        // Clean up instance if start fails
        if (html5QrCodeRef.current) {
            try { await html5QrCodeRef.current.stop(); } catch (e) {}
            html5QrCodeRef.current = null;
        }
    }
  }, [onScanSuccess, onScanError]); // Dependencies for useCallback

  const stopScanner = useCallback(() => {
    if (html5QrCodeRef.current) {
      processingFlag.current = false; // Reset flag when explicitly stopping
      html5QrCodeRef.current.stop()
        .then(() => {
          console.log("Scanner stopped via stopScanner function.");
          html5QrCodeRef.current = null; // Clear instance ref after stopping
          const scannerElement = document.getElementById(SCANNER_ELEMENT_ID);
          if (scannerElement) scannerElement.innerHTML = ""; // Clear UI
        })
        .catch(err => {
          console.error("Error stopping scanner via stopScanner function:", err);
          html5QrCodeRef.current = null; // Still clear ref on error
        });
    }
  }, []); // No dependencies needed

  // Effect to start/stop scanner when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to ensure DOM is ready
      const frameId = requestAnimationFrame(() => {
          startScanner();
      });
      return () => cancelAnimationFrame(frameId); // Cleanup rAF
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]); // Dependencies

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4"
          initial="hidden" animate="visible" exit="exit" variants={modalVariants}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full relative flex flex-col p-6"
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors z-10 h-7 w-7 flex items-center justify-center"
              aria-label="Close scanner"
            >
              <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold text-center mb-4 text-gray-800">
              Scan Achievement QR Code
            </h2>
            {/* Container for the scanner video feed */}
            <div
              id={SCANNER_ELEMENT_ID}
              className="w-full border-2 border-gray-300 rounded-lg overflow-hidden" // Changed border style
              style={{ minHeight: '280px', position: 'relative' }} // Adjusted height slightly
            >
              {/* The library will inject the video element here */}
              {/* Display camera error message */}
              {cameraError && (
                  <div className="absolute inset-0 bg-gray-100 flex items-center justify-center p-4 text-center">
                      <p className="text-sm text-red-600">{cameraError}</p>
                  </div>
              )}
            </div>
             <p className="text-xs text-gray-500 text-center mt-3">
                Point your camera at the QR code.
             </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ScannerModal;
