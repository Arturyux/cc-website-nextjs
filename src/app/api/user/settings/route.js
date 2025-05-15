// src/app/api/user/settings/route.js
import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { auth } from "@clerk/nextjs/server"; 
import { z } from "zod";

const settingsSchema = z.object({
  showPublicName: z.boolean(),
});

const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;


export async function POST(request) {
  if (!clerkClient) {
    console.error("API POST /api/user/settings: Clerk client not initialized (CLERK_SECRET_KEY missing or invalid).");
    return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
  }
  if (typeof clerkClient.users?.updateUserMetadata !== 'function') {
    console.error("API POST /api/user/settings: clerkClient.users.updateUserMetadata is not available even after explicit creation.");
    return NextResponse.json({ message: "Clerk SDK issue" }, { status: 500 });
  }

  try {
    const { userId } = auth();
    if (!userId) {
      console.warn("API POST /api/user/settings: Unauthorized - No User ID from auth().");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
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
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        showPublicName: showPublicName,
      },
    });
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
