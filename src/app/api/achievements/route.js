import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/lib/db";

const intToBool = (val) => (val === 1 ? true : false);
const boolToInt = (val) => (val === true ? 1 : 0);

const getCurrentLevelDetails = (achievement, userProgress) => {
  if (
    !achievement.level_config ||
    achievement.level_config.length === 0 ||
    userProgress === null ||
    userProgress === undefined
  ) {
    return {
      currentLevel: null,
      nextLevelProgressNeeded: achievement.attendanceNeed,
      isMaxLevel: false,
      overrideDetails: {},
    };
  }

  const sortedLevels = [...achievement.level_config].sort(
    (a, b) => a.progressNeeded - b.progressNeeded,
  );

  let currentLevel = null;
  for (let i = sortedLevels.length - 1; i >= 0; i--) {
    if (userProgress >= sortedLevels[i].progressNeeded) {
      currentLevel = sortedLevels[i];
      break;
    }
  }

  let nextLevelProgressNeeded = null;
  let isMaxLevel = false;

  if (currentLevel) {
    const currentLevelIndex = sortedLevels.findIndex(
      (l) => l.levelOrder === currentLevel.levelOrder,
    );
    if (currentLevelIndex < sortedLevels.length - 1) {
      nextLevelProgressNeeded =
        sortedLevels[currentLevelIndex + 1].progressNeeded;
    } else {
      isMaxLevel = true;
      nextLevelProgressNeeded = currentLevel.progressNeeded;
    }
  } else if (sortedLevels.length > 0) {
    nextLevelProgressNeeded = sortedLevels[0].progressNeeded;
  } else {
    nextLevelProgressNeeded = achievement.attendanceNeed;
  }

  const overrideDetails = currentLevel
    ? {
        title: currentLevel.levelTitle || achievement.title,
        imgurl: currentLevel.levelImgUrl || achievement.imgurl,
        description: currentLevel.levelDescription || achievement.description,
        achiveDescription:
          currentLevel.levelAchiveDescription || achievement.achiveDescription,
        card_skin_image_url:
          currentLevel.levelSkinUrl || achievement.card_skin_image_url,
      }
    : {};

  return { currentLevel, nextLevelProgressNeeded, isMaxLevel, overrideDetails };
};

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
      let parsedLevelConfig = [];
      if (ach.level_config) {
        try {
          parsedLevelConfig = JSON.parse(ach.level_config);
        } catch (e) {
          console.error(
            `Failed to parse level_config for achievement ${ach.id}:`,
            e,
          );
        }
      }
      const achievementWithParsedLevels = {
        ...ach,
        level_config: parsedLevelConfig,
      };

      const userProgress = ach.currentUserProgress ?? 0;
      const {
        currentLevel,
        nextLevelProgressNeeded,
        isMaxLevel,
        overrideDetails,
      } = getCurrentLevelDetails(achievementWithParsedLevels, userProgress);

      const baseAchieved = intToBool(ach.currentUserAchieved_raw);
      const isLeveledAchieved = parsedLevelConfig.length > 0 && !!currentLevel;
      const currentUserAchieved =
        parsedLevelConfig.length > 0 ? isLeveledAchieved : baseAchieved;

      return {
        id: ach.id,
        title: overrideDetails.title || ach.title,
        category: ach.category,
        imgurl: overrideDetails.imgurl || ach.imgurl,
        description: overrideDetails.description || ach.description,
        achiveDescription:
          overrideDetails.achiveDescription || ach.achiveDescription,
        silhouetteColor: ach.silhouetteColor,
        isEnabled: intToBool(ach.isEnabled),
        attendanceCounter: intToBool(ach.attendanceCounter),
        attendanceNeed: nextLevelProgressNeeded,
        onScore: intToBool(ach.onScore),
        card_skin_image_url:
          overrideDetails.card_skin_image_url || ach.card_skin_image_url,
        level_config: parsedLevelConfig,
        currentUserAchieved: currentUserAchieved,
        currentUserProgress: userProgress,
        currentUserAchievedDate: currentUserAchieved
          ? ach.currentUserAchievedDate
          : null,
        currentUserScore:
          currentUserAchieved &&
          intToBool(ach.onScore) &&
          ach.currentUserScore !== null
            ? ach.currentUserScore
            : null,
        currentUserAchievedDescription: currentUserAchieved
          ? overrideDetails.achiveDescription ||
            ach.achiveDescription ||
            ach.description
          : overrideDetails.description || ach.description,
        totalAchievedCount: ach.totalAchievedCount ?? 0,
        highestScore: ach.highestScore,
        userHas: ach.userHasJson
          ? JSON.parse(ach.userHasJson).map((u) => ({
              ...u,
              achived: u.achived === true,
            }))
          : [],
        currentLevelDisplay: currentLevel,
        isMaxLevel: isMaxLevel,
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
    const isEnabled = boolToInt(
      body.isEnabled !== undefined ? body.isEnabled : true,
    );
    const attendanceCounter = boolToInt(body.attendanceCounter || false);
    const onScore = boolToInt(body.onScore || false);
    const attendanceNeed =
      attendanceCounter && body.attendanceNeed
        ? parseInt(body.attendanceNeed, 10) || null
        : null;
    const cardSkinImageUrl = body.card_skin_image_url || null;
    const levelConfig =
      body.level_config && Array.isArray(body.level_config)
        ? JSON.stringify(body.level_config)
        : null;

    const stmt = db.prepare(`
      INSERT INTO Achievements
        (id, title, category, imgurl, description, achiveDescription, silhouetteColor, isEnabled, attendanceCounter, attendanceNeed, onScore, card_skin_image_url, level_config)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newAchievementId,
      body.title,
      body.category || "Uncategorized",
      body.imgurl,
      body.description,
      body.achiveDescription || body.description,
      body.silhouetteColor || "bg-gray-400",
      isEnabled,
      attendanceCounter,
      attendanceNeed,
      onScore,
      cardSkinImageUrl,
      levelConfig,
    );

    const selectStmt = db.prepare("SELECT * FROM Achievements WHERE id = ?");
    const newAchievementData = selectStmt.get(newAchievementId);
    if (newAchievementData.level_config) {
      newAchievementData.level_config = JSON.parse(
        newAchievementData.level_config,
      );
    }
    newAchievementData.isEnabled = intToBool(newAchievementData.isEnabled);
    newAchievementData.attendanceCounter = intToBool(
      newAchievementData.attendanceCounter,
    );
    newAchievementData.onScore = intToBool(newAchievementData.onScore);
    newAchievementData.userHas = [];

    return NextResponse.json(newAchievementData, { status: 201 });
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
      return NextResponse.json(
        { message: "Achievement not found" },
        { status: 404 },
      );
    }

    const title = body.title ?? originalAchievement.title;
    const category = body.category ?? originalAchievement.category;
    const imgurl = body.imgurl ?? originalAchievement.imgurl;
    const description = body.description ?? originalAchievement.description;
    const achiveDescription =
      body.achiveDescription ?? originalAchievement.achiveDescription;
    const silhouetteColor =
      body.silhouetteColor ?? originalAchievement.silhouetteColor;
    const isEnabled = boolToInt(
      body.isEnabled !== undefined
        ? body.isEnabled
        : intToBool(originalAchievement.isEnabled),
    );
    const attendanceCounter = boolToInt(
      body.attendanceCounter !== undefined
        ? body.attendanceCounter
        : intToBool(originalAchievement.attendanceCounter),
    );
    const onScore = boolToInt(
      body.onScore !== undefined
        ? body.onScore
        : intToBool(originalAchievement.onScore),
    );
    const attendanceNeed =
      attendanceCounter && body.attendanceNeed
        ? parseInt(body.attendanceNeed, 10) || null
        : intToBool(attendanceCounter)
          ? originalAchievement.attendanceNeed
          : null;
    const cardSkinImageUrl =
      body.card_skin_image_url !== undefined
        ? body.card_skin_image_url
        : originalAchievement.card_skin_image_url;
    const levelConfig =
      body.level_config && Array.isArray(body.level_config)
        ? JSON.stringify(body.level_config)
        : originalAchievement.level_config;

    const updateStmt = db.prepare(`
      UPDATE Achievements SET
        title = ?, category = ?, imgurl = ?, description = ?, achiveDescription = ?,
        silhouetteColor = ?, isEnabled = ?, attendanceCounter = ?, attendanceNeed = ?, onScore = ?, card_skin_image_url = ?, level_config = ?
      WHERE id = ?
    `);

    updateStmt.run(
      title,
      category,
      imgurl,
      description,
      achiveDescription,
      silhouetteColor,
      isEnabled,
      attendanceCounter,
      attendanceNeed,
      onScore,
      cardSkinImageUrl,
      levelConfig,
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
      return NextResponse.json(
        { message: "Achievement not found after update" },
        { status: 404 },
      );
    }
    if (updatedData.level_config) {
      updatedData.level_config = JSON.parse(updatedData.level_config);
    }

    const finalResponse = {
      ...updatedData,
      isEnabled: intToBool(updatedData.isEnabled),
      attendanceCounter: intToBool(updatedData.attendanceCounter),
      onScore: intToBool(updatedData.onScore),
      userHas: updatedData.userHasJson
        ? JSON.parse(updatedData.userHasJson).map((u) => ({
            ...u,
            achived: u.achived === true,
          }))
        : [],
      userHasJson: undefined,
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
      {
        message: "Forbidden: User cannot update achievement counts or scores.",
      },
      { status: 403 },
    );
  }

  const patchTransaction = db.transaction(() => {
    const achStmt = db.prepare(
      "SELECT id, onScore, attendanceCounter, attendanceNeed, level_config FROM Achievements WHERE id = ?",
    );
    const achievement = achStmt.get(achievementId);

    if (!achievement) {
      throw { status: 404, message: "Achievement not found" };
    }

    let parsedLevelConfig = [];
    if (achievement.level_config) {
      try {
        parsedLevelConfig = JSON.parse(achievement.level_config);
      } catch (e) {
        console.error(
          `Failed to parse level_config in PATCH for achievement ${achievement.id}:`,
          e,
        );
      }
    }
    const achievementWithParsedLevels = {
      ...achievement,
      level_config: parsedLevelConfig,
    };

    const currentDate = new Date().toISOString();

    if (action === "setAchieved") {
      const { achieved } = body;
      const achievedValue = boolToInt(achieved);
      const dateValue = achieved ? currentDate : null;
      let attendanceCountToSet;

      if (achieved) {
        if (
          achievementWithParsedLevels.level_config &&
          achievementWithParsedLevels.level_config.length > 0
        ) {
          const sortedLevels = [
            ...achievementWithParsedLevels.level_config,
          ].sort((a, b) => b.progressNeeded - a.progressNeeded);
          attendanceCountToSet = sortedLevels[0].progressNeeded;
        } else if (intToBool(achievement.attendanceCounter)) {
          attendanceCountToSet = achievement.attendanceNeed || 1;
        } else {
          attendanceCountToSet = 1;
        }
      } else {
        attendanceCountToSet = 0;
      }

      const stmt = db.prepare(`
        INSERT INTO UserAchievementStatus (achievement_id, user_id, achieved, achieved_date, attendanceCount, score)
        VALUES (?, ?, ?, ?, ?, NULL)
        ON CONFLICT(achievement_id, user_id) DO UPDATE SET
          achieved = excluded.achieved,
          achieved_date = excluded.achieved_date,
          attendanceCount = excluded.attendanceCount,
          score = CASE WHEN excluded.achieved = 0 THEN NULL ELSE UserAchievementStatus.score END;
      `);
      stmt.run(
        achievementId,
        targetUserId,
        achievedValue,
        dateValue,
        attendanceCountToSet,
      );
    } else if (action === "updateCount") {
      const { countChange } = body;
      const updateCountStmt = db.prepare(`
          INSERT INTO UserAchievementStatus (achievement_id, user_id, attendanceCount, achieved, score)
          VALUES (?, ?, MAX(0, ?), 0, NULL)
          ON CONFLICT(achievement_id, user_id) DO UPDATE SET
              attendanceCount = MAX(0, IFNULL(UserAchievementStatus.attendanceCount, 0) + ?);
      `);
      updateCountStmt.run(achievementId, targetUserId, countChange, countChange);

      const statusCheckStmt = db.prepare(`
          SELECT uas.attendanceCount, uas.achieved as alreadyAchieved
          FROM UserAchievementStatus uas
          WHERE uas.achievement_id = ? AND uas.user_id = ?
      `);
      const statusCheck = statusCheckStmt.get(achievementId, targetUserId);

      if (statusCheck && intToBool(achievement.attendanceCounter)) {
        let newAchievedStatus = intToBool(statusCheck.alreadyAchieved);
        let shouldUpdateAchievedDate = false;

        if (
          achievementWithParsedLevels.level_config &&
          achievementWithParsedLevels.level_config.length > 0
        ) {
          const sortedLevels = [
            ...achievementWithParsedLevels.level_config,
          ].sort((a, b) => a.progressNeeded - b.progressNeeded);
          let highestLevelMet = null;
          for (const level of sortedLevels) {
            if (statusCheck.attendanceCount >= level.progressNeeded) {
              highestLevelMet = level;
            } else {
              break;
            }
          }
          if (highestLevelMet) {
            if (!intToBool(statusCheck.alreadyAchieved)) {
              newAchievedStatus = true;
              shouldUpdateAchievedDate = true;
            } else {
              newAchievedStatus = true;
            }
          } else {
            newAchievedStatus = false;
            if (intToBool(statusCheck.alreadyAchieved)) {
              shouldUpdateAchievedDate = true;
            }
          }
        } else if (
          achievement.attendanceNeed &&
          statusCheck.attendanceCount >= achievement.attendanceNeed
        ) {
          if (!intToBool(statusCheck.alreadyAchieved)) {
            newAchievedStatus = true;
            shouldUpdateAchievedDate = true;
          } else {
            newAchievedStatus = true;
          }
        } else if (
          achievement.attendanceNeed &&
          statusCheck.attendanceCount < achievement.attendanceNeed
        ) {
          newAchievedStatus = false;
          if (intToBool(statusCheck.alreadyAchieved)) {
            shouldUpdateAchievedDate = true;
          }
        }

        if (newAchievedStatus && !intToBool(statusCheck.alreadyAchieved) && shouldUpdateAchievedDate) {
          const grantStmt = db.prepare(`
                UPDATE UserAchievementStatus
                SET achieved = 1, achieved_date = ?
                WHERE achievement_id = ? AND user_id = ?
            `);
          grantStmt.run(currentDate, achievementId, targetUserId);
        } else if (!newAchievedStatus && intToBool(statusCheck.alreadyAchieved)) {
          const revokeStmt = db.prepare(`
                UPDATE UserAchievementStatus
                SET achieved = 0, achieved_date = NULL
                WHERE achievement_id = ? AND user_id = ?
            `);
          revokeStmt.run(achievementId, targetUserId);
        } else if ( newAchievedStatus && intToBool(statusCheck.alreadyAchieved) && !shouldUpdateAchievedDate ) {
          const ensureAchievedStmt = db.prepare(`
                UPDATE UserAchievementStatus SET achieved = 1
                WHERE achievement_id = ? AND user_id = ? AND achieved = 0 AND attendanceCount >= ?
            `);
          const minProgressForAnyLevel =
            achievementWithParsedLevels.level_config &&
            achievementWithParsedLevels.level_config.length > 0
              ? achievementWithParsedLevels.level_config.sort(
                  (a, b) => a.progressNeeded - b.progressNeeded,
                )[0].progressNeeded
              : achievement.attendanceNeed || 0;
          ensureAchievedStmt.run(
            achievementId,
            targetUserId,
            minProgressForAnyLevel,
          );
        }
      }
    } else if (action === "updateScore") {
      if (!intToBool(achievement.onScore)) {
        throw {
          status: 400,
          message: "Scoring is not enabled for this achievement.",
        };
      }
      const { score } = body;
      const scoreValue =
        typeof score === "number" && !isNaN(score) ? score : 0;
      const stmt = db.prepare(`
        INSERT INTO UserAchievementStatus (achievement_id, user_id, score, achieved, attendanceCount)
        VALUES (?, ?, ?, 0, 0)
        ON CONFLICT(achievement_id, user_id) DO UPDATE SET
          score = excluded.score;
      `);
      stmt.run(achievementId, targetUserId, scoreValue);
    }

    const finalReturnStmt = db.prepare(`
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
    const updatedReturnData = finalReturnStmt.get(targetUserId, achievementId);

    if (!updatedReturnData) {
      throw {
        status: 404,
        message: "Achievement data not found after update.",
      };
    }
    let parsedReturnLevelConfig = [];
    if (updatedReturnData.level_config) {
      try {
        parsedReturnLevelConfig = JSON.parse(updatedReturnData.level_config);
      } catch (e) {
        console.error("Error parsing level_config in PATCH return", e);
      }
    }
    const achievementWithParsedLevelsForReturn = {
      ...updatedReturnData,
      level_config: parsedReturnLevelConfig,
    };

    const userProgressForReturn = updatedReturnData.currentUserProgress ?? 0;
    const {
      currentLevel: currentLevelForReturn,
      nextLevelProgressNeeded: nextLevelProgressNeededForReturn,
      isMaxLevel: isMaxLevelForReturn,
      overrideDetails: overrideDetailsForReturn,
    } = getCurrentLevelDetails(
      achievementWithParsedLevelsForReturn,
      userProgressForReturn,
    );

    const baseAchievedForReturn = intToBool(
      updatedReturnData.currentUserAchieved_raw,
    );
    const isLeveledAchievedForReturn =
      parsedReturnLevelConfig.length > 0 && !!currentLevelForReturn;
    const currentUserAchievedForReturn =
      parsedReturnLevelConfig.length > 0
        ? isLeveledAchievedForReturn
        : baseAchievedForReturn;

    return {
      id: updatedReturnData.id,
      title: overrideDetailsForReturn.title || updatedReturnData.title,
      category: updatedReturnData.category,
      imgurl: overrideDetailsForReturn.imgurl || updatedReturnData.imgurl,
      description:
        overrideDetailsForReturn.description || updatedReturnData.description,
      achiveDescription:
        overrideDetailsForReturn.achiveDescription ||
        updatedReturnData.achiveDescription,
      silhouetteColor: updatedReturnData.silhouetteColor,
      isEnabled: intToBool(updatedReturnData.isEnabled),
      attendanceCounter: intToBool(updatedReturnData.attendanceCounter),
      attendanceNeed: nextLevelProgressNeededForReturn,
      onScore: intToBool(updatedReturnData.onScore),
      card_skin_image_url:
        overrideDetailsForReturn.card_skin_image_url ||
        updatedReturnData.card_skin_image_url,
      level_config: parsedReturnLevelConfig,
      currentUserAchieved: currentUserAchievedForReturn,
      currentUserProgress: userProgressForReturn,
      currentUserAchievedDate: currentUserAchievedForReturn
        ? updatedReturnData.currentUserAchievedDate
        : null,
      currentUserScore:
        currentUserAchievedForReturn &&
        intToBool(updatedReturnData.onScore) &&
        updatedReturnData.currentUserScore !== null
          ? updatedReturnData.currentUserScore
          : null,
      currentUserAchievedDescription: currentUserAchievedForReturn
        ? overrideDetailsForReturn.achiveDescription ||
          updatedReturnData.achiveDescription ||
          updatedReturnData.description
        : overrideDetailsForReturn.description ||
          updatedReturnData.description,
      totalAchievedCount: updatedReturnData.totalAchievedCount ?? 0,
      highestScore: updatedReturnData.highestScore,
      userHas: updatedReturnData.userHasJson
        ? JSON.parse(updatedReturnData.userHasJson).map((u) => ({
            ...u,
            achived: u.achived === true,
          }))
        : [],
      currentLevelDisplay: currentLevelForReturn,
      isMaxLevel: isMaxLevelForReturn,
    };
  });

  try {
    const result = patchTransaction();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(`PATCH /api/achievements (Action: ${action}) Error:`, error);
    const status = error.status || 500;
    const message =
      error.message || `Failed to ${action} achievement status/count/score`;
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
    stmt.run(achievementId);
    return NextResponse.json(
      { message: `Achievement ${achievementId} deleted successfully.` },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/achievements Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to delete achievement" },
      { status: 500 },
    );
  }
}
