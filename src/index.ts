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
import { HerokuSDK } from '@heroku/sdk';
import { appExtensions } from '@heroku/sdk/extensions/platform';
import { AppSdk } from './tools/apps.js';
import { MaintenanceSdk } from './tools/maintenance.js';

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
const herokuRepl = new HerokuREPL(requestTimeout);

const herokuSdk = new HerokuSDK({ extensions: [appExtensions] });

const appSdk: AppSdk = {
  list: () => herokuSdk.platform.app.list(),
  listOwnedAndCollaborated: () => herokuSdk.platform.app.listOwnedAndCollaborated('~'),
  listByTeam: (teamIdentity) => herokuSdk.platform.teamApp.listByTeam(teamIdentity),
  info: (appIdentity) => herokuSdk.platform.app.info(appIdentity),
  create: (opts) => herokuSdk.platform.app.create(opts),
  createInTeam: (opts) => herokuSdk.platform.teamApp.create(opts),
  update: (appIdentity, body) => herokuSdk.platform.app.update(appIdentity, body)
};

const maintenanceSdk: MaintenanceSdk = {
  enableMaintenance: (appIdentity) => herokuSdk.platform.app.enableMaintenance(appIdentity),
  disableMaintenance: (appIdentity) => herokuSdk.platform.app.disableMaintenance(appIdentity)
};

// Listen for MCP-formatted fatal startup errors
herokuRepl.on('fatalError', (mcpError) => {
  process.stderr.write(JSON.stringify(mcpError) + '\n');
  process.exit(1);
});

// App-related tools
apps.registerListAppsTool(server, appSdk);
apps.registerGetAppInfoTool(server, appSdk);
apps.registerCreateAppTool(server, appSdk);
apps.registerUpdateAppTool(server, appSdk);

// Maintenance mode tools
maintenance.registerMaintenanceOnTool(server, maintenanceSdk);
maintenance.registerMaintenanceOffTool(server, maintenanceSdk);

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
