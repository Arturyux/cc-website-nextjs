// src/app/api/user/route.js
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { env } from "@/env";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export async function GET(request) {
    const { userId, sessionClaims } = getAuth(request);

    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) {
        return NextResponse.json({ message: "Forbidden: User cannot fetch user list." }, { status: 403 });
    }

    try {
        const users = await clerkClient.users.getUserList();

        const simplifiedUsers = users.data.map(user => ({
            id: user.id,
            fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.emailAddresses[0]?.emailAddress || user.id,
        }));

        return NextResponse.json(simplifiedUsers);

    } catch (error) {
        console.error("Failed to fetch users from Clerk:", error);
        return NextResponse.json({ message: "Failed to fetch user list", error: error.message }, { status: 500 });
    }
}
