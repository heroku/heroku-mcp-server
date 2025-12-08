import sinon from 'sinon';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';

/**
 * Helper function to set up common MCP tool mocks for testing
 * @returns Object containing the server, herokuRepl, and toolCallback for use in tests
 */
export function setupMcpToolMocks(): {
  server: sinon.SinonStubbedInstance<McpServer>;
  herokuRepl: sinon.SinonStubbedInstance<HerokuREPL>;
  getToolCallback: () => Function;
} {
  const server = sinon.createStubInstance(McpServer);
  const herokuRepl = sinon.createStubInstance(HerokuREPL);
  let toolCallback: Function;

  // Create a proper mock for RegisteredTool
  const mockRegisteredTool = {
    enabled: true,
    enable: sinon.stub(),
    disable: sinon.stub(),
    update: sinon.stub(),
    remove: sinon.stub(),
    handler: sinon.stub()
  };

  // Mock the server.tool method - callback is always the last parameter
  server.tool.callsFake((...args: any[]) => {
    toolCallback = args[args.length - 1];
    // Update handler to point to the callback
    mockRegisteredTool.handler = toolCallback as any;
    return mockRegisteredTool;
  });

  return {
    server,
    herokuRepl,
    getToolCallback: () => toolCallback
  };
}
