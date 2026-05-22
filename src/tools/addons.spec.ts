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
  registerListAddonPlansTool,
  AddonSdk
} from './addons.js';
import { setupMcpToolMocks } from '../utils/mcp-tool-mocks.spechelper.js';

describe('addons topic tools', () => {
  let sdk: {
    list: sinon.SinonStub;
    listByApp: sinon.SinonStub;
    describe: sinon.SinonStub;
    create: sinon.SinonStub;
    listServices: sinon.SinonStub;
    listPlans: sinon.SinonStub;
  };

  beforeEach(() => {
    sdk = {
      list: sinon.stub(),
      listByApp: sinon.stub(),
      describe: sinon.stub(),
      create: sinon.stub(),
      listServices: sinon.stub(),
      listPlans: sinon.stub()
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('registerListAddonsTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerListAddonsTool(mocks.server, sdk as AddonSdk);
      toolCallback = mocks.getToolCallback();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('list_addons');
      expect(call.args[2]).to.deep.equal(listAddonsOptionsSchema.shape);
    });

    it('calls sdk.list by default', async () => {
      const addons = [{ name: 'postgresql-curved-12345' }, { name: 'redis-elliptical-67890' }];
      sdk.list.resolves(addons);

      const result = await toolCallback({});
      expect(sdk.list.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(addons, null, 2) }]
      });
    });

    it('calls sdk.listByApp when app provided', async () => {
      const addons = [{ name: 'postgresql-curved-12345' }];
      sdk.listByApp.resolves(addons);

      const result = await toolCallback({ app: 'my-app' });
      expect(sdk.listByApp.calledOnceWith('my-app')).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(addons, null, 2) }]
      });
    });

    it('handles error response', async () => {
      sdk.list.rejects(new Error('401: Unauthorized'));

      const result = await toolCallback({});
      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.include('[Heroku MCP Server Error]');
      expect(result.content[0].text).to.include('401: Unauthorized');
    });
  });

  describe('registerGetAddonInfoTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerGetAddonInfoTool(mocks.server, sdk as AddonSdk);
      toolCallback = mocks.getToolCallback();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('get_addon_info');
      expect(call.args[2]).to.deep.equal(getAddonInfoOptionsSchema.shape);
    });

    it('calls sdk.describe with addon identity', async () => {
      const addon = { name: 'postgresql-curved-12345', plan: { name: 'essential-0' }, attachments: [] };
      sdk.describe.resolves(addon);

      const result = await toolCallback({ addon: 'postgresql-curved-12345' });
      expect(sdk.describe.calledOnceWith('postgresql-curved-12345', { appIdentity: undefined })).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(addon, null, 2) }]
      });
    });

    it('calls sdk.describe with addon and app context', async () => {
      const addon = { name: 'postgresql-curved-12345', plan: { name: 'essential-0' }, attachments: [] };
      sdk.describe.resolves(addon);

      const result = await toolCallback({ addon: 'DATABASE', app: 'my-app' });
      expect(sdk.describe.calledOnceWith('DATABASE', { appIdentity: 'my-app' })).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(addon, null, 2) }]
      });
    });

    it('handles error response', async () => {
      sdk.describe.rejects(new Error('404: Not Found'));

      const result = await toolCallback({ addon: 'nonexistent' });
      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.include('404: Not Found');
    });
  });

  describe('registerCreateAddonTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerCreateAddonTool(mocks.server, sdk as AddonSdk);
      toolCallback = mocks.getToolCallback();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('create_addon');
      expect(call.args[2]).to.deep.equal(createAddonOptionsSchema.shape);
    });

    it('calls sdk.create with all options', async () => {
      const addon = { name: 'my-db', plan: { name: 'heroku-postgresql:essential-0' } };
      sdk.create.resolves(addon);

      const result = await toolCallback({
        app: 'my-app',
        plan: 'heroku-postgresql:essential-0',
        as: 'DATABASE',
        name: 'my-db'
      });
      expect(
        sdk.create.calledOnceWith('my-app', {
          plan: 'heroku-postgresql:essential-0',
          attachment: { name: 'DATABASE' },
          name: 'my-db'
        })
      ).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(addon, null, 2) }]
      });
    });

    it('calls sdk.create with minimal options', async () => {
      const addon = { name: 'postgresql-curved-12345' };
      sdk.create.resolves(addon);

      const result = await toolCallback({
        app: 'my-app',
        plan: 'heroku-postgresql:essential-0'
      });
      expect(
        sdk.create.calledOnceWith('my-app', {
          plan: 'heroku-postgresql:essential-0'
        })
      ).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(addon, null, 2) }]
      });
    });

    it('handles error response', async () => {
      sdk.create.rejects(new Error('422: Name is already taken'));

      const result = await toolCallback({
        app: 'my-app',
        plan: 'heroku-postgresql:essential-0'
      });
      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.include('422: Name is already taken');
    });
  });

  describe('registerListAddonServicesTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerListAddonServicesTool(mocks.server, sdk as AddonSdk);
      toolCallback = mocks.getToolCallback();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('list_addon_services');
      expect(call.args[2]).to.deep.equal(listAddonServicesOptionsSchema.shape);
    });

    it('calls sdk.listServices', async () => {
      const services = [
        { name: 'Heroku PostgreSQL', slug: 'heroku-postgresql' },
        { name: 'Heroku Key-Value Store', slug: 'heroku-redis' }
      ];
      sdk.listServices.resolves(services);

      const result = await toolCallback({});
      expect(sdk.listServices.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(services, null, 2) }]
      });
    });

    it('handles error response', async () => {
      sdk.listServices.rejects(new Error('500: Internal Server Error'));

      const result = await toolCallback({});
      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.include('500: Internal Server Error');
    });
  });

  describe('registerListAddonPlansTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerListAddonPlansTool(mocks.server, sdk as AddonSdk);
      toolCallback = mocks.getToolCallback();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('list_addon_plans');
      expect(call.args[2]).to.deep.equal(listAddonPlansOptionsSchema.shape);
    });

    it('calls sdk.listPlans with service', async () => {
      const plans = [
        { name: 'essential-0', price: { cents: 500, unit: 'month' } },
        { name: 'essential-1', price: { cents: 900, unit: 'month' } }
      ];
      sdk.listPlans.resolves(plans);

      const result = await toolCallback({ service: 'heroku-postgresql' });
      expect(sdk.listPlans.calledOnceWith('heroku-postgresql')).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(plans, null, 2) }]
      });
    });

    it('handles error response', async () => {
      sdk.listPlans.rejects(new Error('404: Service not found'));

      const result = await toolCallback({ service: 'nonexistent' });
      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.include('404: Service not found');
    });
  });
});
