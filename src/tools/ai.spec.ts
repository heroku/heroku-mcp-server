import { expect } from 'chai';
import sinon from 'sinon';
import {
  registerListAiAvailableModelsTool,
  registerProvisionAiModelTool,
  provisionAiModelOptionsSchema,
  registerMakeAiInferenceTool,
  aiInferenceOptionsSchema
} from './ai.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setupMcpToolMocks } from '../utils/mcp-tool-mocks.spechelper.js';

describe('ai topic tools', () => {
  describe('listAiAvailableModelsTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerListAiAvailableModelsTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('list_ai_available_models');
    });

    it('executes command successfully', async () => {
      const expectedOutput =
        ' Model                     Type              Supported regions \n' +
        ' ───────────────────────── ───────────────── ───────────────── \n' +
        ' claude-3-5-haiku          text-to-text      us                \n' +
        ' claude-3-5-sonnet-latest  text-to-text      us                \n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_AI_AVAILABLE_MODELS).build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({}, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('provisionAiModelTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerProvisionAiModelTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
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

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', modelName: 'claude-3-5-sonnet-latest' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
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

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', modelName: 'claude-3-5-sonnet-latest', as: 'MY_MODEL' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('makeAiInferenceTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let mkdtempStub: sinon.SinonStub;
    let writeFileStub: sinon.SinonStub;
    let rmdirStub: sinon.SinonStub;
    let tempDir: string;
    let optsFilePath: string;
    let toolCallback: Function;

    beforeEach(() => {
      tempDir = '/tmp/com.heroku.mcp.ai.inference-12345';
      optsFilePath = path.join(tempDir, 'opts.json');
      mkdtempStub = sinon.stub(fs, 'mkdtemp').resolves(tempDir);
      writeFileStub = sinon.stub(fs, 'writeFile').resolves();
      rmdirStub = sinon.stub(fs, 'rmdir').resolves();

      mocks = setupMcpToolMocks();
      registerMakeAiInferenceTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('make_ai_inference');
      expect(call.args[2]).to.deep.equal(aiInferenceOptionsSchema.shape);
    });

    it('executes command successfully with required arguments and handles temp files', async () => {
      const expectedOutput = 'AI inference response content';
      const opts = {
        model: 'claude-3-5-sonnet-latest',
        messages: [{ role: 'user', content: 'Hello' }]
      };
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.AI_AGENTS_CALL)
        .addPositionalArguments({ modelResource: 'heroku-inference' })
        .addFlags({
          app: 'test-app',
          json: false,
          output: undefined,
          optfile: optsFilePath
        })
        .build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback(
        {
          modelResource: 'heroku-inference',
          app: 'test-app',
          opts
        },
        {}
      );

      expect(mkdtempStub.calledOnce).to.be.true;
      expect(writeFileStub.calledOnce).to.be.true;
      expect(writeFileStub.firstCall.args[0]).to.equal(optsFilePath);
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(rmdirStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with all optional parameters and handles temp files', async () => {
      const expectedOutput = 'AI inference response content';
      const opts = {
        model: 'claude-3-5-sonnet-latest',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens_per_inference_request: 1000,
        tools: [
          {
            type: 'function',
            name: 'test_tool',
            description: 'A test tool'
          }
        ]
      };
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.AI_AGENTS_CALL)
        .addPositionalArguments({ modelResource: 'custom-model' })
        .addFlags({
          app: 'test-app',
          json: true,
          output: 'output.json',
          optfile: optsFilePath
        })
        .build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback(
        {
          app: 'test-app',
          modelResource: 'custom-model',
          opts,
          json: true,
          output: 'output.json'
        },
        {}
      );
      const actualCommand = mocks.herokuRepl.executeCommand.getCall(0).args[0];
      expect(actualCommand).to.equal(expectedCommand);
      expect(mkdtempStub.calledOnce).to.be.true;
      expect(writeFileStub.calledOnce).to.be.true;
      expect(writeFileStub.firstCall.args[0]).to.equal(optsFilePath);
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(rmdirStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });
});
