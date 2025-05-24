// src/components/admin/DriveManagment/OneComPublicFileManager.js
"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExclamationTriangle,
  faChevronLeft,
  faChevronRight,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";

const ITEMS_PER_PAGE = 24; // Adjust as needed

const fetchOneComPublicFiles = async () => {
  const response = await fetch("/api/admin/one-com-public-files");
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (parseError) {
      throw new Error(
        `Failed to fetch public files: ${response.status} ${response.statusText}`,
      );
    }
    throw new Error(
      errorData?.error ||
        `Failed to fetch public files: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
};

const overlayVariants = {
  hidden: { opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
};

export function OneComPublicFileManager({ onImageSelect }) {
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: manifestData,
    isLoading,
    isFetching,
    error,
    isError,
  } = useQuery({
    queryKey: ["oneComPublicFiles"],
    queryFn: fetchOneComPublicFiles,
  });

  useEffect(() => {
    setCurrentPage(1); // Reset page on data change/refetch
  }, [manifestData]);

  const handleItemClick = (fullUrl, name) => {
    if (typeof onImageSelect === "function") {
      onImageSelect(fullUrl);
    } else {
      navigator.clipboard
        .writeText(fullUrl)
        .then(() => {
          setCopiedUrl(fullUrl);
          setTimeout(() => setCopiedUrl(null), 2000);
        })
        .catch((err) => alert(`Failed to copy URL for ${name}.`));
    }
  };

  const getPaginatedData = () => {
    if (!manifestData?.files || !Array.isArray(manifestData.files)) {
      return { items: [], totalPages: 0, imageBaseUrl: "" };
    }
    const itemsToPaginate = manifestData.files;
    const totalItems = itemsToPaginate.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = itemsToPaginate.slice(startIndex, endIndex);
    return {
      items: paginatedItems,
      totalPages,
      imageBaseUrl: manifestData.imageBaseUrl,
    };
  };

  const {
    items: displayedItems,
    totalPages,
    imageBaseUrl,
  } = getPaginatedData();

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-2" />
        Loading public files...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-red-600 text-center">
        <FontAwesomeIcon
          icon={faExclamationTriangle}
          size="2x"
          className="mr-2"
        />
        Error loading public files: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!manifestData || !imageBaseUrl || displayedItems.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No public files found or manifest is not configured correctly.
        <p className="text-xs mt-1">
          Ensure <code>public/data/one_com_public_images.json</code> exists and
          is correctly formatted with an <code>imageBaseUrl</code> and a{" "}
          <code>files</code> array.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 font-sans">
      <div className="mb-4 flex items-center justify-end">
        {isFetching && !isLoading && (
          <FontAwesomeIcon icon={faSpinner} spin className="mr-auto" />
        )}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isFetching}
              className="p-1 disabled:opacity-50 text-gray-600 hover:text-black"
              aria-label="Previous Page"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isFetching}
              className="p-1 disabled:opacity-50 text-gray-600 hover:text-black"
              aria-label="Next Page"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {displayedItems.map((item) => {
          const fullUrl = `${imageBaseUrl.endsWith("/") ? imageBaseUrl : imageBaseUrl + "/"}${item.path.startsWith("/") ? item.path.substring(1) : item.path}`;
          const showCopiedOverlay = !onImageSelect && copiedUrl === fullUrl;

          return (
            <div
              key={item.path}
              onClick={() => handleItemClick(fullUrl, item.name)}
              className={`border border-gray-300 rounded p-2 text-center cursor-pointer overflow-hidden relative min-h-[150px] flex flex-col justify-between transition-transform duration-200 ease-in-out transform motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md bg-white`}
            >
              <div className="flex-grow flex items-center justify-center mb-2">
                <img
                  src={fullUrl}
                  alt={item.name}
                  className="max-w-full max-h-[100px] h-auto object-contain block mx-auto"
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = "none";
                    const parent = e.target.parentNode;
                    if (parent) {
                      const errorIconContainer =
                        document.createElement("span");
                      errorIconContainer.className =
                        "text-red-500 flex flex-col items-center justify-center";
                      const icon = document.createElement("div");
                      icon.innerHTML = `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="exclamation-triangle" class="svg-inline--fa fa-exclamation-triangle fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" style="width: 30px; height: 30px;"><path fill="currentColor" d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-60.075-39.993-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.999 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"></path></svg>`;
                      const errorText = document.createElement("p");
                      errorText.className = "text-xs mt-1";
                      errorText.textContent = "Load error";
                      errorIconContainer.appendChild(icon);
                      errorIconContainer.appendChild(errorText);
                      parent.appendChild(errorIconContainer);
                    }
                  }}
                />
              </div>
              <span
                className="text-sm break-words block mt-auto"
                title={item.name}
              >
                {item.name.length > 25
                  ? item.name.substring(0, 22) + "..."
                  : item.name}
              </span>
              <AnimatePresence>
                {showCopiedOverlay && (
                  <motion.div
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="absolute inset-0 bg-gray-500/70 text-white flex items-center justify-center text-base font-bold rounded z-10 pointer-events-none"
                  >
                    URL Copied
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OneComPublicFileManager;
