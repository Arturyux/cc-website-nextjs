import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/lib/db";

const intToBool = (val) => (val === 1 ? true : false);

export async function POST(request) {
  const { userId } = getAuth(request);
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json(
      { message: "Database connection failed." },
      { status: 500 },
    );
  }

  let body;
  let scannedData;
  try {
    body = await request.json();
    if (!body.scannedData) {
      throw new Error("Missing required field: scannedData");
    }
    scannedData = JSON.parse(body.scannedData);
    if (
      scannedData.type !== "achievement_grant" ||
      !scannedData.achievementId
    ) {
      throw new Error("Invalid QR code content or type.");
    }
  } catch (error) {
    console.error("QR Scan Request Body/Parse Error:", error);
    return NextResponse.json(
      { message: "Invalid request or QR code data", error: error.message },
      { status: 400 },
    );
  }

  const { achievementId } = scannedData;
  const currentDate = new Date().toISOString();

  const scanTransaction = db.transaction(() => {
    const achStmt = db.prepare(
      "SELECT id, title, attendanceCounter, attendanceNeed, onScore, achiveDescription, description FROM Achievements WHERE id = ? AND isEnabled = 1",
    );
    const achievement = achStmt.get(achievementId);

    if (!achievement) {
      throw { status: 404, message: "Achievement not found or not enabled." };
    }

    const statusStmt = db.prepare(
      "SELECT achieved, attendanceCount FROM UserAchievementStatus WHERE achievement_id = ? AND user_id = ?",
    );
    const userStatus = statusStmt.get(achievementId, userId);

    let alreadyAchieved = userStatus ? intToBool(userStatus.achieved) : false;
    let currentCount = userStatus ? userStatus.attendanceCount || 0 : 0;
    let needsUpdate = false;
    let grantAchievement = false;
    let newCount = currentCount;
    let message = `Scanned '${achievement.title}'.`;

    if (intToBool(achievement.attendanceCounter)) {
      if (!alreadyAchieved) {
        newCount = currentCount + 1;
        needsUpdate = true;
        message = `Progress updated for '${achievement.title}' (${newCount}/${achievement.attendanceNeed}).`;
        console.log(
          `User ${userId} scanned counter achievement ${achievementId}. Count: ${currentCount} -> ${newCount}`,
        );
        if (
          achievement.attendanceNeed !== null &&
          newCount >= achievement.attendanceNeed
        ) {
          grantAchievement = true;
          alreadyAchieved = true;
          message = `Achievement Unlocked: '${achievement.title}'!`;
          console.log(
            `User ${userId} achieved ${achievementId} via counter scan.`,
          );
        }
      } else {
        message = `You already achieved '${achievement.title}', Good job!`;
      }
    } else {
      if (!alreadyAchieved) {
        grantAchievement = true;
        alreadyAchieved = true;
        needsUpdate = true;
        message = `Achievement Unlocked: '${achievement.title}'!`;
        console.log(`User ${userId} achieved ${achievementId} via direct scan.`);
      } else {
        message = `You already achieved '${achievement.title}', Good job!`;
      }
    }

    if (needsUpdate) {
      const upsertStmt = db.prepare(`
                INSERT INTO UserAchievementStatus (achievement_id, user_id, achieved, achieved_date, attendanceCount)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(achievement_id, user_id) DO UPDATE SET
                    achieved = CASE WHEN excluded.achieved = 1 THEN 1 ELSE UserAchievementStatus.achieved END,
                    achieved_date = CASE WHEN excluded.achieved = 1 THEN excluded.achieved_date ELSE UserAchievementStatus.achieved_date END,
                    attendanceCount = excluded.attendanceCount;
            `);
      upsertStmt.run(
        achievementId,
        userId,
        grantAchievement ? 1 : 0,
        grantAchievement ? currentDate : null,
        newCount,
      );
    }

    return {
      success: true,
      message: message,
      achievementId: achievement.id,
      achievementTitle: achievement.title,
      achievedNow: grantAchievement,
      isAchieved: alreadyAchieved,
      newProgress: intToBool(achievement.attendanceCounter) ? newCount : null,
      progressNeeded: intToBool(achievement.attendanceCounter)
        ? achievement.attendanceNeed
        : null,
      achieveDescription: grantAchievement
        ? achievement.achiveDescription || achievement.description
        : null,
    };
  });

  try {
    const result = scanTransaction();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(`QR Scan Error for user ${userId}:`, error);
    const status = error.status || 500;
    const message = error.message || "Failed to process QR code scan.";
    return NextResponse.json({ success: false, message }, { status });
  }
}
