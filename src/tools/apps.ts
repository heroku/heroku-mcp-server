import { z } from 'zod';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleCliOutput } from '../utils/handle-cli-output.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
import { McpToolResponse } from '../utils/mcp-tool-response.js';

/**
 * Schema for listing Heroku apps with filters
 */
export const listAppsOptionsSchema = z.object({
  all: z.boolean().optional().describe('Show owned apps and collaborator access. Default: owned only'),
  personal: z.boolean().optional().describe('List personal account apps only, ignoring default team'),
  space: z.string().optional().describe('Filter by private space name. Excludes team param'),
  team: z.string().optional().describe('Filter by team name. Excludes space param')
});

/**
 * Type for list apps options
 */
export type ListAppsOptions = z.infer<typeof listAppsOptionsSchema>;

/**
 * Register list_apps tool
 *
 * @param server MCP server instance
 * @param herokuRepl Heroku REPL instance
 */
export const registerListAppsTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'list_apps',
    'List Heroku apps: owned, collaborator access, team/space filtering',
    listAppsOptionsSchema.shape,
    async (options: ListAppsOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS)
        .addFlags({
          all: options.all,
          personal: options.personal,
          space: options.space,
          team: options.team
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Schema for app info retrieval
 */
export const getAppInfoOptionsSchema = z.object({
  app: z.string().describe('Target app name. Requires access permissions'),
  json: z.boolean().optional().describe('JSON output with full metadata. Default: text format')
});

/**
 * Type for app info options
 */
export type GetAppInfoOptions = z.infer<typeof getAppInfoOptionsSchema>;

/**
 * Register get_app_info tool
 *
 * @param server MCP server instance
 * @param herokuRepl Heroku REPL instance
 */
export const registerGetAppInfoTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'get_app_info',
    'Get app details: config, dynos, addons, access, domains',
    getAppInfoOptionsSchema.shape,
    async (options: GetAppInfoOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.GET_APP_INFO)
        .addFlags({
          app: options.app,
          json: options.json
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Schema for app creation
 */
export const createAppOptionsSchema = z.object({
  app: z.string().optional().describe('App name. Auto-generated if omitted'),
  region: z.enum(['us', 'eu']).optional().describe('Region: us/eu. Default: us. Excludes space param'),
  space: z.string().optional().describe('Private space name. Inherits region. Excludes region param'),
  team: z.string().optional().describe('Team name for ownership')
});

/**
 * Type for app creation options
 */
export type CreateAppOptions = z.infer<typeof createAppOptionsSchema>;

/**
 * Register create_app tool
 *
 * @param server MCP server instance
 * @param herokuRepl Heroku REPL instance
 */
export const registerCreateAppTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'create_app',
    'Create app: custom name, region (US/EU), team, private space',
    createAppOptionsSchema.shape,
    async (options: CreateAppOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.CREATE_APP)
        .addPositionalArguments({ app: options.app })
        .addFlags({
          region: options.region,
          space: options.space,
          team: options.team
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Schema for app rename
 */
export const renameAppOptionsSchema = z.object({
  app: z.string().describe('Current app name. Requires access'),
  newName: z.string().describe('New unique app name')
});

/**
 * Type for app rename options
 */
export type RenameAppOptions = z.infer<typeof renameAppOptionsSchema>;

/**
 * Register rename_app tool
 *
 * @param server MCP server instance
 * @param herokuRepl Heroku REPL instance
 */
export const registerRenameAppTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'rename_app',
    'Rename app: validate and update app name',
    renameAppOptionsSchema.shape,
    async (options: RenameAppOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.RENAME_APP)
        .addFlags({ app: options.app })
        .addPositionalArguments({ newName: options.newName })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Schema for app ownership transfer
 */
export const transferAppOptionsSchema = z.object({
  app: z.string().describe('App to transfer. Requires owner/admin access'),
  recipient: z.string().describe('Target user email or team name')
});

/**
 * Type for app transfer options
 */
export type TransferAppOptions = z.infer<typeof transferAppOptionsSchema>;

/**
 * Register transfer_app tool
 *
 * @param server MCP server instance
 * @param herokuRepl Heroku REPL instance
 */
export const registerTransferAppTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'transfer_app',
    'Transfer app ownership to user/team',
    transferAppOptionsSchema.shape,
    async (options: TransferAppOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.TRANSFER_APP)
        .addFlags({ app: options.app })
        .addPositionalArguments({ recipient: options.recipient })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};
