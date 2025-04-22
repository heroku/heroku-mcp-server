import { z } from 'zod';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleCliOutput } from '../utils/handle-cli-output.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
import { McpToolResponse } from '../utils/mcp-tool-response.js';

/**
 * Schema for listing Heroku add-ons with filters
 */
export const listAddonsOptionsSchema = z.object({
  all: z
    .boolean()
    .optional()
    .describe('List all add-ons across accessible apps. Overrides app param, shows full status'),
  app: z
    .string()
    .optional()
    .describe('Filter by app name. Shows add-ons and attachments. Uses Git remote default if omitted')
});

/**
 * Type definition for the options used when listing Heroku add-ons.
 */
export type ListAddonsOptions = z.infer<typeof listAddonsOptionsSchema>;

/**
 * Registers the list_addons tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerListAddonsTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'list_addons',
    'List add-ons: all apps or specific app, detailed metadata',
    listAddonsOptionsSchema.shape,
    async (options: ListAddonsOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.LIST_ADDONS)
        .addFlags({
          all: options.all,
          app: options.app
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Schema for getting information about a specific Heroku add-on.
 */
export const getAddonInfoOptionsSchema = z.object({
  addon: z.string().describe('Add-on identifier: UUID, name (postgresql-curved-12345), or attachment name (DATABASE)'),
  app: z
    .string()
    .optional()
    .describe('App context for add-on lookup. Required for attachment names. Uses Git remote default')
});

/**
 * Type definition for the options used when getting add-on information.
 */
export type GetAddonInfoOptions = z.infer<typeof getAddonInfoOptionsSchema>;

/**
 * Registers the get_addon_info tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerGetAddonInfoTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'get_addon_info',
    'Get add-on details: plan, state, billing',
    getAddonInfoOptionsSchema.shape,
    async (options: GetAddonInfoOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.GET_ADDON_INFO)
        .addFlags({ app: options.app })
        .addPositionalArguments({ addon: options.addon })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Schema for creating a new Heroku add-on.
 */
export const createAddonOptionsSchema = z.object({
  app: z.string().describe('Target app for add-on. Must have write access. Region/space affects availability'),
  as: z.string().optional().describe('Custom attachment name. Used for config vars prefix. Must be unique in app'),
  name: z.string().optional().describe('Global add-on identifier. Must be unique across all Heroku add-ons'),
  serviceAndPlan: z.string().describe('Format: service_slug:plan_slug (e.g., heroku-postgresql:essential-0)')
});

/**
 * Type definition for the options used when creating an add-on.
 */
export type CreateAddonOptions = z.infer<typeof createAddonOptionsSchema>;

/**
 * Registers the create_addon tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerCreateAddonTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'create_addon',
    'Create add-on: specify service, plan, custom names',
    createAddonOptionsSchema.shape,
    async (options: CreateAddonOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.CREATE_ADDON)
        .addFlags({
          app: options.app,
          as: options.as,
          name: options.name
        })
        .addPositionalArguments({ 'service:plan': options.serviceAndPlan })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Schema for listing available add-on services.
 */
export const listAddonServicesOptionsSchema = z.object({
  json: z
    .boolean()
    .optional()
    .describe('JSON output with sharing options and app generation support. Default: basic text')
});

/**
 * Type definition for the options used when listing add-on services.
 */
export type ListAddonServicesOptions = z.infer<typeof listAddonServicesOptionsSchema>;

/**
 * Registers the list_addon_services tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerListAddonServicesTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'list_addon_services',
    'List available add-on services and features',
    listAddonServicesOptionsSchema.shape,
    async (options: ListAddonServicesOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.LIST_ADDON_SERVICES)
        .addFlags({
          json: options.json
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Schema for listing plans for a specific add-on service.
 */
export const listAddonPlansOptionsSchema = z.object({
  service: z.string().describe('Service slug (e.g., heroku-postgresql). Get from list_addon_services'),
  json: z.boolean().optional().describe('JSON output with pricing, features, space compatibility. Default: text format')
});

/**
 * Type definition for the options used when listing add-on service plans.
 */
export type ListAddonPlansOptions = z.infer<typeof listAddonPlansOptionsSchema>;

/**
 * Registers the list_addon_plans tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerListAddonPlansTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'list_addon_plans',
    'List service plans: features, pricing, availability',
    listAddonPlansOptionsSchema.shape,
    async (options: ListAddonPlansOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.LIST_ADDON_PLANS)
        .addFlags({
          json: options.json
        })
        .addPositionalArguments({ service: options.service })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};
