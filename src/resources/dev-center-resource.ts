import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DevCenterCrawlerService } from '../services/dev-center-crawler-service.js';

/**
 * Registers the Heroku Dev Center resource with the MCP server.
 * Exposes the /tmp/llms.txt file as a text resource, handling missing file gracefully.
 *
 * @param server - The MCP server instance
 */
export function registerDevCenterResource(server: McpServer): void {
  const DEV_CENTER_RESOURCE_URI = process.env.DEV_CENTER_RESOURCE_URI || 'file:///tmp/llms.txt';
  const devCenterCrawler = new DevCenterCrawlerService();

  server.resource(
    'heroku_dev_center',
    DEV_CENTER_RESOURCE_URI,
    {
      mimeType: 'text/plain',
      description: 'This resource provides a summary of Heroku Dev Center articles, and how to use Heroku.'
    },
    async () => {
      let text = '';
      try {
        text = await devCenterCrawler.loadCache();
        if (!text) {
          text =
            '[No Dev Center crawl data available yet. The background crawler may still be running or has not completed.]';
        }
      } catch (err) {
        text = `[Error reading Dev Center crawl data: ${(err as Error)?.message || err}]`;
      }

      return {
        contents: [
          {
            uri: DEV_CENTER_RESOURCE_URI,
            mimeType: 'text/plain',
            text: JSON.stringify(text)
          }
        ]
      };
    }
  );
}
