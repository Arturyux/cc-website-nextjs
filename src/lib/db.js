// src/lib/db.js
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "achievements.db"); // Store DB outside public

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

try {
  db = new Database(dbPath, { /* verbose: console.log */ }); // Uncomment verbose for debugging SQL
  console.log("Connected to the SQLite database.");

  // Enable WAL mode for better concurrency (optional but recommended)
  db.pragma("journal_mode = WAL");
  // Enable foreign key constraints
  db.pragma("foreign_keys = ON");

  // --- Initialize Schema if tables don't exist ---
  // You might run your schema.sql script separately once,
  // but this ensures tables exist if the DB file is new/deleted.
  const createAchievementsTable = `
    CREATE TABLE IF NOT EXISTS Achievements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT,
        imgurl TEXT,
        description TEXT,
        achiveDescription TEXT,
        silhouetteColor TEXT,
        isEnabled INTEGER NOT NULL DEFAULT 1,
        attendanceCounter INTEGER NOT NULL DEFAULT 0,
        attendanceNeed INTEGER,
        onScore INTEGER NOT NULL DEFAULT 0
    );`;

  const createUserStatusTable = `
    CREATE TABLE IF NOT EXISTS UserAchievementStatus (
        achievement_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        achieved INTEGER NOT NULL DEFAULT 0,
        attendanceCount INTEGER DEFAULT 0,
        achieved_date TEXT,
        score INTEGER,
        PRIMARY KEY (achievement_id, user_id),
        FOREIGN KEY (achievement_id) REFERENCES Achievements(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
    );`;

  // Create indexes for faster lookups
  const createIndexUserStatus = `CREATE INDEX IF NOT EXISTS idx_user_achievement ON UserAchievementStatus (user_id, achievement_id);`;
  const createIndexAchieved = `CREATE INDEX IF NOT EXISTS idx_achieved ON UserAchievementStatus (achievement_id, achieved);`;

  db.exec(createAchievementsTable);
  db.exec(createUserStatusTable);
  db.exec(createIndexUserStatus);
  db.exec(createIndexAchieved);

  console.log("Database schema checked/initialized.");
} catch (err) {
  console.error("Error connecting to or initializing SQLite database:", err);
  // Depending on your error handling strategy, you might want to exit
  // or handle this differently. For now, we log and continue,
  // but API routes using `db` will likely fail.
  db = null; // Ensure db is null if connection failed
}

// Close the database connection when the application exits
// This is important for graceful shutdowns
process.on("exit", () => {
  if (db && db.open) {
    db.close((err) => {
      if (err) {
        console.error("Error closing SQLite connection:", err.message);
      } else {
        console.log("SQLite connection closed.");
      }
    });
  }
});
process.on("SIGINT", () => process.exit()); // Handle Ctrl+C

export default db;
