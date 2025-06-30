import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';

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
  static readonly DEV_CENTER_ROOT = 'https://devcenter.heroku.com/';
  static readonly CACHE_FILE = process.env.DEV_CENTER_CACHE_FILE || '/tmp/llms.txt';

  /**
   * Triggers a crawl in the background. Does not block.
   */
  public crawlInBackground(): void {
    this.triggerCrawl().catch((err) => {
      console.log(`[DevCenterCrawler] Crawl failed: ${(err as Error)?.message || err}\n`);
    });
  }

  /**
   * Triggers a crawl and persists results to the cache file.
   * Returns a summary string of the crawl.
   */
  public async triggerCrawl(): Promise<string> {
    //console.log(`[DevCenterCrawler] Starting crawl...\n`);
    const summary = await this.crawlDevCenter();
    //console.log(`[DevCenterCrawler] Crawl completed. Summary length: ${summary.length} characters\n`);

    // Save only the article summaries (without stats) to file for resource access
    const articleSummaries = summary.replace(/\n\n---\nCrawl Summary:.*$/, '');
    await this.saveCache(articleSummaries);
    return summary;
  }

  /**
   * Loads the cached crawl data from the file.
   */
  public async loadCache(): Promise<string> {
    try {
      const content = await fs.readFile(DevCenterCrawlerService.CACHE_FILE, 'utf8');
      //console.log(`[DevCenterCrawler] Loaded cache file: ${DevCenterCrawlerService.CACHE_FILE} (${content.length} characters)\n`);
      return content;
    } catch (err) {
      //console.log(`[DevCenterCrawler] Failed to load cache: ${(err as Error)?.message || err}\n`);
      return '';
    }
  }

  /**
   * Saves the crawl summary to the cache file.
   */
  protected async saveCache(data: string): Promise<void> {
    try {
      //console.log(`[DevCenterCrawler] Saving cache to: ${DevCenterCrawlerService.CACHE_FILE}\n`);
      //console.log(`[DevCenterCrawler] Data to save: ${data.length} characters\n`);
      await fs.writeFile(DevCenterCrawlerService.CACHE_FILE, data, 'utf8');
      //console.log(`[DevCenterCrawler] Cache saved successfully\n`);
    } catch (err) {
      //console.log(`[DevCenterCrawler] Failed to save cache: ${(err as Error)?.message || err}\n`);
    }
  }

  /**
   * Crawls the Dev Center root and a limited set of linked articles, returning a summary.
   * This is optimized for speed and minimal load.
   */
  protected async crawlDevCenter(): Promise<string> {
    const rootHtml = await this.fetchHtml(DevCenterCrawlerService.DEV_CENTER_ROOT);
    const $ = cheerio.load(rootHtml);
    const articles: { title: string; url: string }[] = [];

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
    let successCount = 0;
    let errorCount = 0;

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
            //console.log(`[DevCenterCrawler] Using content selector: ${selector} for ${article.title}\n`);
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
          //console.log(`[DevCenterCrawler] Using fallback paragraph extraction for ${article.title}\n`);
        }

        if (heading && firstPara) {
          summaries.push(`# ${heading}\n${firstPara}\nURL: ${article.url}\n`);
          successCount++;
        } else {
          //console.log(`[DevCenterCrawler] Article has no content: ${article.url}\n`);
          errorCount++;
        }
      } catch (err) {
        const errorMsg = (err as Error)?.message || String(err);
        //console.log(`[DevCenterCrawler] Failed to fetch article "${article.title}": ${article.url} - ${errorMsg}\n`);
        errorCount++;
      }
    }

    // Add summary statistics
    const summary = summaries.join('\n---\n');

    return summary;
  }

  /**
   * Fetches HTML from a URL.
   */
  protected async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, { headers: { 'User-Agent': 'Heroku-MCP-DevCenterCrawler/1.0' } });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    return await res.text();
  }
}
