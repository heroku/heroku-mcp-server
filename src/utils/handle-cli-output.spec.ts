import { expect } from 'chai';
import { handleCliOutput } from './handle-cli-output.js';
import { McpToolResponse } from './mcp-tool-response.js';

describe('handleCliOutput', () => {
  const baseMessage =
    '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command ' +
    'suggestions that may be provided in the command output or error details. ';

  describe('error handling', () => {
    it('handles output with error markers', () => {
      const output = 'Some output\n<<<ERROR>>>Not found<<<END ERROR>>>\nMore output';
      const result: McpToolResponse = handleCliOutput(output);

      expect(result).to.deep.equal({
        isError: true,
        content: [{ type: 'text', text: `${baseMessage}Details:\n${output}` }]
      });
    });

    it('handles output with multiline error message', () => {
      const output = 'Some output\n<<<ERROR>>>First line\nSecond line\nThird line<<<END ERROR>>>\nMore output';
      const result: McpToolResponse = handleCliOutput(output);

      expect(result).to.deep.equal({
        isError: true,
        content: [{ type: 'text', text: `${baseMessage}Details:\n${output}` }]
      });
    });

    it('handles output with empty error message', () => {
      const output = 'Some output\n<<<ERROR>>><<<END ERROR>>>\nMore output';
      const result: McpToolResponse = handleCliOutput(output);

      expect(result).to.deep.equal({
        isError: true,
        content: [{ type: 'text', text: `${baseMessage}Details:\n${output}` }]
      });
    });

    it('handles missing command error with appropriate message', () => {
      const output =
        '<<<ERROR>>>›   Warning: ai:models:list is not a heroku command.\nDid you mean container:login? (Y/n)\n›   Error: Run heroku help for a list of available commands.<<<END ERROR>>>';
      const result: McpToolResponse = handleCliOutput(output);
      const commandNotFoundMessage = '\n\nThe requested command was not found in your Heroku CLI installation.';

      expect(result).to.deep.equal({
        isError: true,
        content: [{ type: 'text', text: `${baseMessage}Details:\n${output}${commandNotFoundMessage}` }]
      });
    });

    it('handles missing command error case-insensitively', () => {
      const output = '<<<ERROR>>>somecommand IS NOT A HEROKU COMMAND<<<END ERROR>>>';
      const result: McpToolResponse = handleCliOutput(output);
      const commandNotFoundMessage = '\n\nThe requested command was not found in your Heroku CLI installation.';

      expect(result).to.deep.equal({
        isError: true,
        content: [{ type: 'text', text: `${baseMessage}Details:\n${output}${commandNotFoundMessage}` }]
      });
    });
  });

  describe('success handling', () => {
    it('handles normal output without error markers', () => {
      const output = 'Command executed successfully\nWith multiple lines\nof output';
      const result: McpToolResponse = handleCliOutput(output);

      expect(result).to.deep.equal({
        content: [{ type: 'text', text: output }]
      });
    });

    it('handles empty output', () => {
      const output = '';
      const result: McpToolResponse = handleCliOutput(output);

      expect(result).to.deep.equal({
        content: [
          {
            type: 'text',
            text: '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\nNo response from command'
          }
        ],
        isError: true
      });
    });
  });
});
