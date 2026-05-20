import { registerMaintenanceOnTool, registerMaintenanceOffTool } from './maintenance.js';
import { expect } from 'chai';
import sinon from 'sinon';
import { setupMcpToolMocks } from '../utils/mcp-tool-mocks.spechelper.js';
import herokuSdk from '../utils/heroku-sdk.js';

describe('Maintenance Tools', () => {
  let enableStub: sinon.SinonStub;
  let disableStub: sinon.SinonStub;

  beforeEach(() => {
    enableStub = sinon.stub(herokuSdk, 'enableMaintenanceMode');
    disableStub = sinon.stub(herokuSdk, 'disableMaintenanceMode');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('maintenance_on', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerMaintenanceOnTool(mocks.server);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('maintenance_on');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should call enableMaintenanceMode with the app name', async () => {
      enableStub.resolves({ name: 'myapp', maintenance: true });

      await toolCallback({ app: 'myapp' });
      expect(enableStub.calledOnceWith('myapp')).to.be.true;
    });

    it('should handle successful response', async () => {
      enableStub.resolves({ name: 'myapp', maintenance: true });

      const result = await toolCallback({ app: 'myapp' });
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: 'Maintenance mode enabled for myapp' }]
      });
    });

    it('should handle error response', async () => {
      enableStub.rejects(new Error('404: Not Found'));

      const result = await toolCallback({ app: 'myapp' });
      expect(result).to.deep.equal({
        content: [
          {
            type: 'text',
            text: '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\n404: Not Found'
          }
        ],
        isError: true
      });
    });
  });

  describe('maintenance_off', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerMaintenanceOffTool(mocks.server);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('maintenance_off');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should call disableMaintenanceMode with the app name', async () => {
      disableStub.resolves({ name: 'myapp', maintenance: false });

      await toolCallback({ app: 'myapp' });
      expect(disableStub.calledOnceWith('myapp')).to.be.true;
    });

    it('should handle successful response', async () => {
      disableStub.resolves({ name: 'myapp', maintenance: false });

      const result = await toolCallback({ app: 'myapp' });
      expect(result).to.deep.equal({
        content: [{ type: 'text', text: 'Maintenance mode disabled for myapp' }]
      });
    });

    it('should handle error response', async () => {
      disableStub.rejects(new Error('404: Not Found'));

      const result = await toolCallback({ app: 'myapp' });
      expect(result).to.deep.equal({
        content: [
          {
            type: 'text',
            text: '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\n404: Not Found'
          }
        ],
        isError: true
      });
    });
  });
});
