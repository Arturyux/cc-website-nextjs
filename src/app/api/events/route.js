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
    if (error.code === "ENOENT") {
        console.error("Events data file not found. Creating an empty file.");
        await writeEvents([]);
        return [];
    }
    console.error("Could not read events data:", error);
    throw new Error("Could not read events data.");
  }
}

async function writeEvents(events) {
  try {
    await fs.writeFile(eventsFilePath, JSON.stringify(events, null, 2));
  } catch (error) {
    console.error("Could not save events data:", error);
    throw new Error("Could not save events data.");
  }
}

function promoteWaitingUserIfNeeded(event) {
    if (!event || !Array.isArray(event.attendeesCounter)) return false;
    const confirmedCount = event.attendeesCounter.filter(att => !att.waiting).length;
    const limit = event.isLimitEnabled && typeof event.attendanceLimit === 'number' ? event.attendanceLimit : Infinity;
    if (confirmedCount < limit) {
        const waitingIndex = event.attendeesCounter.findIndex(att => att.waiting === true);
        if (waitingIndex > -1) {
            delete event.attendeesCounter[waitingIndex].waiting;
            console.log(`Promoted user ${event.attendeesCounter[waitingIndex].userID} from waiting list for event ${event.id}`);
            return true;
        }
    }
    return false;
}

export async function GET(request) {
  try {
    const events = await readEvents();
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        let attendeeDetails = [];
        const userIdsToFetch = Array.isArray(event.attendeesCounter)
                               ? event.attendeesCounter.map(att => att.userID)
                               : [];

        if (userIdsToFetch.length > 0) {
          try {
            const users = await clerkClient.users.getUserList({ userId: userIdsToFetch });
            const userMap = new Map(users.data.map(user => [user.id, user]));

            attendeeDetails = event.attendeesCounter.map(attendee => {
                const user = userMap.get(attendee.userID);
                return {
                    userID: attendee.userID,
                    verified: attendee.verified,
                    waiting: attendee.waiting === true,
                    fullName: user ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || user.id) : (attendee.userID + " (Error loading name)"),
                };
            });
          } catch (fetchError) {
            console.error(`Failed to fetch user details for event ${event.id}:`, fetchError);
            attendeeDetails = (event.attendeesCounter || []).map(att => ({
                userID: att.userID,
                verified: att.verified,
                waiting: att.waiting === true,
                fullName: att.userID + " (Error loading name)"
            }));
          }
        }
        const safeAttendeesCounter = Array.isArray(event.attendeesCounter) ? event.attendeesCounter : [];
        const safeClosed = typeof event.closed === 'boolean' ? event.closed : false;
        return { ...event, closed: safeClosed, attendeesCounter: safeAttendeesCounter, attendeeDetails: attendeeDetails };
      })
    );
    return NextResponse.json(enrichedEvents);
  } catch (error) {
    const status = error.message.includes("not found") ? 404 : 500;
    return NextResponse.json({ message: error.message || "Failed to load event data." }, { status: status });
  }
}

export async function POST(request) {
  const { userId, sessionClaims } = getAuth(request);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await request.json(); } catch (error) { return NextResponse.json({ message: "Invalid request body" }, { status: 400 }); }

  if (body.eventId) {
    const eventId = body.eventId;
    try {
      const events = await readEvents();
      const eventIndex = events.findIndex((e) => e.id === eventId);
      if (eventIndex === -1) return NextResponse.json({ message: "Event not found" }, { status: 404 });

      const event = events[eventIndex];
      if (!event.attendees) return NextResponse.json({ message: "Event does not track attendees" }, { status: 400 });
      if (!Array.isArray(event.attendeesCounter)) event.attendeesCounter = [];

      const attendeeIndex = event.attendeesCounter.findIndex(att => att.userID === userId);

      if (attendeeIndex > -1) {
        const isConfirmed = !event.attendeesCounter[attendeeIndex].waiting;
        const isEventClosed = event.closed === true;

        if (isConfirmed && isEventClosed) {
            return NextResponse.json({ message: "Cannot leave a closed event." }, { status: 403 });
        }

        event.attendeesCounter.splice(attendeeIndex, 1);

        if (isConfirmed) {
            promoteWaitingUserIfNeeded(event);
        }

        await writeEvents(events);
        return NextResponse.json(event, { status: 200 });

      } else {
        const confirmedCount = event.attendeesCounter.filter(att => !att.waiting).length;
        const limit = event.isLimitEnabled && typeof event.attendanceLimit === 'number' ? event.attendanceLimit : Infinity;

        if (confirmedCount < limit) {
            event.attendeesCounter.push({ userID: userId, verified: false });
        } else {
            event.attendeesCounter.push({ userID: userId, verified: false, waiting: true });
        }

        await writeEvents(events);
        return NextResponse.json(event, { status: 200 });
      }
    } catch (error) { return NextResponse.json({ message: error.message || "Failed to update attendance" }, { status: 500 }); }

  } else if (body.title) {
    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { title, date, description, location, imageUrl, attendees, cardColor, isLimitEnabled, attendanceLimit, cardEnabled, inDescription, freezenotallow, closed } = body;

    if (!title || !date || !description || !location) return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    if (isLimitEnabled && (!Number.isInteger(attendanceLimit) || attendanceLimit <= 0)) { return NextResponse.json({ message: "Attendance limit must be a positive whole number." }, { status: 400 }); }

    try {
      const events = await readEvents();
      const newEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title, date, description, location,
        imageUrl: imageUrl || "",
        attendees: typeof attendees === 'boolean' ? attendees : false,
        attendeesCounter: [],
        cardColor: cardColor || "bg-white",
        isLimitEnabled: typeof isLimitEnabled === 'boolean' ? isLimitEnabled : false,
        attendanceLimit: isLimitEnabled ? attendanceLimit : null,
        cardEnabled: typeof cardEnabled === 'boolean' ? cardEnabled : true,
        inDescription: Array.isArray(inDescription) ? inDescription : [],
        freezenotallow: typeof freezenotallow === 'boolean' ? freezenotallow : true,
        closed: typeof closed === 'boolean' ? closed : false,
      };
      events.push(newEvent);
      await writeEvents(events);
      return NextResponse.json(newEvent, { status: 201 });
    } catch (error) { return NextResponse.json({ message: error.message || "Failed to create event" }, { status: 500 }); }
  } else {
    return NextResponse.json({ message: "Invalid request structure" }, { status: 400 });
  }
}

export async function PUT(request) {
    const { userId, sessionClaims } = getAuth(request);
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) return NextResponse.json({ message: "Forbidden: User cannot edit events." }, { status: 403 });

    let updatedEventData;
    try {
        updatedEventData = await request.json();
        if (!updatedEventData.id) { throw new Error("Missing event ID for update."); }
        if (updatedEventData.isLimitEnabled && updatedEventData.hasOwnProperty('attendanceLimit') && (!Number.isInteger(updatedEventData.attendanceLimit) || updatedEventData.attendanceLimit <= 0)) {
            throw new Error("Attendance limit must be a positive whole number when enabled.");
        }
    } catch (error) { return NextResponse.json({ message: "Invalid request body", error: error.message }, { status: 400 }); }

    try {
        const events = await readEvents();
        const eventIndex = events.findIndex((e) => e.id === updatedEventData.id);
        if (eventIndex === -1) return NextResponse.json({ message: "Event not found" }, { status: 404 });

        const originalEvent = events[eventIndex];
        let finalAttendeesCounter;

        if (updatedEventData.resetAttendees === true || (updatedEventData.hasOwnProperty('attendees') && updatedEventData.attendees === false)) {
            finalAttendeesCounter = [];
        } else {
            finalAttendeesCounter = Array.isArray(originalEvent.attendeesCounter) ? originalEvent.attendeesCounter : [];
        }

        const dataToMerge = {
            ...updatedEventData,
             attendanceLimit: updatedEventData.hasOwnProperty('isLimitEnabled')
                ? (updatedEventData.isLimitEnabled ? updatedEventData.attendanceLimit : null)
                : originalEvent.attendanceLimit,
            cardEnabled: typeof updatedEventData.cardEnabled === 'boolean'
                ? updatedEventData.cardEnabled
                : originalEvent.cardEnabled,
            inDescription: Array.isArray(updatedEventData.inDescription)
                ? updatedEventData.inDescription
                : originalEvent.inDescription,
            freezenotallow: typeof updatedEventData.freezenotallow === 'boolean'
                ? updatedEventData.freezenotallow
                : originalEvent.freezenotallow,
            attendees: typeof updatedEventData.attendees === 'boolean'
                ? updatedEventData.attendees
                : originalEvent.attendees,
            closed: typeof updatedEventData.closed === 'boolean'
                ? updatedEventData.closed
                : originalEvent.closed,
        };
         if (typeof dataToMerge.freezenotallow !== 'boolean') {
            dataToMerge.freezenotallow = true;
        }
         if (typeof dataToMerge.closed !== 'boolean') {
            dataToMerge.closed = false;
        }
        delete dataToMerge.resetAttendees;

        const finalUpdatedEvent = {
            ...originalEvent,
            ...dataToMerge,
            attendeesCounter: finalAttendeesCounter
        };

        if (finalUpdatedEvent.attendees && finalUpdatedEvent.isLimitEnabled) {
             const currentConfirmed = finalUpdatedEvent.attendeesCounter.filter(att => !att.waiting).length;
             const newLimit = finalUpdatedEvent.attendanceLimit;
             let promotionsPossible = newLimit - currentConfirmed;
             while (promotionsPossible > 0 && promoteWaitingUserIfNeeded(finalUpdatedEvent)) {
                 promotionsPossible--;
             }
        }

        events[eventIndex] = finalUpdatedEvent;
        await writeEvents(events);
        return NextResponse.json(finalUpdatedEvent, { status: 200 });
    } catch (error) { return NextResponse.json({ message: error.message || "Failed to update event" }, { status: 500 }); }
}

export async function PATCH(request) {
    const { userId, sessionClaims } = getAuth(request);
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) {
        return NextResponse.json({ message: "Forbidden: User cannot modify attendees." }, { status: 403 });
    }

    let body;
     try {
        body = await request.json();
        if (!body.eventId || !body.attendeeUserId) { throw new Error("Missing required fields: eventId, attendeeUserId"); }
        if (body.action === 'remove') { }
        else if (body.action === 'verify' || typeof body.verified === 'boolean') {
            if (typeof body.verified !== 'boolean') { throw new Error("Missing required field for verification: verified (boolean)"); }
        } else { throw new Error("Invalid or missing action specified (must be 'verify' or 'remove')"); }
    } catch (error) { return NextResponse.json({ message: "Invalid request body", error: error.message }, { status: 400 }); }


    const { eventId, attendeeUserId } = body;
    const action = body.action || 'verify';

    try {
        const events = await readEvents();
        const eventIndex = events.findIndex((e) => e.id === eventId);
        if (eventIndex === -1) return NextResponse.json({ message: "Event not found" }, { status: 404 });

        const event = events[eventIndex];
        if (!Array.isArray(event.attendeesCounter)) { return NextResponse.json({ message: "Attendees list not found or invalid for this event." }, { status: 400 }); }

        const attendeeIndex = event.attendeesCounter.findIndex(att => att.userID === attendeeUserId);
        if (attendeeIndex === -1) { return NextResponse.json({ message: "Attendee not found in this event." }, { status: 404 }); }

        if (action === 'remove') {
            const wasConfirmed = !event.attendeesCounter[attendeeIndex].waiting;
            const removedAttendee = event.attendeesCounter.splice(attendeeIndex, 1);

            if (wasConfirmed) {
                promoteWaitingUserIfNeeded(event);
            }

            await writeEvents(events);
            console.log(`Admin/Committee ${userId} removed attendee ${attendeeUserId} from event ${eventId}`);
            return NextResponse.json(event, { status: 200 });

        } else if (action === 'verify') {
            const { verified } = body;
            event.attendeesCounter[attendeeIndex].verified = verified;
            await writeEvents(events);
            console.log(`Admin/Committee ${userId} set verification for attendee ${attendeeUserId} to ${verified} for event ${eventId}`);
            return NextResponse.json(event, { status: 200 });
        } else {
             return NextResponse.json({ message: "Invalid action specified." }, { status: 400 });
        }

    } catch (error) {
        console.error(`Failed to ${action} attendee ${attendeeUserId} for event ${eventId}:`, error);
        return NextResponse.json({ message: error.message || `Failed to ${action} attendee` }, { status: 500 });
    }
}
