import { z } from 'zod';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleCliOutput } from '../utils/handle-cli-output.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import type { HerokuREPL } from '../repl/heroku-cli-repl.js';
import type { McpToolResponse } from '../utils/mcp-tool-response.js';

/**
 * Schema for listing processes.
 */
export const psListOptionsSchema = z.object({
  app: z.string().describe('App name to list processes for'),
  json: z.boolean().optional().describe('Output process info in JSON format')
});

export type PsListOptions = z.infer<typeof psListOptionsSchema>;

/**
 * Schema for scaling processes.
 */
export const psScaleOptionsSchema = z.object({
  app: z.string().describe('App name to scale'),
  dyno: z
    .string()
    .optional()
    .describe('Dyno type and quantity (e.g., web=3:Standard-2X, worker+1). Omit to show current formation')
});

export type PsScaleOptions = z.infer<typeof psScaleOptionsSchema>;

/**
 * Schema for restarting processes.
 */
export const psRestartOptionsSchema = z.object({
  app: z.string().describe('App name to restart processes for'),
  'dyno-name': z
    .string()
    .optional()
    .describe('Specific dyno to restart (e.g., web.1). Omit both options to restart all'),
  'process-type': z.string().optional().describe('Dyno type to restart (e.g., web). Omit both options to restart all')
});

export type PsRestartOptions = z.infer<typeof psRestartOptionsSchema>;

/**
 * Registers the ps tool with the MCP server.
 *
 * @param server - The MCP server instance.
 * @param herokuRepl - The Heroku REPL instance.
 */
export const registerPsListTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'ps_list',
    'List and monitor Heroku app dynos. View running dynos, check status/health, monitor process states, verify configurations.',
    psListOptionsSchema.shape,
    async (options: PsListOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PS)
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
 * Registers the ps:scale tool with the MCP server.
 *
 * @param server - The MCP server instance.
 * @param herokuRepl - The Heroku REPL instance.
 */
export const registerPsScaleTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'ps_scale',
    'Scale Heroku app dynos. Adjust quantities, change sizes, view formation details, manage resources.',
    psScaleOptionsSchema.shape,
    async (options: PsScaleOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PS_SCALE)
        .addFlags({
          app: options.app
        })
        .addPositionalArguments(options.dyno ? { dyno: options.dyno } : {})
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the ps:restart tool with the MCP server.
 *
 * @param server - The MCP server instance.
 * @param herokuRepl - The Heroku REPL instance.
 */
export const registerPsRestartTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'ps_restart',
    'Restart Heroku app processes. Restart specific dynos, process types, or all dynos. Reset dyno states selectively.',
    psRestartOptionsSchema.shape,
    async (options: PsRestartOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PS_RESTART)
        .addFlags({
          app: options.app,
          'dyno-name': options['dyno-name'],
          'process-type': options['process-type']
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};
