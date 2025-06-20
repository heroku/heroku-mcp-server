/**
 * Maps tool names to their corresponding Heroku CLI commands.
 * This mapping ensures consistent command usage across the application.
 */
export const TOOL_COMMAND_MAP = {
  // App-related commands
  LIST_APPS: 'apps',
  CREATE_APP: 'apps:create',
  RENAME_APP: 'apps:rename',
  TRANSFER_APP: 'apps:transfer',
  GET_APP_INFO: 'apps:info',

  // Maintenance mode commands
  MAINTENANCE_ON: 'maintenance:on',
  MAINTENANCE_OFF: 'maintenance:off',

  // Space-related commands
  LIST_PRIVATE_SPACES: 'spaces',

  // Team-related commands
  LIST_TEAMS: 'teams',

  // Addons commands
  LIST_ADDONS: 'addons',
  GET_ADDON_INFO: 'addons:info',
  CREATE_ADDON: 'addons:create',
  DESTROY_ADDON: 'addons:destroy',
  LIST_ADDON_SERVICES: 'addons:services',
  LIST_ADDON_PLANS: 'addons:plans',

  // PostgreSQL commands
  PG_PSQL: 'pg:psql',
  PG_INFO: 'pg:info',
  PG_PS: 'pg:ps',
  PG_LOCKS: 'pg:locks',
  PG_OUTLIERS: 'pg:outliers',
  PG_CREDENTIALS: 'pg:credentials',
  PG_KILL: 'pg:kill',
  PG_MAINTENANCE: 'pg:maintenance',
  PG_BACKUPS: 'pg:backups',
  PG_UPGRADE: 'pg:upgrade',

  // Process commands
  PS: 'ps',
  PS_SCALE: 'ps:scale',
  PS_RESTART: 'ps:restart',

  // Pipelines commands
  PIPELINES: 'pipelines',
  PIPELINES_CREATE: 'pipelines:create',
  PIPELINES_PROMOTE: 'pipelines:promote',
  PIPELINES_INFO: 'pipelines:info',

  // Logs commands
  LOGS: 'logs',

  // AI commands
  LIST_AI_AVAILABLE_MODELS: 'ai:models:list',
  PROVISION_AI_MODEL: 'ai:models:create',
  AI_AGENTS_CALL: 'ai:agents:call'
} as const;
