import { spawn, type ChildProcess, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import * as pjson from '../../package.json' with { type: 'json' };
import { handleCliOutput } from '../utils/handle-cli-output.js';

type CommandQueueItem = { command: string; promise: Promise<string>; resolver: (value: string) => void };
const COMMAND_END_RESULTS_MESSAGE = '<<<END RESULTS>>>';
const READY_MESSAGE = 'heroku >';
const VERSION = pjson.default.version;

/**
 * A class that manages a Heroku CLI REPL process
 * and allows for durably executing commands via a queue.
 *
 * Durability is achieved by guaranteeing that commands are
 * executed in order and that the REPL process is restarted
 * if it exits unexpectedly, experiences an error, or times out
 * during command execution.
 *
 * A command that fails to complete will not be retried but
 * all output leading up to the failure is returned to the caller
 * and the REPL process is restarted. Any commands that remained in
 * the queue prior to the error will not be affected and execution
 * will continue once the new process is ready for input.
 *
 * If the REPL process is aborted or disposed of intentionally,
 * it will not be restarted and a new instance should be created.
 *
 * This maintains a single Heroku CLI process.
 */
export class HerokuREPL extends EventEmitter {
  public static spawn: typeof spawn = spawn;
  public static spawnSync: typeof spawnSync = spawnSync;
  public isProcessingCommand: boolean = false;
  public isReady: boolean = false;

  private process: ChildProcess | undefined;
  private buffer: string = '';
  private commandQueue = [] as CommandQueueItem[];
  private abortController = new AbortController();
  private pauseIterator: Promise<void> | undefined;
  private pauseIteratorResolver: (() => void) | undefined;
  private readonly commandTimeout: number;
  private commandTimeoutId: NodeJS.Timeout | undefined;
  private readonly idleTimeout: number;
  private idleTimeoutId: NodeJS.Timeout | undefined;
  private readonly userAgent: string = `Heroku-MCP-Server/${VERSION} (${process.platform}; ${process.arch}; node/${process.version})`;

  /**
   * Create a new HerokuREPL instance
   *
   * @param commandTimeout the timeout for command execution
   * @param idleTimeout ms of inactivity after which the idle REPL process is torn
   *   down so it stops consuming CPU (W-24704373 / #180). 0 disables idle teardown.
   */
  public constructor(commandTimeout = 15_000, idleTimeout = 300_000) {
    super();
    this.commandTimeout = commandTimeout;
    this.idleTimeout = idleTimeout;
    this.pauseQueue();
    // The REPL process is started lazily on the first command (see executeCommand)
    // and torn down after a period of inactivity, so an idle or never-used server
    // does not keep a Heroku CLI process spinning (W-24704373 / #180).
    this.abortController.signal.addEventListener('abort', this.onAbort);
  }

  /**
   * Clean up the process when the instance is disposed
   */
  public [Symbol.dispose](): void {
    this.abortController.abort();
  }

  /**
   * async iterator that yields the commands being executed
   *
   * @returns An async iterator that yields the commands being executed
   * @yields {Promise<string>} the command being executed
   */
  public async *[Symbol.asyncIterator](): AsyncIterableIterator<string> {
    while (!this.abortController.signal.aborted) {
      await this.pauseIterator;
      const [nextCommand] = this.commandQueue;
      if (!nextCommand || !this.isReady) {
        this.pauseQueue();
        continue;
      }
      this.buffer = '';
      this.isProcessingCommand = true;
      this.process?.stdin?.write(nextCommand.command + '\n');

      this.setCommandTimeout();

      yield nextCommand.promise;
    }
  }

  /**
   * Adds a command to the queue for processing
   *
   * @param command the full command to execute in the Heroku CLI including all flags and args
   * @returns a promise that resolves when the command is complete
   */
  public async executeCommand(command: string): Promise<string> {
    if (this.abortController.signal.aborted) {
      throw new Error('REPL process has been aborted and cannot execute commands');
    }
    // A command cancels any pending idle teardown and lazily (re)starts the REPL
    // process if it was never started or was torn down while idle (W-24704373 / #180).
    this.clearIdleTimeout();
    this.ensureProcess();
    // Replace with Promise.withResolvers once we move to node 22
    let resolver!: (value: string) => void;
    const commandPromise = new Promise<string>((resolve) => {
      resolver = resolve;
    });
    this.commandQueue.push({ command, promise: commandPromise, resolver });
    this.pauseIteratorResolver?.();
    return commandPromise;
  }

  /**
   * Determines the appropriate CLI command and arguments to use for spawning the Heroku REPL process.
   *
   * Prefers a locally installed, new-enough (>= 10.10.0) `heroku` CLI over `npx` because:
   *  - it avoids the npx cold-start penalty (npm registry resolution, often 5-15s) on every spawn,
   *  - it works offline and in air-gapped / firewalled corporate environments where
   *    `registry.npmjs.org` is unreachable, and
   *  - it avoids the Windows `npx` spawn failure where the extracted, extensionless `bin/run`
   *    script cannot be spawned without a `.cmd`/`.exe` shim (ENOENT).
   *
   * Falls back to `npx -y heroku@latest repl` only when no suitable local CLI is found
   * (missing, too old, or an unexpected `version` output). Emits a fatalError and returns
   * null only when neither a usable local CLI nor npx is available.
   *
   * @returns An object with cliCommand and cliArgs, or null if no CLI is available.
   */
  private getHerokuCliCommandAndArgs(): { cliCommand: string; cliArgs: string[] } | null {
    // Prefer a locally installed heroku CLI.
    // On Windows, we need to use shell: true to find heroku.cmd
    const herokuCheck = HerokuREPL.spawnSync('heroku', ['version'], {
      encoding: 'utf-8',
      shell: process.platform === 'win32'
    });
    if (!herokuCheck.error && herokuCheck.status === 0 && typeof herokuCheck.stdout === 'string') {
      const versionMatch = herokuCheck.stdout.match(/heroku\/(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        const [major, minor] = versionMatch[1].split('.').map(Number);
        if (major > 10 || (major === 10 && minor >= 10)) {
          return { cliCommand: 'heroku', cliArgs: ['repl'] };
        }
        // Local CLI is present but too old for `repl` — fall through to npx@latest.
      }
    }

    // Fall back to npx, which fetches the latest Heroku CLI.
    // On Windows, we need to use shell: true to find npx.cmd
    const npxCheck = HerokuREPL.spawnSync('npx', ['--version'], {
      encoding: 'utf-8',
      shell: process.platform === 'win32'
    });
    if (!npxCheck.error && npxCheck.status === 0) {
      return { cliCommand: 'npx', cliArgs: ['-y', 'heroku@latest', 'repl'] };
    }

    this.emit(
      'fatalError',
      handleCliOutput(
        'Startup error: No suitable Heroku CLI found. Install the Heroku CLI (version 10.10.0 or higher) in your PATH, or make npx available. Please install one of them.'
      )
    );
    return null;
  }

  /**
   * Initializes the Heroku CLI process in REPL mode and sets up
   * event listeners for stdout and stderr.
   *
   * This method is called when the instance is created
   * and when the process is closed earlier than expected.
   * If the process is aborted or dispose is called,
   * REPL will be killed and it will not be restarted.
   */
  private initializeProcess(): void {
    this.isReady = false;
    this.clearIdleTimeout();
    if (this.abortController.signal.aborted) {
      return;
    }

    const cliInfo = this.getHerokuCliCommandAndArgs();
    if (!cliInfo) {
      return;
    }
    const { cliCommand, cliArgs } = cliInfo;

    if (this.process) {
      this.process.removeAllListeners();
      this.process.kill();
      this.process = undefined;
    }

    try {
      this.process = HerokuREPL.spawn(cliCommand, cliArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        signal: this.abortController.signal,
        shell: process.platform === 'win32',
        env: {
          ...process.env,
          HEROKU_MCP_MODE: 'true',
          HEROKU_MCP_SERVER_VERSION: VERSION,
          HEROKU_HEADERS: JSON.stringify({
            'User-Agent': this.userAgent
          })
        }
      });
    } catch (err) {
      // Emit MCP error and abort
      this.emit('fatalError', handleCliOutput(`Startup error: ${(err as Error).message}`));
      return;
    }

    this.process.once('error', (err: Error) => {
      this.emit('fatalError', handleCliOutput(`Startup error: ${err.message}`));
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      // Detect old CLI warning and emit MCP error
      if (output.includes('Warning: --repl is not a heroku command.')) {
        this.emit(
          'fatalError',
          handleCliOutput(
            'Startup error: Your Heroku CLI version does not support --repl mode. Please upgrade to the latest Heroku CLI.'
          )
        );
        return;
      }
      if (output.includes(READY_MESSAGE)) {
        this.isReady = true;
        this.pauseIteratorResolver?.();
        // If the process came up ready with nothing to do, start the idle countdown.
        if (!this.isProcessingCommand && this.commandQueue.length === 0) {
          this.scheduleIdleTimeout();
        }
      }
      this.handleOutput(output);
    });

    // We're capturing this data and sending it along
    // to subscribers because the CLI does provide
    // information on this stream. Output here does
    // not always indicate an error has occurred
    this.process.stderr?.on('data', (data: Buffer) => {
      this.buffer += data.toString().trim();
    });

    // If the process was aborted, don't restart it
    // Aborting the process is handled by the dispose method
    // and is the only reason the process should be killed
    this.process.on('close', (code: number) => {
      if (this.abortController.signal.aborted) {
        return;
      }
      this.pauseQueue();
      // If the process was closed unexpectedly, restart it
      // Otherwise, wait for a second and try again
      if (code !== 0) {
        // We can assume the process was closed unexpectedly
        // and we should attempt to determine the cause
        // and pass this info back to the LLM for processing
        // along with the output
        this.buffer += `\n\nHeroku CLI process closed unexpectedly with code ${code}. Restarting...`;
        void this.initializeProcess();
      } else {
        // The process was closed normally but this could be
        // from a rogue command or a user aborting the parent process
        setTimeout(() => void this.initializeProcess(), 1000);
      }
    });
  }

  /**
   * Handles the output from the Heroku CLI process.
   *
   * @param output The output from the Heroku CLI process
   */
  private handleOutput(output: string): void {
    this.buffer += output;

    if (this.isProcessingCommand) {
      this.setCommandTimeout();
    }

    // Check if command execution is complete
    if (this.buffer.includes(COMMAND_END_RESULTS_MESSAGE) && this.isProcessingCommand) {
      const result = this.buffer.trim();
      this.buffer = '';
      this.isProcessingCommand = false;
      clearTimeout(this.commandTimeoutId);
      const currentCommand = this.commandQueue.shift();
      if (currentCommand) {
        currentCommand.resolver(result);
      }
      if (this.commandQueue.length === 0) {
        this.pauseQueue();
        // Nothing left to run — begin the idle countdown to tear down the process.
        this.scheduleIdleTimeout();
      }
    }
  }

  /**
   * Waits for the next command to be added to the queue
   * or for the REPL to be ready for input
   */
  private pauseQueue(): void {
    // Replace with Promise.withResolvers once we move to node 22
    this.pauseIterator = new Promise((resolve) => {
      this.pauseIteratorResolver = resolve;
    });
  }

  /**
   * Sets a timeout for command execution
   */
  private setCommandTimeout(): void {
    clearTimeout(this.commandTimeoutId);
    this.commandTimeoutId = setTimeout(() => {
      // If a timeout occurs, we need to restart the process
      // in case it's in a bad state or an error occurred
      // that we can't recover from
      void this.initializeProcess();
      this.handleOutput(`The command failed to complete in ${this.commandTimeout}ms\n${COMMAND_END_RESULTS_MESSAGE}\n`);
    }, this.commandTimeout);
  }

  /**
   * Ensures a REPL process exists, lazily (re)starting it on demand.
   *
   * The process is not started at construction time and is torn down after a
   * period of inactivity, so this is called when a command arrives to bring the
   * process back up if it is not currently running (W-24704373 / #180).
   */
  private ensureProcess(): void {
    if (!this.process && !this.abortController.signal.aborted) {
      this.initializeProcess();
    }
  }

  /**
   * (Re)starts the idle teardown timer. When it fires, an idle REPL process is
   * killed so it stops consuming CPU (W-24704373 / #180). A value of 0 (or less)
   * disables idle teardown entirely.
   */
  private scheduleIdleTimeout(): void {
    this.clearIdleTimeout();
    if (this.idleTimeout > 0) {
      this.idleTimeoutId = setTimeout(() => this.teardownIdleProcess(), this.idleTimeout);
      // Don't let the idle timer by itself keep the Node.js process alive.
      this.idleTimeoutId.unref?.();
    }
  }

  /**
   * Clears any pending idle teardown timer.
   */
  private clearIdleTimeout(): void {
    clearTimeout(this.idleTimeoutId);
    this.idleTimeoutId = undefined;
  }

  /**
   * Tears down the REPL process once it has been idle for the configured timeout.
   * The process is killed (not aborted) so it can be lazily restarted by the next
   * command. Does nothing if a command is in flight or still queued.
   */
  private teardownIdleProcess(): void {
    if (this.isProcessingCommand || this.commandQueue.length > 0) {
      return;
    }
    this.isReady = false;
    this.pauseQueue();
    if (this.process) {
      // Remove listeners first so the 'close' handler does not treat this
      // intentional teardown as an unexpected exit and restart the process.
      this.process.removeAllListeners();
      this.process.kill();
      this.process = undefined;
    }
  }

  /**
   * Handles the abort event
   */
  private onAbort = (): void => {
    this.commandQueue.length = 0;
    this.pauseIteratorResolver?.();
    clearTimeout(this.commandTimeoutId);
    this.clearIdleTimeout();
  };
}
