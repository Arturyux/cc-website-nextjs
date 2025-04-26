// src/app/api/admin/google-drive-images/route.js
import { google } from "googleapis";
import { NextResponse } from "next/server";

/**
 * @typedef {object} DriveItem
 * @property {string} id
 * @property {string} name
 * @property {'folder' | 'image'} type
 * @property {string} mimeType
 * @property {string} [thumbnailLink] // For images
 * @property {string} [webContentLink] // For images (potential direct link)
 * @property {string} [webViewLink]   // Link to view in Drive UI
 */

export async function GET(request) {
  // --- Get Folder ID from Query Param or Environment Variable ---
  const searchParams = request.nextUrl.searchParams;
  const requestedFolderId = searchParams.get("folderId");
  const rootFolderId = process.env.GOOGLE_DRIVE_PICTURE_FOLDER_ID; // Your starting folder

  const currentFolderId = requestedFolderId || rootFolderId;

  if (!currentFolderId) {
    console.error("Target Google Drive Folder ID is not defined.");
    return NextResponse.json(
      { error: "Configuration error: Folder ID missing." },
      { status: 500 },
    );
  }

  // --- Authentication ---
  const credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  if (!credentials.client_email || !credentials.private_key) {
    console.error("Missing Google Drive API credentials");
    return NextResponse.json(
      { error: "Configuration error: Credentials missing." },
      { status: 500 },
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  const drive = google.drive({ version: "v3", auth });

  // --- Fetching Files and Folders ---
  try {
    const res = await drive.files.list({
      // Query for non-trashed folders OR images within the current folder
      q: `'${currentFolderId}' in parents and (mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'image/') and trashed = false`,
      // Specify needed fields, including mimeType to differentiate
      fields:
        "files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink)",
      // Optional: Order folders first, then by name
      orderBy: "folder, name",
      pageSize: 100, // Adjust as needed
    });

    const files = res.data.files;

    if (!files) {
      // Should return empty array if no files, but handle null/undefined just in case
      return NextResponse.json({ items: [], currentFolderId });
    }

    // Map to the desired structure, determining type based on mimeType
    /** @type {DriveItem[]} */
    const items = files.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      type:
        file.mimeType === "application/vnd.google-apps.folder"
          ? "folder"
          : "image",
      thumbnailLink: file.thumbnailLink || undefined,
      webContentLink: file.webContentLink || undefined,
      webViewLink: file.webViewLink || undefined,
    }));

    // Return the items and the ID of the folder whose contents were listed
    return NextResponse.json({ items, currentFolderId });
  } catch (error) {
    console.error("Error fetching files/folders from Google Drive:", error);
    const errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      "Failed to fetch items from Google Drive.";
    const status = error.response?.status || 500;
    // Include the folder ID attempted in the error if possible
    return NextResponse.json(
      { error: errorMessage, requestedFolderId: currentFolderId },
      { status },
    );
  }
}
