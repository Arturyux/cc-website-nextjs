"use client";

import React, { useState } from "react";
import DriveFileManager from "./DriveFileManager";
import EventImageManager from "./EventImageManager";

export function CombinedFileManager({ onImageSelect }) {
  const [selectedSource, setSelectedSource] = useState(null);
  const googleDriveRootId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const customApiUrl = process.env.NEXT_PUBLIC_FETCHPICTURE_URL;

  const renderContent = () => {
    switch (selectedSource) {
      case "googleDrive":
        if (!googleDriveRootId) {
          return (
            <p className="text-red-600 text-center mt-4">
              Error: Google Drive Root Folder ID is not configured. Please set
              NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID in environment variables.
            </p>
          );
        }
        return <DriveFileManager rootFolderId={googleDriveRootId} onImageSelect={onImageSelect} />;

      case "customApi":
        if (!customApiUrl) {
          return (
            <p className="text-red-600 text-center mt-4">
              Error: Custom API URL is not configured. Please set
              NEXT_PUBLIC_FETCHPICTURE_URL in environment variables.
            </p>
          );
        }
        return <EventImageManager onImageSelect={onImageSelect} />;

      default:
        return (
          <p className="text-gray-600 text-center mt-4">
            Please select a file source above.
          </p>
        );
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-center items-center gap-4 border-b pb-4">
        <h3 className="text-xl font-semibold mr-4">Select File Source:</h3>
        <button
          onClick={() => setSelectedSource("googleDrive")}
          className={`px-4 py-2 rounded ${
            selectedSource === "googleDrive"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
          disabled={!googleDriveRootId}
        >
          Google Drive
        </button>
        <button
          onClick={() => setSelectedSource("customApi")}
          className={`px-4 py-2 rounded ${
            selectedSource === "customApi"
              ? "bg-green-600 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
           disabled={!customApiUrl}
        >
          Event Images (API)
        </button>
      </div>
      <div>{renderContent()}</div>
    </div>
  );
}

export default CombinedFileManager;
