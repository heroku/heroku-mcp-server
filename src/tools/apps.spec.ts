import { expect } from 'chai';
import sinon from 'sinon';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
import {
  listAppsOptionsSchema,
  getAppInfoOptionsSchema,
  createAppOptionsSchema,
  renameAppOptionsSchema,
  transferAppOptionsSchema,
  registerListAppsTool,
  registerGetAppInfoTool,
  registerCreateAppTool,
  registerRenameAppTool,
  registerTransferAppTool
} from './apps.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';

describe('apps topic tools', () => {
  describe('registerListAppsTool', () => {
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

      registerListAppsTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
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

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ all: true }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully', async () => {
      const expectedOutput = '=== user@example.com Apps\n\n' + 'test-app';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS).addFlags({ json: false }).build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ json: false }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with personal flag', async () => {
      const expectedOutput = '=== user@example.com Apps\n\n' + 'test-app';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS).addFlags({ personal: true }).build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ personal: true }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with space flag', async () => {
      const expectedOutput = '=== Apps in space test-space\n\n' + 'test-app2\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS).addFlags({ space: 'test-space' }).build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ space: 'test-space' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with team flag', async () => {
      const expectedOutput = '=== Apps in team test-team\n\n' + 'test-app2\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS).addFlags({ team: 'test-team' }).build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ team: 'test-team' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerGetAppInfoTool', () => {
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

      registerGetAppInfoTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
      expect(call.args[0]).to.equal('get_app_info');
      expect(call.args[2]).to.deep.equal(getAppInfoOptionsSchema.shape);
    });

    it('executes command successfully with json flag', async () => {
      const expectedOutput = '{"name": "test-app"}';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.GET_APP_INFO)
        .addFlags({ app: 'test-app', json: true })
        .build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', json: true }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully without json flag', async () => {
      const expectedOutput = '=== test-app\n\n' + 'Addons: heroku-postgresql:essential-0\n' + 'Stack:  heroku-24';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.GET_APP_INFO).addFlags({ app: 'test-app' }).build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerCreateAppTool', () => {
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

      registerCreateAppTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
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

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
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

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', space: 'test-space' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
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

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', team: 'test-team' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully without flags', async () => {
      const expectedOutput =
        'Creating frozen-badlands-12345... done\n' +
        'https://frozen-badlands-89ae2afb35d.herokuapp.com/ | https://git.heroku.com/frozen-badlands.git\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.CREATE_APP).build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({}, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerRenameAppTool', () => {
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

      registerRenameAppTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
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

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', newName: 'test-app-2' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerTransferAppTool', () => {
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

      registerTransferAppTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
      expect(call.args[0]).to.equal('transfer_app');
      expect(call.args[2]).to.deep.equal(transferAppOptionsSchema.shape);
    });

    it('executes command successfully', async () => {
      const expectedOutput = 'Initiating transfer of test-app to user@example.com... email sent\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.TRANSFER_APP)
        .addFlags({ app: 'test-app' })
        .addPositionalArguments({ recipient: 'user@example.com' })
        .build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app', recipient: 'user@example.com' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  // Common error handling test for all tools
  describe('error handling', () => {
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

    it('handles CLI errors properly for all tools', async () => {
      const expectedOutput = '<<<BEGIN RESULTS>>>\n<<<ERROR>>>API error<<<END ERROR>>><<<END RESULTS>>>';

      herokuRepl.executeCommand.resolves(expectedOutput);

      // Test error handling for each tool
      const tools = [
        { register: registerListAppsTool, options: {} },
        { register: registerGetAppInfoTool, options: { app: 'test-app' } },
        { register: registerCreateAppTool, options: { app: 'test-app' } },
        { register: registerRenameAppTool, options: { app: 'old-app', newName: 'new-app' } },
        { register: registerTransferAppTool, options: { app: 'test-app', recipient: 'user@example.com' } }
      ];

      for (const tool of tools) {
        tool.register(server, herokuRepl);
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
