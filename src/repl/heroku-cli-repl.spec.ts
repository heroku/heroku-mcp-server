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

    // Idle teardown disabled (0) for the shared fixture so these tests are not
    // affected by the idle timer; the dedicated idle tests opt back in.
    repl = new HerokuREPL(500, 0);

    // The process is started lazily (W-24704373 / #180). Most tests below assume
    // a spawned, ready process, so prime one explicitly here.
    repl['initializeProcess']();
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

  describe('stdin protocol', () => {
    // This test locks in the exact bytes written to the CLI process stdin.
    // Commands are newline-delimited on stdin, so the REPL appends a single
    // trailing '\n' to signal "end of command". This is why a command string
    // must itself be a single line: the CLI treats everything after an embedded
    // newline as a separate command. The CommandBuilder CR/LF validation
    // upstream enforces that; this test documents the exact-bytes behavior it
    // relies on.

    it('should write exactly command + a single trailing newline to stdin', async () => {
      const command = 'apps';

      // Deterministically resolve the moment the async iterator writes to
      // stdin, rather than waiting a fixed duration.
      let onWrite!: () => void;
      const written = new Promise<void>((resolve) => {
        onWrite = resolve;
      });
      mockProcess.stdin.write.callsFake(() => {
        onWrite();
        return true;
      });

      const commandPromise = repl.executeCommand(command);

      // Proceed as soon as the write actually happens.
      await written;

      expect(mockProcess.stdin.write.calledOnce).to.be.true;
      const writtenValue = mockProcess.stdin.write.firstCall.args[0] as string;
      expect(writtenValue).to.equal(command + '\n');

      // Clean up the outstanding command promise.
      setTimeout(() => mockProcess.stdout.emit('data', 'Command output\n<<<END RESULTS>>>'));
      await commandPromise;
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

  describe('lazy start and idle teardown (W-24704373 / #180)', () => {
    // These tests construct their own REPL instances so they can observe spawn
    // behavior from a clean slate, independent of the primed shared fixture.

    it('does not spawn a process at construction', () => {
      repl[Symbol.dispose]();
      spawnStub.resetHistory();

      const lazyRepl = new HerokuREPL(500, 0);
      expect(spawnStub.called).to.be.false;
      expect(lazyRepl['process']).to.be.undefined;

      lazyRepl[Symbol.dispose]();
    });

    it('spawns the process lazily on the first executeCommand', () => {
      repl[Symbol.dispose]();
      spawnStub.resetHistory();

      const lazyRepl = new HerokuREPL(500, 0);
      void (async () => {
        for await (const command of lazyRepl) {
          // drain
        }
      })();

      void lazyRepl.executeCommand('apps');
      expect(spawnStub.calledOnce).to.be.true;
      expect(lazyRepl['process']).to.not.be.undefined;

      lazyRepl[Symbol.dispose]();
    });

    it('tears down a ready, idle process after the idle timeout', () => {
      repl[Symbol.dispose]();
      const clock = sinon.useFakeTimers();
      spawnStub.resetHistory();
      mockProcess.kill.resetHistory();

      const idleRepl = new HerokuREPL(500, 1000);
      idleRepl['initializeProcess']();
      expect(spawnStub.calledOnce).to.be.true;

      // Process becomes ready with an empty queue -> schedules idle teardown.
      mockProcess.stdout.emit('data', 'heroku >');
      expect(mockProcess.kill.called).to.be.false;

      clock.tick(1001);

      expect(mockProcess.kill.called).to.be.true;
      expect(idleRepl['process']).to.be.undefined;
      expect(idleRepl['isReady']).to.be.false;

      clock.restore();
      idleRepl[Symbol.dispose]();
    });

    it('does not tear down while a command is queued or in flight', () => {
      repl[Symbol.dispose]();
      const clock = sinon.useFakeTimers();
      spawnStub.resetHistory();
      mockProcess.kill.resetHistory();

      const idleRepl = new HerokuREPL(500, 1000);
      idleRepl['initializeProcess']();
      mockProcess.stdout.emit('data', 'heroku >');

      // Queue work after the idle timer was armed; the pending timer must not
      // kill a process that now has work to do.
      void idleRepl.executeCommand('apps');
      clock.tick(1001);

      expect(mockProcess.kill.called).to.be.false;
      expect(idleRepl['process']).to.not.be.undefined;

      clock.restore();
      idleRepl[Symbol.dispose]();
    });

    it('respawns the process on the next command after an idle teardown', () => {
      repl[Symbol.dispose]();
      spawnStub.resetHistory();

      const idleRepl = new HerokuREPL(500, 1000);
      idleRepl['initializeProcess']();
      expect(spawnStub.calledOnce).to.be.true;

      // Simulate an idle teardown.
      idleRepl['teardownIdleProcess']();
      expect(idleRepl['process']).to.be.undefined;

      spawnStub.resetHistory();
      void (async () => {
        for await (const command of idleRepl) {
          // drain
        }
      })();
      void idleRepl.executeCommand('apps');

      expect(spawnStub.calledOnce).to.be.true;
      expect(idleRepl['process']).to.not.be.undefined;

      idleRepl[Symbol.dispose]();
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

    it('should prefer the local heroku CLI (>= 10.10.0) over npx, without checking npx', () => {
      // heroku CLI available with version >= 10.10.0
      spawnSyncStub.withArgs('heroku', ['version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: null,
        status: 0,
        stdout: 'heroku/10.15.0 (darwin-x64) node-v18.17.0'
      });
      // npx is also available, but must not be used when a suitable local CLI exists
      spawnSyncStub.withArgs('npx', ['--version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: null,
        status: 0,
        stdout: '9.8.1'
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.deep.equal({
        cliCommand: 'heroku',
        cliArgs: ['repl']
      });
      // npx must not even be probed when a suitable local CLI is found
      expect(spawnSyncStub.calledWith('npx', ['--version'], sinon.match.any)).to.be.false;
      expect(fatalSpy.called).to.be.false;
    });

    it('should prefer the local heroku CLI when it is > 10.x', () => {
      spawnSyncStub.withArgs('heroku', ['version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: null,
        status: 0,
        stdout: 'heroku/11.0.0 (darwin-x64) node-v18.17.0'
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.deep.equal({
        cliCommand: 'heroku',
        cliArgs: ['repl']
      });
      expect(fatalSpy.called).to.be.false;
    });

    it('should fall back to npx when heroku CLI is not available', () => {
      // heroku CLI not available
      spawnSyncStub.withArgs('heroku', ['version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: new Error('heroku not found'),
        status: 1,
        stdout: ''
      });
      // npx available
      spawnSyncStub.withArgs('npx', ['--version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: null,
        status: 0,
        stdout: '9.8.1'
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.deep.equal({
        cliCommand: 'npx',
        cliArgs: ['-y', 'heroku@latest', 'repl']
      });
      expect(fatalSpy.called).to.be.false;
    });

    it('should fall back to npx when the local heroku CLI is too old (< 10.10.0)', () => {
      // heroku CLI available but version < 10.10.0 — too old for `repl`
      spawnSyncStub.withArgs('heroku', ['version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: null,
        status: 0,
        stdout: 'heroku/10.9.0 (darwin-x64) node-v18.17.0'
      });
      // npx available
      spawnSyncStub.withArgs('npx', ['--version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: null,
        status: 0,
        stdout: '9.8.1'
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.deep.equal({
        cliCommand: 'npx',
        cliArgs: ['-y', 'heroku@latest', 'repl']
      });
      expect(fatalSpy.called).to.be.false;
    });

    it('should fall back to npx when the heroku CLI version format is unexpected', () => {
      // heroku CLI available but version format is unexpected
      spawnSyncStub.withArgs('heroku', ['version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: null,
        status: 0,
        stdout: 'some unexpected output without version'
      });
      // npx available
      spawnSyncStub.withArgs('npx', ['--version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: null,
        status: 0,
        stdout: '9.8.1'
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.deep.equal({
        cliCommand: 'npx',
        cliArgs: ['-y', 'heroku@latest', 'repl']
      });
      expect(fatalSpy.called).to.be.false;
    });

    it('should fall back to npx when the heroku CLI stdout is not a string', () => {
      // heroku CLI available but stdout is not a string
      spawnSyncStub.withArgs('heroku', ['version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: null,
        status: 0,
        stdout: Buffer.from('heroku/10.15.0')
      });
      // npx available
      spawnSyncStub.withArgs('npx', ['--version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: null,
        status: 0,
        stdout: '9.8.1'
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.deep.equal({
        cliCommand: 'npx',
        cliArgs: ['-y', 'heroku@latest', 'repl']
      });
      expect(fatalSpy.called).to.be.false;
    });

    it('should emit fatalError and return null when neither heroku CLI nor npx is available', () => {
      // heroku CLI not available
      spawnSyncStub.withArgs('heroku', ['version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: new Error('heroku not found'),
        status: 1,
        stdout: ''
      });
      // npx not available
      spawnSyncStub.withArgs('npx', ['--version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: new Error('npx not found'),
        status: 1,
        stdout: ''
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.be.null;
      expect(fatalSpy.called).to.be.true;
      const mcpError = fatalSpy.firstCall.args[0];
      expect(mcpError.content[0].text).to.include('Startup error: No suitable Heroku CLI found');
    });

    it('should emit fatalError and return null when a too-old heroku CLI and no npx are available', () => {
      // heroku CLI present but too old
      spawnSyncStub.withArgs('heroku', ['version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: null,
        status: 0,
        stdout: 'heroku/10.9.0 (darwin-x64) node-v18.17.0'
      });
      // npx not available
      spawnSyncStub.withArgs('npx', ['--version'], sinon.match({ encoding: 'utf-8' })).returns({
        error: new Error('npx not found'),
        status: 1,
        stdout: ''
      });

      const result = repl['getHerokuCliCommandAndArgs']();

      expect(result).to.be.null;
      expect(fatalSpy.called).to.be.true;
      const mcpError = fatalSpy.firstCall.args[0];
      expect(mcpError.content[0].text).to.include('Startup error: No suitable Heroku CLI found');
    });
  });
});
