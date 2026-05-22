import { z } from 'zod';

import type { App, TeamApp } from '@heroku/types/3.sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpToolResponse } from '../utils/mcp-tool-response.js';
import { formatToolError } from '../utils/format-tool-error.js';

export type AppSdk = {
  list(): Promise<App[]>;
  listOwnedAndCollaborated(): Promise<App[]>;
  listByTeam(teamIdentity: string): Promise<TeamApp[]>;
  info(appIdentity: string): Promise<App>;
  create(opts: { name?: string; region?: string; stack?: string }): Promise<App>;
  createInTeam(opts: { name?: string; team?: string; region?: string; stack?: string }): Promise<TeamApp>;
  update(appIdentity: string, body: { name?: string; build_stack?: string; maintenance?: boolean }): Promise<App>;
};

export const listAppsOptionsSchema = z.object({
  all: z
    .boolean()
    .optional()
    .describe('Include all apps accessible to the account. Default: owned and collaborated only'),
  team: z.string().optional().describe('Filter by team name'),
  personal: z
    .boolean()
    .optional()
    .describe('Show only personal-account apps (owned and collaborated, excludes team apps)'),
  space: z.string().optional().describe('Filter by private space name')
});

export type ListAppsOptions = z.infer<typeof listAppsOptionsSchema>;

export const registerListAppsTool = (server: McpServer, sdk: AppSdk): void => {
  server.tool(
    'list_apps',
    'List Heroku apps: owned and collaborated, all, or filtered by team, personal account, or private space',
    listAppsOptionsSchema.shape,
    async (options: ListAppsOptions): Promise<McpToolResponse> => {
      try {
        let result: App[] | TeamApp[];
        if (options.space) {
          const allApps = await sdk.list();
          result = allApps.filter((app) => app.space?.name === options.space);
        } else if (options.personal) {
          result = await sdk.listOwnedAndCollaborated();
        } else if (options.team) {
          result = await sdk.listByTeam(options.team);
        } else if (options.all) {
          result = await sdk.list();
        } else {
          result = await sdk.listOwnedAndCollaborated();
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return formatToolError(error);
      }
    }
  );
};

export const getAppInfoOptionsSchema = z.object({
  app: z.string().describe('Target app name. Requires access permissions')
});

export type GetAppInfoOptions = z.infer<typeof getAppInfoOptionsSchema>;

export const registerGetAppInfoTool = (server: McpServer, sdk: AppSdk): void => {
  server.tool(
    'get_app_info',
    'Get app details: config, dynos, addons, access, domains',
    getAppInfoOptionsSchema.shape,
    async (options: GetAppInfoOptions): Promise<McpToolResponse> => {
      try {
        const result = await sdk.info(options.app);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return formatToolError(error);
      }
    }
  );
};

export const createAppOptionsSchema = z.object({
  name: z.string().optional().describe('App name. Auto-generated if omitted'),
  region: z.string().optional().describe('Region (e.g. us, eu). Default: us'),
  stack: z.string().optional().describe('Stack name (e.g. heroku-24)'),
  team: z.string().optional().describe('Team name for ownership')
});

export type CreateAppOptions = z.infer<typeof createAppOptionsSchema>;

export const registerCreateAppTool = (server: McpServer, sdk: AppSdk): void => {
  server.tool(
    'create_app',
    'Create app: custom name, region, team, or stack',
    createAppOptionsSchema.shape,
    async (options: CreateAppOptions): Promise<McpToolResponse> => {
      try {
        const result = options.team
          ? await sdk.createInTeam({
              name: options.name,
              team: options.team,
              region: options.region,
              stack: options.stack
            })
          : await sdk.create({ name: options.name, region: options.region, stack: options.stack });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return formatToolError(error);
      }
    }
  );
};

export const updateAppOptionsSchema = z.object({
  app: z.string().describe('Target app name. Requires access permissions'),
  name: z.string().optional().describe('New app name (rename)'),
  build_stack: z.string().optional().describe('New build stack (e.g. heroku-24)'),
  maintenance: z.boolean().optional().describe('Enable or disable maintenance mode')
});

export type UpdateAppOptions = z.infer<typeof updateAppOptionsSchema>;

export const registerUpdateAppTool = (server: McpServer, sdk: AppSdk): void => {
  server.tool(
    'update_app',
    'Update app: rename, change build stack, or toggle maintenance',
    updateAppOptionsSchema.shape,
    async (options: UpdateAppOptions): Promise<McpToolResponse> => {
      const { app, name, build_stack, maintenance } = options;

      if (name === undefined && build_stack === undefined && maintenance === undefined) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'At least one of name, build_stack, or maintenance must be provided' }]
        };
      }

      try {
        const body: { name?: string; build_stack?: string; maintenance?: boolean } = {};
        if (name !== undefined) body.name = name;
        if (build_stack !== undefined) body.build_stack = build_stack;
        if (maintenance !== undefined) body.maintenance = maintenance;

        const result = await sdk.update(app, body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return formatToolError(error);
      }
    }
  );
};
