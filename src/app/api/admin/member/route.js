// src/app/api/admin/member/route.js
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Path to the JSON file
const dataFilePath = path.join(process.cwd(), "public/data/BoardMembers.json");

// Helper function to read members from the file
async function readMembers() {
  try {
    const jsonData = await fs.readFile(dataFilePath, "utf-8");
    return JSON.parse(jsonData);
  } catch (error) {
    // If file doesn't exist or is empty, return empty array
    if (error.code === "ENOENT") {
      return [];
    }
    console.error("Error reading members file:", error);
    throw new Error("Could not read members data.");
  }
}

// Helper function to write members to the file
async function writeMembers(members) {
  try {
    const jsonData = JSON.stringify(members, null, 2); // Pretty print JSON
    await fs.writeFile(dataFilePath, jsonData, "utf-8");
  } catch (error) {
    console.error("Error writing members file:", error);
    throw new Error("Could not save members data.");
  }
}

// GET handler - Fetch all members
export async function GET() {
  try {
    const members = await readMembers();
    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch members" },
      { status: 500 },
    );
  }
}

// POST handler - Create a new member
export async function POST(request) {
  try {
    const newMemberData = await request.json();

    // Basic validation
    if (!newMemberData.name || !newMemberData.position) {
      return NextResponse.json(
        { error: "Name and Position are required." },
        { status: 400 },
      );
    }

    const members = await readMembers();

    // Generate a simple unique ID (consider a more robust method like UUID for production)
    const newId = `m${Date.now()}`;
    const newMember = {
      id: newId,
      name: newMemberData.name,
      position: newMemberData.position,
      contact: newMemberData.contact || "", // Default empty string
      imageUrl: newMemberData.imageUrl || "", // Default empty string
      bio: newMemberData.bio || "", // Default empty string
    };

    members.push(newMember);
    await writeMembers(members);

    return NextResponse.json(newMember, { status: 201 }); // 201 Created
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create member" },
      { status: 500 },
    );
  }
}

// PUT handler - Update an existing member
export async function PUT(request) {
  try {
    const updatedMemberData = await request.json();

    // ID is required for update
    if (!updatedMemberData.id) {
      return NextResponse.json({ error: "Member ID is required." }, { status: 400 });
    }
    // Basic validation
    if (!updatedMemberData.name || !updatedMemberData.position) {
      return NextResponse.json(
        { error: "Name and Position are required." },
        { status: 400 },
      );
    }

    const members = await readMembers();
    const memberIndex = members.findIndex((m) => m.id === updatedMemberData.id);

    if (memberIndex === -1) {
      return NextResponse.json(
        { error: `Member with ID ${updatedMemberData.id} not found.` },
        { status: 404 },
      );
    }

    // Update the member data
    members[memberIndex] = {
      ...members[memberIndex], // Keep existing fields if not provided
      ...updatedMemberData, // Overwrite with new data
    };

    await writeMembers(members);

    return NextResponse.json(members[memberIndex]);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update member" },
      { status: 500 },
    );
  }
}

// DELETE handler - Delete a member
export async function DELETE(request) {
  try {
    const { searchParams } = request.nextUrl;
    const memberId = searchParams.get("id");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required." }, { status: 400 });
    }

    const members = await readMembers();
    const initialLength = members.length;
    const filteredMembers = members.filter((m) => m.id !== memberId);

    if (filteredMembers.length === initialLength) {
      return NextResponse.json(
        { error: `Member with ID ${memberId} not found.` },
        { status: 404 },
      );
    }

    await writeMembers(filteredMembers);

    return NextResponse.json({ message: `Member ${memberId} deleted successfully.` });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete member" },
      { status: 500 },
    );
  }
}
