import type { Scraper, ScrapedJob } from "./types";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string };
  updated_at: string;
  first_published?: string;
  content?: string;
  metadata?: Array<{
    name: string;
    value: string | string[] | null;
    value_type: string;
  }>;
  departments?: Array<{ name: string }>;
}

function classifyEmploymentType(title: string, metadata?: GreenhouseJob["metadata"]): string | null {
  // Check metadata first
  if (metadata) {
    for (const m of metadata) {
      if (m.name.toLowerCase().includes("employment") && m.value) {
        const val = Array.isArray(m.value) ? m.value[0] : m.value;
        if (val) return val;
      }
    }
  }

  const t = title.toLowerCase();
  if (t.includes("intern") || t.includes("internship")) return "Intern";
  if (t.includes("co-op") || t.includes("coop")) return "Co-op";
  if (t.includes("new grad") || t.includes("entry level") || t.includes("junior")) return "New Grad";
  return null;
}

function extractDepartment(job: GreenhouseJob): string | null {
  if (job.departments && job.departments.length > 0) {
    return job.departments[0].name;
  }
  if (job.metadata) {
    for (const m of job.metadata) {
      if (
        m.name.toLowerCase().includes("department") ||
        m.name.toLowerCase().includes("discipline")
      ) {
        const val = Array.isArray(m.value) ? m.value[0] : m.value;
        if (val) return val;
      }
    }
  }
  return null;
}

export class GreenhouseScraper implements Scraper {
  async fetchJobs(boardSlug: string, _careersUrl: string): Promise<ScrapedJob[]> {
    const url = `https://api.greenhouse.io/v1/boards/${boardSlug}/jobs?content=true`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Greenhouse API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { jobs: GreenhouseJob[] };
    const jobs: ScrapedJob[] = [];

    for (const job of data.jobs) {
      jobs.push({
        externalId: String(job.id),
        title: job.title,
        location: job.location?.name || null,
        department: extractDepartment(job),
        employmentType: classifyEmploymentType(job.title, job.metadata),
        description: job.content || null,
        url: job.absolute_url,
        postedAt: job.first_published || job.updated_at || null,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
      });
    }

    return jobs;
  }
}
