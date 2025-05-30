import { McpToolResponse } from './mcp-tool-response.js';

/**
 * Handles Heroku REPL command output and formats it into a standardized MCP tool response.
 * This function processes both successful command output and error messages.
 *
 * When the output contains error markers (<<<ERROR>>>...<<<END ERROR>>>), it formats
 * the error message with a standardized prefix and returns an error response.
 * Otherwise, it returns the command output as a successful response.
 *
 * @param output - The output string from the Heroku REPL command execution
 * @returns An McpToolResponse object containing either the formatted output or error message
 */
export function handleCliOutput(output: string): McpToolResponse {
  const errorPattern = /<<<ERROR>>>(.|\n)*?<<<END ERROR>>>/;
  const errorMatch = output?.match(errorPattern);

  if (errorMatch || !output) {
    const baseMessage =
      '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command ' +
      'suggestions that may be provided in the command output or error details. ';

    return {
      isError: true,
      content: [{ type: 'text', text: `${baseMessage}Details:\n${output || 'No response from command'}` }]
    };
  }

  return {
    content: [{ type: 'text', text: output }]
  };
}
