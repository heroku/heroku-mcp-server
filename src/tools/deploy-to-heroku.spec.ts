import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { expect } from 'chai';
import { Readable } from 'node:stream';
import { DeployToHeroku, DeploymentOptions } from './deploy-to-heroku.js';
import AppService from '../services/app-service.js';
import SourceService from '../services/source-service.js';
import AppSetupService from '../services/app-setup-service.js';
import BuildService from '../services/build-service.js';
import sinon from 'sinon';
import { Build } from '@heroku-cli/schema';
import { AppSetup } from '@heroku-cli/schema';
import { OneOffDynoConfig } from './deploy-to-heroku.js';
import { RendezvousConnection } from '../services/rendezvous.js';
import DynoService from '../services/dyno-service.js';

describe('DeployToHeroku', () => {
  // Increase timeout for async tests
  const TEST_TIMEOUT = 30000;
  before(function () {
    this.timeout(TEST_TIMEOUT);
  });

  let tempDir: string;
  let deployToHeroku: DeployToHeroku;
  let appServiceStub: sinon.SinonStubbedInstance<AppService>;
  let sourceServiceStub: sinon.SinonStubbedInstance<SourceService>;
  let appSetupServiceStub: sinon.SinonStubbedInstance<AppSetupService>;
  let buildServiceStub: sinon.SinonStubbedInstance<BuildService>;
  let fetchStub: typeof fetch & sinon.SinonStub;
  let dynoServiceStub: sinon.SinonStubbedInstance<DynoService>;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'deploy-test-'));

    // Create stubs for services
    appServiceStub = sinon.createStubInstance(AppService);
    sourceServiceStub = sinon.createStubInstance(SourceService);
    appSetupServiceStub = sinon.createStubInstance(AppSetupService);
    buildServiceStub = sinon.createStubInstance(BuildService);
    dynoServiceStub = sinon.createStubInstance(DynoService);

    const readable = Readable.from(
      (async function* () {
        yield 'test log output';
      })()
    );

    fetchStub = sinon.stub(globalThis, 'fetch');

    fetchStub
      .withArgs('https://test.com/put', {
        method: 'PUT',
        body: sinon.match.any
      })
      .resolves({ ok: true } as Response);
    fetchStub.withArgs('https://test.com/stream').resolves(new Response(readable));

    deployToHeroku = new DeployToHeroku();
    // Replace service instances with stubs
    Object.assign(deployToHeroku, {
      appService: appServiceStub,
      sourcesService: sourceServiceStub,
      appSetupService: appSetupServiceStub,
      buildService: buildServiceStub,
      dynoService: dynoServiceStub
    });
  });

  afterEach(async () => {
    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
    sinon.restore();
  });

  async function createTempFile(relativePath: string, content: string | Buffer): Promise<string> {
    const filePath = path.join(tempDir, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return filePath;
  }

  describe('run', () => {
    it('should deploy to existing app when app exists', async function () {
      this.timeout(TEST_TIMEOUT);
      // Create test app.json
      await createTempFile(
        'app.json',
        JSON.stringify({
          name: 'test-app',
          description: 'Test app',
          stack: 'heroku-22'
        })
      );

      const mockApp = { id: 'test-id', name: 'test-app', git_url: 'https://git.heroku.com/test-app.git' };
      const mockBuild: Build & { name: string } = {
        id: 'build-id',
        status: 'succeeded',
        output_stream_url: 'https://test.com/stream',
        name: 'test-app'
      };

      appServiceStub.info.resolves(mockApp);
      sourceServiceStub.create.resolves({
        source_blob: {
          get_url: 'https://test.com/get',
          put_url: 'https://test.com/put'
        }
      });
      buildServiceStub.create.resolves(mockBuild);
      buildServiceStub.info.resolves({ ...mockBuild, status: 'succeeded' });

      const options: DeploymentOptions = {
        name: 'test-app',
        rootUri: tempDir
      };

      const result = await deployToHeroku.run(options);
      expect(result).to.not.be.null;
      expect(result).to.have.property('name', 'test-app');
      expect(result).to.have.property('status', 'succeeded');
      expect(appServiceStub.info.calledOnce).to.be.true;
      expect(buildServiceStub.create.calledOnce).to.be.true;
    });

    it('should handle invalid app.json', async function () {
      this.timeout(TEST_TIMEOUT);
      // Create invalid app.json
      await createTempFile('app.json', 'invalid json');

      const options: DeploymentOptions = {
        name: 'test-app',
        rootUri: tempDir
      };

      const result = await deployToHeroku.run(options);
      expect(result).to.not.be.null;
      expect(result).to.have.property('errorMessage');
      expect(result!.errorMessage).to.include('Cannot parse');
    });

    it('should handle deployment errors', async function () {
      this.timeout(TEST_TIMEOUT);
      await createTempFile(
        'app.json',
        JSON.stringify({
          name: 'test-app',
          description: 'Test app',
          stack: 'heroku-22'
        })
      );

      appServiceStub.info.rejects(new Error('App not found'));
      sourceServiceStub.create.rejects(new Error('Source creation failed'));

      const options: DeploymentOptions = {
        name: 'test-app',
        rootUri: tempDir
      };

      const result = await deployToHeroku.run(options);
      expect(result).to.not.be.null;
      expect(result).to.have.property('errorMessage').that.includes('Source creation failed');
    });

    it('should handle app setup failure', async function () {
      this.timeout(TEST_TIMEOUT);
      await createTempFile(
        'app.json',
        JSON.stringify({
          name: 'test-app',
          description: 'Test app',
          stack: 'heroku-22'
        })
      );

      const mockAppSetup: AppSetup = {
        id: 'setup-id',
        status: 'failed',
        failure_message: 'Setup failed',
        manifest_errors: ['Error 1', 'Error 2'],
        app: { name: 'test-app', id: 'app-id' }
      };

      appServiceStub.info.rejects(new Error('App not found'));
      sourceServiceStub.create.resolves({
        source_blob: {
          get_url: 'https://test.com/get',
          put_url: 'https://test.com/put'
        }
      });
      appSetupServiceStub.create.resolves(mockAppSetup);
      appSetupServiceStub.info.resolves(mockAppSetup);

      const options: DeploymentOptions = {
        name: 'test-app',
        rootUri: tempDir
      };

      const result = await deployToHeroku.run(options);
      expect(result).to.not.be.null;
      if (result) {
        expect(result.errorMessage).to.include('Setup failed');
        expect(result.errorMessage).to.include('Error 1');
        expect(result.errorMessage).to.include('Error 2');
      }
    });

    it('should deploy a one-off dyno and capture output', async function () {
      this.timeout(TEST_TIMEOUT);
      // Create test app.json
      await createTempFile(
        'app.json',
        JSON.stringify({
          name: 'test-app',
          description: 'Test app',
          stack: 'heroku-22'
        })
      );

      const mockDyno = {
        id: 'dyno-id',
        attach_url: 'https://test.com/attach',
        command: 'echo "Hello, World!"'
      };

      const mockDynoResult = {
        dyno: mockDyno,
        output: 'Hello, World!',
        exitCode: 0,
        name: 'test-app'
      };

      dynoServiceStub.create.resolves(mockDyno);
      const rendezvousStub = sinon.stub(RendezvousConnection.prototype, 'connect').resolves({
        output: 'Hello, World!',
        exitCode: 0
      });

      const options: OneOffDynoConfig = {
        name: 'test-app',
        command: 'echo "Hello, World!"',
        rootUri: tempDir
      };

      const result = await deployToHeroku.run(options);
      expect(result).to.not.be.null;
      expect(result).to.have.property('output', 'Hello, World!');
      expect(result).to.have.property('exitCode', 0);
      expect(dynoServiceStub.create.calledOnce).to.be.true;
      expect(rendezvousStub.calledOnce).to.be.true;
    });
  });
});
