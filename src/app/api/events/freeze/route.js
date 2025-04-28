import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import path from "path";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { env } from "@/env";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
const eventsFilePath = path.join(process.cwd(), "public", "data", "events.json");

async function readEvents() {
  try {
    const jsonData = await fs.readFile(eventsFilePath, "utf8");
    return JSON.parse(jsonData);
  } catch (error) {
    if (error.code === "ENOENT") throw new Error("Events data file not found.");
    throw new Error("Could not read events data.");
  }
}

export async function POST(request) {
    const { userId, sessionClaims } = getAuth(request);

    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) return NextResponse.json({ message: "Forbidden: User cannot freeze attendees." }, { status: 403 });

    let body;
    try {
        body = await request.json();
        if (!body.eventId) {
            throw new Error("Missing required field: eventId");
        }
    } catch (error) { return NextResponse.json({ message: "Invalid request body", error: error.message }, { status: 400 }); }

    const { eventId } = body;

    try {
        const events = await readEvents();
        const event = events.find((e) => e.id === eventId);

        if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });
        if (!Array.isArray(event.attendeesCounter)) return NextResponse.json({ message: "No attendees list for this event." }, { status: 400 });

        const unverifiedUserIds = event.attendeesCounter
            .filter(att => att.verified === false)
            .map(att => att.userID);

        if (unverifiedUserIds.length === 0) {
            return NextResponse.json({ message: "No unverified users to freeze." }, { status: 200 });
        }

        let frozenCount = 0;
        const errors = [];

        for (const attendeeId of unverifiedUserIds) {
            try {
                await clerkClient.users.updateUserMetadata(attendeeId, {
                    publicMetadata: {
                        freezed: true
                    }
                });
                frozenCount++;
            } catch (clerkError) {
                console.error(`Failed to freeze user ${attendeeId}:`, clerkError);
                errors.push(`User ${attendeeId}: ${clerkError.message || 'Unknown error'}`);
            }
        }

        if (errors.length > 0) {
             return NextResponse.json({
                 message: `Processed freeze request. Frozen: ${frozenCount}. Errors: ${errors.length}`,
                 errors: errors
             }, { status: frozenCount > 0 ? 207 : 500 });
        }

        return NextResponse.json({ message: `Successfully froze ${frozenCount} unverified users.` }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ message: error.message || "Failed to process freeze request" }, { status: 500 });
    }
}
