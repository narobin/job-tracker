import { storage } from "./storage";
import { getScraper } from "./scrapers";
import type { Company } from "@shared/schema";

export async function scrapeCompany(company: Company): Promise<{
  found: number;
  newJobs: number;
  closed: number;
  error?: string;
}> {
  const scraper = getScraper(company.atsType);
  if (!scraper) {
    return { found: 0, newJobs: 0, closed: 0, error: `No scraper for ATS type: ${company.atsType}` };
  }

  const log = await storage.createScrapeLog(company.id);

  try {
    console.log(`[scrape] Starting: ${company.name} (${company.atsType})`);
    const scrapedJobs = await scraper.fetchJobs(
      company.atsIdentifier || company.slug,
      company.careersUrl || ""
    );

    console.log(`[scrape] ${company.name}: fetched ${scrapedJobs.length} jobs`);

    let newCount = 0;
    const activeExternalIds: string[] = [];

    for (const job of scrapedJobs) {
      activeExternalIds.push(job.externalId);

      const existing = await storage.getJobByExternalId(company.id, job.externalId);
      if (!existing) {
        newCount++;
      }

      await storage.upsertJobPosting({
        companyId: company.id,
        externalId: job.externalId,
        title: job.title,
        location: job.location,
        department: job.department,
        employmentType: job.employmentType,
        description: job.description,
        url: job.url,
        postedAt: job.postedAt,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        status: "open",
        firstSeenAt: new Date().toISOString().replace("T", " ").slice(0, 19),
        lastSeenAt: new Date().toISOString().replace("T", " ").slice(0, 19),
        updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
        closedAt: null,
      });
    }

    // Mark jobs that are no longer on the board as closed
    const closedCount = await storage.markJobsClosed(company.id, activeExternalIds);

    await storage.updateScrapeLog(log.id, {
      status: "success",
      completedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      jobsFound: scrapedJobs.length,
      jobsNew: newCount,
      jobsClosed: closedCount,
    });

    console.log(
      `[scrape] ${company.name}: done — ${scrapedJobs.length} found, ${newCount} new, ${closedCount} closed`
    );

    return { found: scrapedJobs.length, newJobs: newCount, closed: closedCount };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`[scrape] ${company.name}: error — ${errorMsg}`);

    await storage.updateScrapeLog(log.id, {
      status: "error",
      completedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      errorMessage: errorMsg,
    });

    return { found: 0, newJobs: 0, closed: 0, error: errorMsg };
  }
}

export async function scrapeAll(): Promise<{
  results: Array<{ company: string; found: number; newJobs: number; closed: number; error?: string }>;
}> {
  const companiesList = await storage.getCompanies();
  const enabled = companiesList.filter((c) => c.enabled);

  console.log(`[scrape] Starting full scrape of ${enabled.length} companies`);

  const results = [];
  for (const company of enabled) {
    const result = await scrapeCompany(company);
    results.push({ company: company.name, ...result });
  }

  console.log(`[scrape] Full scrape complete`);
  return { results };
}
