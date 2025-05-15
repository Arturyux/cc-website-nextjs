import { NextResponse } from "next/server";
import db from "@/lib/db";
import { z } from "zod";

export async function POST(request) {
  if (!db) {
    return NextResponse.json(
      { message: "Internal Server Error: Database unavailable" },
      { status: 500 },
    );
  }
  try {
    const body = await request.json();
    const scoreSchema = z.object({
      score: z.number().int().min(0),
      gameName: z.string().min(1),
      userId: z.string().min(1),
    });

    const validation = scoreSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const { score, gameName, userId: clientProvidedUserId } = validation.data;

    const stmt = db.prepare(
      `INSERT INTO GameScores (user_id, game_name, score)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, game_name) DO UPDATE SET
       score = excluded.score,
       played_at = STRFTIME('%Y-%m-%d %H:%M:%f', 'now', 'localtime')
       WHERE excluded.score > GameScores.score;`,
    );
    const info = stmt.run(clientProvidedUserId, gameName, score);

    if (info.changes > 0) {
      return NextResponse.json(
        { message: "Score saved successfully", id: info.lastInsertRowid },
        { status: 201 },
      );
    } else {
      const existingScoreStmt = db.prepare(
        "SELECT score FROM GameScores WHERE user_id = ? AND game_name = ?",
      );
      const existingScore = existingScoreStmt.get(
        clientProvidedUserId,
        gameName,
      );
      if (existingScore && score <= existingScore.score) {
        return NextResponse.json(
          {
            message:
              "New score is not higher than the existing score. Score not updated.",
            id: null,
          },
          { status: 200 },
        );
      }
      return NextResponse.json(
        { message: "Score processed, no changes made.", id: null },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("API POST /api/game/score: Error:", error.message, error.stack);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  if (!db) {
    console.error("API GET /api/game/score: Database unavailable.");
    return NextResponse.json(
      { message: "Internal Server Error: Database unavailable" },
      { status: 500 },
    );
  }
  try {
    const { searchParams } = new URL(request.url);
    const gameNameParam = searchParams.get("gameName");
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);

    let scoresFromDb;
    if (gameNameParam) {
      const stmt = db.prepare(
        "SELECT id, user_id, score, played_at FROM GameScores WHERE game_name = ? ORDER BY score DESC, played_at DESC LIMIT ?",
      );
      scoresFromDb = stmt.all(gameNameParam, limitParam);
    } else {
      const stmt = db.prepare(
        "SELECT id, user_id, game_name, score, played_at FROM GameScores ORDER BY score DESC, played_at DESC LIMIT ?",
      );
      scoresFromDb = stmt.all(limitParam);
    }
    return NextResponse.json(scoresFromDb || [], { status: 200 });
  } catch (error) {
    console.error("API GET /api/game/score: Error:", error.message, error.stack);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {

  if (!db) {
    console.error(
      "API DELETE /api/game/score: Database connection not available.",
    );
    return NextResponse.json(
      { message: "Database unavailable" },
      { status: 500 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get("gameName");
    // console.log(
    //   "API DELETE /api/game/score: gameName from URL query parameters:",
    //   `'${gameName}'`,
    // );

    if (!gameName) {
      console.warn(
        "API DELETE /api/game/score: Missing gameName parameter in URL.",
      );
      return NextResponse.json(
        { message: "Missing gameName parameter" },
        { status: 400 },
      );
    }


    const stmt = db.prepare("DELETE FROM GameScores WHERE game_name = ?");
    const info = stmt.run(gameName);
    if (info.changes > 0) {
      return NextResponse.json(
        {
          message: `Successfully deleted ${info.changes} scores for game: ${gameName}`,
        },
        { status: 200 },
      );
    } else {

      const checkStmt = db.prepare(
        "SELECT COUNT(*) as count FROM GameScores WHERE game_name = ?",
      );
      const existing = checkStmt.get(gameName);
      // console.log(
      //   `API DELETE /api/game/score: Sanity check - Count of existing scores for game_name = '${gameName}': ${existing?.count}`,
      // );

      return NextResponse.json(
        {
          message: `No scores found for game: ${gameName} to delete. (DB changes: ${info.changes})`,
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error(
      "API DELETE /api/game/score: CRITICAL ERROR in DELETE handler:",
      error.message,
      error.stack,
    );
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 },
    );
  }
}
