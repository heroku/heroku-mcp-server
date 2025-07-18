import { expect } from 'chai';
import sinon from 'sinon';
import { setupMcpToolMocks } from './mcp-tool-mocks.spechelper.js';
import { McpToolResponse } from './mcp-tool-response.js';

describe('setupMcpToolMocks', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('mock configuration', () => {
    it('should return proper mock structure', () => {
      const mocks = setupMcpToolMocks();

      expect(mocks).to.have.property('server');
      expect(mocks).to.have.property('herokuRepl');
      expect(mocks).to.have.property('getToolCallback');
      expect(mocks.getToolCallback).to.be.a('function');
    });
  });

  describe('callback capture', () => {
    it('should capture callback from 4-argument tool registration', () => {
      const mocks = setupMcpToolMocks();
      const testCallback = async (): Promise<McpToolResponse> => ({
        content: [{ type: 'text', text: 'test' }]
      });

      // Simulate 4-argument registration: tool(name, description, schema, callback)
      mocks.server.tool('test_tool', 'Test description', {}, testCallback);

      const capturedCallback = mocks.getToolCallback();
      expect(capturedCallback).to.equal(testCallback);
    });

    it('should find callback when mixed with various non-function arguments', () => {
      const mocks = setupMcpToolMocks();
      const testCallback = async (): Promise<McpToolResponse> => ({
        content: [{ type: 'text', text: 'test' }]
      });

      // Simulate registration with different argument types
      mocks.server.tool('test_tool', 'Test description', {}, { option: 'value' }, testCallback);

      const capturedCallback = mocks.getToolCallback();
      expect(capturedCallback).to.equal(testCallback);
    });
  });
});

describe('callback capture', () => {
  it('should capture callback from 4-argument tool registration', () => {
    const mocks = setupMcpToolMocks();
    const testCallback = async (): Promise<McpToolResponse> => ({
      content: [{ type: 'text', text: 'test' }]
    });

    // Simulate 4-argument registration: tool(name, description, schema, callback)
    mocks.server.tool('test_tool', 'Test description', {}, testCallback);

    const capturedCallback = mocks.getToolCallback();
    expect(capturedCallback).to.equal(testCallback);
  });

  it('should capture callback from 5-argument tool registration', () => {
    const mocks = setupMcpToolMocks();
    const testCallback = async (): Promise<McpToolResponse> => ({
      content: [{ type: 'text', text: 'test' }]
    });

    // Simulate 5-argument registration: tool(name, description, schema, options, callback)
    mocks.server.tool('test_tool', 'Test description', {}, {}, testCallback);

    const capturedCallback = mocks.getToolCallback();
    expect(capturedCallback).to.equal(testCallback);
  });

  it('should capture callback from 5-argument tool registration', () => {
    const mocks = setupMcpToolMocks();
    const testCallback = async (): Promise<McpToolResponse> => ({
      content: [{ type: 'text', text: 'test' }]
    });

    // Simulate 5-argument registration: tool(name, description, schema, options, callback)
    mocks.server.tool('test_tool', 'Test description', {}, {}, testCallback);

    const capturedCallback = mocks.getToolCallback();
    expect(capturedCallback).to.equal(testCallback);
  });
});
