import { expect } from 'chai';
import sinon from 'sinon';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HerokuREPL } from '../repl/heroku-cli-repl.js';
import * as addons from '../tools/addons.js';
import * as ai from '../tools/ai.js';
import * as apps from '../tools/apps.js';
import * as data from '../tools/data.js';
import * as deployToHeroku from '../tools/deploy-to-heroku.js';
import * as logs from '../tools/logs.js';
import * as maintenance from '../tools/maintenance.js';
import * as pipelines from '../tools/pipelines.js';
import * as ps from '../tools/ps.js';
import * as spaces from '../tools/spaces.js';
import * as teams from '../tools/teams.js';
import { destructiveTool, readOnlyTool, writeTool } from './tool-annotations.js';

const READ_ONLY_TOOLS = [
  'list_apps',
  'get_app_info',
  'get_app_logs',
  'list_private_spaces',
  'list_teams',
  'list_addons',
  'get_addon_info',
  'list_addon_services',
  'list_addon_plans',
  'pg_info',
  'pg_ps',
  'pg_locks',
  'pg_credentials',
  'pg_maintenance',
  'pg_backups',
  'ps_list',
  'pipelines',
  'pipelines_list',
  'pipelines_info',
  'list_ai_available_models'
];

const WRITE_TOOLS = [
  'create_app',
  'create_addon',
  'maintenance_off',
  'pipelines_create',
  'provision_ai_model',
  'make_ai_inference'
];

const DESTRUCTIVE_TOOLS = [
  'rename_app',
  'maintenance_on',
  'pg_psql',
  'pg_outliers',
  'pg_kill',
  'pg_upgrade',
  'ps_scale',
  'ps_restart',
  'pipelines_promote',
  'deploy_to_heroku',
  'deploy_one_off_dyno'
];

describe('tool annotation presets', () => {
  it('readOnlyTool sets a title and readOnlyHint only', () => {
    expect(readOnlyTool('List Things')).to.deep.equal({ title: 'List Things', readOnlyHint: true });
  });

  it('writeTool marks a tool as a non-destructive write', () => {
    expect(writeTool('Create Thing')).to.deep.equal({
      title: 'Create Thing',
      readOnlyHint: false,
      destructiveHint: false
    });
  });

  it('destructiveTool marks a tool as destructive', () => {
    expect(destructiveTool('Kill Thing')).to.deep.equal({
      title: 'Kill Thing',
      readOnlyHint: false,
      destructiveHint: true
    });
  });
});

describe('annotations on registered tools', () => {
  let client: Client;
  let server: McpServer;
  let toolsByName: Map<string, { title?: string; annotations?: Record<string, unknown> }>;

  before(async () => {
    server = new McpServer({ name: 'annotations-test', version: '0.0.0' });
    const herokuRepl = sinon.createStubInstance(HerokuREPL) as unknown as HerokuREPL;

    apps.registerListAppsTool(server, herokuRepl);
    apps.registerGetAppInfoTool(server, herokuRepl);
    apps.registerCreateAppTool(server, herokuRepl);
    apps.registerRenameAppTool(server, herokuRepl);
    maintenance.registerMaintenanceOnTool(server, herokuRepl);
    maintenance.registerMaintenanceOffTool(server, herokuRepl);
    logs.registerGetAppLogsTool(server, herokuRepl);
    spaces.registerListPrivateSpacesTool(server, herokuRepl);
    teams.registerListTeamsTool(server, herokuRepl);
    addons.registerListAddonsTool(server, herokuRepl);
    addons.registerGetAddonInfoTool(server, herokuRepl);
    addons.registerCreateAddonTool(server, herokuRepl);
    addons.registerListAddonServicesTool(server, herokuRepl);
    addons.registerListAddonPlansTool(server, herokuRepl);
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
    ps.registerPsListTool(server, herokuRepl);
    ps.registerPsScaleTool(server, herokuRepl);
    ps.registerPsRestartTool(server, herokuRepl);
    pipelines.registerPipelinesTool(server, herokuRepl);
    pipelines.registerPipelinesCreateTool(server, herokuRepl);
    pipelines.registerPipelinesPromoteTool(server, herokuRepl);
    pipelines.registerPipelinesListTool(server, herokuRepl);
    pipelines.registerPipelinesInfoTool(server, herokuRepl);
    deployToHeroku.registerDeployToHerokuTool(server);
    deployToHeroku.registerDeployOneOffDynoTool(server);
    ai.registerListAiAvailableModelsTool(server, herokuRepl);
    ai.registerProvisionAiModelTool(server, herokuRepl);
    ai.registerMakeAiInferenceTool(server, herokuRepl);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'annotations-test-client', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const { tools } = await client.listTools();
    toolsByName = new Map(tools.map((tool) => [tool.name, { title: tool.title, annotations: tool.annotations }]));
  });

  after(async () => {
    await client.close();
    await server.close();
  });

  it('classifies every registered tool exactly once', () => {
    const classified = [...READ_ONLY_TOOLS, ...WRITE_TOOLS, ...DESTRUCTIVE_TOOLS].sort();
    expect([...toolsByName.keys()].sort()).to.deep.equal(classified);
  });

  it('gives every tool a human-readable title in tools/list', () => {
    for (const [name, tool] of toolsByName) {
      expect(tool.annotations?.title, `${name} title`).to.be.a('string').and.not.equal('');
    }
  });

  it('flags read-only tools with readOnlyHint', () => {
    for (const name of READ_ONLY_TOOLS) {
      expect(toolsByName.get(name)?.annotations?.readOnlyHint, name).to.equal(true);
    }
  });

  it('flags write tools as neither read-only nor destructive', () => {
    for (const name of WRITE_TOOLS) {
      const annotations = toolsByName.get(name)?.annotations;
      expect(annotations?.readOnlyHint, `${name} readOnlyHint`).to.equal(false);
      expect(annotations?.destructiveHint, `${name} destructiveHint`).to.equal(false);
    }
  });

  it('flags tools that change or interrupt existing state as destructive', () => {
    for (const name of DESTRUCTIVE_TOOLS) {
      const annotations = toolsByName.get(name)?.annotations;
      expect(annotations?.readOnlyHint, `${name} readOnlyHint`).to.equal(false);
      expect(annotations?.destructiveHint, `${name} destructiveHint`).to.equal(true);
    }
  });
});
