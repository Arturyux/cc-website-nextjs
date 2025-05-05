// src/app/api/events/route.js
import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import db from '@/lib/db';
import { env } from '@/env';

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
const intToBool = (val) => (val === 1 ? true : false);
const boolToInt = (val) => (val === true ? 1 : 0);

async function fetchAndMergeUserDetails(attendeesRaw) {
  if (!Array.isArray(attendeesRaw)) {
    console.error('fetchAndMergeUserDetails received non-array:', attendeesRaw);
    return { attendees: [], attendeeDetails: [] };
  }

  const attendeeUserIds = attendeesRaw.map((a) => a.user_id).filter(Boolean);
  let userDetailsMap = new Map();

  if (attendeeUserIds.length > 0) {
    try {
      const userListResponse = await clerkClient.users.getUserList({
        userId: attendeeUserIds,
        limit: attendeeUserIds.length,
      });

      if (userListResponse && Array.isArray(userListResponse.data)) {
        userListResponse.data.forEach((user) => {
          const primaryEmail = user.emailAddresses.find(
            (email) => email.id === user.primaryEmailAddressId,
          )?.emailAddress;
          userDetailsMap.set(user.id, {
            fullName:
              [user.firstName, user.lastName].filter(Boolean).join(' ') ||
              primaryEmail ||
              user.id,
            primaryEmailAddress: primaryEmail || null,
          });
        });
      } else {
        console.error(
          'Unexpected response structure from clerkClient.users.getUserList:',
          userListResponse,
        );
      }
    } catch (clerkError) {
      console.error('Failed to fetch user details from Clerk:', clerkError);
      attendeeUserIds.forEach((id) => {
        if (!userDetailsMap.has(id)) {
          userDetailsMap.set(id, {
            fullName: `User (${id.substring(5)})`,
            primaryEmailAddress: null,
          });
        }
      });
    }
  }

  const attendees = attendeesRaw.map((att) => ({
    userID: att.user_id,
    waiting: intToBool(att.waiting),
    verified: intToBool(att.verified),
  }));

  const attendeeDetails = attendees.map((att) => ({
    ...att,
    ...(userDetailsMap.get(att.userID) || {
      fullName: `User (${att.userID.substring(5)})`,
      primaryEmailAddress: null,
    }),
  }));

  return { attendees, attendeeDetails };
}

export async function GET(request) {
  if (!db)
    return NextResponse.json(
      { message: 'Database connection failed.' },
      { status: 500 },
    );

  try {
    const eventsStmt = db.prepare(`SELECT * FROM Events ORDER BY date DESC`);
    const events = eventsStmt.all();
    const eventIds = events.map((e) => e.id);
    let attendeesByEvent = {};
    let allAttendeesRaw = [];

    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => '?').join(',');
      const attendeesStmt = db.prepare(
        `SELECT event_id, user_id, waiting, verified FROM EventAttendees WHERE event_id IN (${placeholders})`,
      );
      const attendeesFromDb = attendeesStmt.all(...eventIds); 

      if (Array.isArray(attendeesFromDb)) {
        allAttendeesRaw = attendeesFromDb; 
        attendeesFromDb.forEach((att) => {
          if (!attendeesByEvent[att.event_id])
            attendeesByEvent[att.event_id] = [];
          attendeesByEvent[att.event_id].push(att);
        });
      }
    }

    const { attendeeDetails: allAttendeeDetailsMapped } =
      await fetchAndMergeUserDetails(allAttendeesRaw); 

    const attendeeDetailsMap = new Map(
      allAttendeeDetailsMapped.map((ad) => [ad.userID, ad]),
    );

    const results = events.map((event) => {
      const rawAttendeesForEvent = attendeesByEvent[event.id] || [];

      const attendeesCounter = rawAttendeesForEvent.map((att) => ({
        userID: att.user_id,
        waiting: intToBool(att.waiting),
        verified: intToBool(att.verified),
      }));

      const attendeeDetails = rawAttendeesForEvent.map((att) => ({
        userID: att.user_id,
        waiting: intToBool(att.waiting),
        verified: intToBool(att.verified),
        ...(attendeeDetailsMap.get(att.user_id) || {
          fullName: `User (${att.user_id.substring(5)})`,
          primaryEmailAddress: null,
        }),
      }));

      let inDescriptionParsed = [];
      try {
        if (event.inDescription)
          inDescriptionParsed = JSON.parse(event.inDescription);
      } catch (e) {
        console.error(`Failed to parse inDescription for event ${event.id}`);
      }

      return {
        ...event,
        attendees: intToBool(event.attendees),
        isLimitEnabled: intToBool(event.isLimitEnabled),
        cardEnabled: intToBool(event.cardEnabled),
        freezenotallow: intToBool(event.freezenotallow),
        closed: intToBool(event.closed),
        inDescription: inDescriptionParsed,
        attendeesCounter: attendeesCounter,
        attendeeDetails: attendeeDetails, 
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET /api/events Error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to load events.' },
      { status: 500 },
    );
  }
}

export async function POST(request) {
    const { userId, sessionClaims } = getAuth(request);
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) return NextResponse.json({ message: "Forbidden: User cannot create events." }, { status: 403 });
    if (!db) return NextResponse.json({ message: "Database connection failed." }, { status: 500 });

    let body;
    try {
        body = await request.json();
        if (!body.title?.trim() || !body.date || !body.description?.trim() || !body.location?.trim()) {
            throw new Error("Missing required fields: title, date, description, location");
        }
        if (isNaN(new Date(body.date).getTime())) {
            throw new Error("Invalid date format provided.");
        }
    } catch (error) {
        return NextResponse.json({ message: "Invalid request body", error: error.message }, { status: 400 });
    }

    try {
        const newEventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const inDescriptionString = JSON.stringify(body.inDescription || []);
        const attendanceLimit = body.isLimitEnabled ? (parseInt(body.attendanceLimit, 10) || null) : null;

        const stmt = db.prepare(`
            INSERT INTO Events (
                id, title, date, description, location, imageUrl, attendees, cardColor,
                isLimitEnabled, attendanceLimit, cardEnabled, inDescription, freezenotallow, closed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const info = stmt.run(
            newEventId, body.title.trim(), new Date(body.date).toISOString(), body.description.trim(), body.location.trim(),
            body.imageUrl || null, boolToInt(body.attendees), body.cardColor || 'bg-white', boolToInt(body.isLimitEnabled),
            attendanceLimit, boolToInt(body.cardEnabled), inDescriptionString, boolToInt(body.freezenotallow), boolToInt(body.closed)
        );

        if (info.changes > 0) {
            const selectStmt = db.prepare("SELECT * FROM Events WHERE id = ?");
            const newEventData = selectStmt.get(newEventId);
            let inDescParsed = []; try { if(newEventData.inDescription) inDescParsed = JSON.parse(newEventData.inDescription); } catch(e){}
            const responseData = {
                ...newEventData,
                attendees: intToBool(newEventData.attendees),
                isLimitEnabled: intToBool(newEventData.isLimitEnabled),
                cardEnabled: intToBool(newEventData.cardEnabled),
                freezenotallow: intToBool(newEventData.freezenotallow),
                closed: intToBool(newEventData.closed),
                inDescription: inDescParsed,
                attendeesCounter: [],
                attendeeDetails: []
            };
            return NextResponse.json(responseData, { status: 201 });
        } else {
            throw new Error("Failed to insert new event into database.");
        }
    } catch (error) {
        console.error("POST /api/events Error:", error);
        return NextResponse.json({ message: error.message || "Failed to create event" }, { status: 500 });
    }
}

export async function PUT(request) {
    const { userId, sessionClaims } = getAuth(request);
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) return NextResponse.json({ message: "Forbidden: User cannot edit events." }, { status: 403 });
    if (!db) return NextResponse.json({ message: "Database connection failed." }, { status: 500 });

    let body;
    try {
        body = await request.json();
        if (!body.id || !body.title?.trim() || !body.date || !body.description?.trim() || !body.location?.trim()) {
            throw new Error("Missing required fields: id, title, date, description, location");
        }
        if (isNaN(new Date(body.date).getTime())) {
            throw new Error("Invalid date format provided.");
        }
    } catch (error) {
        return NextResponse.json({ message: "Invalid request body", error: error.message }, { status: 400 });
    }

    try {
        const dbUpdateResult = db.transaction(() => {
             const inDescriptionString = JSON.stringify(body.inDescription || []);
             const attendanceLimit = body.isLimitEnabled ? (parseInt(body.attendanceLimit, 10) || null) : null;
             const updateStmt = db.prepare(`
                UPDATE Events SET
                    title = ?, date = ?, description = ?, location = ?, imageUrl = ?, attendees = ?,
                    cardColor = ?, isLimitEnabled = ?, attendanceLimit = ?, cardEnabled = ?,
                    inDescription = ?, freezenotallow = ?, closed = ?, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            const info = updateStmt.run(
                body.title.trim(), new Date(body.date).toISOString(), body.description.trim(), body.location.trim(), body.imageUrl || null,
                boolToInt(body.attendees), body.cardColor || 'bg-white', boolToInt(body.isLimitEnabled), attendanceLimit,
                boolToInt(body.cardEnabled), inDescriptionString, boolToInt(body.freezenotallow), boolToInt(body.closed), body.id
            );
            if (info.changes === 0) throw { status: 404, message: "Event not found or no changes made." };
            if (body.resetAttendees === true) {
                const deleteAttendeesStmt = db.prepare("DELETE FROM EventAttendees WHERE event_id = ?");
                deleteAttendeesStmt.run(body.id);
                console.log(`Attendees reset for event ${body.id} by user ${userId}`);
            }
            return true;
        })();

        if (!dbUpdateResult) { throw new Error("Database update failed within transaction."); }

        const selectStmt = db.prepare("SELECT * FROM Events WHERE id = ?");
        const updatedEventData = selectStmt.get(body.id);
        if (!updatedEventData) throw { status: 404, message: "Event not found after update." };

        const attendeesStmt = db.prepare("SELECT user_id, waiting, verified FROM EventAttendees WHERE event_id = ?");
        const attendeesRaw = attendeesStmt.all(body.id);

        const { attendees, attendeeDetails } = await fetchAndMergeUserDetails(attendeesRaw);

        let inDescParsed = []; try { if(updatedEventData.inDescription) inDescParsed = JSON.parse(updatedEventData.inDescription); } catch(e){}

        const responseData = {
            ...updatedEventData,
            attendees: intToBool(updatedEventData.attendees),
            isLimitEnabled: intToBool(updatedEventData.isLimitEnabled),
            cardEnabled: intToBool(updatedEventData.cardEnabled),
            freezenotallow: intToBool(updatedEventData.freezenotallow),
            closed: intToBool(updatedEventData.closed),
            inDescription: inDescParsed,
            attendeesCounter: attendees, 
            attendeeDetails: attendeeDetails 
        };

        return NextResponse.json(responseData, { status: 200 });

    } catch (error) {
        console.error("PUT /api/events Error:", error);
        const status = error.status || 500;
        return NextResponse.json({ message: error.message || "Failed to update event" }, { status });
    }
}

export async function PATCH(request) {
  const { userId, sessionClaims } = getAuth(request);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ message: "Database connection failed." }, { status: 500 });

  const isAdmin = sessionClaims?.metadata?.admin === true;
  const isCommittee = sessionClaims?.metadata?.committee === true;
  const isUserFreezed = sessionClaims?.publicMetadata?.freezed === true;

  let body;
  try {
      body = await request.json();
      if (!body.eventId || !body.action) {
          throw new Error("Missing required fields: eventId, action");
      }
      if (['verify', 'remove'].includes(body.action) && !body.attendeeUserId) {
          throw new Error("Missing attendeeUserId for verify/remove action");
      }
      if (body.action === 'verify' && typeof body.verified !== 'boolean') {
          throw new Error("Missing verified status for verify action");
      }
  } catch (error) {
      return NextResponse.json({ message: "Invalid request body", error: error.message }, { status: 400 });
  }

  const { eventId, action, attendeeUserId, verified } = body;
  const targetUserId = (action === 'attend' || action === 'unattend') ? userId : attendeeUserId;

  if (['verify', 'remove'].includes(action) && !isAdmin && !isCommittee) {
      return NextResponse.json({ message: "Forbidden: Only admins/committee can verify or remove attendees." }, { status: 403 });
  }

  const patchTransaction = db.transaction(() => {
      const eventStmt = db.prepare("SELECT id, attendees, isLimitEnabled, attendanceLimit, freezenotallow, closed FROM Events WHERE id = ?");
      const event = eventStmt.get(eventId);
      if (!event) throw { status: 404, message: "Event not found." };
      if (!intToBool(event.attendees)) throw { status: 400, message: "Attendance tracking is not enabled for this event." };

      const userStatusStmt = db.prepare("SELECT waiting, verified FROM EventAttendees WHERE event_id = ? AND user_id = ?");
      const userStatus = userStatusStmt.get(eventId, targetUserId);
      const isCurrentlyAttending = !!userStatus;
      const isCurrentlyWaiting = isCurrentlyAttending && intToBool(userStatus.waiting);

      if (action === 'attend') {
          if (intToBool(event.closed)) throw { status: 400, message: "Cannot attend a closed event." };
          if (intToBool(event.freezenotallow) && isUserFreezed) {
               throw { status: 403, message: "Your account is frozen and this event does not allow frozen users." };
          }
          if (isCurrentlyAttending && !isCurrentlyWaiting) {
               throw { status: 400, message: "You are already attending this event." };
          }

          let waitingList = false; 

          if (isUserFreezed) {
              waitingList = true;
              console.log(`Frozen user ${targetUserId} placed directly on waitlist for ${eventId}`);
          } else {
              if (intToBool(event.isLimitEnabled) && event.attendanceLimit > 0) {
                  const confirmedCountStmt = db.prepare("SELECT COUNT(*) as count FROM EventAttendees WHERE event_id = ? AND waiting = 0");
                  const { count: currentConfirmedCount } = confirmedCountStmt.get(eventId);
                  if (currentConfirmedCount >= event.attendanceLimit) {
                      waitingList = true;
                      console.log(`Non-frozen user ${targetUserId} placed on waitlist for ${eventId} (limit reached)`);
                  }
              }
          }

          const upsertStmt = db.prepare(`
              INSERT INTO EventAttendees (event_id, user_id, waiting, verified, attended_at)
              VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP) -- Set verified = 0
              ON CONFLICT(event_id, user_id) DO UPDATE SET
                  waiting = excluded.waiting,
                  verified = 0, -- Reset verification on re-attend/join waitlist
                  -- Update attended_at only if moving from waiting to confirmed (won't happen for frozen on initial join now)
                  attended_at = CASE WHEN waiting = 1 AND excluded.waiting = 0 THEN CURRENT_TIMESTAMP ELSE attended_at END;
          `);
          upsertStmt.run(eventId, targetUserId, boolToInt(waitingList));
          console.log(`User ${targetUserId} ${waitingList ? 'joined waitlist for' : 'attended'} event ${eventId}`);

      } else if (action === 'unattend') {
          if (intToBool(event.closed)) throw { status: 400, message: "Cannot unattend a closed event." };
          if (!isCurrentlyAttending) throw { status: 400, message: "You are not currently attending or on the waitlist for this event." };

          const deleteStmt = db.prepare("DELETE FROM EventAttendees WHERE event_id = ? AND user_id = ?");
          const deleteInfo = deleteStmt.run(eventId, targetUserId);

          if (deleteInfo.changes > 0 && !isCurrentlyWaiting && intToBool(event.isLimitEnabled)) {
              const nextWaitingStmt = db.prepare("SELECT user_id FROM EventAttendees WHERE event_id = ? AND waiting = 1 ORDER BY attended_at ASC LIMIT 1");
              const nextUser = nextWaitingStmt.get(eventId);
              if (nextUser) {
                  const promoteStmt = db.prepare("UPDATE EventAttendees SET waiting = 0, verified = 0, attended_at = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?");
                  promoteStmt.run(eventId, nextUser.user_id);
                  console.log(`User ${nextUser.user_id} promoted from waitlist for event ${eventId} after unattend.`);
              }
          }
          console.log(`User ${targetUserId} unattended event ${eventId}`);

      } else if (action === 'verify') {
          if (!isCurrentlyAttending) throw { status: 404, message: "Attendee not found for this event." };
          const verifyStmt = db.prepare("UPDATE EventAttendees SET verified = ? WHERE event_id = ? AND user_id = ?");
          verifyStmt.run(boolToInt(verified), eventId, targetUserId);
          console.log(`Admin ${userId} set verification for ${targetUserId} on event ${eventId} to ${verified}`);

      } else if (action === 'remove') {
          const userToRemoveStatus = userStatusStmt.get(eventId, targetUserId);
          if (!userToRemoveStatus) throw { status: 404, message: "Attendee to remove not found for this event." };
          const wasRemovedUserWaiting = intToBool(userToRemoveStatus.waiting);

          const deleteStmt = db.prepare("DELETE FROM EventAttendees WHERE event_id = ? AND user_id = ?");
          const deleteInfo = deleteStmt.run(eventId, targetUserId);

           if (deleteInfo.changes > 0 && !wasRemovedUserWaiting && intToBool(event.isLimitEnabled)) {
              const nextWaitingStmt = db.prepare("SELECT user_id FROM EventAttendees WHERE event_id = ? AND waiting = 1 ORDER BY attended_at ASC LIMIT 1");
              const nextUser = nextWaitingStmt.get(eventId);
              if (nextUser) {
                  const promoteStmt = db.prepare("UPDATE EventAttendees SET waiting = 0, verified = 0, attended_at = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?");
                  promoteStmt.run(eventId, nextUser.user_id);
                  console.log(`User ${nextUser.user_id} promoted from waitlist for event ${eventId} after removal.`);
              }
          }
          console.log(`Admin ${userId} removed attendee ${targetUserId} from event ${eventId}`);
      } else {
          throw { status: 400, message: "Invalid action specified." };
      }

      const selectEventStmt = db.prepare("SELECT * FROM Events WHERE id = ?");
      const updatedEventData = selectEventStmt.get(eventId);
      const attendeesStmt = db.prepare("SELECT user_id, waiting, verified FROM EventAttendees WHERE event_id = ?");
      const attendeesRaw = attendeesStmt.all(eventId);

      return { updatedEventData, attendeesRaw };
  });

  try {
      const { updatedEventData, attendeesRaw } = patchTransaction();

      const { attendees, attendeeDetails } = await fetchAndMergeUserDetails(attendeesRaw);

      let inDescParsed = []; try { if(updatedEventData.inDescription) inDescParsed = JSON.parse(updatedEventData.inDescription); } catch(e){}

      const responseData = {
          ...updatedEventData,
          attendees: intToBool(updatedEventData.attendees),
          isLimitEnabled: intToBool(updatedEventData.isLimitEnabled),
          cardEnabled: intToBool(updatedEventData.cardEnabled),
          freezenotallow: intToBool(updatedEventData.freezenotallow),
          closed: intToBool(updatedEventData.closed),
          inDescription: inDescParsed,
          attendeesCounter: attendees,
          attendeeDetails: attendeeDetails
      };

      return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
      console.error(`PATCH /api/events (Action: ${action}) Error:`, error);
      const status = error.status || 500;
      return NextResponse.json({ message: error.message || `Failed to ${action}` }, { status });
  }
}



export async function DELETE(request) {
    const { userId, sessionClaims } = getAuth(request);
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) return NextResponse.json({ message: "Forbidden: User cannot delete events." }, { status: 403 });
    if (!db) return NextResponse.json({ message: "Database connection failed." }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    if (!eventId) return NextResponse.json({ message: "Missing required query parameter: id" }, { status: 400 });

    try {
        const deleteTransaction = db.transaction(() => {
            const deleteAttendeesStmt = db.prepare("DELETE FROM EventAttendees WHERE event_id = ?");
            deleteAttendeesStmt.run(eventId);

            const deleteEventStmt = db.prepare("DELETE FROM Events WHERE id = ?");
            const info = deleteEventStmt.run(eventId);
            return info; 
        });

        const info = deleteTransaction();

        if (info.changes > 0) {
            console.log(`Admin/Committee ${userId} deleted event ${eventId}`);
            return NextResponse.json({ message: `Event ${eventId} deleted successfully.` }, { status: 200 });
        } else {
            return NextResponse.json({ message: "Event not found" }, { status: 404 });
        }
    } catch (error) {
        console.error("DELETE /api/events Error:", error);
        return NextResponse.json({ message: error.message || "Failed to delete event" }, { status: 500 });
    }
}
