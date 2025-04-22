import { expect } from 'chai';
import sinon from 'sinon';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
import {
  listAddonsOptionsSchema,
  getAddonInfoOptionsSchema,
  createAddonOptionsSchema,
  listAddonServicesOptionsSchema,
  listAddonPlansOptionsSchema,
  registerListAddonsTool,
  registerGetAddonInfoTool,
  registerCreateAddonTool,
  registerListAddonServicesTool,
  registerListAddonPlansTool
} from './addons.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';

describe('addons topic tools', () => {
  describe('registerListAddonsTool', () => {
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

      registerListAddonsTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
      expect(call.args[0]).to.equal('list_addons');
      expect(call.args[2]).to.deep.equal(listAddonsOptionsSchema.shape);
    });

    it('executes command successfully with all flag', async () => {
      const expectedOutput =
        ' Owning app Add-on                  Plan                          Price        Max price State   \n' +
        ' ────────── ─────────────────────── ───────────────────────────── ──────────── ───────── ─────── \n' +
        ' test-app   postgresql-curved-12345 heroku-postgresql:essential-0 ~$0.007/hour $5/month  created \n' +
        ' test-app-2 redis-elliptical-12345  heroku-redis:mini             ~$0.004/hour $3/month  created \n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_ADDONS).addFlags({ all: true }).build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ all: true }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with app flag', async () => {
      const expectedOutput =
        ' Add-on                                Plan Price        Max price State   \n' +
        ' ───────────────────────────────────── ──── ──────────── ───────── ─────── \n' +
        ' heroku-redis (redis-elliptical-12345) mini ~$0.004/hour $3/month  created \n' +
        '  └─ as REDIS_TEST_DB                                                      \n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_ADDONS).addFlags({ app: 'test-app-2' }).build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app-2' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerGetAddonInfoTool', () => {
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

      registerGetAddonInfoTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
      expect(call.args[0]).to.equal('get_addon_info');
      expect(call.args[2]).to.deep.equal(getAddonInfoOptionsSchema.shape);
    });

    it('executes command successfully with add-on name', async () => {
      const expectedOutput =
        '=== postgresql-curved-12345\n\n' +
        'Attachments: test-app::DATABASE\n' +
        'Owning App:  test-app\n' +
        'Plan:        heroku-postgresql:essential-0\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.GET_ADDON_INFO)
        .addPositionalArguments({ addon: 'postgresql-curved-12345' })
        .build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ addon: 'postgresql-curved-12345' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with app context', async () => {
      const expectedOutput =
        '=== postgresql-curved-12345\n\n' +
        'Attachments: test-app::DATABASE\n' +
        'Owning App:  test-app\n' +
        'Plan:        heroku-postgresql:essential-0\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.GET_ADDON_INFO)
        .addPositionalArguments({ addon: 'DATABASE' })
        .addFlags({ app: 'test-app' })
        .build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ addon: 'DATABASE', app: 'test-app' }, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerCreateAddonTool', () => {
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

      registerCreateAddonTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
      expect(call.args[0]).to.equal('create_addon');
      expect(call.args[2]).to.deep.equal(createAddonOptionsSchema.shape);
    });

    it('executes command successfully with all options', async () => {
      const expectedOutput =
        'Creating heroku-postgresql:essential-0 on test-app... ~$0.007/hour (max $5/month)\n' +
        'Database should be available soon\n' +
        'test-app-primary-db is being created in the background. The app will restart when complete...\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.CREATE_ADDON)
        .addFlags({
          app: 'test-app',
          as: 'DATABASE',
          name: 'test-app-primary-db'
        })
        .addPositionalArguments({ 'service:plan': 'heroku-postgresql:essential-0' })
        .build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback(
        {
          app: 'test-app',
          as: 'DATABASE',
          name: 'test-app-primary-db',
          serviceAndPlan: 'heroku-postgresql:essential-0'
        },
        {}
      );
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });

    it('executes command successfully with minimal options', async () => {
      const expectedOutput =
        'Creating heroku-postgresql:essential-0 on test-app... ~$0.007/hour (max $5/month)\n' +
        'Database should be available soon\n' +
        'postgresql-curved-12345 is being created in the background. The app will restart when complete...\n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.CREATE_ADDON)
        .addFlags({ app: 'test-app' })
        .addPositionalArguments({ 'service:plan': 'heroku-postgresql:essential-0' })
        .build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback(
        {
          app: 'test-app',
          serviceAndPlan: 'heroku-postgresql:essential-0'
        },
        {}
      );
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerListAddonServicesTool', () => {
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

      registerListAddonServicesTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
      expect(call.args[0]).to.equal('list_addon_services');
      expect(call.args[2]).to.deep.equal(listAddonServicesOptionsSchema.shape);
    });

    it('executes command successfully', async () => {
      const expectedOutput =
        ' Slug              Name                   State \n' +
        ' ───────────────── ────────────────────── ───── \n' +
        ' heroku-postgresql Heroku PostgreSQL      ga    \n' +
        ' heroku-redis      Heroku Key-Value Store ga    \n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_ADDON_SERVICES).build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({}, {});
      expect(herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerListAddonPlansTool', () => {
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

      registerListAddonPlansTool(server, herokuRepl);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(server.tool.calledOnce).to.be.true;
      const call = server.tool.getCall(0);
      expect(call.args[0]).to.equal('list_addon_plans');
      expect(call.args[2]).to.deep.equal(listAddonPlansOptionsSchema.shape);
    });

    it('executes command successfully', async () => {
      const expectedOutput =
        '         Slug                           Name         Price         Max price    \n' +
        ' ─────── ────────────────────────────── ──────────── ───────────── ──────────── \n' +
        ' default heroku-postgresql:essential-0  Essential 0  ~$0.007/hour  $5/month     \n' +
        '         heroku-postgresql:essential-1  Essential 1  ~$0.013/hour  $9/month     \n';
      const expectedCommand = new CommandBuilder(TOOL_COMMAND_MAP.LIST_ADDON_PLANS)
        .addPositionalArguments({ service: 'heroku-postgresql' })
        .build();

      herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ service: 'heroku-postgresql' }, {});
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
        { register: registerListAddonsTool, options: {} },
        { register: registerGetAddonInfoTool, options: { addon: 'test-addon' } },
        {
          register: registerCreateAddonTool,
          options: { app: 'test-app', serviceAndPlan: 'heroku-postgresql:essential-0' }
        },
        { register: registerListAddonServicesTool, options: {} },
        { register: registerListAddonPlansTool, options: { service: 'heroku-postgresql' } }
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
