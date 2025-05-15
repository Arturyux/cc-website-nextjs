import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/lib/db";

const intToBool = (val) => (val === 1 ? true : false);

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
        a.title,
        a.category,
        a.imgurl,
        a.description,
        a.achiveDescription,
        a.silhouetteColor,
        a.isEnabled,
        a.attendanceCounter,
        a.attendanceNeed,
        a.onScore
      FROM UserFavoriteAchievements ufa
      JOIN Achievements a ON ufa.achievement_id = a.id
      WHERE ufa.user_id = ?
      ORDER BY ufa.slot_position ASC
    `);
    const favoriteBadgesData = stmt.all(userId);

    const favorites = favoriteBadgesData.map((fav) => ({
      slot_position: fav.slot_position,
      id: fav.id,
      title: fav.title,
      category: fav.category,
      imgurl: fav.imgurl,
      description: fav.description,
      achiveDescription: fav.achiveDescription,
      silhouetteColor: fav.silhouetteColor,
      isEnabled: intToBool(fav.isEnabled),
      attendanceCounter: intToBool(fav.attendanceCounter),
      attendanceNeed: fav.attendanceNeed,
      onScore: intToBool(fav.onScore),
      currentUserAchieved: true,
    }));

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
      const checkAchievedStmt = db.prepare(`
        SELECT achieved FROM UserAchievementStatus
        WHERE user_id = ? AND achievement_id = ? AND achieved = 1
      `);
      const userHasAchieved = checkAchievedStmt.get(userId, achievementId);

      if (!userHasAchieved) {
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
        INSERT OR REPLACE INTO UserFavoriteAchievements
          (user_id, achievement_id, slot_position)
        VALUES (?, ?, ?)
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
      return NextResponse.json({ message: error.message }, { status: error.status });
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
