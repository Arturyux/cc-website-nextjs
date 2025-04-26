"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolder, faArrowLeft, faSpinner, faExclamationTriangle,
  faChevronLeft, faChevronRight
} from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";

const fetchDriveItems = async (folderId) => {
  const response = await fetch(
    `/api/admin/google-drive-images?folderId=${encodeURIComponent(folderId)}`,
  );
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (parseError) {
      throw new Error(
        `Failed to fetch items: ${response.status} ${response.statusText}`,
      );
    }
    throw new Error(
      errorData?.error ||
        `Failed to fetch items: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
};

const overlayVariants = {
  hidden: { opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
};
const ITEMS_PER_PAGE = 10;

export function DriveFileManager({ rootFolderId, onImageSelect }) {
  if (!rootFolderId) {
     return <div className="p-4">Error: Root Folder ID is required.</div>;
  }

  const [folderIdStack, setFolderIdStack] = useState([rootFolderId]);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const currentFolderId = folderIdStack[folderIdStack.length - 1];

  const {
    data: queryData,
    isLoading,
    isFetching,
    error,
    isError,
  } = useQuery({
    queryKey: ["googleDriveItems", currentFolderId],
    queryFn: () => fetchDriveItems(currentFolderId),
    keepPreviousData: true,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [currentFolderId]);

  const prefetchFolder = (folderId) => {
    queryClient.prefetchQuery({
      queryKey: ["googleDriveItems", folderId],
      queryFn: () => fetchDriveItems(folderId),
      staleTime: 60 * 1000,
    });
  };

  const handleItemClick = (item) => {
    if (item.type === "folder") {
      setFolderIdStack((prevStack) => [...prevStack, item.id]);
    } else if (item.type === "image") {
      const urlToUse = item.thumbnailLink || item.webContentLink || `https://drive.google.com/file/d/${item.id}/preview`;

      if (urlToUse && item.id) {
        if (typeof onImageSelect === 'function') {
          onImageSelect(urlToUse);
        } else {
          navigator.clipboard.writeText(urlToUse)
            .then(() => {
              setCopiedUrl(urlToUse);
              setTimeout(() => setCopiedUrl(null), 2000);
            })
            .catch((err) => alert("Failed to copy URL."));
        }
      } else {
        alert("Could not determine a usable URL for this image.");
      }
    }
  };

  const handleBackClick = () => {
    if (folderIdStack.length > 1) {
      setFolderIdStack((prevStack) => prevStack.slice(0, -1));
    }
  };

  const getPaginatedData = () => {
    if (!queryData?.items) return { items: [], totalPages: 0 };
    const itemsToPaginate = queryData.items;
    const totalItems = itemsToPaginate.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = itemsToPaginate.slice(startIndex, endIndex);
    return { items: paginatedItems, totalPages };
  };

  const { items: displayedItems, totalPages } = getPaginatedData();

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="p-4 font-sans">
      <div className="mb-4 flex items-center justify-between">
         <div className="flex items-center gap-4">
            {folderIdStack.length > 1 && (
              <button onClick={handleBackClick} disabled={isFetching} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Back
              </button>
            )}
            {isFetching && <FontAwesomeIcon icon={faSpinner} spin />}
         </div>
         {totalPages > 1 && (
           <div className="flex items-center gap-2">
             <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isFetching} className="p-1 disabled:opacity-50 text-gray-600 hover:text-black" aria-label="Previous Page">
               <FontAwesomeIcon icon={faChevronLeft} />
             </button>
             <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
             <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || isFetching} className="p-1 disabled:opacity-50 text-gray-600 hover:text-black" aria-label="Next Page">
               <FontAwesomeIcon icon={faChevronRight} />
             </button>
           </div>
         )}
      </div>

      {isLoading && !isFetching && <div>Loading initial content...</div>}
      {isError && !isFetching && ( <div className="text-red-600">Error loading folder content: {error?.message || "Unknown error"}</div> )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
          {displayedItems.length === 0 && !isLoading && <div>This folder is empty.</div>}
          {displayedItems.map((item) => {
            const potentialUrl = item.thumbnailLink || item.webContentLink || `https://drive.google.com/file/d/${item.id}/preview`;
            const showCopiedOverlay = !onImageSelect && copiedUrl === potentialUrl;

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => item.type === 'folder' && prefetchFolder(item.id)}
                className={`border border-gray-300 rounded p-2 text-center cursor-pointer overflow-hidden relative min-h-[150px] flex flex-col justify-between transition-transform duration-200 ease-in-out transform motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md ${item.type === "folder" ? "bg-gray-100" : "bg-white"}`}
              >
                <div className="flex-grow flex items-center justify-center mb-2">
                  {item.type === "image" ? (
                    <img
                      src={item.thumbnailLink}
                      alt={item.name}
                      className="max-w-full max-h-[100px] h-auto object-contain block mx-auto"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const errorIcon = document.createElement('span');
                        errorIcon.innerHTML = `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="exclamation-triangle" class="svg-inline--fa fa-exclamation-triangle" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" style="width: 40px; height: 40px; color: #dc3545;"><path fill="currentColor" d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-60.075-39.993-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.999 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"></path></svg>`;
                        if (e.target.parentNode) { e.target.parentNode.appendChild(errorIcon); }
                      }}
                    />
                  ) : (
                    <FontAwesomeIcon icon={faFolder} className="text-5xl text-gray-500" />
                  )}
                </div>
                <span className="text-sm break-words block mt-auto" title={item.name}>
                  {item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name}
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
      )}
    </div>
  );
}

export default DriveFileManager;
