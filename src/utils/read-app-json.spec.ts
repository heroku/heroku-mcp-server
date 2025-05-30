import { expect } from 'chai';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { readAppJson } from './read-app-json.js';

describe('readAppJson', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'app-json-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should read and validate a valid app.json file', async () => {
    const validAppJson = {
      name: 'test-app',
      description: 'Test application',
      keywords: ['test', 'app'],
      env: {
        API_KEY: {
          description: 'API key for service',
          required: true
        }
      },
      formation: {
        web: {
          quantity: 1,
          size: 'standard-1x'
        }
      },
      stack: 'heroku-22'
    };

    const appJsonPath = path.join(tempDir, 'app.json');
    await fs.writeFile(appJsonPath, JSON.stringify(validAppJson, null, 2));

    const result = await readAppJson(tempDir);
    expect(result).to.deep.equal(validAppJson);
  });

  it('should throw error when app.json file does not exist', async () => {
    try {
      await readAppJson(tempDir);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.include('Cannot find app.json file');
    }
  });

  it('should throw error for invalid JSON syntax', async () => {
    const invalidJson = '{ "name": "test-app", invalid json }';
    const appJsonPath = path.join(tempDir, 'app.json');
    await fs.writeFile(appJsonPath, invalidJson);

    try {
      await readAppJson(tempDir);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.include('Cannot parse the app.json file');
    }
  });

  it('should throw error for schema validation failures', async () => {
    const invalidAppJson = {
      name: 'test-app',
      // Invalid stack value - must be one of the allowed values
      stack: 'invalid-stack',
      // Invalid website URL format
      website: 'not-a-url',
      // Invalid buildpack format - missing required url property
      buildpacks: [{}]
    };

    const appJsonPath = path.join(tempDir, 'app.json');
    await fs.writeFile(appJsonPath, JSON.stringify(invalidAppJson));

    try {
      await readAppJson(tempDir);
      expect.fail('Should have thrown an error');
    } catch (error) {
      console.log('Actual error message:', (error as Error).message);
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.include('Invalid app.json file');
    }
  });

  it('should accept and validate app.json content as Uint8Array', async () => {
    const validAppJson = {
      name: 'test-app',
      stack: 'heroku-22'
    };

    const appJsonContent = new TextEncoder().encode(JSON.stringify(validAppJson));
    const result = await readAppJson(tempDir, appJsonContent);
    expect(result).to.deep.equal(validAppJson);
  });

  it('should throw error for invalid app.json content as Uint8Array', async () => {
    const invalidJson = '{ invalid json }';
    const appJsonContent = new TextEncoder().encode(invalidJson);

    try {
      await readAppJson(tempDir, appJsonContent);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.include('Cannot parse the app.json file');
    }
  });
});
