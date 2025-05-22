import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/lib/db";
import jwt from "jsonwebtoken";

const intToBool = (val) => (val === 1 ? true : false);
const TWELVE_HOURS_IN_MS = 12 * 60 * 60 * 1000;
const QR_JWT_SECRET = process.env.QR_JWT_SECRET;

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
  if (!QR_JWT_SECRET) {
    console.error("QR_JWT_SECRET is not defined for scan verification.");
    return NextResponse.json(
      { message: "Server configuration error." },
      { status: 500 },
    );
  }

  let body;
  let scannedToken;
  try {
    body = await request.json();
    if (!body.scannedData) {
      throw new Error("Missing required field: scannedData (JWT token)");
    }
    scannedToken = body.scannedData;
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid request body", error: error.message },
      { status: 400 },
    );
  }

  let achievementIdFromToken;
  try {
    const decoded = jwt.verify(scannedToken, QR_JWT_SECRET);
    if (decoded.type !== "achievement_grant" || !decoded.achievementId) {
      throw new Error("Invalid token content or type.");
    }
    achievementIdFromToken = decoded.achievementId;
  } catch (error) {
    console.error("QR Token Verification Error:", error.message);
    let userMessage = "Invalid or expired QR code.";
    if (error.name === "TokenExpiredError") {
      userMessage = "This QR code has expired.";
    } else if (error.name === "JsonWebTokenError") {
      userMessage = "This QR code is invalid or has been tampered with.";
    }
    return NextResponse.json(
      { success: false, message: userMessage },
      { status: 400 },
    );
  }

  const achievementId = achievementIdFromToken;
  const currentDate = new Date().toISOString();
  const currentTimeMs = new Date().getTime();

  const scanTransaction = db.transaction(() => {
    const achStmt = db.prepare(
      `SELECT id, title, attendanceCounter, attendanceNeed, onScore, 
              achiveDescription, description, level_config 
       FROM Achievements WHERE id = ? AND isEnabled = 1`,
    );
    const achievement = achStmt.get(achievementId);

    if (!achievement) {
      throw { status: 404, message: "Achievement not found or not enabled." };
    }

    const statusStmt = db.prepare(
      `SELECT achieved, attendanceCount, last_progress_scan_timestamp 
       FROM UserAchievementStatus 
       WHERE achievement_id = ? AND user_id = ?`,
    );
    const userStatus = statusStmt.get(achievementId, userId);

    let alreadyAchievedInDb = userStatus
      ? intToBool(userStatus.achieved)
      : false;
    let currentCount = userStatus ? userStatus.attendanceCount || 0 : 0;
    let lastScanTimestampStr = userStatus?.last_progress_scan_timestamp;

    let needsUpdate = false;
    let grantAchievementThisScan = false;
    let newCount = currentCount;
    let message = `Scanned '${achievement.title}'.`;
    let newScanTimestampToStore = lastScanTimestampStr;

    if (intToBool(achievement.attendanceCounter)) {
      if (lastScanTimestampStr) {
        const lastScanTimeMs = new Date(lastScanTimestampStr).getTime();
        if (currentTimeMs - lastScanTimeMs < TWELVE_HOURS_IN_MS) {
          const timeLeftMs =
            TWELVE_HOURS_IN_MS - (currentTimeMs - lastScanTimeMs);
          const hoursLeft = Math.floor(timeLeftMs / (60 * 60 * 1000));
          const minutesLeft = Math.ceil(
            (timeLeftMs % (60 * 60 * 1000)) / (60 * 1000),
          );
          message = `You can scan for '${achievement.title}' again in approximately ${hoursLeft}h ${minutesLeft}m.`;
          return {
            success: false,
            message: message,
            cooldownActive: true,
            achievementId: achievement.id,
            achievementTitle: achievement.title,
          };
        }
      }
      newCount = currentCount + 1;
      needsUpdate = true;
      newScanTimestampToStore = currentDate;
      message = `Progress updated for '${achievement.title}' (${newCount}/${
        achievement.attendanceNeed ?? "N/A"
      }).`;

      if (
        !alreadyAchievedInDb &&
        achievement.attendanceNeed !== null &&
        newCount >= achievement.attendanceNeed
      ) {
        grantAchievementThisScan = true;
        message = `Achievement Unlocked: '${achievement.title}'!`;
      } else if (alreadyAchievedInDb) {
        message = `Progress updated for '${achievement.title}' (already achieved). New count: ${newCount}.`;
      }
    } else {
      if (!alreadyAchievedInDb) {
        grantAchievementThisScan = true;
        needsUpdate = true;
        message = `Achievement Unlocked: '${achievement.title}'!`;
      } else {
        message = `You already achieved '${achievement.title}', Good job!`;
      }
    }

    if (needsUpdate) {
      const upsertStmt = db.prepare(`
        INSERT INTO UserAchievementStatus 
          (achievement_id, user_id, achieved, achieved_date, attendanceCount, last_progress_scan_timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(achievement_id, user_id) DO UPDATE SET
          achieved = CASE WHEN excluded.achieved = 1 THEN 1 ELSE UserAchievementStatus.achieved END,
          achieved_date = CASE WHEN excluded.achieved = 1 THEN excluded.achieved_date ELSE UserAchievementStatus.achieved_date END,
          attendanceCount = excluded.attendanceCount,
          last_progress_scan_timestamp = excluded.last_progress_scan_timestamp;
      `);

      upsertStmt.run(
        achievementId,
        userId,
        grantAchievementThisScan ? 1 : alreadyAchievedInDb ? 1 : 0,
        grantAchievementThisScan
          ? currentDate
          : userStatus?.achieved_date || null,
        newCount,
        newScanTimestampToStore,
      );
    }

    return {
      success: true,
      message: message,
      achievementId: achievement.id,
      achievementTitle: achievement.title,
      achievedNow: grantAchievementThisScan,
      isAchieved: grantAchievementThisScan || alreadyAchievedInDb,
      newProgress: intToBool(achievement.attendanceCounter) ? newCount : null,
      progressNeeded: intToBool(achievement.attendanceCounter)
        ? achievement.attendanceNeed
        : null,
      achieveDescription: grantAchievementThisScan
        ? achievement.achiveDescription || achievement.description
        : null,
    };
  });

  try {
    const result = scanTransaction();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(
      `QR Scan Error for user ${userId}, achievement ${achievementId}:`,
      error,
    );
    const status = error.status || 500;
    const errMessage = error.message || "Failed to process QR code scan.";
    return NextResponse.json({ success: false, message: errMessage }, { status });
  }
}
