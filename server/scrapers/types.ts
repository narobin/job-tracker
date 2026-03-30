export interface ScrapedJob {
  externalId: string;
  title: string;
  location: string | null;
  department: string | null;
  employmentType: string | null;
  description: string | null;
  url: string;
  postedAt: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
}

export interface Scraper {
  fetchJobs(atsIdentifier: string, careersUrl: string): Promise<ScrapedJob[]>;
}
