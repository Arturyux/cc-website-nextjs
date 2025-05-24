// src/app/api/admin/one-com-public-files/route.js
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import SftpClient from "ssh2-sftp-client";
import path from "path"; // Still useful for filename manipulation

// --- Clerk Auth Helpers (reuse from your project) ---
const initializeClerk = () => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey)
    throw new Error("Server config error: Clerk Secret Key missing.");
  return createClerkClient({ secretKey });
};

async function checkUserPermission(
  request,
  allowedRoleKeys = ["admin", "committee"],
) {
  let authResult;
  try {
    authResult = getAuth(request);
    if (!authResult || !authResult.userId)
      return {
        authorized: false,
        error: "Auth context missing.",
        status: 401,
      };
  } catch (error) {
    return {
      authorized: false,
      error: "Failed to get auth context.",
      status: 500,
    };
  }
  const { userId } = authResult;
  try {
    const clerk = initializeClerk();
    const user = await clerk.users.getUser(userId);
    const userPublicMetadata = user?.publicMetadata || {};
    const hasPermission = allowedRoleKeys.some(
      (roleKey) => userPublicMetadata[roleKey] === true,
    );
    if (!hasPermission)
      return {
        authorized: false,
        error: `Unauthorized. Requires ${allowedRoleKeys.join(" or ")} role.`,
        status: 403,
      };
    return { authorized: true, userId };
  } catch (error) {
    return {
      authorized: false,
      error: "Could not verify user roles.",
      status: 500,
    };
  }
}
// --- End Clerk Auth Helpers ---

const sftpConfig = {
  host: process.env.ONE_COM_SFTP_HOST,
  port: parseInt(process.env.ONE_COM_SFTP_PORT || "22", 10),
  username: process.env.ONE_COM_SFTP_USERNAME,
  password: process.env.ONE_COM_SFTP_PASSWORD,
  // privateKey: require('fs').readFileSync('/path/to/private/key'), // For key-based auth
};

const remotePath = process.env.ONE_COM_SFTP_REMOTE_PATH;
const publicBaseUrl = process.env.NEXT_PUBLIC_ONE_COM_PUBLIC_FILES_BASE_URL;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function GET(request) {
  const permissionCheck = await checkUserPermission(request);
  if (!permissionCheck.authorized) {
    return NextResponse.json(
      { error: permissionCheck.error },
      { status: permissionCheck.status },
    );
  }

  if (
    !sftpConfig.host ||
    !sftpConfig.username ||
    (!sftpConfig.password && !sftpConfig.privateKey) || // Check if at least one auth method is present
    !remotePath ||
    !publicBaseUrl
  ) {
    return NextResponse.json(
      { error: "SFTP or URL configuration is missing." },
      { status: 500 },
    );
  }

  const sftp = new SftpClient();
  try {
    await sftp.connect(sftpConfig);
    const fileList = await sftp.list(remotePath);

    const imageFiles = fileList
      .filter((item) => {
        if (item.type === "-") { // '-' usually denotes a file
          const ext = path.extname(item.name).toLowerCase();
          return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(
            ext,
          );
        }
        return false;
      })
      .map((item) => ({
        name: item.name,
        // size: item.size, // SFTP list usually provides size
        // modifiedAt: item.modifyTime, // And modification time
      }));

    return NextResponse.json({
      imageBaseUrl: publicBaseUrl,
      files: imageFiles,
    });
  } catch (err) {
    console.error("SFTP GET Error:", err);
    return NextResponse.json(
      { error: `SFTP operation failed: ${err.message}` },
      { status: 500 },
    );
  } finally {
    if (sftp.client && sftp.client.sftp) { // Check if client and sftp session exist
        await sftp.end();
    }
  }
}

export async function POST(request) {
  const permissionCheck = await checkUserPermission(request, ["admin"]);
  if (!permissionCheck.authorized) {
    return NextResponse.json(
      { error: permissionCheck.error },
      { status: permissionCheck.status },
    );
  }

  if (
    !sftpConfig.host ||
    !sftpConfig.username ||
    (!sftpConfig.password && !sftpConfig.privateKey) ||
    !remotePath
  ) {
    return NextResponse.json(
      { error: "SFTP configuration is missing for upload." },
      { status: 500 },
    );
  }

  const sftp = new SftpClient();
  try {
    await sftp.connect(sftpConfig);
    const formData = await request.formData();
    const uploadedFileResults = [];

    for (const [fieldName, file] of formData.entries()) {
      if (file instanceof File) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          // Skip non-image files or return error for this specific file
          console.warn(`Skipping non-image file: ${file.name} (${file.type})`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          console.warn(`Skipping large file: ${file.name} (${file.size} bytes)`);
          // Potentially collect these errors to return to client
          continue;
        }

        let safeFilename = file.name
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_.-]/g, "");
        if (!safeFilename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            safeFilename = `${safeFilename}.png`; // Default extension
        }
        const finalFilename = `${Date.now()}_${safeFilename}`;
        const remoteFilePath = path.join(remotePath, finalFilename).replace(/\\/g, '/'); // Ensure forward slashes for remote path

        const fileBuffer = Buffer.from(await file.arrayBuffer());

        // Ensure remote directory exists (optional, sftp.put might create it or fail)
        // For simplicity, assuming `remotePath` itself exists.
        // To create subdirectories if `remotePath` includes them:
        // const dirToEnsure = path.dirname(remoteFilePath);
        // if (dirToEnsure !== remotePath) {
        //   await sftp.mkdir(dirToEnsure, true).catch(err => { /* ignore if exists */ });
        // }

        await sftp.put(fileBuffer, remoteFilePath);
        uploadedFileResults.push({
          name: finalFilename,
          originalName: file.name,
          size: file.size,
          type: file.type,
        });
      }
    }

    if (uploadedFileResults.length === 0) {
      return NextResponse.json(
        { error: "No valid image files were processed for upload." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `${uploadedFileResults.length} file(s) uploaded successfully via SFTP.`,
      files: uploadedFileResults,
    });
  } catch (err) {
    console.error("SFTP POST Error:", err);
    return NextResponse.json(
      { error: `SFTP upload operation failed: ${err.message}` },
      { status: 500 },
    );
  } finally {
    if (sftp.client && sftp.client.sftp) {
        await sftp.end();
    }
  }
}
