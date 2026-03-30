#!/usr/bin/env tsx
/**
 * CLI script for periodic job board scraping.
 *
 * Usage:
 *   npx tsx scripts/scrape-cli.ts              # Scrape all enabled companies
 *   npx tsx scripts/scrape-cli.ts --company=spacex  # Scrape a single company by slug
 *   npx tsx scripts/scrape-cli.ts --stats       # Show current stats
 *
 * Cron example (every 6 hours):
 *   0 */6 * * * cd /path/to/job-board && npx tsx scripts/scrape-cli.ts >> logs/scrape.log 2>&1
 */

import "../server/db"; // Initialize DB
import { storage } from "../server/storage";
import { scrapeAll, scrapeCompany } from "../server/scrape-engine";
import { seedCompanies } from "../server/seed";

async function main() {
  const args = process.argv.slice(2);
  const timestamp = new Date().toISOString();

  // Ensure companies are seeded
  await seedCompanies();

  if (args.includes("--stats")) {
    const companiesList = await storage.getCompanies();
    const { total: allJobs } = await storage.getJobPostings({ limit: 1 });
    const { total: openJobs } = await storage.getJobPostings({ status: "open", limit: 1 });
    const logs = await storage.getScrapeLogs(4);

    console.log(`\n=== Job Tracker Stats (${timestamp}) ===`);
    console.log(`Companies: ${companiesList.length}`);
    console.log(`Total jobs: ${allJobs}`);
    console.log(`Open jobs:  ${openJobs}`);
    console.log(`Closed:     ${allJobs - openJobs}`);
    console.log(`\nRecent scrape logs:`);
    for (const log of logs) {
      console.log(
        `  ${log.companyName}: ${log.status} — ${log.jobsFound} found, ${log.jobsNew} new, ${log.jobsClosed} closed (${log.completedAt || "running"})`
      );
    }
    process.exit(0);
  }

  const companyArg = args.find((a) => a.startsWith("--company="));

  if (companyArg) {
    const slug = companyArg.split("=")[1];
    const company = await storage.getCompanyBySlug(slug);
    if (!company) {
      console.error(`[${timestamp}] Company not found: ${slug}`);
      const all = await storage.getCompanies();
      console.error(`Available slugs: ${all.map((c) => c.slug).join(", ")}`);
      process.exit(1);
    }
    console.log(`[${timestamp}] Scraping: ${company.name}`);
    const result = await scrapeCompany(company);
    console.log(
      `[${timestamp}] ${company.name}: ${result.found} found, ${result.newJobs} new, ${result.closed} closed${result.error ? ` (ERROR: ${result.error})` : ""}`
    );
  } else {
    console.log(`[${timestamp}] Starting full scrape...`);
    const { results } = await scrapeAll();
    console.log(`\n[${timestamp}] === Scrape Summary ===`);
    for (const r of results) {
      console.log(
        `  ${r.company}: ${r.found} found, ${r.newJobs} new, ${r.closed} closed${r.error ? ` (ERROR: ${r.error})` : ""}`
      );
    }
    const totalNew = results.reduce((s, r) => s + r.newJobs, 0);
    const totalClosed = results.reduce((s, r) => s + r.closed, 0);
    console.log(`\n  Total new: ${totalNew}, Total closed: ${totalClosed}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
