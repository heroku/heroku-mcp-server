import { z } from 'zod';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleCliOutput } from '../utils/handle-cli-output.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
import { McpToolResponse } from '../utils/mcp-tool-response.js';

/**
 * Schema for app logs retrieval with filtering options
 */
export const getAppGetAppLogsOptionsSchema = z.object({
  app: z.string().describe('Heroku app name. Requires: permissions, Cedar-gen'),
  dynoName: z.string().optional().describe('Format: web.1/worker.2. Excludes processType'),
  source: z.string().optional().describe('app=application, heroku=platform. Default: all'),
  processType: z.string().optional().describe('web|worker. All instances. Excludes dynoName')
});

/**
 * Type definition for options when retrieving application logs.
 */
export type GetAppLogsOptions = z.infer<typeof getAppGetAppLogsOptionsSchema>;

/**
 * Registers app logs tool with MCP server
 *
 * @param server MCP server instance
 * @param herokuRepl Heroku REPL instance
 */
export const registerGetAppLogsTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'get_app_logs',
    'App logs: monitor/debug/filter by dyno/process/source',
    getAppGetAppLogsOptionsSchema.shape,
    async (options: GetAppLogsOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.LOGS)
        .addFlags({
          app: options.app,
          'dyno-name': options.dynoName,
          source: options.source,
          'process-type': options.processType
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};
