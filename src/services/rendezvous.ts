import * as tls from 'node:tls';

type RendezvousOptions = {
  uri: URL;
  rejectUnauthorized: boolean;
  showStatus?: boolean;
  exitCode?: boolean;
  getStatus?: (state: string) => string;
  onData?: (data: string) => void;
  onStatusChange?: (status: string) => void;
};

/**
 * Implements the Heroku Rendezvous protocol for connecting to one-off dynos
 * See: https://devcenter.heroku.com/articles/one-off-dynos#rendezvous
 */
export class RendezvousConnection {
  private connection: tls.TLSSocket | null = null;
  private readonly timeout = 1000 * 60 * 60; // 1 hour timeout
  private output: string = '';
  private exitCode: number | null = null;

  /**
   * Creates a new RendezvousConnection
   *
   * @param options The options for the rendezvous connection
   */
  public constructor(private readonly options: RendezvousOptions) {}

  /**
   * Establishes a connection to the dyno using the rendezvous protocol
   * and returns the output once the dyno completes
   *
   * @returns A promise that resolves with the dyno output and exit code
   */
  public async connect(): Promise<{ output: string; exitCode: number }> {
    try {
      this.updateStatus('starting');

      this.connection = tls.connect(Number.parseInt(this.options.uri.port, 10), this.options.uri.hostname, {
        rejectUnauthorized: this.options.rejectUnauthorized
      });

      await this.setupConnection();

      // Return the captured output and exit code
      return {
        output: this.output,
        exitCode: this.exitCode ?? 0
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to establish connection');
    }
  }

  /**
   * Closes the rendezvous connection if open
   */
  public close(): void {
    if (this.connection) {
      this.connection.end();
      this.connection = null;
    }
  }

  /**
   * Sets up the connection
   *
   * @returns A promise that resolves when the connection is complete
   */
  private setupConnection(): Promise<void> {
    if (!this.connection) throw new Error('Connection not initialized');

    return new Promise((resolve, reject) => {
      this.connection!.setTimeout(this.timeout);
      this.connection!.setEncoding('utf8');

      // Setup event handlers
      this.connection!.on('connect', () => this.handleConnect());
      this.connection!.on('data', (data: string) => this.handleData(data));
      this.connection!.on('close', () => resolve());
      this.connection!.on('error', (err: Error) => reject(err));
      this.connection!.on('timeout', () => this.handleTimeout());

      // Handle process termination
      process.once('SIGINT', () => {
        this.close();
        reject(new Error('Process terminated'));
      });
    });
  }

  /**
   * Handles the initial connection setup
   */
  private handleConnect(): void {
    if (!this.connection) return;

    const pathnameWithSearchParams = this.options.uri.pathname + this.options.uri.search;
    this.connection.write(pathnameWithSearchParams.slice(1) + '\r\n', () => {
      this.updateStatus('connecting');
    });
  }

  /**
   * Handles incoming data from the connection
   * Captures both output and exit code from the dyno
   *
   * @param data The data received from the connection
   */
  private handleData(data: string): void {
    // Check for exit code in the data
    const exitCodeMatch = data.match(/\[exit\s*(\d+)\]/);
    if (exitCodeMatch) {
      this.exitCode = parseInt(exitCodeMatch[1], 10);
      // Create a new variable for the modified data
      const cleanedData = data.replace(/\[exit\s*\d+\]/, '');
      // Append to output buffer
      this.output += cleanedData;

      // Call onData callback if provided
      if (this.options.onData) {
        this.options.onData(cleanedData);
      }
    } else {
      // Append to output buffer
      this.output += data;

      // Call onData callback if provided
      if (this.options.onData) {
        this.options.onData(data);
      }
    }

    // Update status if we detect completion
    if (this.exitCode !== null) {
      this.updateStatus('complete');
    }
  }

  /**
   * Handles connection timeout events
   */
  private handleTimeout(): void {
    this.close();
    throw new Error('Connection timed out');
  }

  /**
   * Updates the connection status
   *
   * @param status The new status to set
   */
  private updateStatus(status: string): void {
    if (this.options.showStatus && this.options.onStatusChange) {
      this.options.onStatusChange(status);
    }
  }
}
