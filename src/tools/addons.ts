import { z } from 'zod';

import type { AddOn, AddOnService, Plan } from '@heroku/types/3.sdk';
import type { DescribedAddOn } from '@heroku/sdk/resources/platform/add-on';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpToolResponse } from '../utils/mcp-tool-response.js';
import { formatToolError } from '../utils/format-tool-error.js';

export type AddonSdk = {
  list(): Promise<AddOn[]>;
  listByApp(appIdentity: string): Promise<AddOn[]>;
  describe(addonIdentity: string, options?: { appIdentity?: string }): Promise<DescribedAddOn>;
  create(appIdentity: string, body: { plan: string; attachment?: { name?: string }; name?: string }): Promise<AddOn>;
  listServices(): Promise<AddOnService[]>;
  listPlans(serviceIdentity: string): Promise<Plan[]>;
};

export const listAddonsOptionsSchema = z.object({
  app: z.string().optional().describe('Filter by app name. Shows add-ons provisioned on this app')
});

export type ListAddonsOptions = z.infer<typeof listAddonsOptionsSchema>;

export const registerListAddonsTool = (server: McpServer, sdk: AddonSdk): void => {
  server.tool(
    'list_addons',
    'List add-ons: all accessible or filtered by app',
    listAddonsOptionsSchema.shape,
    async (options: ListAddonsOptions): Promise<McpToolResponse> => {
      try {
        const result = options.app ? await sdk.listByApp(options.app) : await sdk.list();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return formatToolError(error);
      }
    }
  );
};

export const getAddonInfoOptionsSchema = z.object({
  addon: z.string().describe('Add-on identifier: UUID, name (postgresql-curved-12345), or attachment name (DATABASE)'),
  app: z.string().optional().describe('App context for add-on lookup. Required for attachment names')
});

export type GetAddonInfoOptions = z.infer<typeof getAddonInfoOptionsSchema>;

export const registerGetAddonInfoTool = (server: McpServer, sdk: AddonSdk): void => {
  server.tool(
    'get_addon_info',
    'Get add-on details: plan, state, billing, attachments',
    getAddonInfoOptionsSchema.shape,
    async (options: GetAddonInfoOptions): Promise<McpToolResponse> => {
      try {
        const result = await sdk.describe(options.addon, { appIdentity: options.app });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return formatToolError(error);
      }
    }
  );
};

export const createAddonOptionsSchema = z.object({
  app: z.string().describe('Target app for add-on. Must have write access'),
  plan: z.string().describe('Service and plan (e.g., heroku-postgresql:essential-0)'),
  as: z.string().optional().describe('Custom attachment name. Used for config vars prefix. Must be unique in app'),
  name: z.string().optional().describe('Global add-on identifier. Must be unique across all Heroku add-ons')
});

export type CreateAddonOptions = z.infer<typeof createAddonOptionsSchema>;

export const registerCreateAddonTool = (server: McpServer, sdk: AddonSdk): void => {
  server.tool(
    'create_addon',
    'Create add-on: specify service, plan, custom names',
    createAddonOptionsSchema.shape,
    async (options: CreateAddonOptions): Promise<McpToolResponse> => {
      try {
        const body: { plan: string; attachment?: { name?: string }; name?: string } = {
          plan: options.plan
        };
        if (options.as !== undefined) body.attachment = { name: options.as };
        if (options.name !== undefined) body.name = options.name;

        const result = await sdk.create(options.app, body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return formatToolError(error);
      }
    }
  );
};

export const listAddonServicesOptionsSchema = z.object({});

export type ListAddonServicesOptions = z.infer<typeof listAddonServicesOptionsSchema>;

export const registerListAddonServicesTool = (server: McpServer, sdk: AddonSdk): void => {
  server.tool(
    'list_addon_services',
    'List available add-on services and features',
    listAddonServicesOptionsSchema.shape,
    async (): Promise<McpToolResponse> => {
      try {
        const result = await sdk.listServices();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return formatToolError(error);
      }
    }
  );
};

export const listAddonPlansOptionsSchema = z.object({
  service: z.string().describe('Service slug (e.g., heroku-postgresql). Get from list_addon_services')
});

export type ListAddonPlansOptions = z.infer<typeof listAddonPlansOptionsSchema>;

export const registerListAddonPlansTool = (server: McpServer, sdk: AddonSdk): void => {
  server.tool(
    'list_addon_plans',
    'List service plans: features, pricing, availability',
    listAddonPlansOptionsSchema.shape,
    async (options: ListAddonPlansOptions): Promise<McpToolResponse> => {
      try {
        const result = await sdk.listPlans(options.service);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return formatToolError(error);
      }
    }
  );
};
