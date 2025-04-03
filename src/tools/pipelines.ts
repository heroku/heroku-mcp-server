import { z } from 'zod';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleCliOutput } from '../utils/handle-cli-output.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import type { HerokuREPL } from '../repl/heroku-cli-repl.js';
import type { McpToolResponse } from '../utils/mcp-tool-response.js';

/**
 * Schema for creating a new pipeline.
 */
export const pipelinesCreateOptionsSchema = z.object({
  name: z.string().describe('Name of the pipeline to create'),
  stage: z.string().optional().describe('Stage of first app in pipeline (e.g., production, staging, development)'),
  app: z.string().optional().describe('Name of the app to add to the pipeline'),
  team: z.string().optional().describe('Team to create the pipeline in')
});

export type PipelinesCreateOptions = z.infer<typeof pipelinesCreateOptionsSchema>;

/**
 * Schema for promoting apps through a pipeline.
 */
export const pipelinesPromoteOptionsSchema = z.object({
  app: z.string().describe('Name of the app to promote from'),
  to: z.string().optional().describe('Target stage to promote to (e.g., staging, production)')
});

export type PipelinesPromoteOptions = z.infer<typeof pipelinesPromoteOptionsSchema>;

/**
 * Schema for listing pipelines.
 */
export const pipelinesListOptionsSchema = z.object({
  json: z.boolean().optional().describe('Output in json format')
});

export type PipelinesListOptions = z.infer<typeof pipelinesListOptionsSchema>;

/**
 * Schema for getting pipeline information.
 */
export const pipelinesInfoOptionsSchema = z.object({
  pipeline: z.string().describe('Name of the pipeline to get info for'),
  'with-owners': z.boolean().optional().describe('Include pipeline owners in output'),
  json: z.boolean().optional().describe('Output in json format')
});

export type PipelinesInfoOptions = z.infer<typeof pipelinesInfoOptionsSchema>;

/**
 * Schema for the base pipelines command.
 */
export const pipelinesOptionsSchema = z.object({
  json: z.boolean().optional().describe('Output in json format')
});

export type PipelinesOptions = z.infer<typeof pipelinesOptionsSchema>;

/**
 * Registers the pipelines:create tool with the MCP server.
 *
 * @param server - The MCP server instance.
 * @param herokuRepl - The Heroku REPL instance.
 */
export const registerPipelinesCreateTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pipelines_create',
    '[DESC] Create a new pipeline\n' +
      '[PARAM] name: <string> Name of the pipeline\n' +
      '[OPT] stage: initial stage; app: app to add; team: team to create in\n' +
      '[USAGE] Setup deployment pipelines, organize apps by environment\n' +
      '[RELATED] pipelines_add (add apps), pipelines_promote (promote apps)',
    pipelinesCreateOptionsSchema.shape,
    async (options: PipelinesCreateOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PIPELINES_CREATE)
        .addFlags({
          stage: options.stage,
          app: options.app,
          team: options.team
        })
        .addPositionalArguments({ name: options.name })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the pipelines:promote tool with the MCP server.
 *
 * @param server - The MCP server instance.
 * @param herokuRepl - The Heroku REPL instance.
 */
export const registerPipelinesPromoteTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pipelines_promote',
    '[DESC] Promote apps in a pipeline to the next stage\n' +
      '[PARAM] app: <string> App to promote from\n' +
      '[OPT] to: target stage\n' +
      '[USAGE] Deploy to staging/production, manage app promotion flow\n' +
      '[RELATED] pipelines_info (check status), pipelines_diff (compare stages)',
    pipelinesPromoteOptionsSchema.shape,
    async (options: PipelinesPromoteOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PIPELINES_PROMOTE)
        .addFlags({
          app: options.app,
          to: options.to
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the pipelines:list tool with the MCP server.
 *
 * @param server - The MCP server instance.
 * @param herokuRepl - The Heroku REPL instance.
 */
export const registerPipelinesListTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pipelines_list',
    '[DESC] List pipelines you have access to\n' +
      '[OPT] json: json output format; team: filter by team\n' +
      '[USAGE] View available pipelines, check pipeline ownership\n' +
      '[RELATED] pipelines_info (pipeline details)',
    pipelinesListOptionsSchema.shape,
    async (options: PipelinesListOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PIPELINES)
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
 * Registers the pipelines:info tool with the MCP server.
 *
 * @param server - The MCP server instance.
 * @param herokuRepl - The Heroku REPL instance.
 */
export const registerPipelinesInfoTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pipelines_info',
    '[DESC] Show detailed pipeline information\n' +
      '[PARAM] pipeline: <string> Pipeline to get info for\n' +
      '[OPT] json: output in json format; with-owners: include owners\n' +
      '[USAGE] View pipeline configuration, check app stages\n' +
      '[RELATED] pipelines (view all)',
    pipelinesInfoOptionsSchema.shape,
    async (options: PipelinesInfoOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PIPELINES_INFO)
        .addFlags({
          'with-owners': options['with-owners'],
          json: options.json
        })
        .addPositionalArguments({ pipeline: options.pipeline })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the base pipelines tool with the MCP server.
 *
 * @param server - The MCP server instance.
 * @param herokuRepl - The Heroku REPL instance.
 */
export const registerPipelinesTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pipelines',
    '[DESC] List pipelines you have access to\n' +
      '[OPT] json: output in json format\n' +
      '[USAGE] View all accessible pipelines\n' +
      '[RELATED] pipelines:info (pipeline details)',
    pipelinesOptionsSchema.shape,
    async (options: PipelinesOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder('pipelines')
        .addFlags({
          json: options.json
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};
