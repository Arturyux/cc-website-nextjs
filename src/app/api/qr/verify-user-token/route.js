import { NextResponse } from "next/server";
import { getAuth, createClerkClient } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";
import { env } from "@/env";

const QR_JWT_SECRET = process.env.QR_JWT_SECRET;
const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export async function POST(request) {
  const { userId: adminUserId, sessionClaims } = getAuth(request);

  if (!adminUserId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = sessionClaims?.metadata?.admin === true;
  const isCommittee = sessionClaims?.metadata?.committee === true;
  if (!isAdmin && !isCommittee) {
    return NextResponse.json(
      { message: "Forbidden: Not authorized to verify user tokens." },
      { status: 403 },
    );
  }

  if (!QR_JWT_SECRET) {
    console.error("QR_JWT_SECRET is not defined for user token verification.");
    return NextResponse.json(
      { message: "Server configuration error." },
      { status: 500 },
    );
  }

  if (!env.CLERK_SECRET_KEY) {
    console.error("CLERK_SECRET_KEY is not defined.");
    return NextResponse.json(
      { message: "Server configuration error (Clerk)." },
      { status: 500 },
    );
  }

  let body;
  let userToken;
  try {
    body = await request.json();
    if (!body.userToken) {
      throw new Error("Missing required field: userToken");
    }
    userToken = body.userToken;
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid request body", error: error.message },
      { status: 400 },
    );
  }

  try {
    const decoded = jwt.verify(userToken, QR_JWT_SECRET);
    if (decoded.type !== "user_identity" || !decoded.userId) {
      throw new Error("Invalid user token content or type.");
    }
    const targetUserId = decoded.userId;

    // Fetch user directly from Clerk
    const userInfoFromClerk = await clerkClient.users.getUser(targetUserId);

    if (!userInfoFromClerk) {
      return NextResponse.json(
        { message: "User identified by token not found via Clerk." },
        { status: 404 },
      );
    }

    const primaryEmail = userInfoFromClerk.emailAddresses.find(
      (email) => email.id === userInfoFromClerk.primaryEmailAddressId,
    )?.emailAddress;

    return NextResponse.json({
      success: true,
      userId: userInfoFromClerk.id,
      userName:
        `${userInfoFromClerk.firstName || ""} ${
          userInfoFromClerk.lastName || ""
        }`.trim() ||
        userInfoFromClerk.username ||
        primaryEmail ||
        userInfoFromClerk.id,
    });
  } catch (error) {
    console.error("User Token Verification or Clerk API Error:", error);
    let userMessage = "Invalid or expired user QR code.";
    if (error.name === "TokenExpiredError") {
      userMessage = "This user QR code has expired.";
    } else if (error.name === "JsonWebTokenError") {
      userMessage = "This user QR code is invalid or has been tampered with.";
    } else if (error.message && error.message.includes("Clerk")) {
      userMessage = "Could not retrieve user details at this time.";
    }

    return NextResponse.json(
      { success: false, message: userMessage, detail: error.message },
      { status: 400 }, 
    );
  }
}
