#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import * as pjson from '../package.json' with { type: 'json' };
import * as apps from './tools/apps.js';
import * as spaces from './tools/spaces.js';
import * as teams from './tools/teams.js';
import * as addons from './tools/addons.js';
import * as data from './tools/data.js';
import * as maintenance from './tools/maintenance.js';
import * as ps from './tools/ps.js';
import * as pipelines from './tools/pipelines.js';
import * as deployToHeroku from './tools/deploy-to-heroku.js';
import * as logs from './tools/logs.js';
import * as ai from './tools/ai.js';
import * as devCenterResource from './resources/dev-center-resource.js';

import { HerokuREPL } from './repl/heroku-cli-repl.js';
import { isPluginInstalled } from './utils/plugin-detector.js';

const VERSION = pjson.default.version;

const server = new McpServer(
  { name: 'Heroku MCP Server', version: VERSION },
  {
    capabilities: {
      tools: {
        listChanged: true
      }
    }
  }
);
const requestTimeout = isNaN(Number(process.env.MCP_SERVER_REQUEST_TIMEOUT))
  ? 15_000
  : Number(process.env.MCP_SERVER_REQUEST_TIMEOUT);
// Tear down the underlying Heroku CLI REPL process after this many ms of
// inactivity so an idle server does not keep a CLI process spinning
// (W-24704373 / #180). Defaults to 10 minutes; set to 0 to disable idle teardown.
const idleTimeout = isNaN(Number(process.env.MCP_SERVER_IDLE_TIMEOUT))
  ? 600_000
  : Number(process.env.MCP_SERVER_IDLE_TIMEOUT);
const herokuRepl = new HerokuREPL(requestTimeout, idleTimeout);

// Log MCP-formatted fatal errors but do NOT exit. With lazy start + idle
// respawn (W-24704373 / #180) a fatalError can now fire mid-session on a
// transient CLI failure; the REPL settles the in-flight command with the error
// text, so the client gets a tool error and the server stays up to retry on the
// next call. Exiting here would crash the whole server on a single bad respawn.
herokuRepl.on('fatalError', (mcpError) => {
  process.stderr.write(JSON.stringify(mcpError) + '\n');
});

// Clean up the Heroku CLI REPL process on shutdown so it is not left running as
// an orphan when the MCP client terminates the server (W-24704373 / #180).
const shutdown = (): void => {
  herokuRepl[Symbol.dispose]();
  process.exit(0);
};
for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) {
  process.once(signal, shutdown);
}

// App-related tools
apps.registerListAppsTool(server, herokuRepl);
apps.registerGetAppInfoTool(server, herokuRepl);
apps.registerCreateAppTool(server, herokuRepl);
apps.registerRenameAppTool(server, herokuRepl);

// Maintenance mode tools
maintenance.registerMaintenanceOnTool(server, herokuRepl);
maintenance.registerMaintenanceOffTool(server, herokuRepl);

// Logs tools
logs.registerGetAppLogsTool(server, herokuRepl);

// Space-related tools
spaces.registerListPrivateSpacesTool(server, herokuRepl);

// Team-related tools
teams.registerListTeamsTool(server, herokuRepl);

// Add-on related tools
addons.registerListAddonsTool(server, herokuRepl);
addons.registerGetAddonInfoTool(server, herokuRepl);
addons.registerCreateAddonTool(server, herokuRepl);
addons.registerListAddonServicesTool(server, herokuRepl);
addons.registerListAddonPlansTool(server, herokuRepl);

// PostgreSQL-related tools
data.registerPgPsqlTool(server, herokuRepl);
data.registerPgInfoTool(server, herokuRepl);
data.registerPgPsTool(server, herokuRepl);
data.registerPgLocksTool(server, herokuRepl);
data.registerPgOutliersTool(server, herokuRepl);
data.registerPgCredentialsTool(server, herokuRepl);
data.registerPgKillTool(server, herokuRepl);
data.registerPgMaintenanceTool(server, herokuRepl);
data.registerPgBackupsTool(server, herokuRepl);
data.registerPgUpgradeTool(server, herokuRepl);

// Process-related tools
ps.registerPsListTool(server, herokuRepl);
ps.registerPsScaleTool(server, herokuRepl);
ps.registerPsRestartTool(server, herokuRepl);

// Pipelines-related tools
pipelines.registerPipelinesCreateTool(server, herokuRepl);
pipelines.registerPipelinesPromoteTool(server, herokuRepl);
pipelines.registerPipelinesListTool(server, herokuRepl);
pipelines.registerPipelinesInfoTool(server, herokuRepl);

// Deploy-to-Heroku tool
deployToHeroku.registerDeployToHerokuTool(server);
deployToHeroku.registerDeployOneOffDynoTool(server);

// AI-related tools (only register if plugin is installed)
const hasAiPlugin = isPluginInstalled('@heroku/plugin-ai');
if (hasAiPlugin) {
  process.stderr.write('[Plugin Check] @heroku/plugin-ai: INSTALLED - Registering AI tools\n');
  ai.registerListAiAvailableModelsTool(server, herokuRepl);
  ai.registerProvisionAiModelTool(server, herokuRepl);
  ai.registerMakeAiInferenceTool(server, herokuRepl);
} else {
  process.stderr.write('[Plugin Check] @heroku/plugin-ai: NOT INSTALLED - Skipping AI tools\n');
}

// Register the Dev Center resource
devCenterResource.registerDevCenterResource(server);

/**
 * Run the server
 */
export const runServer = async (): Promise<void> => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('Heroku MCP Server running on stdio');
  /**
   * Hook to intercept all command results before they are
   * sent back to the LLM. This is useful for logging
   * or modifying command results (not-implemented).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const command of herokuRepl) {
    // do nothing until logger is implemented
  }
};
