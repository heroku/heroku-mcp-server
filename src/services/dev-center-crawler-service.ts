import { promises as fs } from 'node:fs';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Service for crawling the Heroku Dev Center and caching results to a file.
 * Crawling is always background-only and never blocks server startup.
 * Results are persisted to /tmp/llms.txt for resource exposure.
 *
 * Usage:
 *   const crawler = new DevCenterCrawlerService();
 *   crawler.crawlInBackground(); // on startup
 *   await crawler.triggerCrawl(); // manual/automated refresh
 *   const data = await crawler.loadCache();
 */
export class DevCenterCrawlerService {
  public static readonly DEV_CENTER_ROOT = 'https://devcenter.heroku.com/';
  public static readonly CACHE_FILE = process.env.DEV_CENTER_CACHE_FILE ?? '/tmp/llms.txt';

  /**
   * Triggers a crawl in the background. Does not block.
   */
  public crawlInBackground(): void {
    this.triggerCrawl().catch((err) => {
      process.stderr.write(`[DevCenterCrawler] Crawl failed: ${(err as Error)?.message || err}\n`);
    });
  }

  /**
   * Triggers a crawl and persists results to the cache file.
   *
   * @returns A summary string of the crawl.
   */
  public async triggerCrawl(): Promise<string> {
    const summary = await this.crawlDevCenter();

    // Save only the article summaries (without stats) to file for resource access
    const articleSummaries = summary.replace(/\n\n---\nCrawl Summary:.*$/, '');
    await this.saveCache(articleSummaries);
    return summary;
  }

  /**
   * Loads the cached crawl data from the file.
   *
   * @returns The cached crawl data as a string, or an empty string if not found.
   */
  public async loadCache(): Promise<string> {
    try {
      const content = await fs.readFile(DevCenterCrawlerService.CACHE_FILE, 'utf8');
      return content;
    } catch {
      return '';
    }
  }

  /**
   * Saves the crawl summary to the cache file.
   *
   * @param data - The data to save to the cache.
   * @returns Resolves when the cache is saved.
   */
  protected async saveCache(data: string): Promise<void> {
    try {
      await fs.writeFile(DevCenterCrawlerService.CACHE_FILE, data, 'utf8');
    } catch (err) {
      process.stderr.write(`[DevCenterCrawler] Error saving cache: ${String(err)}\n`);
    }
  }

  /**
   * Crawls the Dev Center root and a limited set of linked articles, returning a summary.
   *
   * @returns The summary of crawled articles.
   */
  protected async crawlDevCenter(): Promise<string> {
    const rootHtml = await this.fetchHtml(DevCenterCrawlerService.DEV_CENTER_ROOT);
    const $ = cheerio.load(rootHtml);
    const articles: Array<{ title: string; url: string }> = [];

    // Find main article links (limit to 20 for speed)
    $('a[href^="/articles/"]')
      .slice(0, 20)
      .each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        if (href && title && title.length > 0) {
          articles.push({ title, url: new URL(href, DevCenterCrawlerService.DEV_CENTER_ROOT).toString() });
        }
      });

    if (articles.length === 0) {
      return '[No articles found on Dev Center homepage. The site structure may have changed.]';
    }

    // Fetch and summarize each article (limit to 20)
    const summaries: string[] = [];

    for (const article of articles) {
      try {
        // Add a small delay to be respectful to the server
        if (summaries.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const html = await this.fetchHtml(article.url);
        const $a = cheerio.load(html);

        // Extract content using multiple possible Dev Center selectors
        const heading = $a('h1').first().text().trim() || article.title;

        // Try different content container selectors in order of preference
        const contentSelectors = [
          '.col-md-8.content',
          'div.container',
          '.content',
          '.article-content',
          'main',
          'article'
        ];

        let firstPara = '';
        let contentContainer = null;

        // Find the first available content container
        for (const selector of contentSelectors) {
          contentContainer = $a(selector);
          if (contentContainer.length > 0) {
            break;
          }
        }

        if (contentContainer && contentContainer.length > 0) {
          // Get all paragraphs from within the content container
          const paragraphs = contentContainer
            .find('p')
            .map((_, el) => $a(el).text().trim())
            .get();
          // Filter out empty paragraphs and join all content
          const validParagraphs = paragraphs.filter((p) => p.length > 0);
          firstPara = validParagraphs.join('\n\n');
        } else {
          // Fallback: try to find paragraphs anywhere on the page
          const paragraphs = $a('p')
            .map((_, el) => $a(el).text().trim())
            .get();
          const validParagraphs = paragraphs.filter((p) => p.length > 0);
          firstPara = validParagraphs.join('\n\n');
        }

        if (heading && firstPara) {
          summaries.push(`# ${heading}\n${firstPara}\nURL: ${article.url}\n`);
        }
      } catch (err) {
        process.stderr.write(`[DevCenterCrawler] Error: ${String(err)}\n`);
      }
    }

    // Add summary statistics
    const summary = summaries.join('\n---\n');

    return summary;
  }

  /**
   * Fetches HTML from a URL.
   *
   * @param url - The URL to fetch.
   * @returns The HTML content as a string.
   */
  protected async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, { headers: { 'User-Agent': 'Heroku-MCP-DevCenterCrawler/1.0' } });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    return res.text();
  }
}
