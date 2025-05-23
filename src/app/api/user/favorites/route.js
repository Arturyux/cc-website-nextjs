import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/lib/db";

const intToBool = (val) => (val === 1 ? true : false);
const boolToInt = (val) => (val === true ? 1 : 0);

const getLevelDetailsForFavoriteDisplay = (
  baseAchievement,
  userProgress,
) => {
  let displayTitle = baseAchievement.title;
  let displayImgUrl = baseAchievement.imgurl;

  if (
    baseAchievement.level_config &&
    intToBool(baseAchievement.attendanceCounter)
  ) {
    try {
      const parsedLevels = JSON.parse(baseAchievement.level_config);
      if (parsedLevels.length > 0) {
        const sortedLevels = [...parsedLevels].sort(
          (a, b) => a.progressNeeded - b.progressNeeded,
        );

        let currentLevel = null;
        for (let i = sortedLevels.length - 1; i >= 0; i--) {
          if (userProgress >= sortedLevels[i].progressNeeded) {
            currentLevel = sortedLevels[i];
            break;
          }
        }

        if (currentLevel) {
          displayTitle = currentLevel.levelTitle || baseAchievement.title;
          displayImgUrl = currentLevel.levelImgUrl || baseAchievement.imgurl;
        } else if (sortedLevels.length > 0 && userProgress < sortedLevels[0].progressNeeded) {
        }
      }
    } catch (e) {
      console.error(
        `Error parsing level_config for favorite ${baseAchievement.id}:`,
        e,
      );
    }
  }
  return { displayTitle, displayImgUrl };
};

export async function GET(request) {
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

  try {
    const stmt = db.prepare(`
      SELECT
        ufa.slot_position,
        a.id,
        a.title AS base_title,
        a.category,
        a.imgurl AS base_imgurl,
        a.description,
        a.achiveDescription,
        a.silhouetteColor,
        a.isEnabled,
        a.attendanceCounter,
        a.attendanceNeed AS base_attendanceNeed,
        a.onScore,
        a.level_config,
        uas.attendanceCount AS currentUserProgress,
        uas.achieved AS currentUserAchieved_raw
      FROM UserFavoriteAchievements ufa
      JOIN Achievements a ON ufa.achievement_id = a.id
      LEFT JOIN UserAchievementStatus uas ON ufa.achievement_id = uas.achievement_id AND uas.user_id = ?
      WHERE ufa.user_id = ?
      ORDER BY ufa.slot_position ASC
    `);
    const favoriteBadgesData = stmt.all(userId, userId);

    const favorites = favoriteBadgesData.map((fav) => {
      const { displayTitle, displayImgUrl } =
        getLevelDetailsForFavoriteDisplay(
          {
            id: fav.id,
            title: fav.base_title,
            imgurl: fav.base_imgurl,
            level_config: fav.level_config,
            attendanceCounter: fav.attendanceCounter,
          },
          fav.currentUserProgress ?? 0,
        );
      
      let isActuallyAchieved = intToBool(fav.currentUserAchieved_raw);
      if (!isActuallyAchieved && intToBool(fav.attendanceCounter) && fav.level_config) {
          try {
              const levels = JSON.parse(fav.level_config);
              if (levels.length > 0) {
                  const firstLevelNeeded = levels.sort((a,b) => a.progressNeeded - b.progressNeeded)[0].progressNeeded;
                  if ((fav.currentUserProgress ?? 0) >= firstLevelNeeded) {
                      isActuallyAchieved = true;
                  }
              }
          } catch(e) { /* ignore parsing error for this check */ }
      }


      return {
        slot_position: fav.slot_position,
        id: fav.id,
        title: displayTitle,
        category: fav.category,
        imgurl: displayImgUrl,
        description: fav.description,
        achiveDescription: fav.achiveDescription,
        silhouetteColor: fav.silhouetteColor,
        isEnabled: intToBool(fav.isEnabled),
        attendanceCounter: intToBool(fav.attendanceCounter),
        attendanceNeed: fav.base_attendanceNeed,
        onScore: intToBool(fav.onScore),
        currentUserAchieved: isActuallyAchieved,
      };
    });

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("GET /api/user/favorites Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to load favorite badges." },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
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
  try {
    body = await request.json();
    if (
      !body.achievementId ||
      !body.slotPosition ||
      ![1, 2, 3].includes(body.slotPosition)
    ) {
      throw new Error(
        "Missing or invalid fields: achievementId, slotPosition (1, 2, or 3)",
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid request body", error: error.message },
      { status: 400 },
    );
  }

  const { achievementId, slotPosition } = body;

  try {
    const transaction = db.transaction(() => {
      const achDetailsStmt = db.prepare(`
        SELECT 
          a.attendanceCounter, 
          a.level_config,
          a.attendanceNeed AS base_attendanceNeed,
          uas.achieved AS rawAchieved,
          uas.attendanceCount
        FROM Achievements a
        LEFT JOIN UserAchievementStatus uas ON a.id = uas.achievement_id AND uas.user_id = ?
        WHERE a.id = ?
      `);
      const achInfo = achDetailsStmt.get(userId, achievementId);

      if (!achInfo) {
        throw { status: 404, message: "Achievement not found." };
      }

      let isConsideredAchieved = intToBool(achInfo.rawAchieved);

      if (!isConsideredAchieved && intToBool(achInfo.attendanceCounter)) {
        if (achInfo.level_config) {
            try {
                const levels = JSON.parse(achInfo.level_config);
                if (levels.length > 0) {
                    const sortedLevels = [...levels].sort((a,b) => a.progressNeeded - b.progressNeeded);
                    if ((achInfo.attendanceCount ?? 0) >= sortedLevels[0].progressNeeded) {
                        isConsideredAchieved = true;
                    }
                }
            } catch (e) {  }
        } else if (achInfo.base_attendanceNeed && (achInfo.attendanceCount ?? 0) >= achInfo.base_attendanceNeed) {
            isConsideredAchieved = true;
        }
      } else if (!isConsideredAchieved && !intToBool(achInfo.attendanceCounter)) {
      }
      
      if (!isConsideredAchieved) {
        throw {
          status: 403,
          message: "User has not achieved this badge.",
        };
      }

      const clearOtherSlotsStmt = db.prepare(`
        DELETE FROM UserFavoriteAchievements
        WHERE user_id = ? AND achievement_id = ? AND slot_position != ?
      `);
      clearOtherSlotsStmt.run(userId, achievementId, slotPosition);

      const upsertStmt = db.prepare(`
        INSERT INTO UserFavoriteAchievements
          (user_id, achievement_id, slot_position)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, slot_position) DO UPDATE SET
          achievement_id = excluded.achievement_id
      `);
      upsertStmt.run(userId, achievementId, slotPosition);

      return { success: true };
    });

    const result = transaction();
    if (result.success) {
      return NextResponse.json(
        { message: "Favorite badge updated successfully." },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("PUT /api/user/favorites Error:", error);
    if (error.status) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { message: error.message || "Failed to update favorite badge." },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
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
  try {
    body = await request.json();
    if (!body.slotPosition || ![1, 2, 3].includes(body.slotPosition)) {
      throw new Error("Missing or invalid field: slotPosition (1, 2, or 3)");
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid request body", error: error.message },
      { status: 400 },
    );
  }

  const { slotPosition } = body;

  try {
    const stmt = db.prepare(`
      DELETE FROM UserFavoriteAchievements
      WHERE user_id = ? AND slot_position = ?
    `);
    const info = stmt.run(userId, slotPosition);

    if (info.changes > 0) {
      return NextResponse.json(
        { message: "Favorite badge removed successfully." },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        { message: "No favorite badge found in that slot to remove." },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("DELETE /api/user/favorites Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to remove favorite badge." },
      { status: 500 },
    );
  }
}
