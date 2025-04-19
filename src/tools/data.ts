import { z } from 'zod';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleCliOutput } from '../utils/handle-cli-output.js';
import { CommandBuilder } from '../utils/command-builder.js';
import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import type { HerokuREPL } from '../repl/heroku-cli-repl.js';
import type { McpToolResponse } from '../utils/mcp-tool-response.js';

/**
 * Schema for executing PostgreSQL queries.
 */
export const pgPsqlOptionsSchema = z.object({
  command: z.string().optional().describe('SQL command. Single line. Ignored if file provided'),
  file: z.string().optional().describe('SQL file path. Ignored if command provided'),
  credential: z.string().optional().describe('credential to use'),
  app: z.string().describe('app to run command against'),
  database: z
    .string()
    .optional()
    .describe(
      'Database identifier: config var, name, ID, alias. Format: APP_NAME::DB for other apps. Default: DATABASE_URL'
    )
});

export type PgPsqlOptions = z.infer<typeof pgPsqlOptionsSchema>;

/**
 * Schema for getting database information.
 */
export const pgInfoOptionsSchema = z.object({
  app: z.string().describe('Target app name'),
  database: z
    .string()
    .optional()
    .describe('Database identifier. Format: APP_NAME::DB for other apps. Default: all databases')
});

export type PgInfoOptions = z.infer<typeof pgInfoOptionsSchema>;

/**
 * Schema for viewing active queries.
 */
export const pgPsOptionsSchema = z.object({
  app: z.string().describe('Target app name'),
  verbose: z.boolean().optional().describe('Show query plan and memory usage'),
  database: z
    .string()
    .optional()
    .describe('Database identifier. Format: APP_NAME::DB for other apps. Default: DATABASE_URL')
});

export type PgPsOptions = z.infer<typeof pgPsOptionsSchema>;

/**
 * Schema for viewing database locks.
 */
export const pgLocksOptionsSchema = z.object({
  app: z.string().describe('Target app name'),
  truncate: z.boolean().optional().describe('Truncate queries to 40 chars'),
  database: z
    .string()
    .optional()
    .describe('Database identifier. Format: APP_NAME::DB for other apps. Default: DATABASE_URL')
});

export type PgLocksOptions = z.infer<typeof pgLocksOptionsSchema>;

/**
 * Schema for viewing query statistics.
 */
export const pgOutliersOptionsSchema = z.object({
  app: z.string().describe('Target app name'),
  num: z.number().optional().describe('Number of queries to show. Default: 10'),
  reset: z.boolean().optional().describe('Reset pg_stat_statements stats'),
  truncate: z.boolean().optional().describe('Truncate queries to 40 chars'),
  database: z
    .string()
    .optional()
    .describe('Database identifier. Format: APP_NAME::DB for other apps. Default: DATABASE_URL')
});

export type PgOutliersOptions = z.infer<typeof pgOutliersOptionsSchema>;

/**
 * Schema for viewing database credentials.
 */
export const pgCredentialsOptionsSchema = z.object({
  app: z.string().describe('Target app name'),
  database: z
    .string()
    .optional()
    .describe('Database identifier. Format: APP_NAME::DB for other apps. Default: DATABASE_URL')
});

export type PgCredentialsOptions = z.infer<typeof pgCredentialsOptionsSchema>;

/**
 * Schema for terminating database processes.
 */
export const pgKillOptionsSchema = z.object({
  app: z.string().describe('Target app name'),
  pid: z.number().describe('Process ID to terminate'),
  force: z.boolean().optional().describe('Force immediate termination'),
  database: z
    .string()
    .optional()
    .describe('Database identifier. Format: APP_NAME::DB for other apps. Default: DATABASE_URL')
});

export type PgKillOptions = z.infer<typeof pgKillOptionsSchema>;

/**
 * Schema for managing database maintenance.
 */
export const pgMaintenanceOptionsSchema = z.object({
  app: z.string().describe('Target app name'),
  database: z
    .string()
    .optional()
    .describe('Database identifier. Format: APP_NAME::DB for other apps. Default: DATABASE_URL')
});

export type PgMaintenanceOptions = z.infer<typeof pgMaintenanceOptionsSchema>;

/**
 * Schema for managing database backups.
 */
export const pgBackupsOptionsSchema = z.object({
  app: z.string().describe('Target app name')
});

export type PgBackupsOptions = z.infer<typeof pgBackupsOptionsSchema>;

/**
 * Schema for upgrading database version.
 */
export const pgUpgradeOptionsSchema = z.object({
  app: z.string().describe('Target app name'),
  version: z.string().optional().describe('PostgreSQL version target'),
  confirm: z.string().optional().describe('Confirmation for destructive operation'),
  database: z
    .string()
    .optional()
    .describe('Database identifier. Format: APP_NAME::DB for other apps. Default: DATABASE_URL')
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
    'Execute SQL queries: analyze, debug, modify schema, manage data',
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
    'View database status: config, metrics, resources, health',
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
    'Monitor active queries: progress, resources, performance',
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
    'Analyze locks: blocked queries, deadlocks, concurrency',
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
    'Find resource-heavy queries: performance, patterns, optimization',
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
    'Manage access: credentials, permissions, security, monitoring',
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
    'Stop processes: stuck queries, blocking transactions, runaway operations',
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
    'Track maintenance: windows, schedules, progress, planning',
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
    'Manage backups: schedules, status, verification, recovery',
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
    'Upgrade PostgreSQL: version migration, compatibility, safety',
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
