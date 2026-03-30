export interface Company {
  id: number;
  name: string;
  slug: string;
  website: string | null;
  careersUrl: string | null;
  atsType: string;
  atsIdentifier: string | null;
  logoUrl: string | null;
  industry: string | null;
  enabled: boolean;
}

export interface JobPosting {
  id: number;
  companyId: number;
  externalId: string;
  title: string;
  location: string | null;
  department: string | null;
  employmentType: string | null;
  description: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  url: string;
  status: string;
  firstSeenAt: string;
  lastSeenAt: string;
  closedAt: string | null;
  postedAt: string | null;
  updatedAt: string;
}

export interface JobWithCompany extends JobPosting {
  company: Company;
  isFavorite: boolean;
  favoriteId?: number;
}

export interface JobsResponse {
  jobs: JobWithCompany[];
  total: number;
}

export interface Stats {
  totalCompanies: number;
  totalJobs: number;
  openJobs: number;
  favorites: number;
  lastScrape: string | null;
}

export interface ScrapeLog {
  id: number;
  companyId: number;
  companyName: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  jobsFound: number;
  jobsNew: number;
  jobsClosed: number;
  errorMessage: string | null;
}
