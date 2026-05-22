import { expect } from 'chai';
import sinon from 'sinon';
import {
  listAppsOptionsSchema,
  getAppInfoOptionsSchema,
  createAppOptionsSchema,
  updateAppOptionsSchema,
  registerListAppsTool,
  registerGetAppInfoTool,
  registerCreateAppTool,
  registerUpdateAppTool,
  AppSdk
} from './apps.js';
import { setupMcpToolMocks } from '../utils/mcp-tool-mocks.spechelper.js';

describe('apps topic tools', () => {
  let sdk: {
    list: sinon.SinonStub;
    listOwnedAndCollaborated: sinon.SinonStub;
    listByTeam: sinon.SinonStub;
    info: sinon.SinonStub;
    create: sinon.SinonStub;
    createInTeam: sinon.SinonStub;
    update: sinon.SinonStub;
  };

  beforeEach(() => {
    sdk = {
      list: sinon.stub(),
      listOwnedAndCollaborated: sinon.stub(),
      listByTeam: sinon.stub(),
      info: sinon.stub(),
      create: sinon.stub(),
      createInTeam: sinon.stub(),
      update: sinon.stub()
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('registerListAppsTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerListAppsTool(mocks.server, sdk as AppSdk);
      toolCallback = mocks.getToolCallback();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('list_apps');
      expect(call.args[2]).to.deep.equal(listAppsOptionsSchema.shape);
    });

    it('calls sdk.listOwnedAndCollaborated by default', async () => {
      const apps = [{ name: 'app-1' }, { name: 'app-2' }];
      sdk.listOwnedAndCollaborated.resolves(apps);

      const result = await toolCallback({});
      expect(sdk.listOwnedAndCollaborated.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(apps, null, 2) }]
      });
    });

    it('calls sdk.list when all is true', async () => {
      const apps = [{ name: 'app-1' }, { name: 'app-2' }, { name: 'collab-app' }];
      sdk.list.resolves(apps);

      const result = await toolCallback({ all: true });
      expect(sdk.list.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(apps, null, 2) }]
      });
    });

    it('calls sdk.listByTeam when team provided', async () => {
      const apps = [{ name: 'team-app-1' }];
      sdk.listByTeam.resolves(apps);

      const result = await toolCallback({ team: 'my-team' });
      expect(sdk.listByTeam.calledOnceWith('my-team')).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(apps, null, 2) }]
      });
    });

    it('handles error response', async () => {
      sdk.listOwnedAndCollaborated.rejects(new Error('401: Unauthorized'));

      const result = await toolCallback({});
      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.include('[Heroku MCP Server Error]');
      expect(result.content[0].text).to.include('401: Unauthorized');
    });
  });

  describe('registerGetAppInfoTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerGetAppInfoTool(mocks.server, sdk as AppSdk);
      toolCallback = mocks.getToolCallback();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('get_app_info');
      expect(call.args[2]).to.deep.equal(getAppInfoOptionsSchema.shape);
    });

    it('calls sdk.info with app name', async () => {
      const app = { name: 'test-app', id: '123', maintenance: false };
      sdk.info.resolves(app);

      const result = await toolCallback({ app: 'test-app' });
      expect(sdk.info.calledOnceWith('test-app')).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(app, null, 2) }]
      });
    });

    it('handles error response', async () => {
      sdk.info.rejects(new Error('404: Not Found'));

      const result = await toolCallback({ app: 'nonexistent' });
      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.include('404: Not Found');
    });
  });

  describe('registerCreateAppTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerCreateAppTool(mocks.server, sdk as AppSdk);
      toolCallback = mocks.getToolCallback();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('create_app');
      expect(call.args[2]).to.deep.equal(createAppOptionsSchema.shape);
    });

    it('calls sdk.create with name and region', async () => {
      const app = { name: 'my-app', region: { name: 'us' } };
      sdk.create.resolves(app);

      const result = await toolCallback({ name: 'my-app', region: 'us' });
      expect(sdk.create.calledOnceWith({ name: 'my-app', region: 'us', stack: undefined })).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(app, null, 2) }]
      });
    });

    it('calls sdk.createInTeam when team provided', async () => {
      const app = { name: 'team-app', team: { name: 'my-team' } };
      sdk.createInTeam.resolves(app);

      const result = await toolCallback({ name: 'team-app', team: 'my-team', region: 'eu' });
      expect(sdk.createInTeam.calledOnceWith({ name: 'team-app', team: 'my-team', region: 'eu' })).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(app, null, 2) }]
      });
    });

    it('calls sdk.createInTeam with stack when both team and stack provided', async () => {
      const app = { name: 'team-app', team: { name: 'my-team' }, stack: { name: 'heroku-24' } };
      sdk.createInTeam.resolves(app);

      const result = await toolCallback({
        name: 'team-app',
        team: 'my-team',
        region: 'eu',
        stack: 'heroku-24'
      });
      expect(
        sdk.createInTeam.calledOnceWith({
          name: 'team-app',
          team: 'my-team',
          region: 'eu',
          stack: 'heroku-24'
        })
      ).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(app, null, 2) }]
      });
    });

    it('calls sdk.create with no options for auto-generated name', async () => {
      const app = { name: 'frozen-badlands-12345' };
      sdk.create.resolves(app);

      const result = await toolCallback({});
      expect(sdk.create.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(app, null, 2) }]
      });
    });

    it('handles error response', async () => {
      sdk.create.rejects(new Error('422: Name is already taken'));

      const result = await toolCallback({ name: 'taken-name' });
      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.include('422: Name is already taken');
    });
  });

  describe('registerUpdateAppTool', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerUpdateAppTool(mocks.server, sdk as AppSdk);
      toolCallback = mocks.getToolCallback();
    });

    it('registers the tool with correct name and schema', () => {
      expect(mocks.server.tool.calledOnce).to.be.true;
      const call = mocks.server.tool.getCall(0);
      expect(call.args[0]).to.equal('update_app');
      expect(call.args[2]).to.deep.equal(updateAppOptionsSchema.shape);
    });

    it('calls sdk.update with name for rename', async () => {
      const app = { name: 'new-name', id: '123' };
      sdk.update.resolves(app);

      const result = await toolCallback({ app: 'old-name', name: 'new-name' });
      expect(sdk.update.calledOnceWith('old-name', { name: 'new-name' })).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(app, null, 2) }]
      });
    });

    it('calls sdk.update with build_stack', async () => {
      const app = { name: 'my-app', build_stack: { name: 'heroku-24' } };
      sdk.update.resolves(app);

      const result = await toolCallback({ app: 'my-app', build_stack: 'heroku-24' });
      expect(sdk.update.calledOnceWith('my-app', { build_stack: 'heroku-24' })).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(app, null, 2) }]
      });
    });

    it('calls sdk.update with maintenance', async () => {
      const app = { name: 'my-app', maintenance: true };
      sdk.update.resolves(app);

      const result = await toolCallback({ app: 'my-app', maintenance: true });
      expect(sdk.update.calledOnceWith('my-app', { maintenance: true })).to.be.true;
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: JSON.stringify(app, null, 2) }]
      });
    });

    it('returns error when no update fields provided', async () => {
      const result = await toolCallback({ app: 'my-app' });
      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.equal('At least one of name, build_stack, or maintenance must be provided');
      expect(result.content[0].text).to.not.include('[Heroku MCP Server Error]');
      expect(sdk.update.called).to.be.false;
    });

    it('handles error response', async () => {
      sdk.update.rejects(new Error('404: Not Found'));

      const result = await toolCallback({ app: 'nonexistent', name: 'new-name' });
      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.include('404: Not Found');
    });
  });
});
