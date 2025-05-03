import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { env } from "@/env"; // Assuming you use this for env variables

// Initialize Clerk client using your environment variable
const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export async function GET(request) {
    const { userId, sessionClaims } = getAuth(request);

    // 1. Authentication
    if (!userId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorization (Admin or Committee can fetch)
    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) {
        return NextResponse.json({ message: "Forbidden: User cannot fetch user list." }, { status: 403 });
    }

    try {
        // 3. Fetch users from Clerk (using default limit, consider pagination for >10/20 users)
        const userListResponse = await clerkClient.users.getUserList({
             orderBy: "+created_at" // Optional: Consistent ordering
        });

        // 4. Map to the format needed by QRCodeGrantModal
        const formattedUsers = userListResponse.data.map(user => {
            // Find the primary email address string
            const primaryEmail = user.emailAddresses.find(
                (email) => email.id === user.primaryEmailAddressId
            )?.emailAddress;

            return {
                id: user.id,
                username: user.username ?? null, // Provide username or null
                firstName: user.firstName ?? null, // Provide firstName or null
                lastName: user.lastName ?? null, // Provide lastName or null
                primaryEmailAddress: primaryEmail ?? null, // Provide email string or null
                // Keep fullName for potential other uses or remove if not needed elsewhere
                fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail || user.id,
            };
        });

        // 5. Return the formatted list
        return NextResponse.json(formattedUsers);

    } catch (error) {
        console.error("Failed to fetch users from Clerk:", error);
        // Basic error handling, can be enhanced
        let errorMessage = "Failed to fetch user list";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        // Check for Clerk specific error structure if needed
        // if (error.status && error.errors) { ... }
        return NextResponse.json({ message: "Failed to fetch user list", error: errorMessage }, { status: 500 });
    }
}
