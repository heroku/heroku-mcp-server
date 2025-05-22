import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { z } from 'zod';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleCliOutput } from '../utils/handle-cli-output.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
import { McpToolResponse } from '../utils/mcp-tool-response.js';
/**
 * Register list_ai_available_models tool
 *
 * @param server MCP server instance
 * @param herokuRepl Heroku REPL instance
 */
export const registerListAiAvailableModelsTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'list_ai_available_models',
    'List available AI inference models',
    z.object({}).shape,
    async (): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.LIST_AI_AVAILABLE_MODELS).build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Schema for provisioning an AI model
 */
export const provisionAiModelOptionsSchema = z.object({
  app: z.string().describe('Target app name for AI model access provisioning'),
  modelName: z
    .string()
    .describe(
      'Name of the AI model to provision access for. Valid model names can be found with tool "list_ai_available_models"'
    ),
  as: z
    .string()
    .optional()
    .describe('Alias for the model resource when attaching to the app. Randomly generated if not provided.')
});

/**
 * Type for provision AI model options
 */
export type ProvisionAiModelOptions = z.infer<typeof provisionAiModelOptionsSchema>;

/**
 * Register create_app tool
 *
 * @param server MCP server instance
 * @param herokuRepl Heroku REPL instance
 */
export const registerProvisionAiModelTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'provision_ai_model',
    'Provision AI model access for app',
    provisionAiModelOptionsSchema.shape,
    async (options: ProvisionAiModelOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PROVISION_AI_MODEL)
        .addPositionalArguments({ modelName: options.modelName })
        .addFlags({
          app: options.app,
          as: options.as
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Schema for agent message
 */
const agentMessageSchema = z.object({
  role: z.string(),
  content: z.string()
});

/**
 * Schema for agent tool parameters
 */
const agentToolParametersSchema = z.object({
  type: z.string(),
  properties: z.record(z.unknown()),
  required: z.array(z.string())
});

/**
 * Schema for agent tool params
 */
const agentToolParamsSchema = z.object({
  cmd: z.string().optional(),
  description: z.string().optional(),
  parameters: agentToolParametersSchema.optional()
});

/**
 * Schema for agent runtime params
 */
const agentRuntimeParamsSchema = z.object({
  // eslint-disable-next-line camelcase
  target_app_name: z.string().optional(),
  // eslint-disable-next-line camelcase
  tool_params: agentToolParamsSchema.optional()
});

/**
 * Schema for agent tool
 */
const agentToolSchema = z.object({
  type: z.string(),
  name: z.string(),
  description: z.string().optional(),
  // eslint-disable-next-line camelcase
  runtime_params: agentRuntimeParamsSchema.optional()
});

/**
 * Schema for agent request
 */
const agentRequestSchema = z.object({
  model: z.string(),
  messages: z.array(agentMessageSchema),
  // eslint-disable-next-line camelcase
  max_tokens_per_inference_request: z.number().optional(),
  stop: z.array(z.string()).optional(),
  temperature: z.number().optional(),
  tools: z.array(agentToolSchema).optional(),
  // eslint-disable-next-line camelcase
  top_p: z.number().optional()
});

/**
 * Schema for making an AI inference request
 */
export const aiInferenceOptionsSchema = z.object({
  app: z.string().describe('App name/ID (required for alias)'),
  modelResource: z.string().describe('Model resource ID/alias (requires --app for alias)').default('heroku-inference'),
  opts: agentRequestSchema,
  json: z.boolean().optional().describe('Output as JSON').default(false),
  output: z.string().optional().describe('Output file path')
});

/**
 * Type for AI inference options
 */
export type AiInferenceOptions = z.infer<typeof aiInferenceOptionsSchema>;

/**
 * Register make_ai_inference tool
 *
 * @param server MCP server instance
 * @param herokuRepl Heroku REPL instance
 */
export const registerMakeAiInferenceTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'make_ai_inference',
    'Make inference request to Heroku AI API',
    aiInferenceOptionsSchema.shape,
    async (options: AiInferenceOptions): Promise<McpToolResponse> => {
      // Passing a json string to the opts flag is brittle,
      // so we write the json to a file and pass the file path instead
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'com.heroku.mcp.ai.inference'));
      const optsFilePath = path.join(tempDir, 'opts.json');
      await fs.writeFile(optsFilePath, JSON.stringify(options.opts, null, 0));

      const command = new CommandBuilder(TOOL_COMMAND_MAP.AI_AGENTS_CALL)
        .addPositionalArguments({ modelResource: options.modelResource })
        .addFlags({
          app: options.app,
          json: options.json,
          output: options.output,
          optfile: optsFilePath
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      await fs.rmdir(tempDir, { recursive: true });
      return handleCliOutput(output);
    }
  );
};
