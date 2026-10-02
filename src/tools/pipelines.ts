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
  name: z.string().describe('Pipeline name'),
  stage: z.enum(['development', 'staging', 'production']).describe('Initial pipeline stage'),
  app: z.string().optional().describe('App to add to pipeline'),
  team: z.string().optional().describe('Team owning the pipeline')
});

export type PipelinesCreateOptions = z.infer<typeof pipelinesCreateOptionsSchema>;

/**
 * Schema for promoting apps through a pipeline.
 */
export const pipelinesPromoteOptionsSchema = z.object({
  app: z.string().describe('Source app for promotion'),
  to: z.string().optional().describe('Target apps for promotion (comma-separated)')
});

export type PipelinesPromoteOptions = z.infer<typeof pipelinesPromoteOptionsSchema>;

/**
 * Schema for listing pipelines.
 */
export const pipelinesListOptionsSchema = z.object({
  json: z.boolean().optional().describe('Enable JSON output')
});

export type PipelinesListOptions = z.infer<typeof pipelinesListOptionsSchema>;

/**
 * Schema for getting pipeline information.
 */
export const pipelinesInfoOptionsSchema = z.object({
  pipeline: z.string().describe('Target pipeline name'),
  json: z.boolean().optional().describe('Enable JSON output')
});

export type PipelinesInfoOptions = z.infer<typeof pipelinesInfoOptionsSchema>;

/**
 * Schema for the base pipelines command.
 */
export const pipelinesOptionsSchema = z.object({
  json: z.boolean().optional().describe('Enable JSON output')
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
    'Creates new Heroku deployment pipeline with configurable stages, apps, and team settings',
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
    'Promotes apps between pipeline stages with configurable target applications',
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
    'Lists accessible Heroku pipelines with ownership and configuration details',
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
    'Displays detailed pipeline configuration, stages, and connected applications',
    pipelinesInfoOptionsSchema.shape,
    async (options: PipelinesInfoOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PIPELINES_INFO)
        .addFlags({
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
    'Lists and manages Heroku pipelines with configuration visibility',
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
