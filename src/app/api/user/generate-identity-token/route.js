// src/app/api/user/generate-identity-token/route.js
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";

const QR_JWT_SECRET = process.env.QR_JWT_SECRET;
const USER_TOKEN_EXPIRY = "24h"; 

export async function GET(request) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!QR_JWT_SECRET) {
    console.error(
      "QR_JWT_SECRET is not defined for user identity token generation.",
    );
    return NextResponse.json(
      { message: "Server configuration error." },
      { status: 500 },
    );
  }

  try {
    const payload = {
      type: "user_identity",
      userId: userId,
    };

    const token = jwt.sign(payload, QR_JWT_SECRET, {
      expiresIn: USER_TOKEN_EXPIRY,
    });

    return NextResponse.json({ userQrToken: token });
  } catch (error) {
    console.error("Error generating user identity QR token:", error);
    return NextResponse.json(
      { message: "Failed to generate user identity QR token." },
      { status: 500 },
    );
  }
}
