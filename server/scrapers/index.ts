import type { Scraper } from "./types";
import { GreenhouseScraper } from "./greenhouse";
import { CustomHtmlScraper } from "./custom-html";

const scraperRegistry: Record<string, Scraper> = {
  greenhouse: new GreenhouseScraper(),
  custom_html: new CustomHtmlScraper(),
};

export function getScraper(atsType: string): Scraper | undefined {
  return scraperRegistry[atsType];
}

export { type ScrapedJob } from "./types";
