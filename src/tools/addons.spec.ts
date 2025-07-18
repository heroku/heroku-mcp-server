import { expect } from 'chai';
import sinon from 'sinon';
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
import { setupMcpToolMocks } from '../utils/mcp-tool-mocks.spechelper.js';

describe('addons topic tools', () => {
  describe('registerListAddonsTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerListAddonsTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
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

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ all: true }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
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

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ app: 'test-app-2' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerGetAddonInfoTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerGetAddonInfoTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
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

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ addon: 'postgresql-curved-12345' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
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

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ addon: 'DATABASE', app: 'test-app' }, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerCreateAddonTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerCreateAddonTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
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

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback(
        {
          app: 'test-app',
          as: 'DATABASE',
          name: 'test-app-primary-db',
          serviceAndPlan: 'heroku-postgresql:essential-0'
        },
        {}
      );
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
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

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback(
        {
          app: 'test-app',
          serviceAndPlan: 'heroku-postgresql:essential-0'
        },
        {}
      );
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerListAddonServicesTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerListAddonServicesTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
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
      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({}, {});
      expect(mocks.herokuRepl.executeCommand.calledOnceWith(expectedCommand)).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: expectedOutput }]
      });
    });
  });

  describe('registerListAddonPlansTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerListAddonPlansTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
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
      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

      const result = await toolCallback({ service: 'heroku-postgresql' }, {});
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

      mocks.herokuRepl.executeCommand.resolves(expectedOutput);

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
        tool.register(mocks.server, mocks.herokuRepl);
        const toolCallback = mocks.getToolCallback();
        const result = await toolCallback(tool.options, {});
        console.log('result', result);
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
