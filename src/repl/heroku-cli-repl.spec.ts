import { EventEmitter } from 'node:events';
import { expect } from 'chai';
import sinon from 'sinon';
import { HerokuREPL } from './heroku-cli-repl.js';
import * as pjson from '../../package.json' with { type: 'json' };

const VERSION = pjson.default.version;

describe('HerokuREPL', () => {
  let repl: HerokuREPL;
  let mockProcess: EventEmitter & {
    stdin: EventEmitter & { write: sinon.SinonStub };
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: sinon.SinonStub;
  };
  let spawnStub: sinon.SinonStub;

  beforeEach(() => {
    // Create mock process with stdin, stdout, and stderr streams
    mockProcess = new (class extends EventEmitter {
      public stdin = new EventEmitter() as EventEmitter & { write: sinon.SinonStub };
      public stdout = new EventEmitter();
      public stderr = new EventEmitter();
      public kill = sinon.stub();
      constructor() {
        super();
        this.stdin.write = sinon.stub();
      }
    })();
    // Stub the spawn function
    spawnStub = sinon.stub(HerokuREPL, 'spawn').returns(mockProcess as any);

    repl = new HerokuREPL(500);

    mockProcess.stdout.emit('data', 'heroku >');
    (async () => {
      for await (const command of repl) {
        // debug here if needed
      }
    })();
  });

  afterEach(() => {
    repl[Symbol.dispose]();
    sinon.restore();
  });

  describe('initialization', () => {
    it('should create a new process when initialized', () => {
      expect(spawnStub.calledOnce).to.be.true;
      expect(spawnStub.firstCall.args[2].env.HEROKU_MCP_MODE).to.equal('true');
      expect(spawnStub.firstCall.args[2].env.HEROKU_MCP_SERVER_VERSION).to.equal(VERSION);
      expect(spawnStub.firstCall.args[2].env.HEROKU_HEADERS).to.equal(
        JSON.stringify({
          'User-Agent': `Heroku-MCP-Server/${VERSION} (${process.platform}; ${process.arch}; node/${process.version})`
        })
      );
    });
  });

  describe('executeCommand', () => {
    it('should queue and execute commands', async () => {
      const commandPromise = repl.executeCommand('apps');

      // Simulate process output
      setTimeout(() => mockProcess.stdout.emit('data', 'Command output\n<<<END RESULTS>>>'));

      const result = await commandPromise;
      expect(result).to.include('Command output');
    });

    it('should handle multiple commands in sequence', async () => {
      const command1Promise = repl.executeCommand('apps');
      const command2Promise = repl.executeCommand('addons');

      setTimeout(() => mockProcess.stdout.emit('data', 'Command 1 output\n<<<END RESULTS>>>'));
      setTimeout(() => mockProcess.stdout.emit('data', 'Command 2 output\n<<<END RESULTS>>>'));

      const result1 = await command1Promise;
      const result2 = await command2Promise;

      expect(result1).to.include('Command 1 output');
      expect(result2).to.include('Command 2 output');
    });

    it('should capture stderr output', async () => {
      const commandPromise = repl.executeCommand('apps');

      setTimeout(() => mockProcess.stderr.emit('data', 'Warning message'));
      setTimeout(() => mockProcess.stdout.emit('data', 'Command output\n<<<END RESULTS>>>'));

      const result = await commandPromise;
      expect(result).to.include('Warning message');
    });

    it('should timeout if command takes too long', async () => {
      const commandPromise = repl.executeCommand('apps');

      setTimeout(() => mockProcess.stdout.emit('data', 'This is taking too long...\n'), 600);

      const result = await commandPromise;
      expect(result).to.include('The command failed to complete in 500ms');
    });
  });

  describe('process management', () => {
    it('should restart process on unexpected close', () => {
      mockProcess.emit('close', 1);
      expect(spawnStub.calledTwice).to.be.true;
    });

    it('should not restart process when aborted', () => {
      repl[Symbol.dispose]();
      mockProcess.emit('close', 0);
      expect(spawnStub.calledOnce).to.be.true;
    });
  });

  describe('async iterator', () => {
    it('should yield command results as they are executed', async () => {
      const commandPromise = repl.executeCommand('apps');

      let commands = [] as string[];
      void (async () => {
        for await (const command of repl) {
          commands.push(command);
        }
      })();

      // Clean up the command
      setTimeout(() => mockProcess.stdout.emit('data', 'Output\n<<<END RESULTS>>>'));
      await commandPromise;
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(commands[0]).to.equal('Output\n<<<END RESULTS>>>');
    });
  });

  describe('cleanup', () => {
    it('should abort when disposed', () => {
      repl[Symbol.dispose]();
      expect(repl['abortController'].signal.aborted).to.be.true;
    });
  });

  describe('MCP startup error handling', () => {
    it('should emit fatalError if spawn throws', () => {
      spawnStub.restore();
      const error = new Error('spawn failed');
      const badSpawn = sinon.stub(HerokuREPL, 'spawn').throws(error);
      const fatalSpy = sinon.spy();
      const replWithError = new HerokuREPL(500);
      replWithError.on('fatalError', fatalSpy);
      // Force re-init to trigger error
      replWithError['initializeProcess']();
      expect(fatalSpy.called).to.be.true;
      const mcpError = fatalSpy.firstCall.args[0];
      expect(mcpError.content[0].text).to.include('Startup error: spawn failed');
      badSpawn.restore();
    });

    it('should emit fatalError if process emits error', () => {
      const fatalSpy = sinon.spy();
      repl.on('fatalError', fatalSpy);
      const error = new Error('process error');
      mockProcess.emit('error', error);
      expect(fatalSpy.called).to.be.true;
      const mcpError = fatalSpy.firstCall.args[0];
      expect(mcpError.content[0].text).to.include('Startup error: process error');
    });

    it('should emit fatalError if CLI outputs old version warning', () => {
      const fatalSpy = sinon.spy();
      repl.on('fatalError', fatalSpy);
      mockProcess.stdout.emit('data', 'Warning: --repl is not a heroku command.');
      expect(fatalSpy.called).to.be.true;
      const mcpError = fatalSpy.firstCall.args[0];
      expect(mcpError.content[0].text).to.include('Your Heroku CLI version does not support --repl mode');
    });
  });

  describe('getHerokuCliCommandAndArgs', () => {
    let spawnSyncStub: sinon.SinonStub;
    let fatalSpy: sinon.SinonSpy;

    beforeEach(() => {
      spawnSyncStub = sinon.stub(HerokuREPL, 'spawnSync');
      fatalSpy = sinon.spy();
      repl.on('fatalError', fatalSpy);
    });

    afterEach(() => {
      spawnSyncStub.restore();
    });

    it('should return npx command when npx is available', () => {
      spawnSyncStub.withArgs('npx', ['--version'], { encoding: 'utf-8' }).returns({
        error: null,
        status: 0,
        stdout: '9.8.1'
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.deep.equal({
        cliCommand: 'npx',
        cliArgs: ['-y', 'heroku@latest', '--repl']
      });
      expect(fatalSpy.called).to.be.false;
    });

    it('should return heroku command when npx is not available but heroku CLI >= 10.10.0 is available', () => {
      // npx not available
      spawnSyncStub.withArgs('npx', ['--version'], { encoding: 'utf-8' }).returns({
        error: new Error('npx not found'),
        status: 1,
        stdout: ''
      });

      // heroku CLI available with version >= 10.10.0
      spawnSyncStub.withArgs('heroku', ['version'], { encoding: 'utf-8' }).returns({
        error: null,
        status: 0,
        stdout: 'heroku/10.15.0 (darwin-x64) node-v18.17.0'
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.deep.equal({
        cliCommand: 'heroku',
        cliArgs: ['--repl']
      });
      expect(fatalSpy.called).to.be.false;
    });

    it('should return heroku command when npx is not available but heroku CLI > 10.x is available', () => {
      // npx not available
      spawnSyncStub.withArgs('npx', ['--version'], { encoding: 'utf-8' }).returns({
        error: new Error('npx not found'),
        status: 1,
        stdout: ''
      });

      // heroku CLI available with version > 10.x
      spawnSyncStub.withArgs('heroku', ['version'], { encoding: 'utf-8' }).returns({
        error: null,
        status: 0,
        stdout: 'heroku/11.0.0 (darwin-x64) node-v18.17.0'
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.deep.equal({
        cliCommand: 'heroku',
        cliArgs: ['--repl']
      });
      expect(fatalSpy.called).to.be.false;
    });

    it('should emit fatalError and return null when npx is not available and heroku CLI < 10.10.0 is available', () => {
      // npx not available
      spawnSyncStub.withArgs('npx', ['--version'], { encoding: 'utf-8' }).returns({
        error: new Error('npx not found'),
        status: 1,
        stdout: ''
      });

      // heroku CLI available but version < 10.10.0
      spawnSyncStub.withArgs('heroku', ['version'], { encoding: 'utf-8' }).returns({
        error: null,
        status: 0,
        stdout: 'heroku/10.9.0 (darwin-x64) node-v18.17.0'
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.be.null;
      expect(fatalSpy.called).to.be.true;
      const mcpError = fatalSpy.firstCall.args[0];
      expect(mcpError.content[0].text).to.include('Startup error: Heroku CLI version 10.10.0 or higher is required');
      expect(mcpError.content[0].text).to.include('Detected version: 10.9.0');
    });

    it('should emit fatalError and return null when npx is not available and heroku CLI is not available', () => {
      // npx not available
      spawnSyncStub.withArgs('npx', ['--version'], { encoding: 'utf-8' }).returns({
        error: new Error('npx not found'),
        status: 1,
        stdout: ''
      });

      // heroku CLI not available
      spawnSyncStub.withArgs('heroku', ['version'], { encoding: 'utf-8' }).returns({
        error: new Error('heroku not found'),
        status: 1,
        stdout: ''
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.be.null;
      expect(fatalSpy.called).to.be.true;
      const mcpError = fatalSpy.firstCall.args[0];
      expect(mcpError.content[0].text).to.include(
        'Startup error: npx is not installed and Heroku CLI (10.10.0+) is not available'
      );
    });

    it('should emit fatalError and return null when npx is not available and heroku CLI version format is unexpected', () => {
      // npx not available
      spawnSyncStub.withArgs('npx', ['--version'], { encoding: 'utf-8' }).returns({
        error: new Error('npx not found'),
        status: 1,
        stdout: ''
      });

      // heroku CLI available but version format is unexpected
      spawnSyncStub.withArgs('heroku', ['version'], { encoding: 'utf-8' }).returns({
        error: null,
        status: 0,
        stdout: 'some unexpected output without version'
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.be.null;
      expect(fatalSpy.called).to.be.true;
      const mcpError = fatalSpy.firstCall.args[0];
      expect(mcpError.content[0].text).to.include(
        'Startup error: npx is not installed and Heroku CLI (10.10.0+) is not available'
      );
    });

    it('should emit fatalError and return null when npx is not available and heroku CLI returns error', () => {
      // npx not available
      spawnSyncStub.withArgs('npx', ['--version'], { encoding: 'utf-8' }).returns({
        error: new Error('npx not found'),
        status: 1,
        stdout: ''
      });

      // heroku CLI returns error
      spawnSyncStub.withArgs('heroku', ['version'], { encoding: 'utf-8' }).returns({
        error: new Error('heroku command failed'),
        status: 1,
        stdout: ''
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.be.null;
      expect(fatalSpy.called).to.be.true;
      const mcpError = fatalSpy.firstCall.args[0];
      expect(mcpError.content[0].text).to.include(
        'Startup error: npx is not installed and Heroku CLI (10.10.0+) is not available'
      );
    });

    it('should emit fatalError and return null when npx is not available and heroku CLI stdout is not a string', () => {
      // npx not available
      spawnSyncStub.withArgs('npx', ['--version'], { encoding: 'utf-8' }).returns({
        error: new Error('npx not found'),
        status: 1,
        stdout: ''
      });

      // heroku CLI available but stdout is not a string
      spawnSyncStub.withArgs('heroku', ['version'], { encoding: 'utf-8' }).returns({
        error: null,
        status: 0,
        stdout: Buffer.from('heroku/10.15.0')
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.be.null;
      expect(fatalSpy.called).to.be.true;
      const mcpError = fatalSpy.firstCall.args[0];
      expect(mcpError.content[0].text).to.include(
        'Startup error: npx is not installed and Heroku CLI (10.10.0+) is not available'
      );
    });
  });
});
