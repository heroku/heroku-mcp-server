import { z } from 'zod';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleCliOutput } from '../utils/handle-cli-output.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
import { McpToolResponse } from '../utils/mcp-tool-response.js';

/**
 * Schema for listing Heroku Private Spaces with output format options.
 * This schema defines the structure and validation rules for the list private spaces operation.
 */
export const listPrivateSpacesOptionsSchema = z.object({
  json: z.boolean().optional().describe('JSON output for detailed space metadata, text output if false/omitted')
});

/**
 * Type definition for options when listing Heroku Private Spaces.
 * This type is derived from the listPrivateSpacesOptionsSchema and provides type safety for the list apps operation.
 */
export type ListPrivateSpacesOptions = z.infer<typeof listPrivateSpacesOptionsSchema>;

/**
 * Registers the list_private_spaces tool with the MCP server.
 * This tool provides information about available Heroku Private Spaces,
 * including CIDR blocks, regions, and compliance features.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerListPrivateSpacesTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'list_private_spaces',
    'Lists Heroku Private Spaces with CIDR blocks, regions, compliance and capacity details. JSON output supported.',
    listPrivateSpacesOptionsSchema.shape,
    async (options: ListPrivateSpacesOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.LIST_PRIVATE_SPACES).addFlags({ json: options.json }).build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};
