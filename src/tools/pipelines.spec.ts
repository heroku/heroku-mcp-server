import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import {
  registerPipelinesCreateTool,
  registerPipelinesPromoteTool,
  registerPipelinesListTool,
  registerPipelinesInfoTool,
  registerPipelinesTool
} from './pipelines.js';
import { expect } from 'chai';
import sinon from 'sinon';
import { setupMcpToolMocks } from '../utils/mcp-tool-mocks.spechelper.js';

describe('Pipeline Tools', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('pipelines:create', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerPipelinesCreateTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('pipelines_create');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      mocks.herokuRepl.executeCommand.resolves('Creating pipeline myapp-pipeline... done\n');

      await toolCallback({ name: 'myapp-pipeline' });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PIPELINES_CREATE} -- myapp-pipeline`
      );
    });

    it('should build correct command with all parameters', async () => {
      mocks.herokuRepl.executeCommand.resolves('Creating pipeline myapp-pipeline... done\n');

      await toolCallback({
        name: 'myapp-pipeline',
        stage: 'production',
        app: 'myapp',
        team: 'myteam'
      });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PIPELINES_CREATE} --stage=production --app=myapp --team=myteam -- myapp-pipeline`
      );
    });

    it('should handle error response', async () => {
      const errorResponse = '<<<ERROR>>>\nError: Pipeline already exists\n<<<END ERROR>>>\n';
      mocks.herokuRepl.executeCommand.resolves(errorResponse);

      const result = await toolCallback({ name: 'myapp-pipeline' });
      expect(result).to.deep.equal({
        content: [
          {
            type: 'text',
            text: '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\n<<<ERROR>>>\nError: Pipeline already exists\n<<<END ERROR>>>\n'
          }
        ],
        isError: true
      });
    });
  });

  describe('pipelines:promote', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerPipelinesPromoteTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('pipelines_promote');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      mocks.herokuRepl.executeCommand.resolves('Promoting myapp to production... done\n');

      await toolCallback({ app: 'myapp' });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PIPELINES_PROMOTE} --app=myapp`
      );
    });

    it('should build correct command with all parameters', async () => {
      mocks.herokuRepl.executeCommand.resolves('Promoting myapp to production... done\n');

      await toolCallback({
        app: 'myapp',
        to: 'production'
      });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PIPELINES_PROMOTE} --app=myapp --to=production`
      );
    });
  });

  describe('pipelines:list', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerPipelinesListTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('pipelines_list');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with no parameters', async () => {
      mocks.herokuRepl.executeCommand.resolves('=== My Pipelines\nmyapp-pipeline\n');

      await toolCallback({});
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(TOOL_COMMAND_MAP.PIPELINES);
    });

    it('should build correct command with all parameters', async () => {
      mocks.herokuRepl.executeCommand.resolves('=== My Pipelines\nmyapp-pipeline\n');

      await toolCallback({
        json: true,
        team: 'myteam'
      });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(`${TOOL_COMMAND_MAP.PIPELINES} --json`);
    });
  });

  describe('pipelines:info', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerPipelinesInfoTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('pipelines_info');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      mocks.herokuRepl.executeCommand.resolves('=== myapp-pipeline\nStaging: myapp-staging\nProduction: myapp-prod\n');

      await toolCallback({ pipeline: 'myapp-pipeline' });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PIPELINES_INFO} -- myapp-pipeline`
      );
    });

    it('should build correct command with all parameters', async () => {
      mocks.herokuRepl.executeCommand.resolves('{"pipeline": "myapp-pipeline", "apps": {...}}\n');

      await toolCallback({
        pipeline: 'myapp-pipeline',
        json: true
      });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PIPELINES_INFO} --json -- myapp-pipeline`
      );
    });
  });

  describe('pipelines', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerPipelinesTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('pipelines');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with no parameters', async () => {
      mocks.herokuRepl.executeCommand.resolves('=== My Pipelines\nmyapp-pipeline\n');

      await toolCallback({});
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal('pipelines');
    });

    it('should build correct command with json parameter', async () => {
      mocks.herokuRepl.executeCommand.resolves('{"pipelines": [...]}\n');

      await toolCallback({ json: true });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal('pipelines --json');
    });

    it('should handle undefined response', async () => {
      mocks.herokuRepl.executeCommand.resolves(undefined);

      const result = await toolCallback({});
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
