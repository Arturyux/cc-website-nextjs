import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import path from "path";
import { promises as fs } from "fs";

const agendaFilePath = path.join(
  process.cwd(),
  "public",
  "data",
  "agendas.json",
);

const initializeClerk = () => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Server configuration error: Clerk Secret Key missing.");
  }

  return createClerkClient({ secretKey });
};

async function checkUserPermission(request, allowedRoleKeys = ["admin"]) {
  let authResult;

  try {
    authResult = getAuth(request);
    if (!authResult?.userId) {
      return {
        authorized: false,
        error: "Authentication context missing.",
        status: 401,
      };
    }
  } catch (error) {
    console.error("Agenda permission check failed while reading auth:", error);
    return {
      authorized: false,
      error: "Failed to get authentication context.",
      status: 500,
    };
  }

  try {
    const clerk = initializeClerk();
    const user = await clerk.users.getUser(authResult.userId);
    const userPublicMetadata = user?.publicMetadata || {};

    const hasPermission = allowedRoleKeys.some(
      (roleKey) => userPublicMetadata[roleKey] === true,
    );

    if (!hasPermission) {
      return {
        authorized: false,
        error: `Unauthorized. Requires ${allowedRoleKeys.join(" or ")} role.`,
        status: 403,
      };
    }

    return { authorized: true, userId: authResult.userId };
  } catch (error) {
    console.error("Agenda permission check failed while reading user:", error);
    return {
      authorized: false,
      error: "Could not verify user roles.",
      status: 500,
    };
  }
}

const agendaDocumentFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatAgendaDate = (dateValue) => {
  if (!dateValue) {
    return "Day Month, Year";
  }

  const parsedDate = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Day Month, Year";
  }

  return agendaDocumentFormatter.format(parsedDate);
};

const formatAgendaTitle = (dateValue) => `Agenda ${formatAgendaDate(dateValue)}`;

const ensureTopicList = (topics) => {
  const normalizedTopics = Array.isArray(topics)
    ? topics.map((topic) => (typeof topic === "string" ? topic : ""))
    : [];

  while (normalizedTopics.length < 3) {
    normalizedTopics.push("");
  }

  return normalizedTopics;
};

const normalizeAgenda = (agenda, index = 0) => {
  const safeAgenda =
    agenda && typeof agenda === "object" && !Array.isArray(agenda) ? agenda : {};
  const date = typeof safeAgenda.date === "string" ? safeAgenda.date : "";

  return {
    id:
      typeof safeAgenda.id === "string" && safeAgenda.id.trim()
        ? safeAgenda.id
        : `agenda-${index}`,
    date,
    title: formatAgendaTitle(date),
    present: typeof safeAgenda.present === "string" ? safeAgenda.present : "",
    chairman:
      typeof safeAgenda.chairman === "string" ? safeAgenda.chairman : "",
    secretary:
      typeof safeAgenda.secretary === "string" ? safeAgenda.secretary : "",
    minuteChecker:
      typeof safeAgenda.minuteChecker === "string"
        ? safeAgenda.minuteChecker
        : "",
    minuteValidator:
      typeof safeAgenda.minuteValidator === "string"
        ? safeAgenda.minuteValidator
        : "",
    meetingInitiation:
      typeof safeAgenda.meetingInitiation === "string"
        ? safeAgenda.meetingInitiation
        : "",
    boardMembersMeetUp:
      typeof safeAgenda.boardMembersMeetUp === "string"
        ? safeAgenda.boardMembersMeetUp
        : "",
    meetingStart:
      typeof safeAgenda.meetingStart === "string" ? safeAgenda.meetingStart : "",
    topics: ensureTopicList(safeAgenda.topics),
    meetingConcludes:
      typeof safeAgenda.meetingConcludes === "string"
        ? safeAgenda.meetingConcludes
        : "",
    nextMeetingDate:
      typeof safeAgenda.nextMeetingDate === "string"
        ? safeAgenda.nextMeetingDate
        : "",
    topicsForNextMeeting:
      typeof safeAgenda.topicsForNextMeeting === "string"
        ? safeAgenda.topicsForNextMeeting
        : "",
  };
};

const normalizeAgendas = (data) => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((agenda, index) => normalizeAgenda(agenda, index))
    .sort((left, right) => right.date.localeCompare(left.date));
};

const validateAgendas = (data) => {
  if (!Array.isArray(data)) {
    throw new Error("Invalid data format: Expected an array of agendas.");
  }

  const seenDates = new Set();

  for (const agenda of data) {
    if (
      typeof agenda.id !== "string" ||
      typeof agenda.date !== "string" ||
      typeof agenda.title !== "string"
    ) {
      throw new Error(
        "Invalid item structure: Each agenda must have id, date, and title as strings.",
      );
    }

    if (!Array.isArray(agenda.topics)) {
      throw new Error("Invalid item structure: topics must be an array.");
    }

    if (agenda.date) {
      if (seenDates.has(agenda.date)) {
        throw new Error("Invalid data format: Agenda dates must be unique.");
      }
      seenDates.add(agenda.date);
    }
  }
};

async function readAgendaFile() {
  try {
    const fileContents = await fs.readFile(agendaFilePath, "utf8");
    return normalizeAgendas(JSON.parse(fileContents));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    console.error("Error reading agendas file:", error);
    throw new Error("Failed to read agenda data.");
  }
}

async function writeAgendaFile(data) {
  const normalizedAgendas = normalizeAgendas(data);
  validateAgendas(normalizedAgendas);

  await fs.writeFile(
    agendaFilePath,
    JSON.stringify(normalizedAgendas, null, 2),
    "utf8",
  );
}

export async function GET(request) {
  const permissionCheck = await checkUserPermission(request, [
    "admin",
    "committee",
  ]);
  if (!permissionCheck.authorized) {
    return NextResponse.json(
      { error: permissionCheck.error },
      { status: permissionCheck.status },
    );
  }

  try {
    const agendas = await readAgendaFile();
    return NextResponse.json(agendas);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const permissionCheck = await checkUserPermission(request, ["admin"]);
  if (!permissionCheck.authorized) {
    return NextResponse.json(
      { error: permissionCheck.error },
      { status: permissionCheck.status },
    );
  }

  try {
    const updatedAgendas = await request.json();
    await writeAgendaFile(updatedAgendas);
    return NextResponse.json(normalizeAgendas(updatedAgendas));
  } catch (error) {
    const status = error.message.startsWith("Invalid data format") ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
