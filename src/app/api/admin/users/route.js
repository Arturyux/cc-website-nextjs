import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";

console.log(
  "If clerk secret key exists:",
  !!process.env.CLERK_SECRET_KEY,
  "Length:",
  process.env.CLERK_SECRET_KEY?.length
);

const initializeClerk = () => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("Clerk Secret Key is missing from environment variables!");
    throw new Error("Server configuration error: Clerk Secret Key missing.");
  }
  try {
      return createClerkClient({ secretKey });
  } catch (error) {
      console.error("Failed to initialize Clerk SDK:", error);
      throw new Error("Failed to initialize Clerk SDK.");
  }
};

async function verifyUserLoggedIn(request) {
  let authResult;
  try {
    authResult = getAuth(request);
    if (!authResult || !authResult.userId) {
      console.error("verifyUserLoggedIn: Failed to get userId from getAuth.");
      return { authorized: false, error: "Authentication context missing or invalid session.", status: 401 };
    }
    // console.log(`verifyUserLoggedIn: User ${authResult.userId} is logged in.`);
    return { authorized: true, userId: authResult.userId };
  } catch (error) {
    console.error("verifyUserLoggedIn: Error calling getAuth:", error);
    return { authorized: false, error: "Failed to get authentication context due to server error.", status: 500 };
  }
}

export async function GET(request) {
  const loggedInCheck = await verifyUserLoggedIn(request);
  if (!loggedInCheck.authorized) {
    return NextResponse.json({ error: loggedInCheck.error }, { status: loggedInCheck.status });
  }

  let clerk;
  try {
    clerk = initializeClerk();
    const userListResponse = await clerk.users.getUserList({ limit: 500 });

    const users = userListResponse?.data;
    const totalCount = userListResponse?.totalCount;

    if (!Array.isArray(users)) {
        console.error("API GET /api/admin/users - Expected an array in response.data, but received:", userListResponse);
        throw new Error("Received invalid user list format from server (expected response.data to be an array).");
    }

    const userData = users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress || "No primary email",
      isAdmin: user.publicMetadata?.admin === true,
      isMember: user.publicMetadata?.member === true,
      isFreezed: user.publicMetadata?.freezed === true,
    }));

    return NextResponse.json(userData);

  } catch (error) {
    console.error("API GET /api/admin/users - Error during user fetch or SDK init:", error);
    if (error.message.includes("Clerk Secret Key missing") || error.message.includes("Failed to initialize Clerk SDK")) {
       return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error.message.includes("Received invalid user list format")) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: `Failed to fetch users: ${error.message}` }, { status: 500 });
  }
}

export async function PUT(request) {
  console.log("API PUT /api/admin/users - Verifying user logged in...");
  const loggedInCheck = await verifyUserLoggedIn(request);
  if (!loggedInCheck.authorized) {
     console.log("API PUT /api/admin/users - User not logged in or context missing.");
    return NextResponse.json({ error: loggedInCheck.error }, { status: loggedInCheck.status });
  }
  //  console.log("API PUT /api/admin/users - User logged in.");

  let clerk;
  try {
    clerk = initializeClerk();
    const { userId, metadataKey, metadataValue } = await request.json();
    console.log(`API PUT /api/admin/users - Received request to update user ${userId}, key: ${metadataKey}, value: ${metadataValue}`);

    const validKeys = ["admin", "member", "freezed"];
    if (!userId || !validKeys.includes(metadataKey) || typeof metadataValue !== 'boolean') {
       console.error("API PUT /api/admin/users - Invalid request body:", { userId, metadataKey, metadataValue });
      return NextResponse.json({ error: "Invalid input: Missing userId, invalid metadataKey, or metadataValue is not a boolean." }, { status: 400 });
    }

    let existingMetadata = {};
    try {
        const user = await clerk.users.getUser(userId);
        existingMetadata = user.publicMetadata || {};
         console.log(`API PUT /api/admin/users - Fetched existing metadata for ${userId}:`, existingMetadata);
    } catch (fetchError) {
         console.error(`API PUT /api/admin/users - Failed to fetch user ${userId} before update:`, fetchError);
         return NextResponse.json({ error: `Failed to fetch user ${userId} to get existing metadata.` }, { status: 500 });
    }

    let finalMetadata = { ...existingMetadata, [metadataKey]: metadataValue };
    if (metadataKey === 'admin' && metadataValue === true) {
      console.log(`API PUT /api/admin/users - Enforcing Member status for new Admin ${userId}`);
      finalMetadata.member = true;
    }
    console.log(`API PUT /api/admin/users - Final metadata for ${userId}:`, finalMetadata);

    await clerk.users.updateUserMetadata(userId, { publicMetadata: finalMetadata });
    console.log(`API PUT /api/admin/users - Successfully updated metadata for ${userId}`);

    return NextResponse.json({ success: true, userId, metadataKey, metadataValue });

  } catch (error) {
     console.error("API PUT /api/admin/users - Error during user update or SDK init:", error);
     if (error.message.includes("Clerk Secret Key missing") || error.message.includes("Failed to initialize Clerk SDK")) {
       return NextResponse.json({ error: error.message }, { status: 500 });
     }
    return NextResponse.json({ error: `Failed to update user status: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request) {
  console.log("API POST /api/admin/users - Verifying user logged in...");
  const loggedInCheck = await verifyUserLoggedIn(request);
  if (!loggedInCheck.authorized) {
    console.log("API POST /api/admin/users - User not logged in or context missing.");
    return NextResponse.json({ error: loggedInCheck.error }, { status: loggedInCheck.status });
  }
  // console.log("API POST /api/admin/users - User logged in.");

  let isAdmin = false;
  let clerkForAdminCheck;
  try {
      clerkForAdminCheck = initializeClerk();
      const requestingUser = await clerkForAdminCheck.users.getUser(loggedInCheck.userId);
      isAdmin = requestingUser?.publicMetadata?.admin === true;
  } catch(adminCheckError) {
       console.error("API POST /api/admin/users - Error checking admin status for requesting user:", adminCheckError);
       if (adminCheckError.message.includes("Clerk Secret Key missing") || adminCheckError.message.includes("Failed to initialize Clerk SDK")) {
           return NextResponse.json({ error: adminCheckError.message }, { status: 500 });
       }
       return NextResponse.json({ error: "Failed to verify admin privileges." }, { status: 500 });
  }

  if (!isAdmin) {
      console.log(`API POST /api/admin/users - User ${loggedInCheck.userId} is not authorized for bulk actions.`);
      return NextResponse.json({ error: "Unauthorized: Admin privileges required for this action." }, { status: 403 });
  }
  // console.log(`Admin user ${loggedInCheck.userId}`);

  let action;
  try {
      const body = await request.json();
      action = body?.action;
      console.log(`API POST /api/admin/users - Parsed action from body: ${action}`);
  } catch (e) {
      console.log("API POST /api/admin/users - Could not parse JSON body or action missing.");
      return NextResponse.json({ error: "Invalid request body or missing action." }, { status: 400 });
  }

  if (action === 'removeAllMembers') {
    console.log("API POST /api/admin/users - Processing 'removeAllMembers' action...");
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      const clerk = clerkForAdminCheck || initializeClerk();
      const userListResponse = await clerk.users.getUserList({ limit: 500 });
      const users = userListResponse?.data;

      if (!Array.isArray(users)) {
          throw new Error("Received invalid user list format from server during bulk action.");
      }

      for (const user of users) {
        const existingMetadata = user.publicMetadata || {};
        if (existingMetadata.member === true) {
          try {
            const finalMetadata = { ...existingMetadata, member: false };
            await clerk.users.updateUserMetadata(user.id, { publicMetadata: finalMetadata });
            updatedCount++;
          } catch (updateError) {
            errorCount++;
            errors.push(`Failed to update user ${user.id}: ${updateError.message || updateError}`);
            console.error(`API POST /api/admin/users - Failed to update user ${user.id} during bulk remove:`, updateError);
          }
        }
      }

      console.log(`API POST /api/admin/users - Finished 'removeAllMembers'. Updated: ${updatedCount}, Errors: ${errorCount}`);
      return NextResponse.json({
        success: true,
        message: `Removed member status from ${updatedCount} user(s).`,
        errors: errorCount > 0 ? errors : undefined,
      });

    } catch (error) {
      console.error("API POST /api/admin/users - General error during 'removeAllMembers':", error);
      if (error.message.includes("Clerk Secret Key missing") || error.message.includes("Failed to initialize Clerk SDK")) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
       if (error.message.includes("Received invalid user list format")) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ error: `Failed to process bulk request: ${error.message}` }, { status: 500 });
    }
  }
  return NextResponse.json({ error: `Action '${action}' not supported.` }, { status: 400 });
}
