// src/app/api/user/details/route.js
import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { z } from "zod";

const userDetailsSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(50),
});

const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

export async function POST(request) {
  if (!clerkClient) {
    console.error("API POST /api/user/details: Clerk client not initialized (CLERK_SECRET_KEY missing or invalid).");
    return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
  }
   if (typeof clerkClient.users?.getUserList !== 'function') {
    console.error("API POST /api/user/details: clerkClient.users.getUserList is not available even after explicit creation.");
    return NextResponse.json({ message: "Clerk SDK issue" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const validation = userDetailsSchema.safeParse(body);

    if (!validation.success) {
      console.warn("API POST /api/user/details: Validation failed.", validation.error.format());
      return NextResponse.json(
        { message: "Invalid input", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const { userIds } = validation.data;
    if (!userIds || userIds.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    const userListResponse = await clerkClient.users.getUserList({ userId: userIds });
    const usersArray = userListResponse.data;

    if (!Array.isArray(usersArray)) {
        console.error("API POST /api/user/details: userListResponse.data is not an array. Response:", userListResponse);
        return NextResponse.json({ message: "Unexpected response structure from Clerk SDK" }, { status: 500 });
    }

    const usersMap = {};
    usersArray.forEach(user => {
      const firstName = user.firstName || "";
      const lastName = user.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      const showPublicName = user.publicMetadata?.showPublicName !== false;

      usersMap[user.id] = {
        id: user.id,
        name: fullName || user.username || "Player",
        showPublicName: showPublicName,
      };
    });

    return NextResponse.json(usersMap, { status: 200 });

  } catch (error) {
    console.error("API POST /api/user/details: Error fetching user details:", error.message, error.stack);
    if (error.errors) console.error("Clerk specific errors:", JSON.stringify(error.errors));
    return NextResponse.json(
      { message: "Internal Server Error fetching user details", error: error.message },
      { status: 500 },
    );
  }
}
