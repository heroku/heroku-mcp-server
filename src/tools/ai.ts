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
    'List Heroku AI available inference models',
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
    'Provision access to an AI model for an app',
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
