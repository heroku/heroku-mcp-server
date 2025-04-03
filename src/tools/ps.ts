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
  app: z.string().describe('Name of the app to list processes for'),
  json: z.boolean().optional().describe('Return process information in json format'),
  extended: z.boolean().optional().describe('Extended information for each process')
});

export type PsListOptions = z.infer<typeof psListOptionsSchema>;

/**
 * Schema for scaling processes.
 */
export const psScaleOptionsSchema = z.object({
  app: z.string().describe('Name of the app to scale'),
  dyno: z.string().describe('The type of dyno to scale (e.g., web=1, worker=2)')
});

export type PsScaleOptions = z.infer<typeof psScaleOptionsSchema>;

/**
 * Schema for restarting processes.
 */
export const psRestartOptionsSchema = z.object({
  app: z.string().describe('Name of the app to restart processes for'),
  'dyno-name': z.string().optional().describe('The name of the dyno to restart'),
  'process-type': z.string().optional().describe('Restart dynos of this type')
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
    '[DESC] List processes for an app\n' +
      '[PARAM] app: <string> Target application name\n' +
      '[OPT] json: json output; extended: detailed info\n' +
      '[USAGE] Monitor running processes, check dyno status\n' +
      '[RELATED] ps:scale (adjust dynos), ps:restart (restart processes)',
    psListOptionsSchema.shape,
    async (options: PsListOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PS)
        .addFlags({
          app: options.app,
          json: options.json,
          extended: options.extended
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
    '[DESC] Scale processes by type\n' +
      '[PARAM] app: <string> Target application name; dyno: <string> Dyno type and quantity\n' +
      '[USAGE] Adjust application capacity, scale for traffic\n' +
      '[RELATED] ps (check current), ps:type (available types)',
    psScaleOptionsSchema.shape,
    async (options: PsScaleOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PS_SCALE)
        .addFlags({
          app: options.app
        })
        .addPositionalArguments({ dyno: options.dyno })
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
    '[DESC] Restart processes\n' +
      '[PARAM] app: <string> Target application name\n' +
      '[OPT] dyno: specific dyno; type: dyno type\n' +
      '[USAGE] Restart problematic processes, apply config changes\n' +
      '[RELATED] ps (verify restart), ps:stop (stop processes)',
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
