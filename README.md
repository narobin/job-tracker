# Job Tracker

A job board aggregation system that collects and tracks job postings from multiple aerospace & defense companies. Built with SQLite, Express, React, and Drizzle ORM.

## Features

- **Multi-source scraping** — Pluggable adapter system supports Greenhouse API and Radancy-based career sites
- **Deduplication** — Jobs matched by external ID per company; re-scraping updates timestamps without creating duplicates
- **Lifecycle tracking** — Jobs automatically marked as closed when they disappear from the source board, reopened if they reappear
- **Search & filters** — Full-text search across title, company, location, and department. Filter by company, status, and employment type
- **Favorites** — Star jobs to save them for later review
- **Dark mode** — System-aware theme with manual toggle
- **CLI scraper** — Standalone script for cron-based periodic scraping

## Tracked Companies

| Company | ATS | Jobs |
|---------|-----|------|
| SpaceX | Greenhouse | ~1,600 |
| Anduril Industries | Greenhouse | ~1,700 |
| Lockheed Martin | Radancy | ~3,000 |
| L3Harris Technologies | Radancy | ~1,500 |

## Getting Started

```bash
npm install
npm run dev          # Express + Vite on port 5000
```

Then open [http://localhost:5000](http://localhost:5000).

### Initial Data Load

From the UI, go to **Companies** → **Fetch All Jobs**, or from the CLI:

```bash
npm run scrape
```

## CLI Usage

```bash
npm run scrape                                      # scrape all companies
npx tsx scripts/scrape-cli.ts --company=spacex      # scrape one company by slug
npm run scrape:stats                                # show DB stats
```

### Cron (every 6 hours)

```
0 */6 * * * cd /path/to/job-tracker && npx tsx scripts/scrape-cli.ts >> logs/scrape.log 2>&1
```

## Adding Companies

1. Add an entry to `server/seed.ts`
2. For **Greenhouse** companies: set `atsType: "greenhouse"` and `atsIdentifier` to the board slug (found at `api.greenhouse.io/v1/boards/{slug}/jobs`)
3. For **Radancy** career sites: set `atsType: "custom_html"` and add a config entry in `server/scrapers/custom-html.ts`
4. For other ATS platforms: create a new scraper class implementing the `Scraper` interface in `server/scrapers/`

## Tech Stack

- **Database**: SQLite (via better-sqlite3) with WAL mode
- **ORM**: Drizzle ORM with drizzle-zod for validation
- **Backend**: Express
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Scraping**: Native fetch + Cheerio for HTML parsing

## Project Structure

```
├── client/src/          # React frontend
│   ├── pages/           # Jobs, Favorites, Companies views
│   ├── components/ui/   # shadcn/ui components
│   └── lib/             # Query client, types, utilities
├── server/              # Express backend
│   ├── scrapers/        # ATS-specific scraper adapters
│   ├── db.ts            # SQLite initialization
│   ├── storage.ts       # Data access layer
│   ├── scrape-engine.ts # Orchestrates scraping + dedup
│   ├── routes.ts        # API endpoints
│   └── seed.ts          # Company seed data
├── shared/schema.ts     # Drizzle schema (shared types)
├── scripts/             # CLI tools
└── data/                # SQLite database (gitignored)
```
