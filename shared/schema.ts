import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ── Companies ──────────────────────────────────────────────
export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  website: text("website"),
  careersUrl: text("careers_url"),
  atsType: text("ats_type").notNull(), // 'greenhouse', 'custom_html', etc.
  atsIdentifier: text("ats_identifier"), // e.g. greenhouse board slug
  logoUrl: text("logo_url"),
  industry: text("industry"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// ── Job Postings ───────────────────────────────────────────
export const jobPostings = sqliteTable("job_postings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  externalId: text("external_id").notNull(), // ATS-specific unique ID
  title: text("title").notNull(),
  location: text("location"),
  department: text("department"),
  employmentType: text("employment_type"), // 'Intern', 'Co-op', 'Full-time', etc.
  description: text("description"), // HTML or plain text
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency"),
  url: text("url").notNull(), // direct link to the job posting
  status: text("status").notNull().default("open"), // 'open' | 'closed'
  firstSeenAt: text("first_seen_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  lastSeenAt: text("last_seen_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  closedAt: text("closed_at"),
  postedAt: text("posted_at"), // from the source if available
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({
  id: true,
});
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type JobPosting = typeof jobPostings.$inferSelect;

// ── Favorites ──────────────────────────────────────────────
export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobPostingId: integer("job_posting_id")
    .notNull()
    .references(() => jobPostings.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  notes: text("notes"),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
});
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// ── Scrape Logs ────────────────────────────────────────────
export const scrapeLogs = sqliteTable("scrape_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  startedAt: text("started_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  completedAt: text("completed_at"),
  status: text("status").notNull().default("running"), // 'running' | 'success' | 'error'
  jobsFound: integer("jobs_found").default(0),
  jobsNew: integer("jobs_new").default(0),
  jobsClosed: integer("jobs_closed").default(0),
  errorMessage: text("error_message"),
});

export type ScrapeLog = typeof scrapeLogs.$inferSelect;

// ── View types for frontend ────────────────────────────────
export type JobWithCompany = JobPosting & {
  company: Company;
  isFavorite: boolean;
  favoriteId?: number;
};
