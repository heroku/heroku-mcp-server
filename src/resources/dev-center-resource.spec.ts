import { expect } from 'chai';
import sinon from 'sinon';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDevCenterResource } from './dev-center-resource.js';

describe('registerDevCenterResource', () => {
  let server: sinon.SinonStubbedInstance<McpServer>;

  beforeEach(() => {
    server = sinon.createStubInstance(McpServer);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('registers the resource with the correct name', () => {
    registerDevCenterResource(server as any);
    expect(server.resource.calledOnce).to.be.true;
    const call = server.resource.getCall(0);
    expect(call.args[0]).to.equal('heroku_dev_center');
  });
});
