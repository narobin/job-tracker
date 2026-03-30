import * as cheerio from "cheerio";
import type { Scraper, ScrapedJob } from "./types";

/**
 * Generic HTML scraper for sites like L3Harris and Lockheed Martin
 * that use the TMP Worldwide / Radancy job search platform.
 * These sites return JSON with HTML fragments from an AJAX endpoint.
 */

interface RadancyConfig {
  baseUrl: string;
  ajaxPath: string;
  recordsPerPage: number;
  keywords?: string;
  maxPages: number;
}

const SITE_CONFIGS: Record<string, RadancyConfig> = {
  l3harris: {
    baseUrl: "https://careers.l3harris.com",
    ajaxPath: "/en/search-jobs/results",
    recordsPerPage: 100,
    keywords: "",
    maxPages: 50,
  },
  lockheedmartin: {
    baseUrl: "https://www.lockheedmartinjobs.com",
    ajaxPath: "/search-jobs/results",
    recordsPerPage: 100,
    keywords: "",
    maxPages: 100,
  },
};

function classifyEmploymentType(title: string, category?: string): string | null {
  const combined = `${title} ${category || ""}`.toLowerCase();
  if (combined.includes("intern") || combined.includes("internship")) return "Intern";
  if (combined.includes("co-op") || combined.includes("co op") || combined.includes("coop")) return "Co-op";
  if (combined.includes("new grad")) return "New Grad";
  return null;
}

export class CustomHtmlScraper implements Scraper {
  async fetchJobs(atsIdentifier: string, careersUrl: string): Promise<ScrapedJob[]> {
    const config = SITE_CONFIGS[atsIdentifier];
    if (!config) {
      throw new Error(`No config found for custom HTML site: ${atsIdentifier}`);
    }

    const allJobs: ScrapedJob[] = [];
    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages && currentPage <= config.maxPages) {
      const params = new URLSearchParams({
        ActiveFacetID: "0",
        CurrentPage: String(currentPage),
        RecordsPerPage: String(config.recordsPerPage),
        Distance: "50",
        RadiusUnitType: "0",
        Keywords: config.keywords || "",
        Location: "",
        ShowRadius: "False",
        IsPagination: currentPage > 1 ? "True" : "False",
        CustomFacetName: "",
        FacetTerm: "",
        FacetType: "0",
        SearchResultsModuleName: "Search Results",
        SearchFiltersModuleName: "Search Filters",
        SortCriteria: "0",
        SortDirection: "0",
        SearchType: "5",
        PostalCode: "",
        ResultsType: "0",
        fc: "",
        fl: "",
        fcf: "",
        aession: "a",
      });

      const url = `${config.baseUrl}${config.ajaxPath}?${params}`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
      }

      const data = (await response.json()) as {
        results: string;
        filters: string;
        hasJobs: boolean;
      };

      if (!data.hasJobs) break;

      // Parse total pages from the results HTML
      const $ = cheerio.load(data.results);
      if (currentPage === 1) {
        const totalStr = $("[data-total-pages]").attr("data-total-pages");
        if (totalStr) {
          totalPages = parseInt(totalStr, 10);
        }
      }

      // Extract jobs from <li> elements
      $("ul li a[data-job-id]").each((_i, el) => {
        const $a = $(el);
        const jobId = $a.attr("data-job-id") || "";
        const href = $a.attr("href") || "";
        const title =
          $a.find(".job-title").text().trim() ||
          $a.find("h2").text().trim();
        const location =
          $a.find(".job-location").text().trim() ||
          $a.find(".job-location.test3").text().trim();
        const category =
          $a.find(".job-category").text().trim() ||
          $a.find(".results-facet.job-category").text().trim();
        const datePosted = $a.find(".job-date-posted").text().replace("Date Posted:", "").trim();

        if (jobId && title) {
          allJobs.push({
            externalId: jobId,
            title,
            location: location || null,
            department: category ? category.split("|")[0].trim() : null,
            employmentType: classifyEmploymentType(title, category),
            description: null, // Would require fetching individual pages
            url: href.startsWith("http") ? href : `${config.baseUrl}${href}`,
            postedAt: datePosted || null,
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: null,
          });
        }
      });

      currentPage++;

      // Rate limiting: small delay between pages
      if (currentPage <= totalPages) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return allJobs;
  }
}
