// src/app/api/achievements/route.js
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import path from "path";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { env } from "@/env";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
const achievementsFilePath = path.join(process.cwd(), "public", "data", "achievements.json");

async function readAchievements() {
  try {
    const jsonData = await fs.readFile(achievementsFilePath, "utf8");
    return JSON.parse(jsonData);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error("Achievements data file not found. Creating empty file.");
      await writeAchievements([]);
      return [];
    }
    console.error("Could not read achievements data:", error);
    throw new Error("Could not read achievements data.");
  }
}

async function writeAchievements(achievements) {
  try {
    await fs.writeFile(achievementsFilePath, JSON.stringify(achievements, null, 2));
  } catch (error) {
    console.error("Could not save achievements data:", error);
    throw new Error("Could not save achievements data.");
  }
}

export async function GET(request) {
  const { userId } = getAuth(request);

  try {
    const achievements = await readAchievements();

    const enrichedAchievements = achievements.map(ach => {
      const userHasArray = Array.isArray(ach.userHas) ? ach.userHas : [];
      const totalAchievedCount = userHasArray.filter(u => u.achived === true).length;
      const userEntry = userId ? userHasArray.find(u => u.userID === userId) : null;
      const achieved = userEntry ? userEntry.achived === true : false;

      let highestScore = null;
      if (ach.onScore === true) {
          highestScore = userHasArray.reduce((max, user) => {
              if (user.achived === true && typeof user.score === 'number') {
                  return Math.max(max, user.score);
              }
              return max;
          }, -Infinity);
          if (highestScore === -Infinity) {
              highestScore = null;
          }
      }

      const currentUserScore = (achieved && ach.onScore === true && typeof userEntry?.score === 'number')
                               ? userEntry.score
                               : null;

      return {
        ...ach,
        currentUserAchieved: achieved,
        currentUserProgress: userEntry ? userEntry.attendanceCount : 0,
        currentUserAchievedDate: achieved ? (userEntry.date || null) : null,
        currentUserAchievedDescription: achieved ? (ach.achiveDescription || ach.description) : ach.description,
        totalAchievedCount: totalAchievedCount,
        highestScore: highestScore,
        currentUserScore: currentUserScore,
        userHas: userHasArray,
      };
    });

    return NextResponse.json(enrichedAchievements);
  } catch (error) {
    return NextResponse.json({ message: error.message || "Failed to load achievements data." }, { status: 500 });
  }
}

export async function POST(request) {
  const { userId, sessionClaims } = getAuth(request);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = sessionClaims?.metadata?.admin === true;
  const isCommittee = sessionClaims?.metadata?.committee === true;
  if (!isAdmin && !isCommittee) return NextResponse.json({ message: "Forbidden: User cannot create achievements." }, { status: 403 });

  let body;
  try {
    body = await request.json();
    if (!body.title || !body.description || !body.imgurl) {
      throw new Error("Missing required fields: title, description, imgurl");
    }
  } catch (error) {
    return NextResponse.json({ message: "Invalid request body", error: error.message }, { status: 400 });
  }

  try {
    const achievements = await readAchievements();

    const newAchievement = {
      id: `ach_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: body.title,
      category: body.category || "Uncategorized",
      imgurl: body.imgurl,
      description: body.description,
      achiveDescription: body.achiveDescription || body.description,
      silhouetteColor: body.silhouetteColor || "bg-gray-400",
      isEnabled: typeof body.isEnabled === 'boolean' ? body.isEnabled : true,
      attendanceCounter: typeof body.attendanceCounter === 'boolean' ? body.attendanceCounter : false,
      attendanceNeed: body.attendanceCounter ? (parseInt(body.attendanceNeed, 10) || null) : null,
      onScore: typeof body.onScore === 'boolean' ? body.onScore : false,
      userHas: [],
    };

    achievements.push(newAchievement);
    await writeAchievements(achievements);

    return NextResponse.json(newAchievement, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Failed to create achievement" }, { status: 500 });
  }
}

export async function PUT(request) {
    const { userId, sessionClaims } = getAuth(request);
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) return NextResponse.json({ message: "Forbidden: User cannot edit achievements." }, { status: 403 });

    let body;
    try {
        body = await request.json();
        if (!body.id) {
            throw new Error("Missing required field: id");
        }
    } catch (error) { return NextResponse.json({ message: "Invalid request body", error: error.message }, { status: 400 }); }

    try {
        const achievements = await readAchievements();
        const achievementIndex = achievements.findIndex(ach => ach.id === body.id);

        if (achievementIndex === -1) {
            return NextResponse.json({ message: "Achievement not found" }, { status: 404 });
        }

        const originalAchievement = achievements[achievementIndex];

        const updatedAchievement = {
            ...originalAchievement,
            title: body.title ?? originalAchievement.title,
            category: body.category ?? originalAchievement.category,
            imgurl: body.imgurl ?? originalAchievement.imgurl,
            description: body.description ?? originalAchievement.description,
            achiveDescription: body.achiveDescription ?? originalAchievement.achiveDescription,
            silhouetteColor: body.silhouetteColor ?? originalAchievement.silhouetteColor,
            isEnabled: typeof body.isEnabled === 'boolean' ? body.isEnabled : originalAchievement.isEnabled,
            attendanceCounter: typeof body.attendanceCounter === 'boolean' ? body.attendanceCounter : originalAchievement.attendanceCounter,
            attendanceNeed: (typeof body.attendanceCounter === 'boolean' ? body.attendanceCounter : originalAchievement.attendanceCounter)
                            ? (parseInt(body.attendanceNeed, 10) || null)
                            : null,
            onScore: typeof body.onScore === 'boolean' ? body.onScore : originalAchievement.onScore,
        };

        achievements[achievementIndex] = updatedAchievement;
        await writeAchievements(achievements);

        return NextResponse.json(updatedAchievement, { status: 200 });

    } catch (error) {
        return NextResponse.json({ message: error.message || "Failed to update achievement" }, { status: 500 });
    }
}

export async function PATCH(request) {
    const { userId, sessionClaims } = getAuth(request);
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;

    let body;
    try {
        body = await request.json();
        if (!body.achievementId || !body.targetUserId || !body.action) {
            throw new Error("Missing required fields: achievementId, targetUserId, action");
        }
        if (body.action === 'setAchieved' && typeof body.achieved !== 'boolean') {
             throw new Error("Missing required field for action 'setAchieved': achieved (boolean)");
        }
        if (body.action === 'updateCount' && typeof body.countChange !== 'number') {
             throw new Error("Missing required field for action 'updateCount': countChange (number)");
        }
        if (body.action === 'updateScore' && typeof body.score !== 'number') {
             throw new Error("Missing required field for action 'updateScore': score (number)");
        }
        if (!['setAchieved', 'updateCount', 'updateScore'].includes(body.action)) {
            throw new Error("Invalid action specified. Must be 'setAchieved', 'updateCount', or 'updateScore'.");
        }

    } catch (error) { return NextResponse.json({ message: "Invalid request body", error: error.message }, { status: 400 }); }

    const { achievementId, targetUserId, action } = body;

    if (action === 'setAchieved' && !isAdmin) {
        return NextResponse.json({ message: "Forbidden: Only Admins can grant/revoke achievements." }, { status: 403 });
    }
    if ((action === 'updateCount' || action === 'updateScore') && !isAdmin && !isCommittee) {
        return NextResponse.json({ message: "Forbidden: User cannot update achievement counts or scores." }, { status: 403 });
    }

    try {
        const achievements = await readAchievements();
        const achievementIndex = achievements.findIndex(ach => ach.id === achievementId);

        if (achievementIndex === -1) {
            return NextResponse.json({ message: "Achievement not found" }, { status: 404 });
        }

        const achievement = achievements[achievementIndex];

        if (action === 'updateScore' && achievement.onScore !== true) {
            return NextResponse.json({ message: "Scoring is not enabled for this achievement." }, { status: 400 });
        }

        if (!Array.isArray(achievement.userHas)) {
            achievement.userHas = [];
        }

        let userIndex = achievement.userHas.findIndex(u => u.userID === targetUserId);
        const currentDate = new Date().toISOString();

         if (userIndex === -1 && (action === 'updateCount' || action === 'updateScore' || (action === 'setAchieved' && body.achieved === true))) {
             achievement.userHas.push({
                userID: targetUserId,
                achived: false,
                attendanceCount: 0,
                score: achievement.onScore ? 0 : undefined
             });
             userIndex = achievement.userHas.length - 1;
        } else if (userIndex === -1 && action === 'setAchieved' && body.achieved === false) {
             return NextResponse.json(achievement, { status: 200 });
        }

        if (action === 'setAchieved') {
            const { achieved } = body;
            if (userIndex > -1) {
                achievement.userHas[userIndex].achived = achieved;
                achievement.userHas[userIndex].date = achieved ? currentDate : undefined;
                 if (!achieved) {
                    delete achievement.userHas[userIndex].date;
                 }
                 console.log(`Admin ${userId} set achievement ${achievementId} for user ${targetUserId} to ${achieved}`);
            }

        } else if (action === 'updateCount') {
            const { countChange } = body;
            if (userIndex > -1) {
                const currentCount = achievement.userHas[userIndex].attendanceCount || 0;
                const newCount = Math.max(0, currentCount + countChange);
                achievement.userHas[userIndex].attendanceCount = newCount;
                 console.log(`User ${userId} updated count for ${targetUserId} on ${achievementId} by ${countChange} to ${newCount}`);
            }
        } else if (action === 'updateScore') {
            const { score } = body;
             if (userIndex > -1) {
                 achievement.userHas[userIndex].score = score;
                 console.log(`User ${userId} updated score for ${targetUserId} on ${achievementId} to ${score}`);
             }
        }

        await writeAchievements(achievements);
        return NextResponse.json(achievement, { status: 200 });

    } catch (error) {
        console.error(`Failed to ${action} for user ${targetUserId} on achievement ${achievementId}:`, error);
        return NextResponse.json({ message: error.message || `Failed to ${action} achievement status/count/score` }, { status: 500 });
    }
}


export async function DELETE(request) {
    const { userId, sessionClaims } = getAuth(request);
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const isAdmin = sessionClaims?.metadata?.admin === true;
    const isCommittee = sessionClaims?.metadata?.committee === true;
    if (!isAdmin && !isCommittee) return NextResponse.json({ message: "Forbidden: User cannot delete achievements." }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const achievementId = searchParams.get('id');
    if (!achievementId) return NextResponse.json({ message: "Missing required query parameter: id" }, { status: 400 });

    try {
        const achievements = await readAchievements();
        const initialLength = achievements.length;
        const filteredAchievements = achievements.filter(ach => ach.id !== achievementId);
        if (filteredAchievements.length === initialLength) return NextResponse.json({ message: "Achievement not found" }, { status: 404 });
        await writeAchievements(filteredAchievements);
        console.log(`Admin/Committee ${userId} deleted achievement ${achievementId}`);
        return NextResponse.json({ message: `Achievement ${achievementId} deleted successfully.` }, { status: 200 });
    } catch (error) { return NextResponse.json({ message: error.message || "Failed to delete achievement" }, { status: 500 }); }
}
