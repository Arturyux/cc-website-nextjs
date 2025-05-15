import { NextResponse } from "next/server";
import db from "@/lib/db";
import { z } from "zod";

export async function POST(request) {
  console.log("API POST /api/game/score: Request received (NO SERVER-SIDE AUTH CHECK).");
  if (!db) {
    console.error("API POST: Database connection is not available.");
    return NextResponse.json(
      { message: "Internal Server Error: Database unavailable" },
      { status: 500 },
    );
  }
  try {
    const body = await request.json();
    console.log("API POST: Request body parsed:", body);

    const scoreSchema = z.object({
        score: z.number().int().min(0),
        gameName: z.string().min(1),
        userId: z.string().min(1),
    });

    const validation = scoreSchema.safeParse(body);
    if (!validation.success) {
      console.warn("API POST: Validation failed:", validation.error.format());
      return NextResponse.json(
        { message: "Invalid input", errors: validation.error.issues },
        { status: 400 },
      );
    }

    const { score, gameName, userId: clientProvidedUserId } = validation.data;
    console.log("API POST: Validated data - Score:", score, "GameName:", gameName, "ClientProvidedUserId:", clientProvidedUserId);

    const stmt = db.prepare(
      "INSERT INTO GameScores (user_id, game_name, score) VALUES (?, ?, ?)",
    );
    const info = stmt.run(clientProvidedUserId, gameName, score);
    console.log("API POST: Database insert result:", info);

    if (info.changes > 0) {
      return NextResponse.json(
        { message: "Score saved successfully", id: info.lastInsertRowid },
        { status: 201 },
      );
    } else {
      console.error("API POST: Database insert failed, no changes made.");
      return NextResponse.json(
        { message: "Failed to save score to database" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("API POST: Critical error in POST handler:", error.message, error.stack);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  console.log("API GET /api/game/score (raw scores): Request received.");
  if (!db) {
    console.error("API GET: Database connection is not available.");
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

    console.log("API GET: Returning raw scores from DB:", scoresFromDb.length);
    return NextResponse.json(scoresFromDb || [], { status: 200 });

  } catch (error) {
    console.error("API GET: Critical error in GET handler:", error.message, error.stack);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 },
    );
  }
}
