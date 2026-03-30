import { db } from "./db";
import { companies } from "@shared/schema";

const SEED_COMPANIES = [
  {
    name: "SpaceX",
    slug: "spacex",
    website: "https://www.spacex.com",
    careersUrl: "https://www.spacex.com/careers",
    atsType: "greenhouse",
    atsIdentifier: "spacex",
    industry: "Aerospace & Defense",
    enabled: true,
  },
  {
    name: "L3Harris Technologies",
    slug: "l3harris",
    website: "https://www.l3harris.com",
    careersUrl: "https://careers.l3harris.com",
    atsType: "custom_html",
    atsIdentifier: "l3harris",
    industry: "Aerospace & Defense",
    enabled: true,
  },
  {
    name: "Lockheed Martin",
    slug: "lockheedmartin",
    website: "https://www.lockheedmartin.com",
    careersUrl: "https://www.lockheedmartinjobs.com",
    atsType: "custom_html",
    atsIdentifier: "lockheedmartin",
    industry: "Aerospace & Defense",
    enabled: true,
  },
  {
    name: "Anduril Industries",
    slug: "anduril",
    website: "https://www.anduril.com",
    careersUrl: "https://www.anduril.com/careers",
    atsType: "greenhouse",
    atsIdentifier: "andurilindustries",
    industry: "Defense Technology",
    enabled: true,
  },
];

export async function seedCompanies() {
  for (const company of SEED_COMPANIES) {
    try {
      await db
        .insert(companies)
        .values(company)
        .onConflictDoUpdate({
          target: companies.slug,
          set: {
            name: company.name,
            website: company.website,
            careersUrl: company.careersUrl,
            atsType: company.atsType,
            atsIdentifier: company.atsIdentifier,
            industry: company.industry,
          },
        });
      console.log(`[seed] Upserted company: ${company.name}`);
    } catch (err) {
      console.error(`[seed] Error upserting ${company.name}:`, err);
    }
  }
}
