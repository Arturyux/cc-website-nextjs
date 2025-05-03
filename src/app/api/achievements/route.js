import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/lib/db";

const intToBool = (val) => (val === 1 ? true : false);

export async function GET(request) {
  const { userId } = getAuth(request);

  if (!db) {
    return NextResponse.json(
      { message: "Database connection failed." },
      { status: 500 },
    );
  }

  try {
    const stmt = db.prepare(`
            SELECT
                a.*,
                uas_user.achieved AS currentUserAchieved_raw,
                uas_user.attendanceCount AS currentUserProgress,
                uas_user.achieved_date AS currentUserAchievedDate,
                uas_user.score AS currentUserScore,
                (SELECT COUNT(*) FROM UserAchievementStatus WHERE achievement_id = a.id AND achieved = 1) AS totalAchievedCount,
                (SELECT MAX(score) FROM UserAchievementStatus WHERE achievement_id = a.id AND achieved = 1 AND score IS NOT NULL) AS highestScore,
                -- Aggregate userHas data as JSON directly in SQL (more advanced, requires JSON1 extension enabled)
                (SELECT json_group_array(json_object('userID', uas_all.user_id, 'achived', CASE WHEN uas_all.achieved = 1 THEN json('true') ELSE json('false') END, 'attendanceCount', uas_all.attendanceCount, 'score', uas_all.score, 'date', uas_all.achieved_date))
                 FROM UserAchievementStatus uas_all WHERE uas_all.achievement_id = a.id) AS userHasJson
            FROM
                Achievements a
            LEFT JOIN
                UserAchievementStatus uas_user ON a.id = uas_user.achievement_id AND uas_user.user_id = ?
            ORDER BY a.category, a.title;
        `);

    const achievementsData = stmt.all(userId);

    const enrichedAchievements = achievementsData.map((ach) => {
      const achieved = intToBool(ach.currentUserAchieved_raw);
      let userHasArray = [];
      try {
          if (ach.userHasJson) {
              userHasArray = JSON.parse(ach.userHasJson);
              userHasArray = userHasArray.map(u => ({...u, achived: u.achived === true}));
          }
      } catch (e) {
          console.error(`Failed to parse userHasJson for achievement ${ach.id}:`, e);
      }

      return {
        id: ach.id,
        title: ach.title,
        category: ach.category,
        imgurl: ach.imgurl,
        description: ach.description,
        achiveDescription: ach.achiveDescription,
        silhouetteColor: ach.silhouetteColor,
        isEnabled: intToBool(ach.isEnabled),
        attendanceCounter: intToBool(ach.attendanceCounter),
        attendanceNeed: ach.attendanceNeed,
        onScore: intToBool(ach.onScore),
        currentUserAchieved: achieved,
        currentUserProgress: ach.currentUserProgress ?? 0,
        currentUserAchievedDate: achieved ? ach.currentUserAchievedDate : null,
        currentUserScore:
          achieved && intToBool(ach.onScore) && ach.currentUserScore !== null
            ? ach.currentUserScore
            : null,
        currentUserAchievedDescription: achieved
          ? ach.achiveDescription || ach.description
          : ach.description,
        totalAchievedCount: ach.totalAchievedCount ?? 0,
        highestScore: ach.highestScore,
        userHas: userHasArray,
      };
    });

    return NextResponse.json(enrichedAchievements);
  } catch (error) {
    console.error("GET /api/achievements Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to load achievements data." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const { userId, sessionClaims } = getAuth(request);
  if (!userId)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = sessionClaims?.metadata?.admin === true;
  const isCommittee = sessionClaims?.metadata?.committee === true;
  if (!isAdmin && !isCommittee)
    return NextResponse.json(
      { message: "Forbidden: User cannot create achievements." },
      { status: 403 },
    );

  if (!db) {
    return NextResponse.json(
      { message: "Database connection failed." },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
    if (!body.title || !body.description || !body.imgurl) {
      throw new Error("Missing required fields: title, description, imgurl");
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid request body", error: error.message },
      { status: 400 },
    );
  }

  try {
    const newAchievementId = `ach_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const isEnabled = typeof body.isEnabled === "boolean" ? body.isEnabled : true;
    const attendanceCounter =
      typeof body.attendanceCounter === "boolean"
        ? body.attendanceCounter
        : false;
    const onScore = typeof body.onScore === "boolean" ? body.onScore : false;
    const attendanceNeed = attendanceCounter
      ? parseInt(body.attendanceNeed, 10) || null
      : null;

    const stmt = db.prepare(`
            INSERT INTO Achievements
                (id, title, category, imgurl, description, achiveDescription, silhouetteColor, isEnabled, attendanceCounter, attendanceNeed, onScore)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

    const info = stmt.run(
      newAchievementId,
      body.title,
      body.category || "Uncategorized",
      body.imgurl,
      body.description,
      body.achiveDescription || body.description,
      body.silhouetteColor || "bg-gray-400",
      isEnabled ? 1 : 0,
      attendanceCounter ? 1 : 0,
      attendanceNeed,
      onScore ? 1 : 0,
    );

    if (info.changes > 0) {
      const selectStmt = db.prepare("SELECT * FROM Achievements WHERE id = ?");
      const newAchievementData = selectStmt.get(newAchievementId);
      newAchievementData.isEnabled = intToBool(newAchievementData.isEnabled);
      newAchievementData.attendanceCounter = intToBool(
        newAchievementData.attendanceCounter,
      );
      newAchievementData.onScore = intToBool(newAchievementData.onScore);
      newAchievementData.userHas = []; 

      return NextResponse.json(newAchievementData, { status: 201 });
    } else {
      throw new Error("Failed to insert new achievement into database.");
    }
  } catch (error) {
    console.error("POST /api/achievements Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create achievement" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  const { userId, sessionClaims } = getAuth(request);
  if (!userId)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = sessionClaims?.metadata?.admin === true;
  const isCommittee = sessionClaims?.metadata?.committee === true;
  if (!isAdmin && !isCommittee)
    return NextResponse.json(
      { message: "Forbidden: User cannot edit achievements." },
      { status: 403 },
    );

  if (!db) {
    return NextResponse.json(
      { message: "Database connection failed." },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
    if (!body.id) {
      throw new Error("Missing required field: id");
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid request body", error: error.message },
      { status: 400 },
    );
  }

  try {
    const selectStmt = db.prepare("SELECT * FROM Achievements WHERE id = ?");
    const originalAchievement = selectStmt.get(body.id);

    if (!originalAchievement) {
      return NextResponse.json({ message: "Achievement not found" }, { status: 404 });
    }

    const title = body.title ?? originalAchievement.title;
    const category = body.category ?? originalAchievement.category;
    const imgurl = body.imgurl ?? originalAchievement.imgurl;
    const description = body.description ?? originalAchievement.description;
    const achiveDescription =
      body.achiveDescription ?? originalAchievement.achiveDescription;
    const silhouetteColor =
      body.silhouetteColor ?? originalAchievement.silhouetteColor;
    const isEnabled =
      typeof body.isEnabled === "boolean"
        ? body.isEnabled
        : intToBool(originalAchievement.isEnabled);
    const attendanceCounter =
      typeof body.attendanceCounter === "boolean"
        ? body.attendanceCounter
        : intToBool(originalAchievement.attendanceCounter);
    const onScore =
      typeof body.onScore === "boolean"
        ? body.onScore
        : intToBool(originalAchievement.onScore);
    const attendanceNeed = attendanceCounter
      ? parseInt(body.attendanceNeed, 10) || null
      : null;

    const updateStmt = db.prepare(`
            UPDATE Achievements SET
                title = ?, category = ?, imgurl = ?, description = ?, achiveDescription = ?,
                silhouetteColor = ?, isEnabled = ?, attendanceCounter = ?, attendanceNeed = ?, onScore = ?
            WHERE id = ?
        `);

    const info = updateStmt.run(
      title,
      category,
      imgurl,
      description,
      achiveDescription,
      silhouetteColor,
      isEnabled ? 1 : 0,
      attendanceCounter ? 1 : 0,
      attendanceNeed,
      onScore ? 1 : 0,
      body.id,
    );
    const returnStmt = db.prepare(`
             SELECT
                 a.*,
                 (SELECT json_group_array(json_object('userID', uas_all.user_id, 'achived', CASE WHEN uas_all.achieved = 1 THEN json('true') ELSE json('false') END, 'attendanceCount', uas_all.attendanceCount, 'score', uas_all.score, 'date', uas_all.achieved_date))
                  FROM UserAchievementStatus uas_all WHERE uas_all.achievement_id = a.id) AS userHasJson
             FROM Achievements a
             WHERE a.id = ?;
         `);
    const updatedData = returnStmt.get(body.id);

    if (!updatedData) {
         return NextResponse.json({ message: "Achievement not found after update" }, { status: 404 });
    }

    let userHasArray = [];
    try {
        if (updatedData.userHasJson) {
            userHasArray = JSON.parse(updatedData.userHasJson);
            userHasArray = userHasArray.map(u => ({...u, achived: u.achived === true}));
        }
    } catch (e) { console.error("Failed to parse userHasJson after PUT:", e); }

    const finalResponse = {
        ...updatedData,
        isEnabled: intToBool(updatedData.isEnabled),
        attendanceCounter: intToBool(updatedData.attendanceCounter),
        onScore: intToBool(updatedData.onScore),
        userHas: userHasArray,
        userHasJson: undefined
    };

    return NextResponse.json(finalResponse, { status: 200 });

  } catch (error) {
    console.error("PUT /api/achievements Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to update achievement" },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  const { userId, sessionClaims } = getAuth(request);
  if (!userId)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = sessionClaims?.metadata?.admin === true;
  const isCommittee = sessionClaims?.metadata?.committee === true;

  if (!db) {
    return NextResponse.json(
      { message: "Database connection failed." },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
    if (!body.achievementId || !body.targetUserId || !body.action) {
      throw new Error(
        "Missing required fields: achievementId, targetUserId, action",
      );
    }
    if (body.action === "setAchieved" && typeof body.achieved !== "boolean") {
      throw new Error(
        "Missing required field for action 'setAchieved': achieved (boolean)",
      );
    }
    if (body.action === "updateCount" && typeof body.countChange !== "number") {
      throw new Error(
        "Missing required field for action 'updateCount': countChange (number)",
      );
    }
    if (body.action === "updateScore" && typeof body.score !== "number") {
      throw new Error(
        "Missing required field for action 'updateScore': score (number)",
      );
    }
    if (!["setAchieved", "updateCount", "updateScore"].includes(body.action)) {
      throw new Error(
        "Invalid action specified. Must be 'setAchieved', 'updateCount', or 'updateScore'.",
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid request body", error: error.message },
      { status: 400 },
    );
  }

  const { achievementId, targetUserId, action } = body;

  if (action === "setAchieved" && !isAdmin) {
    return NextResponse.json(
      { message: "Forbidden: Only Admins can grant/revoke achievements." },
      { status: 403 },
    );
  }
  if (
    (action === "updateCount" || action === "updateScore") &&
    !isAdmin &&
    !isCommittee
  ) {
    return NextResponse.json(
      { message: "Forbidden: User cannot update achievement counts or scores." },
      { status: 403 },
    );
  }

  const patchTransaction = db.transaction(() => {
    const achStmt = db.prepare(
      "SELECT id, onScore, attendanceCounter, attendanceNeed FROM Achievements WHERE id = ?",
    );
    const achievement = achStmt.get(achievementId);

    if (!achievement) {
      throw { status: 404, message: "Achievement not found" };
    }

    const currentDate = new Date().toISOString();
    let info;

    if (action === "setAchieved") {
      const { achieved } = body;
      const achievedValue = achieved ? 1 : 0;
      const dateValue = achieved ? currentDate : null;

      const stmt = db.prepare(`
          INSERT INTO UserAchievementStatus (achievement_id, user_id, achieved, achieved_date, attendanceCount, score)
          VALUES (?, ?, ?, ?, 0, NULL)
          ON CONFLICT(achievement_id, user_id) DO UPDATE SET
              achieved = excluded.achieved,
              achieved_date = CASE WHEN excluded.achieved = 1 THEN excluded.achieved_date ELSE NULL END,
              attendanceCount = CASE WHEN excluded.achieved = 0 THEN 0 ELSE UserAchievementStatus.attendanceCount END,
              score = CASE WHEN excluded.achieved = 0 THEN NULL ELSE UserAchievementStatus.score END;
      `);
      info = stmt.run(achievementId, targetUserId, achievedValue, dateValue);
      console.log(
        `Admin ${userId} set achievement ${achievementId} for user ${targetUserId} to ${achieved}`,
      );
    } else if (action === "updateCount") {
      const { countChange } = body;
      const stmt = db.prepare(`
          INSERT INTO UserAchievementStatus (achievement_id, user_id, attendanceCount, achieved, score)
          VALUES (?, ?, MAX(0, ?), 0, NULL)
          ON CONFLICT(achievement_id, user_id) DO UPDATE SET
              attendanceCount = MAX(0, IFNULL(UserAchievementStatus.attendanceCount, 0) + ?);
      `);
      info = stmt.run(achievementId, targetUserId, countChange, countChange);
      console.log(
        `User ${userId} updated count for ${targetUserId} on ${achievementId} by ${countChange}`,
      );

      const checkStmt = db.prepare(`
          SELECT uas.attendanceCount, a.attendanceNeed
          FROM UserAchievementStatus uas
          JOIN Achievements a ON uas.achievement_id = a.id
          WHERE uas.achievement_id = ? AND uas.user_id = ? AND uas.achieved = 0 AND a.attendanceCounter = 1
      `);
      const statusCheck = checkStmt.get(achievementId, targetUserId);
      if (statusCheck && statusCheck.attendanceNeed !== null && statusCheck.attendanceCount >= statusCheck.attendanceNeed) {
          const grantStmt = db.prepare(`
              UPDATE UserAchievementStatus
              SET achieved = 1, achieved_date = ?
              WHERE achievement_id = ? AND user_id = ? AND achieved = 0
          `);
          grantStmt.run(currentDate, achievementId, targetUserId);
          console.log(`User ${targetUserId} automatically achieved ${achievementId} via count update.`);
      }

    } else if (action === "updateScore") {
      if (!intToBool(achievement.onScore)) {
        throw { status: 400, message: "Scoring is not enabled for this achievement." };
      }
      const { score } = body;
      const scoreValue = (typeof score === 'number' && !isNaN(score)) ? score : 0;
      const stmt = db.prepare(`
          INSERT INTO UserAchievementStatus (achievement_id, user_id, score, achieved, attendanceCount)
          VALUES (?, ?, ?, 0, 0)
          ON CONFLICT(achievement_id, user_id) DO UPDATE SET
              score = excluded.score;
      `);
      info = stmt.run(achievementId, targetUserId, scoreValue);
      console.log(
        `User ${userId} updated score for ${targetUserId} on ${achievementId} to ${scoreValue}`,
      );
    }

    const returnStmt = db.prepare(`
             SELECT
                 a.*,
                 uas_user.achieved AS currentUserAchieved_raw,
                 uas_user.attendanceCount AS currentUserProgress,
                 uas_user.achieved_date AS currentUserAchievedDate,
                 uas_user.score AS currentUserScore,
                 (SELECT COUNT(*) FROM UserAchievementStatus WHERE achievement_id = a.id AND achieved = 1) AS totalAchievedCount,
                 (SELECT MAX(score) FROM UserAchievementStatus WHERE achievement_id = a.id AND achieved = 1 AND score IS NOT NULL) AS highestScore,
                 (SELECT json_group_array(json_object('userID', uas_all.user_id, 'achived', CASE WHEN uas_all.achieved = 1 THEN json('true') ELSE json('false') END, 'attendanceCount', uas_all.attendanceCount, 'score', uas_all.score, 'date', uas_all.achieved_date))
                  FROM UserAchievementStatus uas_all WHERE uas_all.achievement_id = a.id) AS userHasJson
             FROM
                 Achievements a
             LEFT JOIN
                 UserAchievementStatus uas_user ON a.id = uas_user.achievement_id AND uas_user.user_id = ?
             WHERE a.id = ?;
         `);
    const updatedData = returnStmt.get(targetUserId, achievementId);

    if (!updatedData) {
      throw { status: 404, message: "Achievement data not found after update." };
    }

    let userHasArray = [];
    try {
        if (updatedData.userHasJson) {
            userHasArray = JSON.parse(updatedData.userHasJson);
            userHasArray = userHasArray.map(u => ({...u, achived: u.achived === true}));
        }
    } catch (e) { console.error("Failed to parse userHasJson after PATCH:", e); }

    const achieved = intToBool(updatedData.currentUserAchieved_raw);
    return {
        id: updatedData.id,
        title: updatedData.title,
        category: updatedData.category,
        imgurl: updatedData.imgurl,
        description: updatedData.description,
        achiveDescription: updatedData.achiveDescription,
        silhouetteColor: updatedData.silhouetteColor,
        isEnabled: intToBool(updatedData.isEnabled),
        attendanceCounter: intToBool(updatedData.attendanceCounter),
        attendanceNeed: updatedData.attendanceNeed,
        onScore: intToBool(updatedData.onScore),
        currentUserAchieved: achieved,
        currentUserProgress: updatedData.currentUserProgress ?? 0,
        currentUserAchievedDate: achieved ? updatedData.currentUserAchievedDate : null,
        currentUserScore:
            achieved && intToBool(updatedData.onScore) && updatedData.currentUserScore !== null
            ? updatedData.currentUserScore
            : null,
        currentUserAchievedDescription: achieved
            ? updatedData.achiveDescription || updatedData.description
            : updatedData.description,
        totalAchievedCount: updatedData.totalAchievedCount ?? 0,
        highestScore: updatedData.highestScore,
        userHas: userHasArray,
    };
  });

  try {
    const result = patchTransaction();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(`PATCH /api/achievements (Action: ${action}) Error:`, error);
    const status = error.status || 500;
    const message = error.message || `Failed to ${action} achievement status/count/score`;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(request) {
  const { userId, sessionClaims } = getAuth(request);
  if (!userId)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const isAdmin = sessionClaims?.metadata?.admin === true;
  const isCommittee = sessionClaims?.metadata?.committee === true;
  if (!isAdmin && !isCommittee)
    return NextResponse.json(
      { message: "Forbidden: User cannot delete achievements." },
      { status: 403 },
    );

  if (!db) {
    return NextResponse.json(
      { message: "Database connection failed." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const achievementId = searchParams.get("id");
  if (!achievementId)
    return NextResponse.json(
      { message: "Missing required query parameter: id" },
      { status: 400 },
    );

  try {
    const stmt = db.prepare("DELETE FROM Achievements WHERE id = ?");
    const info = stmt.run(achievementId);

    if (info.changes > 0) {
      console.log(`Admin/Committee ${userId} deleted achievement ${achievementId}`);
      return NextResponse.json(
        { message: `Achievement ${achievementId} deleted successfully.` },
        { status: 200 },
      );
    } else {
      return NextResponse.json({ message: "Achievement not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("DELETE /api/achievements Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to delete achievement" },
      { status: 500 },
    );
  }
}
