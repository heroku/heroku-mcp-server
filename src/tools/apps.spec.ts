import { expect } from 'chai';
import sinon from 'sinon';
import {
  listAppsOptionsSchema,
  getAppInfoOptionsSchema,
  createAppOptionsSchema,
  renameAppOptionsSchema,
  registerListAppsTool,
  registerGetAppInfoTool,
  registerCreateAppTool,
  registerRenameAppTool
} from './apps.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import { setupMcpToolMocks } from '../utils/mcp-tool-mocks.spechelper.js';

describe('apps topic tools', () => {
  describe('registerListAppsTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerListAppsTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('list_apps');
      expect(call.args[2]).to.deep.equal(listAppsOptionsSchema.shape);
    });

    it('executes command successfully with all flag', async () => {
      const expectedOutput =
        '=== user@example.com Apps\n\n' +
        'test-app\n' +
        '=== Collaborated Apps\n\n' +
        'test-app2  test-team@herokumanager.com';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS).addFlags({ all: true }).build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ all: true }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully', async () => {
      const expectedOutput = '=== user@example.com Apps\n\n' + 'test-app';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS).addFlags({ json: false }).build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ json: false }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with personal flag', async () => {
      const expectedOutput = '=== user@example.com Apps\n\n' + 'test-app';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS).addFlags({ personal: true }).build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ personal: true }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with space flag', async () => {
      const expectedOutput = '=== Apps in space test-space\n\n' + 'test-app2\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS).addFlags({ space: 'test-space' }).build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ space: 'test-space' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with team flag', async () => {
      const expectedOutput = '=== Apps in team test-team\n\n' + 'test-app2\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS).addFlags({ team: 'test-team' }).build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ team: 'test-team' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerGetAppInfoTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerGetAppInfoTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('get_app_info');
      expect(call.args[2]).to.deep.equal(getAppInfoOptionsSchema.shape);
    });

    it('executes command successfully with json flag', async () => {
      const expectedOutput = '{"name": "test-app"}';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.GET_APP_INFO)
        .addFlags({ app: 'test-app', json: true })
        .build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', json: true }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully without json flag', async () => {
      const expectedOutput = '=== test-app\n\n' + 'Addons: heroku-postgresql:essential-0\n' + 'Stack:  heroku-24';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.GET_APP_INFO).addFlags({ app: 'test-app' }).build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerCreateAppTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerCreateAppTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('create_app');
      expect(call.args[2]).to.deep.equal(createAppOptionsSchema.shape);
    });

    it('executes command successfully with name argument', async () => {
      const expectedOutput =
        'Creating test-app... done\n' +
        'https://test-app-7a40ad12ea52.herokuapp.com/ | https://git.heroku.com/test-app.git\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.CREATE_APP)
        .addPositionalArguments({ app: 'test-app' })
        .build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with space argument', async () => {
      const expectedOutput =
        'Creating test-app in space test-space... done\n' +
        'https://test-app-7a40ad12ea52.herokuapp.com/ | https://git.heroku.com/test-app.git\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.CREATE_APP)
        .addPositionalArguments({ app: 'test-app' })
        .addFlags({ space: 'test-space' })
        .build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', space: 'test-space' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with team argument', async () => {
      const expectedOutput =
        'Creating test-app in team test-team... done\n' +
        'https://test-app-7a40ad12ea52.herokuapp.com/ | https://git.heroku.com/test-app.git\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.CREATE_APP)
        .addPositionalArguments({ app: 'test-app' })
        .addFlags({ team: 'test-team' })
        .build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', team: 'test-team' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully without flags', async () => {
      const expectedOutput =
        'Creating frozen-badlands-12345... done\n' +
        'https://frozen-badlands-89ae2afb35d.herokuapp.com/ | https://git.heroku.com/frozen-badlands.git\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.CREATE_APP).build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({}, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerRenameAppTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerRenameAppTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('rename_app');
      expect(call.args[2]).to.deep.equal(renameAppOptionsSchema.shape);
    });

    it('executes command successfully', async () => {
      const expectedOutput =
        'Renaming test-app to test-app-2... done\n' +
        'https://test-app-2-0f749ee37cc8.herokuapp.com/ | https://git.heroku.com/test-app-2.git\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.RENAME_APP)
        .addPositionalArguments({ newName: 'test-app-2' })
        .addFlags({ app: 'test-app' })
        .build();

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', newName: 'test-app-2' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  // Common error handling test for all tools
  describe('error handling', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('handles CLI errors properly for all tools', async () => {
      const expectedOutput = '<<<BEGIN RESULTS>>>\n<<<ERROR>>>API error<<<END ERROR>>><<<END RESULTS>>>';

      // Test error handling for each tool
      const tools = [
        { register: registerListAppsTool, options: {} },
        { register: registerGetAppInfoTool, options: { app: 'test-app' } },
        { register: registerCreateAppTool, options: { app: 'test-app' } },
        { register: registerRenameAppTool, options: { app: 'old-app', newName: 'new-app' } }
      ];

      for (const tool of tools) {
        mocks.herokuRepl.executeCommand.resolves(expectedOutput);
        tool.register(mocks.server, mocks.herokuRepl);

        const toolCallback = mocks.getToolCallback();
        const result = await toolCallback(tool.options, {});

        expect(result).to.deep.equal({
          isError: true,
          content: [
            {
              type: 'text',
              text:
                '[Heroku MCP Server Error] Please use available tools to resolve this issue. ' +
                'Ignore any Heroku CLI command suggestions that may be provided in the command output or error ' +
                `details. Details:\n${expectedOutput}`
            }
          ]
        });
      }
    });
  });
});
