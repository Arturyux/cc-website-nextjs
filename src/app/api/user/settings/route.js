// src/app/api/user/settings/route.js
import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/clerk-sdk-node"; // Use this
import { auth } from "@clerk/nextjs/server"; // Keep auth for session check
import { z } from "zod";

const settingsSchema = z.object({
  showPublicName: z.boolean(),
  // userId is no longer needed from client if we use auth()
});

// Initialize clerkClient at the module scope if preferred, or inside POST
// Ensure CLERK_SECRET_KEY is available
const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;


export async function POST(request) {
  console.log("API POST /api/user/settings: Request received.");

  if (!clerkClient) {
    console.error("API POST /api/user/settings: Clerk client not initialized (CLERK_SECRET_KEY missing or invalid).");
    return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
  }
  if (typeof clerkClient.users?.updateUserMetadata !== 'function') {
    console.error("API POST /api/user/settings: clerkClient.users.updateUserMetadata is not available even after explicit creation.");
    return NextResponse.json({ message: "Clerk SDK issue" }, { status: 500 });
  }

  try {
    const { userId } = auth(); // Use auth() to get the authenticated user's ID
    console.log("API POST /api/user/settings: userId from auth():", userId);

    if (!userId) {
      console.warn("API POST /api/user/settings: Unauthorized - No User ID from auth().");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // Adjust schema if userId is not sent from client anymore
    const currentSettingsSchema = z.object({ showPublicName: z.boolean() });
    const validation = currentSettingsSchema.safeParse(body);


    if (!validation.success) {
      console.warn("API POST /api/user/settings: Validation failed.", validation.error.format());
      return NextResponse.json(
        { message: "Invalid input", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const { showPublicName } = validation.data;
    console.log("API POST /api/user/settings: Data from client - showPublicName:", showPublicName);

    await clerkClient.users.updateUserMetadata(userId, { // Use userId from auth()
      publicMetadata: {
        showPublicName: showPublicName,
      },
    });
    console.log("API POST /api/user/settings: User metadata updated for", userId, "showPublicName:", showPublicName);

    return NextResponse.json({ message: "Settings updated successfully", showPublicName });
  } catch (error) {
    console.error("API POST /api/user/settings: Error updating settings:", error.message, error.stack);
    if (error.errors) console.error("Clerk specific errors:", JSON.stringify(error.errors));
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 },
    );
  }
}
