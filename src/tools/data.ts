import { z } from 'zod';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleCliOutput } from '../utils/handle-cli-output.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import type { HerokuREPL } from '../repl/heroku-cli-repl.js';
import type { McpToolResponse } from '../utils/mcp-tool-response.js';

/**
 * Schema for executing PostgreSQL queries.
 * This schema defines the structure and validation rules for running SQL queries.
 */
export const pgPsqlOptionsSchema = z.object({
  command: z
    .string()
    .optional()
    .describe(
      'SQL command to run; file is ignored if provided; must be single line; must supply either command or file'
    ),
  file: z
    .string()
    .optional()
    .describe(
      'SQL file to run; command is ignored if provided; must be an absolute path; must supply either command or file'
    ),
  credential: z.string().optional().describe('credential to use'),
  app: z.string().describe('app to run command against'),
  database: z
    .string()
    .optional()
    .describe(
      "Config var containing the connection string, unique name, ID, or alias of the database. To access another app's database, prepend the app name to the config var or alias with `APP_NAME::`. If omitted, DATABASE_URL is used."
    )
});

export type PgPsqlOptions = z.infer<typeof pgPsqlOptionsSchema>;

/**
 * Schema for getting database information.
 */
export const pgInfoOptionsSchema = z.object({
  app: z.string().describe('The name of the Heroku app whose database to inspect.'),
  database: z
    .string()
    .optional()
    .describe(
      "Config var containing the connection string, unique name, ID, or alias of the database. To access another app's database, prepend the app name to the config var or alias with `APP_NAME::`. If omitted, all databases are shown."
    )
});

export type PgInfoOptions = z.infer<typeof pgInfoOptionsSchema>;

/**
 * Schema for viewing active queries.
 */
export const pgPsOptionsSchema = z.object({
  app: z.string().describe('The name of the Heroku app whose database processes to view.'),
  verbose: z
    .boolean()
    .optional()
    .describe('When true, shows additional query details including query plan and memory usage.'),
  database: z
    .string()
    .optional()
    .describe(
      "Config var containing the connection string, unique name, ID, or alias of the database. To access another app's database, prepend the app name to the config var or alias with `APP_NAME::`. If omitted, DATABASE_URL is used."
    )
});

export type PgPsOptions = z.infer<typeof pgPsOptionsSchema>;

/**
 * Schema for viewing database locks.
 */
export const pgLocksOptionsSchema = z.object({
  app: z.string().describe('The name of the Heroku app whose database locks to view.'),
  truncate: z.boolean().optional().describe('When true, truncates queries to 40 characters.'),
  database: z
    .string()
    .optional()
    .describe(
      "Config var containing the connection string, unique name, ID, or alias of the database. To access another app's database, prepend the app name to the config var or alias with `APP_NAME::`. If omitted, DATABASE_URL is used."
    )
});

export type PgLocksOptions = z.infer<typeof pgLocksOptionsSchema>;

/**
 * Schema for viewing query statistics.
 */
export const pgOutliersOptionsSchema = z.object({
  app: z.string().describe('The name of the Heroku app whose query statistics to analyze.'),
  num: z.number().optional().describe('The number of queries to display. Defaults to 10.'),
  reset: z.boolean().optional().describe('When true, resets statistics gathered by pg_stat_statements.'),
  truncate: z.boolean().optional().describe('When true, truncates queries to 40 characters.'),
  database: z
    .string()
    .optional()
    .describe(
      "Config var containing the connection string, unique name, ID, or alias of the database. To access another app's database, prepend the app name to the config var or alias with `APP_NAME::`. If omitted, DATABASE_URL is used."
    )
});

export type PgOutliersOptions = z.infer<typeof pgOutliersOptionsSchema>;

/**
 * Schema for viewing database credentials.
 */
export const pgCredentialsOptionsSchema = z.object({
  app: z.string().describe('The name of the Heroku app whose database credentials to view.'),
  database: z
    .string()
    .optional()
    .describe(
      "Config var containing the connection string, unique name, ID, or alias of the database. To access another app's database, prepend the app name to the config var or alias with `APP_NAME::`. If omitted, DATABASE_URL is used."
    )
});

export type PgCredentialsOptions = z.infer<typeof pgCredentialsOptionsSchema>;

/**
 * Schema for terminating database processes.
 */
export const pgKillOptionsSchema = z.object({
  app: z.string().describe('The name of the Heroku app whose database process to terminate.'),
  pid: z.number().describe('The process ID to terminate, as shown by pg_ps.'),
  force: z.boolean().optional().describe('When true, forces immediate termination instead of graceful shutdown.'),
  database: z
    .string()
    .optional()
    .describe(
      "Config var containing the connection string, unique name, ID, or alias of the database. To access another app's database, prepend the app name to the config var or alias with `APP_NAME::`. If omitted, DATABASE_URL is used."
    )
});

export type PgKillOptions = z.infer<typeof pgKillOptionsSchema>;

/**
 * Schema for managing database maintenance.
 */
export const pgMaintenanceOptionsSchema = z.object({
  app: z.string().describe('Show current maintenance information for the app.'),
  database: z
    .string()
    .optional()
    .describe(
      "Config var containing the connection string, unique name, ID, or alias of the database. To access another app's database, prepend the app name to the config var or alias with `APP_NAME::`. If omitted, DATABASE_URL is used."
    )
});

export type PgMaintenanceOptions = z.infer<typeof pgMaintenanceOptionsSchema>;

/**
 * Schema for managing database backups.
 */
export const pgBackupsOptionsSchema = z.object({
  app: z.string().describe('The name of the Heroku app whose backups to manage.')
});

export type PgBackupsOptions = z.infer<typeof pgBackupsOptionsSchema>;

/**
 * Schema for upgrading database version.
 */
export const pgUpgradeOptionsSchema = z.object({
  app: z.string().describe('The name of the Heroku app whose database to upgrade.'),
  version: z.string().optional().describe('PostgreSQL version to upgrade to'),
  confirm: z.string().optional().describe('Confirmation string required for this potentially destructive operation.'),
  database: z
    .string()
    .optional()
    .describe(
      "Config var containing the connection string, unique name, ID, or alias of the database. To access another app's database, prepend the app name to the config var or alias with `APP_NAME::`. If omitted, DATABASE_URL is used."
    )
});

export type PgUpgradeOptions = z.infer<typeof pgUpgradeOptionsSchema>;

/**
 * Registers the pg:psql tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerPgPsqlTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pg_psql',
    '[DESC] Execute SQL queries against Heroku PostgreSQL database\n' +
      '[PARAM] app: <string> Target application name\n' +
      '[OPT] command: SQL to execute - single line only; file: SQL file path; credential: alternate auth; database: specific DB\n' +
      '[USAGE] Query analysis, locks investigation, schema updates\n' +
      '[RELATED] pg:ps (verify execution), pg:locks (check blocking), pg:credentials (auth)',
    pgPsqlOptionsSchema.shape,
    async (options: PgPsqlOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PG_PSQL)
        .addFlags({
          app: options.app,
          command: `"${options.command?.replaceAll('\n', ' ') ?? ''}"`,
          file: options.file,
          credential: options.credential
        })
        .addPositionalArguments({ database: options.database })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the pg:info tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerPgInfoTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pg_info',
    '[DESC] Display detailed information about a Heroku PostgreSQL database\n' +
      '[PARAM] app: <string> Target application name\n' +
      '[OPT] database: specific DB to inspect\n' +
      '[USAGE] Performance investigation, connection monitoring\n' +
      '[RELATED] pg:ps (active queries), pg:backups (database health)',
    pgInfoOptionsSchema.shape,
    async (options: PgInfoOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PG_INFO)
        .addFlags({
          app: options.app
        })
        .addPositionalArguments({ database: options.database })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the pg:ps tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerPgPsTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pg_ps',
    '[DESC] View active queries and their execution details\n' +
      '[PARAM] app: <string> Target application name\n' +
      '[OPT] verbose: detailed output; database: specific DB\n' +
      '[USAGE] Identify running queries, monitor progress, verify blocking locks\n' +
      '[RELATED] pg:locks (check blocking), pg:outliers (analyze performance)',
    pgPsOptionsSchema.shape,
    async (options: PgPsOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PG_PS)
        .addFlags({
          app: options.app,
          verbose: options.verbose
        })
        .addPositionalArguments({ database: options.database })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the pg:locks tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerPgLocksTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pg_locks',
    '[DESC] View database locks and identify blocking transactions\n' +
      '[PARAM] app: <string> Target application name\n' +
      '[OPT] truncate: shorten output; database: specific DB\n' +
      '[USAGE] Deadlock investigation, lock chain analysis\n' +
      '[RELATED] pg:ps (blocking queries), pg:psql (detailed investigation)',
    pgLocksOptionsSchema.shape,
    async (options: PgLocksOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PG_LOCKS)
        .addFlags({
          app: options.app,
          truncate: options.truncate
        })
        .addPositionalArguments({ database: options.database })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the pg:outliers tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerPgOutliersTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pg_outliers',
    '[DESC] Identify resource-intensive and long-running queries\n' +
      '[PARAM] app: <string> Target application name\n' +
      '[OPT] num: result limit; reset: clear stats; truncate: shorten display; database: specific DB\n' +
      '[USAGE] Performance analysis, query optimization\n' +
      '[TIPS] Reset periodically; Use with pg:indexes; Follow up with pg:psql',
    pgOutliersOptionsSchema.shape,
    async (options: PgOutliersOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PG_OUTLIERS)
        .addFlags({
          app: options.app,
          num: options.num?.toString(),
          reset: options.reset,
          truncate: options.truncate
        })
        .addPositionalArguments({ database: options.database })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the pg:credentials tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerPgCredentialsTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pg_credentials',
    '[DESC] Manage database connection credentials and access\n' +
      '[PARAM] app: <string> Target application name\n' +
      '[OPT] database: specific DB to manage\n' +
      '[USAGE] Setup monitoring, configure access, rotate credentials\n' +
      '[SECURITY] Rotate every 30-90 days; Use --reset for immediate rotation',
    pgCredentialsOptionsSchema.shape,
    async (options: PgCredentialsOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PG_CREDENTIALS)
        .addFlags({
          app: options.app
        })
        .addPositionalArguments({ database: options.database })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the pg:kill tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerPgKillTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pg_kill',
    '[DESC] Terminate specific database processes\n' +
      '[PARAM] app: <string> Target application name; pid: <number> Process ID to terminate\n' +
      '[OPT] force: immediate termination; database: specific DB\n' +
      '[SAFETY] Non-destructive to data; Use force cautiously; Verify PID with pg:ps\n' +
      '[USAGE] Stop long queries, clear stuck processes',
    pgKillOptionsSchema.shape,
    async (options: PgKillOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PG_KILL)
        .addFlags({
          app: options.app,
          force: options.force
        })
        .addPositionalArguments({
          pid: options.pid.toString(),
          database: options.database
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the pg:maintenance tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerPgMaintenanceTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pg_maintenance',
    '[DESC] Show current maintenance information\n' +
      '[PARAM] app: <string> Target application name\n' +
      '[RELATED] pg_info (health), pg_backups (safety)',
    pgMaintenanceOptionsSchema.shape,
    async (options: PgMaintenanceOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PG_MAINTENANCE)
        .addFlags({
          app: options.app
        })
        .addPositionalArguments({ database: options.database })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the pg:backups tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerPgBackupsTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pg_backups',
    '[DESC] Manage database backups and schedules\n' +
      '[PARAM] app: <string> Target application name\n' +
      '[USAGE] List database backups for the app.',
    pgBackupsOptionsSchema.shape,
    async (options: PgBackupsOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PG_BACKUPS)
        .addFlags({
          app: options.app
        })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};

/**
 * Registers the pg:upgrade tool with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with
 * @param herokuRepl - The Heroku REPL instance for executing commands
 */
export const registerPgUpgradeTool = (server: McpServer, herokuRepl: HerokuREPL): void => {
  server.tool(
    'pg_upgrade',
    '[DESC] Upgrade a Heroku PostgreSQL database to a newer version\n' +
      '[PARAM] app: <string> Target application name\n' +
      '[OPT] version: new version; confirm: confirmation string; database: specific DB\n' +
      '[USAGE] Critical operations workflow: 1) Check current version with pg:info',
    pgUpgradeOptionsSchema.shape,
    async (options: PgUpgradeOptions): Promise<McpToolResponse> => {
      const command = new CommandBuilder(TOOL_COMMAND_MAP.PG_UPGRADE)
        .addFlags({
          app: options.app,
          version: options.version,
          confirm: options.confirm
        })
        .addPositionalArguments({ database: options.database })
        .build();

      const output = await herokuRepl.executeCommand(command);
      return handleCliOutput(output);
    }
  );
};
