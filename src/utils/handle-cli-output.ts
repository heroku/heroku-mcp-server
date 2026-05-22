import { McpToolResponse } from './mcp-tool-response.js';
import { ERROR_PREFIX } from './format-tool-error.js';

export function handleCliOutput(output: string): McpToolResponse {
  const errorPattern = /<<<ERROR>>>(.|\n)*?<<<END ERROR>>>/;
  const errorMatch = output?.match(errorPattern);

  if (errorMatch || !output) {
    const missingCommandPattern = /is not a heroku command/i;
    const isMissingCommand = missingCommandPattern.test(output || '');

    if (isMissingCommand) {
      const commandNotFoundMessage = '\n\nThe requested command was not found in your Heroku CLI installation.';

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `${ERROR_PREFIX}${output || 'No response from command'}${commandNotFoundMessage}`
          }
        ]
      };
    }

    return {
      isError: true,
      content: [{ type: 'text', text: `${ERROR_PREFIX}${output || 'No response from command'}` }]
    };
  }

  return {
    content: [{ type: 'text', text: output }]
  };
}
