import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";

const DB_DIR = path.resolve(process.cwd(), "data");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, "jobs.db");
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrent read/write performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Initialize tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    website TEXT,
    careers_url TEXT,
    ats_type TEXT NOT NULL,
    ats_identifier TEXT,
    logo_url TEXT,
    industry TEXT,
    enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS job_postings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT,
    department TEXT,
    employment_type TEXT,
    description TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency TEXT,
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at TEXT,
    posted_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(company_id, external_id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_posting_id INTEGER NOT NULL REFERENCES job_postings(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS scrape_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    jobs_found INTEGER DEFAULT 0,
    jobs_new INTEGER DEFAULT 0,
    jobs_closed INTEGER DEFAULT 0,
    error_message TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_job_postings_company ON job_postings(company_id);
  CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
  CREATE INDEX IF NOT EXISTS idx_job_postings_type ON job_postings(employment_type);
  CREATE INDEX IF NOT EXISTS idx_job_postings_title ON job_postings(title);
  CREATE INDEX IF NOT EXISTS idx_favorites_job ON favorites(job_posting_id);
`);

export default db;
