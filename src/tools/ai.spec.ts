import { expect } from 'chai';
import sinon from 'sinon';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
import {
  registerListAiAvailableModelsTool,
  registerProvisionAiModelTool,
  provisionAiModelOptionsSchema
} from './ai.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';

describe('ai topic tools', () => {
  describe('registerListAiAvailableModelsTool', () => {
    let server: sinon.SinonStubbedInstance<McpServer>;
    let herokuRepl: sinon.SinonStubbedInstance<HerokuREPL>;
    let toolCallback: Function;

    beforeEach(() => {
      server = sinon.createStubInstance(McpServer);
      herokuRepl = sinon.createStubInstance(HerokuREPL);

      server.tool.callsFake((_name: string, _description: string, _schema: any, callback: Function) => {
        toolCallback = callback;
        return server;
      });

      registerListAiAvailableModelsTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
      expect(call.args[0]).to.equal('list_ai_available_models');
    });

    it('executes command successfully', async () => {
      const expectedOutput =
        ' Model                     Type              Supported regions \n' +
        ' ───────────────────────── ───────────────── ───────────────── \n' +
        ' claude-3-5-haiku          text-to-text      us                \n' +
        ' claude-3-5-sonnet-latest  text-to-text      us                \n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_AI_AVAILABLE_MODELS).build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({}, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('provisionAiModelTool', () => {
    let server: sinon.SinonStubbedInstance<McpServer>;
    let herokuRepl: sinon.SinonStubbedInstance<HerokuREPL>;
    let toolCallback: Function;

    beforeEach(() => {
      server = sinon.createStubInstance(McpServer);
      herokuRepl = sinon.createStubInstance(HerokuREPL);

      server.tool.callsFake((_name: string, _description: string, _schema: any, callback: Function) => {
        toolCallback = callback;
        return server;
      });

      registerProvisionAiModelTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
      expect(call.args[0]).to.equal('provision_ai_model');
      expect(call.args[2]).to.deep.equal(provisionAiModelOptionsSchema.shape);
    });

    it('executes command successfully with required arguments', async () => {
      const expectedOutput =
        'Provisioning access to claude-3-5-sonnet-latest for app test-app... done\n' +
        'Created claude-3-5-sonnet-latest as INFERENCE on test-app';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.PROVISION_AI_MODEL)
        .addPositionalArguments({ modelName: 'claude-3-5-sonnet-latest' })
        .addFlags({ app: 'test-app' })
        .build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', modelName: 'claude-3-5-sonnet-latest' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with optional "--as" parameter', async () => {
      const expectedOutput =
        'Provisioning access to claude-3-5-sonnet-latest for app test-app as MY_MODEL... done\n' +
        'Created claude-3-5-sonnet-latest as MY_MODEL on test-app';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.PROVISION_AI_MODEL)
        .addPositionalArguments({ modelName: 'claude-3-5-sonnet-latest' })
        .addFlags({ app: 'test-app', as: 'MY_MODEL' })
        .build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', modelName: 'claude-3-5-sonnet-latest', as: 'MY_MODEL' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });
});
