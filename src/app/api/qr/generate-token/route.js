import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";
import db from "@/lib/db";

const QR_JWT_SECRET = process.env.QR_JWT_SECRET;
const TOKEN_EXPIRY = "1h";

export async function POST(request) {
  const { userId, sessionClaims } = getAuth(request);

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = sessionClaims?.metadata?.admin === true;
  const isCommittee = sessionClaims?.metadata?.committee === true;
  if (!isAdmin && !isCommittee) {
    return NextResponse.json(
      { message: "Forbidden: Not authorized to generate QR tokens." },
      { status: 403 },
    );
  }

  if (!QR_JWT_SECRET) {
    console.error("QR_JWT_SECRET is not defined.");
    return NextResponse.json(
      { message: "Server configuration error." },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
    if (!body.achievementId) {
      throw new Error("Missing required field: achievementId");
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid request body", error: error.message },
      { status: 400 },
    );
  }

  const { achievementId } = body;

  try {
    const achStmt = db.prepare(
      "SELECT id FROM Achievements WHERE id = ? AND isEnabled = 1",
    );
    const achievement = achStmt.get(achievementId);
    if (!achievement) {
      return NextResponse.json(
        { message: "Achievement not found or not enabled." },
        { status: 404 },
      );
    }

    const payload = {
      type: "achievement_grant",
      achievementId: achievementId,
    };

    const token = jwt.sign(payload, QR_JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });

    return NextResponse.json({ qrToken: token });
  } catch (error) {
    console.error("Error generating QR token:", error);
    return NextResponse.json(
      { message: "Failed to generate QR token." },
      { status: 500 },
    );
  }
}
