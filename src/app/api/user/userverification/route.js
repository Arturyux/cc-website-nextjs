// app/api/add-verification/route.js
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server"; // Use server-side auth
import fs from "fs/promises";
import path from "path";

const dataFilePath = path.join(
  process.cwd(),
  "public",
  "data",
  "MemberVerefication.json",
);
const dataDir = path.dirname(dataFilePath);

// Helper function to ensure directory and file exist
async function ensureFileExists() {
  try {
    await fs.access(dataDir);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(dataDir, { recursive: true });
  }
  try {
    await fs.access(dataFilePath);
  } catch (error) {
    // File doesn't exist, create it with an empty array
    await fs.writeFile(dataFilePath, "[]", "utf-8");
  }
}

// Helper function to read data
async function readVerificationData() {
  await ensureFileExists(); // Make sure file exists before reading
  try {
    const fileContent = await fs.readFile(dataFilePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading verification file:", error);
    // Return empty array or throw error depending on desired handling
    return []; // Safer default
  }
}

export async function POST(request) {
  const { userId: authenticatedUserId } = auth(); // Get authenticated user ID

  if (!authenticatedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userIdToAdd;
  try {
    const body = await request.json();
    userIdToAdd = body.userId;
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Security Check: Ensure the user being added is the authenticated user
  if (authenticatedUserId !== userIdToAdd) {
    console.warn(
      `Security Warning: User ${authenticatedUserId} attempted to add ${userIdToAdd}`,
    );
    return NextResponse.json(
      { error: "Forbidden: Cannot add another user" },
      { status: 403 },
    );
  }

  try {
    const data = await readVerificationData();

    // Check if user already exists
    const userExists = data.some((entry) => entry.userID === userIdToAdd);

    if (userExists) {
      return NextResponse.json(
        { message: "User already in verification list" },
        { status: 200 }, // Or 409 Conflict if you prefer
      );
    }

    // Add the new user
    data.push({ userID: userIdToAdd });

    // Write the updated data back to the file
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), "utf-8");

    return NextResponse.json(
      { success: true, message: "User added to verification list" },
      { status: 201 }, // 201 Created
    );
  } catch (error) {
    console.error("Error processing verification request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
