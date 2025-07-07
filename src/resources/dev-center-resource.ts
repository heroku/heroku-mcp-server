import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Registers the Heroku Dev Center resource with the MCP server.
 * Exposes the /tmp/llms.txt file as a text resource, handling missing file gracefully.
 *
 * @param server - The MCP server instance
 */
export function registerDevCenterResource(server: McpServer): void {
  const DEV_CENTER_RESOURCE_URI = 'https://devcenter.heroku.com/llms.txt';

  server.resource(
    'heroku_dev_center',
    DEV_CENTER_RESOURCE_URI,
    {
      mimeType: 'text/plain',
      description: 'This resource provides a summary of Heroku Dev Center articles, and how to use Heroku.'
    },
    async () => {
      let docText = '';
      try {
        const res = await fetch(DEV_CENTER_RESOURCE_URI);
        docText = await res.text();
      } catch (err) {
        docText = `[Error reading Dev Center data: ${(err as Error)?.message || String(err)}]`;
      }
      if (!docText) {
        docText = '[No Dev Center data available.]';
      }
      return {
        contents: [
          {
            uri: DEV_CENTER_RESOURCE_URI,
            mimeType: 'text/plain',
            text: docText
          }
        ]
      };
    }
  );
}
