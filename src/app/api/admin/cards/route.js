// src/app/api/admin/cards/route.js
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import path from 'path';
import { promises as fs } from 'fs';

// --- Initialization and Auth (Similar to users route) ---

const initializeClerk = () => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("Server configuration error: Clerk Secret Key missing.");
  try {
    return createClerkClient({ secretKey });
  } catch (error) {
    console.error("Failed to initialize Clerk SDK:", error);
    throw new Error("Failed to initialize Clerk SDK.");
  }
};

async function verifyAdmin(request) {
  let authResult;
  try {
    authResult = getAuth(request);
    if (!authResult || !authResult.userId) return { authorized: false, error: "Authentication context missing.", status: 401 };
  } catch (error) {
    return { authorized: false, error: "Failed to get authentication context.", status: 500 };
  }

  const { userId } = authResult;
  let isAdmin = false;
  try {
    const clerk = initializeClerk();
    const user = await clerk.users.getUser(userId);
    isAdmin = user?.publicMetadata?.admin === true;
  } catch (error) {
    console.error(`verifyAdmin (Cards): Error fetching user ${userId}:`, error);
    return { authorized: false, error: "Could not verify admin status.", status: 500 };
  }

  if (!isAdmin) {
    return { authorized: false, error: "Unauthorized access.", status: 403 };
  }
  return { authorized: true, userId };
}

// --- JSON File Handling ---
const jsonFilePath = path.join(process.cwd(), 'public', 'data', 'cards.json');

async function readCardsFile() {
  try {
    const fileContents = await fs.readFile(jsonFilePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error("Error reading cards file:", error);
    // If file doesn't exist, maybe return empty array? Or throw specific error.
    if (error.code === 'ENOENT') return [];
    throw new Error("Failed to read card data.");
  }
}

async function writeCardsFile(data) {
  try {
    await fs.writeFile(jsonFilePath, JSON.stringify(data, null, 2), 'utf8'); // Pretty print JSON
  } catch (error) {
    console.error("Error writing cards file:", error);
    throw new Error("Failed to save card data.");
  }
}

// --- Route Handlers ---

// GET: Fetch all cards
export async function GET(request) {
  // Optional: Add admin check if you want this specific endpoint protected
  // const adminCheck = await verifyAdmin(request);
  // if (!adminCheck.authorized) {
  //   return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  // }
  try {
    const cards = await readCardsFile();
    return NextResponse.json(cards);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new card
export async function POST(request) {
  const adminCheck = await verifyAdmin(request);
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  try {
    const newCardData = await request.json();
    // Basic validation (add more as needed)
    if (!newCardData.title || !newCardData.date || !newCardData.time || !newCardData.location) {
      return NextResponse.json({ error: "Missing required card fields." }, { status: 400 });
    }

    const cards = await readCardsFile();
    const newCard = {
      ...newCardData,
      id: Date.now(), // Simple ID generation (consider UUID for production)
      // Ensure default bgColor if not provided
      bgColor: newCardData.bgColor || 'bg-gray-200',
    };
    cards.push(newCard);
    await writeCardsFile(cards);
    return NextResponse.json(newCard, { status: 201 }); // Return created card
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing card
export async function PUT(request) {
  const adminCheck = await verifyAdmin(request);
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  try {
    const updatedCardData = await request.json();
    if (!updatedCardData.id) {
      return NextResponse.json({ error: "Card ID is required for update." }, { status: 400 });
    }

    const cards = await readCardsFile();
    const cardIndex = cards.findIndex(card => card.id === updatedCardData.id);

    if (cardIndex === -1) {
      return NextResponse.json({ error: `Card with ID ${updatedCardData.id} not found.` }, { status: 404 });
    }

    // Merge existing data with updates
    cards[cardIndex] = { ...cards[cardIndex], ...updatedCardData };
    await writeCardsFile(cards);
    return NextResponse.json(cards[cardIndex]); // Return updated card
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a card
export async function DELETE(request) {
  const adminCheck = await verifyAdmin(request);
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  try {
    // Get ID from query parameters for DELETE: e.g., /api/admin/cards?id=123
    const { searchParams } = new URL(request.url);
    const cardIdParam = searchParams.get('id');

    if (!cardIdParam) {
        return NextResponse.json({ error: "Card ID is required for deletion." }, { status: 400 });
    }
    // Convert ID to number if necessary (depends on how IDs are stored/generated)
    const cardId = parseInt(cardIdParam, 10);
     if (isNaN(cardId)) {
         return NextResponse.json({ error: "Invalid Card ID format." }, { status: 400 });
     }


    const cards = await readCardsFile();
    const initialLength = cards.length;
    const filteredCards = cards.filter(card => card.id !== cardId);

    if (filteredCards.length === initialLength) {
      return NextResponse.json({ error: `Card with ID ${cardId} not found.` }, { status: 404 });
    }

    await writeCardsFile(filteredCards);
    return NextResponse.json({ success: true, message: `Card ${cardId} deleted.` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
