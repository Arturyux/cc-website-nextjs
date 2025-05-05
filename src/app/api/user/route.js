//src/app/api/user/route.js

import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { env } from "@/env";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export async function GET(request) {
    const { userId, sessionClaims } = getAuth(request);

    if (!userId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) {
        return NextResponse.json({ message: "Forbidden: User cannot fetch user list." }, { status: 403 });
    }

    try {
        const userListResponse = await clerkClient.users.getUserList({
             orderBy: "+created_at"
        });

        const formattedUsers = userListResponse.data.map(user => {
            const primaryEmail = user.emailAddresses.find(
                (email) => email.id === user.primaryEmailAddressId
            )?.emailAddress;

            return {
                id: user.id,
                username: user.username ?? null, 
                firstName: user.firstName ?? null, 
                lastName: user.lastName ?? null, 
                primaryEmailAddress: primaryEmail ?? null,
                fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail || user.id,
            };
        });

        return NextResponse.json(formattedUsers);

    } catch (error) {
        console.error("Failed to fetch users from Clerk:", error);
        let errorMessage = "Failed to fetch user list";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ message: "Failed to fetch user list", error: errorMessage }, { status: 500 });
    }
}
