import sqlite3 from "sqlite3";
import { open } from "sqlite";

const dbPromise = open({
  filename: process.env.DB_PATH || "./pricehunter.db",
  driver: sqlite3.Database
});

export const initDb = async () => {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Lightweight migration for older databases.
  const userColumns = await db.all("PRAGMA table_info(users)");
  const hasPasswordHash = userColumns.some((column) => column.name === "password_hash");
  if (!hasPasswordHash) {
    await db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  return db;
};

export const getDb = async () => dbPromise;
