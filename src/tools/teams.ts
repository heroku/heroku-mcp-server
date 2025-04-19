import { z } from 'zod';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleCliOutput } from '../utils/handle-cli-output.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
import { McpToolResponse } from '../utils/mcp-tool-response.js';

/**
 * Schema for listing Heroku Teams with output format options.
 * This schema defines the structure and validation rules for the list teams operation.
 *
 * [json] - Controls the output format. When true, returns a detailed JSON response containing
 * team metadata such as enterprise account name. When false or omitted, returns a simplified text format.
 */
export const listTeamsOptionsSchema = z.object({
  json: z
    .boolean()
    .optional()
    .describe('Output format control - true for detailed JSON with team metadata, false/omitted for simplified text')
});

/**
 * Type definition for options when listing Heroku Teams.
 * This type is derived from the listTeamsOptionsSchema and provides type safety for the list teams operation.
 */
export type ListTeamsOptions = z.infer<typeof listTeamsOptionsSchema>;

/**
 * Registers the list_teams tool with the MCP server.
 * This tool provides information about accessible Heroku Teams,
 * including membership details and enterprise relationships.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerListTeamsTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'list_teams',
    'Lists accessible Heroku Teams. Use for: viewing teams, checking membership, getting team metadata, and verifying access. JSON output available.',
    listTeamsOptionsSchema.shape,
    async (options: ListTeamsOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.LIST_TEAMS).addFlags({ json: options.json }).build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};
