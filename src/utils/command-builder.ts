/**
 * Characters that are not permitted in a flag value or positional argument.
 *
 * Each built command is delivered to the Heroku CLI as a single line — the REPL
 * writes `command + '\n'` to the CLI process's stdin (see `HerokuREPL`). Because
 * commands are line-delimited, a value that spans multiple lines would not be
 * handled as a single, self-contained value. There is no legitimate reason for a
 * flag value or positional argument to contain a line break, so we apply strict
 * input validation and reject them.
 */
const LINE_BREAK_PATTERN = /[\r\n]/;

/**
 * A builder class for constructing Heroku CLI commands with flags and positional arguments.
 * This class provides a fluent interface for building command-line arguments in a structured way.
 */
export class CommandBuilder {
  private baseCommand: string;
  private flags: string[] = [];
  private args: string[] = [];

  /**
   * Creates a new CommandBuilder instance.
   *
   * @param baseCommand - The base Heroku CLI command to execute (e.g., 'apps', 'apps:create')
   */
  public constructor(baseCommand: string) {
    this.baseCommand = baseCommand;
  }

  /**
   * Validates that a value is a single line, as required for a well-formed command.
   *
   * @param kind - Whether the value is a flag value or a positional argument (for the error message).
   * @param name - The flag/argument name the value is associated with (for the error message).
   * @param value - The value to validate.
   * @throws {Error} If the value contains a carriage return or line feed.
   */
  private static assertNoLineBreaks(kind: 'argument' | 'flag', name: string, value: string): void {
    if (LINE_BREAK_PATTERN.test(value)) {
      throw new Error(
        `Invalid ${kind} value for "${name}": line breaks (CR/LF) are not allowed. Commands are sent one per line to the Heroku CLI, so a value must be contained on a single line.`
      );
    }
  }

  /**
   * Adds command-line flags to the command.
   *
   * @param flags - An object containing flag names and their values. Boolean flags are added without values,
   * while string flags are added with their values.
   * @returns The builder instance for method chaining
   */
  public addFlags(flags: Record<string, boolean | string | undefined>): this {
    for (const [flag, value] of Object.entries(flags)) {
      if (value) {
        if (typeof value === 'boolean') this.flags.push(`--${flag}`);
        else {
          CommandBuilder.assertNoLineBreaks('flag', flag, value);
          this.flags.push(`--${flag}=${value}`);
        }
      }
    }
    return this;
  }

  /**
   * Adds positional arguments to the command.
   *
   * @param args - An object containing argument names and their values. Only values are used in the final command.
   * @returns The builder instance for method chaining
   */
  public addPositionalArguments(args: Record<string, string | undefined>): this {
    for (const [name, value] of Object.entries(args)) {
      if (value) {
        CommandBuilder.assertNoLineBreaks('argument', name, value);
        this.args.push(value);
      }
    }
    return this;
  }

  /**
   * Builds and returns the complete command string.
   *
   * @returns A string representing the command with all flags and arguments
   */
  public build(): string {
    let command = this.baseCommand;
    if (this.flags.length > 0) command += ` ${this.flags.join(' ')}`;
    if (this.args.length > 0) command += ` -- ${this.args.join(' ')}`;
    return command;
  }
}
