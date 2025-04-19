import { z } from 'zod';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleCliOutput } from '../utils/handle-cli-output.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
import { McpToolResponse } from '../utils/mcp-tool-response.js';

/**
 * Schema for maintenance mode operations on a Heroku application.
 * This schema defines the structure and validation rules for both enabling and disabling maintenance mode.
 */
export const maintenanceModeOptionsSchema = z.object({
  app: z.string().describe('Target Heroku app name')
});

/**
 * Type definition for the options used when modifying maintenance mode.
 * This type is derived from the maintenanceModeOptionsSchema and provides type safety for maintenance operations.
 */
export type MaintenanceModeOptions = z.infer<typeof maintenanceModeOptionsSchema>;

/**
 * Registers the maintenance_on tool with the MCP server.
 * This tool enables maintenance mode for a specified Heroku application.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerMaintenanceOnTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'maintenance_on',
    'Enable maintenance mode and redirect traffic for a Heroku app',
    maintenanceModeOptionsSchema.shape,
    async (options: MaintenanceModeOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.MAINTENANCE_ON)
        .addFlags({
          app: options.app
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the maintenance_off tool with the MCP server.
 * This tool disables maintenance mode for a specified Heroku application.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerMaintenanceOffTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'maintenance_off',
    'Disable maintenance mode and restore normal app operations',
    maintenanceModeOptionsSchema.shape,
    async (options: MaintenanceModeOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.MAINTENANCE_OFF)
        .addFlags({
          app: options.app
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};
