import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
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

describe('Pipeline Tools', () => {
  let server: sinon.SinonStubbedInstance<McpServer>;
  let herokuRepl: sinon.SinonStubbedInstance<HerokuREPL>;
  let toolCallback: Function;

  beforeEach(() => {
    server = sinon.createStubInstance(McpServer);
    herokuRepl = sinon.createStubInstance(HerokuREPL);

    server.tool.callsFake((_name, _description, _schema, callback) => {
      toolCallback = callback;
      return server;
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('pipelines:create', () => {
    beforeEach(() => {
      registerPipelinesCreateTool(server, herokuRepl);
    });

    it('should register the tool with correct parameters', () => {
      expect(server.tool.calledOnce).to.be.true;
      expect(server.tool.firstCall.args[0]).to.equal('pipelines_create');
      expect(server.tool.firstCall.args[1]).to.be.a('string');
      expect(server.tool.firstCall.args[2]).to.be.an('object');
      expect(server.tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      herokuRepl.executeCommand.resolves('Creating pipeline myapp-pipeline... done\n');

      await toolCallback({ name: 'myapp-pipeline' });
      expect(herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PIPELINES_CREATE} -- myapp-pipeline`
      );
    });

    it('should build correct command with all parameters', async () => {
      herokuRepl.executeCommand.resolves('Creating pipeline myapp-pipeline... done\n');

      await toolCallback({
        name: 'myapp-pipeline',
        stage: 'production',
        app: 'myapp',
        team: 'myteam'
      });
      expect(herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PIPELINES_CREATE} --stage=production --app=myapp --team=myteam -- myapp-pipeline`
      );
    });

    it('should handle error response', async () => {
      const errorResponse = '<<<ERROR>>>\nError: Pipeline already exists\n<<<END ERROR>>>\n';
      herokuRepl.executeCommand.resolves(errorResponse);

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
    beforeEach(() => {
      registerPipelinesPromoteTool(server, herokuRepl);
    });

    it('should register the tool with correct parameters', () => {
      expect(server.tool.calledOnce).to.be.true;
      expect(server.tool.firstCall.args[0]).to.equal('pipelines_promote');
      expect(server.tool.firstCall.args[1]).to.be.a('string');
      expect(server.tool.firstCall.args[2]).to.be.an('object');
      expect(server.tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      herokuRepl.executeCommand.resolves('Promoting myapp to production... done\n');

      await toolCallback({ app: 'myapp' });
      expect(herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(herokuRepl.executeCommand.firstCall.args[0]).to.equal(`${TOOL_COMMAND_MAP.PIPELINES_PROMOTE} --app=myapp`);
    });

    it('should build correct command with all parameters', async () => {
      herokuRepl.executeCommand.resolves('Promoting myapp to production... done\n');

      await toolCallback({
        app: 'myapp',
        to: 'production'
      });
      expect(herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PIPELINES_PROMOTE} --app=myapp --to=production`
      );
    });
  });

  describe('pipelines:list', () => {
    beforeEach(() => {
      registerPipelinesListTool(server, herokuRepl);
    });

    it('should register the tool with correct parameters', () => {
      expect(server.tool.calledOnce).to.be.true;
      expect(server.tool.firstCall.args[0]).to.equal('pipelines_list');
      expect(server.tool.firstCall.args[1]).to.be.a('string');
      expect(server.tool.firstCall.args[2]).to.be.an('object');
      expect(server.tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with no parameters', async () => {
      herokuRepl.executeCommand.resolves('=== My Pipelines\nmyapp-pipeline\n');

      await toolCallback({});
      expect(herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(herokuRepl.executeCommand.firstCall.args[0]).to.equal(TOOL_COMMAND_MAP.PIPELINES);
    });

    it('should build correct command with all parameters', async () => {
      herokuRepl.executeCommand.resolves('=== My Pipelines\nmyapp-pipeline\n');

      await toolCallback({
        json: true,
        team: 'myteam'
      });
      expect(herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(herokuRepl.executeCommand.firstCall.args[0]).to.equal(`${TOOL_COMMAND_MAP.PIPELINES} --json`);
    });
  });

  describe('pipelines:info', () => {
    beforeEach(() => {
      registerPipelinesInfoTool(server, herokuRepl);
    });

    it('should register the tool with correct parameters', () => {
      expect(server.tool.calledOnce).to.be.true;
      expect(server.tool.firstCall.args[0]).to.equal('pipelines_info');
      expect(server.tool.firstCall.args[1]).to.be.a('string');
      expect(server.tool.firstCall.args[2]).to.be.an('object');
      expect(server.tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      herokuRepl.executeCommand.resolves('=== myapp-pipeline\nStaging: myapp-staging\nProduction: myapp-prod\n');

      await toolCallback({ pipeline: 'myapp-pipeline' });
      expect(herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PIPELINES_INFO} -- myapp-pipeline`
      );
    });

    it('should build correct command with all parameters', async () => {
      herokuRepl.executeCommand.resolves('{"pipeline": "myapp-pipeline", "apps": {...}}\n');

      await toolCallback({
        pipeline: 'myapp-pipeline',
        json: true,
        'with-owners': true
      });
      expect(herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PIPELINES_INFO} --with-owners --json -- myapp-pipeline`
      );
    });
  });

  describe('pipelines', () => {
    beforeEach(() => {
      registerPipelinesTool(server, herokuRepl);
    });

    it('should register the tool with correct parameters', () => {
      expect(server.tool.calledOnce).to.be.true;
      expect(server.tool.firstCall.args[0]).to.equal('pipelines');
      expect(server.tool.firstCall.args[1]).to.be.a('string');
      expect(server.tool.firstCall.args[2]).to.be.an('object');
      expect(server.tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with no parameters', async () => {
      herokuRepl.executeCommand.resolves('=== My Pipelines\nmyapp-pipeline\n');

      await toolCallback({});
      expect(herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(herokuRepl.executeCommand.firstCall.args[0]).to.equal('pipelines');
    });

    it('should build correct command with json parameter', async () => {
      herokuRepl.executeCommand.resolves('{"pipelines": [...]}\n');

      await toolCallback({ json: true });
      expect(herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(herokuRepl.executeCommand.firstCall.args[0]).to.equal('pipelines --json');
    });

    it('should handle undefined response', async () => {
      herokuRepl.executeCommand.resolves(undefined);

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
