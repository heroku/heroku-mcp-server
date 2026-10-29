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
  private restartTimeoutId: NodeJS.Timeout | undefined;
  private pauseIteratorResolved = false;
  private resolvedCli: { cliCommand: string; cliArgs: string[] } | undefined;
  private readonly userAgent: string = `Heroku-MCP-Server/${VERSION} (${process.platform}; ${process.arch}; node/${process.version})`;

  /**
   * Create a new HerokuREPL instance
   *
   * @param commandTimeout the timeout for command execution
   * @param idleTimeout ms of inactivity after which the idle REPL process is torn
   *   down so it stops consuming CPU (W-24704373 / #180). 0 disables idle teardown.
   */
  public constructor(commandTimeout = 15_000, idleTimeout = 600_000) {
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
    // Replace with Promise.withResolvers once we move to node 22
    let resolver!: (value: string) => void;
    const commandPromise = new Promise<string>((resolve) => {
      resolver = resolve;
    });
    // Enqueue BEFORE (re)starting the process so that a synchronous startup
    // failure (no suitable CLI, spawn throw) can settle this command's promise
    // with an error instead of leaving the caller hanging (see handleFatal).
    this.commandQueue.push({ command, promise: commandPromise, resolver });
    this.ensureProcess();
    this.pauseIteratorResolver?.();
    // Bound the wait even if the process spawns but never becomes ready to
    // dispatch (e.g. it never prints the prompt). Normally the async iterator
    // re-arms this on dispatch; arming here covers the never-ready case so the
    // command times out and restarts instead of hanging forever.
    if (!this.isReady && this.commandQueue.length > 0) {
      this.setCommandTimeout();
    }
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
    // Reuse the previously resolved CLI. Idle teardown respawns the process
    // (W-24704373 / #180), and re-running the blocking spawnSync probes on every
    // respawn would add latency to the hot path. The resolution does not change
    // within a process lifetime, so cache the first successful result. Failures
    // are not cached so a transient probe failure can recover on the next call.
    if (this.resolvedCli) {
      return this.resolvedCli;
    }

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
          this.resolvedCli = { cliCommand: 'heroku', cliArgs: ['repl'] };
          return this.resolvedCli;
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
      this.resolvedCli = { cliCommand: 'npx', cliArgs: ['-y', 'heroku@latest', 'repl'] };
      return this.resolvedCli;
    }

    this.handleFatal(
      'Startup error: No suitable Heroku CLI found. Install the Heroku CLI (version 10.10.0 or higher) in your PATH, or make npx available. Please install one of them.'
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
    this.clearRestartTimeout();
    if (this.abortController.signal.aborted) {
      return;
    }

    const cliInfo = this.getHerokuCliCommandAndArgs();
    if (!cliInfo) {
      return;
    }
    const { cliCommand, cliArgs } = cliInfo;

    if (this.process) {
      this.killChild(this.process);
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
      // Settle the queued command(s) with the error and surface it; do not exit.
      this.handleFatal(`Startup error: ${(err as Error).message}`);
      return;
    }

    this.process.once('error', (err: Error) => {
      this.handleFatal(`Startup error: ${err.message}`);
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      // Detect old CLI warning and surface it as a fatal error
      if (output.includes('Warning: --repl is not a heroku command.')) {
        this.handleFatal(
          'Startup error: Your Heroku CLI version does not support --repl mode. Please upgrade to the latest Heroku CLI.'
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
        // from a rogue command or a user aborting the parent process.
        // Track the timer so an idle teardown / abort can cancel a pending
        // restart, and unref it so it can't by itself keep Node alive.
        this.restartTimeoutId = setTimeout(() => void this.initializeProcess(), 1000);
        this.restartTimeoutId.unref?.();
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
    // Idempotent on purpose: if the async iterator is already parked on an
    // unresolved pauseIterator promise, keep it. Replacing it would orphan the
    // promise the iterator is awaiting, so a later resolver call would wake a
    // promise nobody is listening to and the queued command would never be
    // written to stdin — the respawn/close hang this class has hit twice
    // (W-24704373). Only mint a fresh promise once the current one has resolved.
    if (this.pauseIterator && !this.pauseIteratorResolved) {
      return;
    }
    this.pauseIteratorResolved = false;
    // Replace with Promise.withResolvers once we move to node 22
    this.pauseIterator = new Promise((resolve) => {
      this.pauseIteratorResolver = () => {
        this.pauseIteratorResolved = true;
        resolve();
      };
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
      // Settle the head command directly rather than injecting a synthetic END
      // marker through handleOutput: the latter only resolves when a command is
      // actively processing, so a command that was queued but never dispatched
      // (the process spawned but never printed the prompt) would hang.
      this.failHeadCommand(`The command failed to complete in ${this.commandTimeout}ms`);
    }, this.commandTimeout);
  }

  /**
   * Resolves the command at the head of the queue with the given (error) text
   * and resets per-command state. Used by the command-timeout path so a stalled
   * or never-dispatched command settles instead of hanging.
   */
  private failHeadCommand(message: string): void {
    clearTimeout(this.commandTimeoutId);
    this.isProcessingCommand = false;
    this.buffer = '';
    const head = this.commandQueue.shift();
    head?.resolver(message);
    if (this.commandQueue.length === 0) {
      this.pauseQueue();
      this.scheduleIdleTimeout();
    }
  }

  /**
   * Surfaces a fatal/startup error and settles every pending command with it, so
   * a transient respawn failure returns an error to the caller instead of
   * hanging the request (the server stays up and can retry on the next command).
   *
   * @param message the error text to surface and resolve pending commands with
   */
  private handleFatal(message: string): void {
    this.emit('fatalError', handleCliOutput(message));
    this.failPendingCommands(message);
  }

  /**
   * Resolves every queued command with the given (error) text and resets
   * per-command state. The iterator is left parked on its current promise.
   *
   * @param message the text to resolve each pending command with
   */
  private failPendingCommands(message: string): void {
    clearTimeout(this.commandTimeoutId);
    this.isProcessingCommand = false;
    this.buffer = '';
    while (this.commandQueue.length > 0) {
      this.commandQueue.shift()?.resolver(message);
    }
    this.pauseQueue();
  }

  /**
   * Tears down a child process we own. Detaches only the listeners we added
   * (not Node's internal 'exit' handler, which spawn({signal}) uses to release
   * its AbortSignal listener — removing it leaks one listener + child reference
   * per respawn) and silences late output so a stale 'heroku >' can't mark a new
   * process ready and a late 'error' (e.g. a failed kill) can't go unhandled.
   *
   * @param child the child process to tear down
   */
  private killChild(child: ChildProcess): void {
    child.removeAllListeners('close');
    child.removeAllListeners('error');
    // Keep an error sink so a post-kill 'error' doesn't become an uncaught throw.
    child.on('error', () => {});
    child.stdout?.removeAllListeners('data');
    child.stderr?.removeAllListeners('data');
    if (process.platform === 'win32' && typeof child.pid === 'number') {
      // shell: true on Windows means `child` is cmd.exe; child.kill() leaves the
      // heroku/node grandchild running. Kill the whole tree (W-24704374).
      try {
        HerokuREPL.spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f']);
      } catch {
        // Fall through to child.kill() below.
      }
    }
    child.kill();
  }

  /**
   * Clears any pending unexpected-close restart timer.
   */
  private clearRestartTimeout(): void {
    clearTimeout(this.restartTimeoutId);
    this.restartTimeoutId = undefined;
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
    // Cancel any pending unexpected-close restart so it can't respawn the
    // process we are about to intentionally tear down.
    this.clearRestartTimeout();
    // NB: do NOT call pauseQueue() here. The async iterator is already parked on
    // the current `pauseIterator` promise (created when the last command drained
    // the queue). pauseQueue() is now idempotent and would no-op, but leaving the
    // parked promise untouched makes the intent explicit: the next executeCommand
    // resolves the exact promise the iterator is awaiting, so the respawned
    // process receives the queued command instead of hanging (W-24704373).
    if (this.process) {
      // killChild detaches our listeners first so the 'close' handler does not
      // treat this intentional teardown as an unexpected exit and restart.
      this.killChild(this.process);
      this.process = undefined;
    }
  }

  /**
   * Handles the abort event
   */
  private onAbort = (): void => {
    // Settle any in-flight/queued commands so their awaiters don't hang when the
    // instance is disposed. (The signal-handler dispose path exits the process,
    // but a programmatic dispose should not strand pending callers.)
    while (this.commandQueue.length > 0) {
      this.commandQueue.shift()?.resolver('The REPL process was shut down before the command completed.');
    }
    this.pauseIteratorResolver?.();
    clearTimeout(this.commandTimeoutId);
    this.clearRestartTimeout();
    this.clearIdleTimeout();
  };
}
