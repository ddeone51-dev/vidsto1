/**
 * Database Migration Script
 * Run this to ensure database schema is up to date
 * Usage: node scripts/migrate.js
 */

import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, "..", "data", "vidsto.db");

// Ensure data directory exists
const dataDir = join(__dirname, "..", "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log("Created data directory");
}

const db = new Database(dbPath);

console.log("Running database migrations...");

// Check if audio_generations table exists, create if not
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audio_generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      duration_minutes REAL NOT NULL,
      credits_used INTEGER NOT NULL,
      narration_text TEXT,
      voice_id TEXT,
      language TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_audio_generations_user_id ON audio_generations(user_id);
  `);
  console.log("✓ Audio generations table created/verified");
} catch (error) {
  console.error("Error creating audio_generations table:", error.message);
}

// Verify all required tables exist
const requiredTables = [
  "users",
  "plans",
  "user_plans",
  "credit_transactions",
  "payments",
  "user_videos",
  "featured_videos",
  "audio_generations"
];

console.log("\nVerifying database schema...");
for (const table of requiredTables) {
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name=?
  `).get(table);
  
  if (tableExists) {
    console.log(`✓ Table '${table}' exists`);
  } else {
    console.warn(`⚠ Table '${table}' is missing`);
  }
}

db.close();
console.log("\n✓ Database migration completed");



