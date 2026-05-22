import { z } from 'zod';

import type { App } from '@heroku/types/3.sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpToolResponse } from '../utils/mcp-tool-response.js';
import { formatToolError } from '../utils/format-tool-error.js';

export const maintenanceModeOptionsSchema = z.object({
  app: z.string().describe('Target Heroku app name')
});

export type MaintenanceModeOptions = z.infer<typeof maintenanceModeOptionsSchema>;

export type MaintenanceSdk = {
  enableMaintenance(appIdentity: string): Promise<App>;
  disableMaintenance(appIdentity: string): Promise<App>;
};

export const registerMaintenanceOnTool = (server: McpServer, sdk: MaintenanceSdk): void => {
  server.tool(
    'maintenance_on',
    'Enable maintenance mode and redirect traffic for a Heroku app',
    maintenanceModeOptionsSchema.shape,
    async (options: MaintenanceModeOptions): Promise<McpToolResponse> => {
      try {
        const result = await sdk.enableMaintenance(options.app);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return formatToolError(error);
      }
    }
  );
};

export const registerMaintenanceOffTool = (server: McpServer, sdk: MaintenanceSdk): void => {
  server.tool(
    'maintenance_off',
    'Disable maintenance mode and restore normal app operations',
    maintenanceModeOptionsSchema.shape,
    async (options: MaintenanceModeOptions): Promise<McpToolResponse> => {
      try {
        const result = await sdk.disableMaintenance(options.app);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error: unknown) {
        return formatToolError(error);
      }
    }
  );
};
