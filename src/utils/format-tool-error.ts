import { McpToolResponse } from './mcp-tool-response.js';

export const ERROR_PREFIX =
  '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\n';

export function formatToolError(error: unknown): McpToolResponse {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: 'text', text: `${ERROR_PREFIX}${message}` }]
  };
}
