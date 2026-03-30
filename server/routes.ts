import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapeAll, scrapeCompany } from "./scrape-engine";
import { seedCompanies } from "./seed";
import { insertFavoriteSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed companies on startup
  await seedCompanies();

  // ── Companies ────────────────────────────────────────
  app.get("/api/companies", async (_req, res) => {
    const list = await storage.getCompanies();
    res.json(list);
  });

  app.get("/api/companies/:id", async (req, res) => {
    const company = await storage.getCompany(Number(req.params.id));
    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json(company);
  });

  // ── Job Postings ─────────────────────────────────────
  app.get("/api/jobs", async (req, res) => {
    const filters = {
      search: req.query.search as string | undefined,
      companyIds: req.query.companyIds
        ? String(req.query.companyIds)
            .split(",")
            .map(Number)
            .filter((n) => !isNaN(n))
        : undefined,
      status: req.query.status as string | undefined,
      employmentType: req.query.employmentType as string | undefined,
      location: req.query.location as string | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Math.min(Number(req.query.limit), 100) : 25,
      sortBy: (req.query.sortBy as any) || "postedAt",
      sortDir: (req.query.sortDir as any) || "desc",
      favoritesOnly: req.query.favoritesOnly === "true",
    };

    const result = await storage.getJobPostings(filters);
    res.json(result);
  });

  app.get("/api/jobs/:id", async (req, res) => {
    const job = await storage.getJobPosting(Number(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  // ── Favorites ────────────────────────────────────────
  app.get("/api/favorites", async (_req, res) => {
    const favs = await storage.getFavorites();
    res.json(favs);
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const data = insertFavoriteSchema.parse(req.body);
      const fav = await storage.addFavorite(data);
      res.json(fav);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/favorites/:id", async (req, res) => {
    await storage.removeFavorite(Number(req.params.id));
    res.json({ ok: true });
  });

  app.patch("/api/favorites/:id/notes", async (req, res) => {
    const { notes } = req.body;
    if (typeof notes !== "string") return res.status(400).json({ error: "notes must be a string" });
    await storage.updateFavoriteNotes(Number(req.params.id), notes);
    res.json({ ok: true });
  });

  // ── Scraping ─────────────────────────────────────────
  app.post("/api/scrape", async (_req, res) => {
    // Run scrape in background, return immediately
    res.json({ status: "started", message: "Scrape started for all companies" });
    try {
      await scrapeAll();
    } catch (err) {
      console.error("[scrape] Error in background scrape:", err);
    }
  });

  app.post("/api/scrape/:companyId", async (req, res) => {
    const company = await storage.getCompany(Number(req.params.companyId));
    if (!company) return res.status(404).json({ error: "Company not found" });

    res.json({ status: "started", message: `Scrape started for ${company.name}` });
    try {
      await scrapeCompany(company);
    } catch (err) {
      console.error(`[scrape] Error scraping ${company.name}:`, err);
    }
  });

  app.get("/api/scrape/logs", async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const logs = await storage.getScrapeLogs(limit);
    res.json(logs);
  });

  // ── Stats ────────────────────────────────────────────
  app.get("/api/stats", async (_req, res) => {
    const companiesList = await storage.getCompanies();
    const allJobs = await storage.getJobPostings({ limit: 1 });
    const openJobs = await storage.getJobPostings({ status: "open", limit: 1 });
    const favs = await storage.getFavorites();
    const logs = await storage.getScrapeLogs(1);

    res.json({
      totalCompanies: companiesList.length,
      totalJobs: allJobs.total,
      openJobs: openJobs.total,
      favorites: favs.length,
      lastScrape: logs[0]?.completedAt || null,
    });
  });

  return httpServer;
}
