import {
  type Company,
  type InsertCompany,
  type JobPosting,
  type InsertJobPosting,
  type Favorite,
  type InsertFavorite,
  type JobWithCompany,
  type ScrapeLog,
  companies,
  jobPostings,
  favorites,
  scrapeLogs,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or, desc, asc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company | undefined>;

  // Job Postings
  getJobPostings(filters: JobFilters): Promise<{ jobs: JobWithCompany[]; total: number }>;
  getJobPosting(id: number): Promise<JobWithCompany | undefined>;
  getJobByExternalId(companyId: number, externalId: string): Promise<JobPosting | undefined>;
  upsertJobPosting(job: InsertJobPosting): Promise<JobPosting>;
  markJobsClosed(companyId: number, activeExternalIds: string[]): Promise<number>;
  updateJobPosting(id: number, data: Partial<InsertJobPosting>): Promise<void>;

  // Favorites
  getFavorites(): Promise<JobWithCompany[]>;
  addFavorite(fav: InsertFavorite): Promise<Favorite>;
  removeFavorite(id: number): Promise<void>;
  updateFavoriteNotes(id: number, notes: string): Promise<void>;

  // Scrape logs
  createScrapeLog(companyId: number): Promise<ScrapeLog>;
  updateScrapeLog(id: number, data: Partial<ScrapeLog>): Promise<void>;
  getScrapeLogs(limit?: number): Promise<(ScrapeLog & { companyName: string })[]>;
}

export interface JobFilters {
  search?: string;
  companyIds?: number[];
  status?: string;
  employmentType?: string;
  location?: string;
  page?: number;
  limit?: number;
  sortBy?: "title" | "postedAt" | "company" | "location";
  sortDir?: "asc" | "desc";
  favoritesOnly?: boolean;
}

class SqliteStorage implements IStorage {
  // ── Companies ────────────────────────────────────────
  async getCompanies(): Promise<Company[]> {
    return db.select().from(companies).orderBy(asc(companies.name));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [result] = await db.select().from(companies).where(eq(companies.id, id));
    return result;
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    const [result] = await db.select().from(companies).where(eq(companies.slug, slug));
    return result;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [result] = await db.insert(companies).values(company).returning();
    return result;
  }

  async updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company | undefined> {
    const [result] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return result;
  }

  // ── Job Postings ─────────────────────────────────────
  async getJobPostings(filters: JobFilters): Promise<{ jobs: JobWithCompany[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: any[] = [];

    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          like(jobPostings.title, term),
          like(jobPostings.location, term),
          like(jobPostings.department, term),
          like(companies.name, term)
        )
      );
    }

    if (filters.companyIds && filters.companyIds.length > 0) {
      conditions.push(inArray(jobPostings.companyId, filters.companyIds));
    }

    if (filters.status) {
      conditions.push(eq(jobPostings.status, filters.status));
    }

    if (filters.employmentType) {
      conditions.push(eq(jobPostings.employmentType, filters.employmentType));
    }

    if (filters.location) {
      conditions.push(like(jobPostings.location, `%${filters.location}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    let orderClause;
    const dir = filters.sortDir === "asc" ? asc : desc;
    switch (filters.sortBy) {
      case "title":
        orderClause = dir(jobPostings.title);
        break;
      case "company":
        orderClause = dir(companies.name);
        break;
      case "location":
        orderClause = dir(jobPostings.location);
        break;
      case "postedAt":
      default:
        orderClause = desc(jobPostings.lastSeenAt);
    }

    // Count total
    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(jobPostings)
      .innerJoin(companies, eq(jobPostings.companyId, companies.id))
      .where(whereClause)
      .get();

    const total = countResult?.count || 0;

    // Get favorited job IDs
    const allFavs = await db.select().from(favorites);
    const favMap = new Map<number, number>();
    allFavs.forEach((f) => favMap.set(f.jobPostingId, f.id));

    // Fetch jobs
    let query = db
      .select()
      .from(jobPostings)
      .innerJoin(companies, eq(jobPostings.companyId, companies.id))
      .where(whereClause)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset);

    const rows = await query;

    const jobs: JobWithCompany[] = rows.map((row) => ({
      ...row.job_postings,
      company: row.companies,
      isFavorite: favMap.has(row.job_postings.id),
      favoriteId: favMap.get(row.job_postings.id),
    }));

    // If filtering by favorites only, do it post-query
    if (filters.favoritesOnly) {
      const favJobIds = new Set(allFavs.map((f) => f.jobPostingId));
      const filtered = jobs.filter((j) => favJobIds.has(j.id));
      return { jobs: filtered, total: filtered.length };
    }

    return { jobs, total };
  }

  async getJobPosting(id: number): Promise<JobWithCompany | undefined> {
    const [row] = await db
      .select()
      .from(jobPostings)
      .innerJoin(companies, eq(jobPostings.companyId, companies.id))
      .where(eq(jobPostings.id, id));

    if (!row) return undefined;

    const [fav] = await db
      .select()
      .from(favorites)
      .where(eq(favorites.jobPostingId, id));

    return {
      ...row.job_postings,
      company: row.companies,
      isFavorite: !!fav,
      favoriteId: fav?.id,
    };
  }

  async getJobByExternalId(companyId: number, externalId: string): Promise<JobPosting | undefined> {
    const [result] = await db
      .select()
      .from(jobPostings)
      .where(and(eq(jobPostings.companyId, companyId), eq(jobPostings.externalId, externalId)));
    return result;
  }

  async upsertJobPosting(job: InsertJobPosting): Promise<JobPosting> {
    const existing = await this.getJobByExternalId(job.companyId, job.externalId);

    if (existing) {
      // Update: refresh lastSeenAt, reopen if was closed
      const [updated] = await db
        .update(jobPostings)
        .set({
          title: job.title,
          location: job.location,
          department: job.department,
          employmentType: job.employmentType,
          description: job.description,
          url: job.url,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          lastSeenAt: new Date().toISOString().replace("T", " ").slice(0, 19),
          status: "open",
          closedAt: null,
          updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
        })
        .where(eq(jobPostings.id, existing.id))
        .returning();
      return updated;
    }

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const [created] = await db
      .insert(jobPostings)
      .values({
        ...job,
        firstSeenAt: now,
        lastSeenAt: now,
        updatedAt: now,
        status: "open",
      })
      .returning();
    return created;
  }

  async markJobsClosed(companyId: number, activeExternalIds: string[]): Promise<number> {
    if (activeExternalIds.length === 0) return 0;

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    // Get all open jobs for this company
    const openJobs = await db
      .select()
      .from(jobPostings)
      .where(and(eq(jobPostings.companyId, companyId), eq(jobPostings.status, "open")));

    const activeSet = new Set(activeExternalIds);
    const toClose = openJobs.filter((j) => !activeSet.has(j.externalId));

    for (const job of toClose) {
      await db
        .update(jobPostings)
        .set({ status: "closed", closedAt: now, updatedAt: now })
        .where(eq(jobPostings.id, job.id));
    }

    return toClose.length;
  }

  async updateJobPosting(id: number, data: Partial<InsertJobPosting>): Promise<void> {
    await db.update(jobPostings).set(data).where(eq(jobPostings.id, id));
  }

  // ── Favorites ────────────────────────────────────────
  async getFavorites(): Promise<JobWithCompany[]> {
    const rows = await db
      .select()
      .from(favorites)
      .innerJoin(jobPostings, eq(favorites.jobPostingId, jobPostings.id))
      .innerJoin(companies, eq(jobPostings.companyId, companies.id))
      .orderBy(desc(favorites.createdAt));

    return rows.map((row) => ({
      ...row.job_postings,
      company: row.companies,
      isFavorite: true,
      favoriteId: row.favorites.id,
    }));
  }

  async addFavorite(fav: InsertFavorite): Promise<Favorite> {
    const [result] = await db.insert(favorites).values(fav).returning();
    return result;
  }

  async removeFavorite(id: number): Promise<void> {
    await db.delete(favorites).where(eq(favorites.id, id));
  }

  async updateFavoriteNotes(id: number, notes: string): Promise<void> {
    await db.update(favorites).set({ notes }).where(eq(favorites.id, id));
  }

  // ── Scrape Logs ──────────────────────────────────────
  async createScrapeLog(companyId: number): Promise<ScrapeLog> {
    const [result] = await db
      .insert(scrapeLogs)
      .values({ companyId, status: "running" })
      .returning();
    return result;
  }

  async updateScrapeLog(id: number, data: Partial<ScrapeLog>): Promise<void> {
    await db.update(scrapeLogs).set(data).where(eq(scrapeLogs.id, id));
  }

  async getScrapeLogs(limit = 50): Promise<(ScrapeLog & { companyName: string })[]> {
    const rows = await db
      .select()
      .from(scrapeLogs)
      .innerJoin(companies, eq(scrapeLogs.companyId, companies.id))
      .orderBy(desc(scrapeLogs.startedAt))
      .limit(limit);

    return rows.map((row) => ({
      ...row.scrape_logs,
      companyName: row.companies.name,
    }));
  }
}

export const storage = new SqliteStorage();
