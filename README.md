# heroku-mcp-server

## Overview

The Heroku Platform MCP Server is a specialized Model Context Protocol (MCP) implementation designed to facilitate
seamless interaction between Large Language Models and the Heroku Platform. This server aims at providing a robust set
of tools and capabilities that enable LLMs to read, manage, and operate Heroku Platform resources.

Key Features:

- Direct interaction with Heroku Platform resources through LLM-driven tools
- Secure and authenticated access to Heroku Platform APIs, leveraging Heroku CLI
- Natural language interface for Heroku Platform interactions

Note: The Heroku Platform MCP Server is currently in early development. As we continue to enhance and refine the
implementation, the available functionality and tools may evolve. We welcome feedback and contributions to help shape
the future of this project.

## Installation

Install the Heroku Platform MCP Server globally using npm:

```sh
npm i -g @heroku/mcp-server
```

## Configuration

### Authentication Setup

Generate a Heroku authorization token using one of these methods:

- Through your Heroku Dashboard account profile
- Using the Heroku CLI command:
  ```sh
    heroku authorizations:create
  ```
- Using an existing token in the CLI
  ```sh
    heroku auth:token
  ```
  Copy the token and use it as your `HEROKU_API_KEY` in the following steps.

### Usage with [Claude Desktop](https://claude.ai/download)

Add this to your `claude_desktop_config.json`:

```json
"mcpServers": {
  "heroku": {
    "command": "heroku-mcp-server",
    "env": {
      "HEROKU_API_KEY": "<YOUR_HEROKU_AUTH_TOKEN>"
    }
  }
}
```

### Usage with [Zed](https://github.com/zed-industries/zed)

Add this to your Zed settings.json:

```json
"context_servers": [
  "heroku-mcp-server": {
    "command": {
      "path": "heroku-mcp-server",
      "env": {
        "HEROKU_API_KEY": "<YOUR_HEROKU_AUTH_TOKEN>"
      }
    }
  }
],
```

### Usage with [Cursor](https://www.cursor.com/)

Add this to your Cursor mcp.json:

```json
"mcpServers": {
  "heroku": {
    "command": "heroku-mcp-server",
    "env": {
      "HEROKU_API_KEY": "<YOUR_HEROKU_AUTH_TOKEN>"
    }
  },
}
```

### Usage with [Windsurf](https://www.windsurf.com/)

Add this to your Windsurf mcp_config.json:

```json
"mcpServers": {
  "heroku": {
    "command": "heroku-mcp-server",
    "env": {
      "HEROKU_API_KEY": "<YOUR_HEROKU_AUTH_TOKEN>"
    }
  },
}
```

## Available Tools

### Application Management

- `list_apps` - List Heroku applications with filtering options for owned apps, collaborator apps, team apps, and
  private space apps
- `get_app_info` - Get detailed information about an app including configuration, dynos, add-ons, and more
- `create_app` - Create a new Heroku application with customizable settings for region, team, and private space
- `rename_app` - Rename an existing Heroku application
- `transfer_app` - Transfer app ownership to another user or team
- `deploy_to_heroku` - Deploy projects to Heroku with app.json configuration, supporting team deployments, private
  spaces, and environment setup

### Process & Dyno Management

- `ps_list` - List all dynos for an app
- `ps_scale` - Scale dyno quantity up/down or resize dynos
- `ps_restart` - Restart specific dynos, process types, or all dynos

### Add-ons

- `list_addons` - List all add-ons across apps or for a specific app
- `get_addon_info` - Get detailed information about a specific add-on
- `create_addon` - Provision a new add-on for an app

### Maintenance & Logs

- `maintenance_on` - Enable maintenance mode for an app
- `maintenance_off` - Disable maintenance mode
- `get_app_logs` - View application logs with filtering options

### Pipeline Management

- `pipelines_create` - Create a new pipeline
- `pipelines_promote` - Promote apps to the next stage in a pipeline
- `pipelines_list` - List available pipelines
- `pipelines_info` - Get detailed pipeline information

### Team & Space Management

- `list_teams` - List teams you belong to
- `list_private_spaces` - List available private spaces

### PostgreSQL Database Management

- `pg_psql` - Execute SQL queries against Heroku PostgreSQL database
- `pg_info` - Display detailed database information
- `pg_ps` - View active queries and execution details
- `pg_locks` - View database locks and identify blocking transactions
- `pg_outliers` - Identify resource-intensive queries
- `pg_credentials` - Manage database credentials and access
- `pg_kill` - Terminate specific database processes
- `pg_maintenance` - Show database maintenance information
- `pg_backups` - Manage database backups and schedules
- `pg_upgrade` - Upgrade PostgreSQL to a newer version

## Debugging

You can use the MCP inspector or the vscode run/debug to run and debug the server.

1. link the project as a global CLI using `npm link` from the project root
2. build using `npm run build:dev`, or;
3. to watch for file changes and build automatically use `npm run build:watch`

Option 1 - use the @modelcontextprotocol/inspector (no breakpoints in code):

```
# Breakpoints are not available
npx @modelcontextprotocol/inspector heroku-mcp-server
```

Option 2 - use the VSCode run/debug launcher (fully functional breakpoints in code):

1. Locate and click on the run debug
2. select the configuration labeled "MCP Server Launcher" in the dropdown
3. click on the green run/debug button

Or if you've installed the package in a specific directory or are developing on it:

```
cd path/to/servers/src/git
npx @modelcontextprotocol/inspector dist/index.js
```

### VS Code / Cursor Debugging Setup

To setup local debugging with breakpoints:

1. Store your Heroku auth token in VS Code user settings:

   - Open Command Palette (Cmd/Ctrl + Shift + P)
   - Type "Preferences: Open User Settings (JSON)"
   - Add the following:

   ```json
   {
     "heroku.mcp.authToken": "your-token-here"
   }
   ```

2. Create or update `.vscode/launch.json`:

   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "node",
         "request": "launch",
         "name": "MCP Server Launcher",
         "skipFiles": ["<node_internals>/**"],
         "program": "${workspaceFolder}/node_modules/@modelcontextprotocol/inspector/bin/cli.js",
         "outFiles": ["${workspaceFolder}/**/dist/**/*.js"],
         "env": {
           "HEROKU_API_KEY": "${config:heroku.mcp.authToken}",
           "DEBUG": "true"
         },
         "args": ["heroku-mcp-server"],
         "sourceMaps": true,
         "console": "integratedTerminal",
         "internalConsoleOptions": "neverOpen",
         "preLaunchTask": "npm: build:watch"
       },
       {
         "type": "node",
         "request": "attach",
         "name": "Attach to Debug Hook Process",
         "port": 9332,
         "skipFiles": ["<node_internals>/**"],
         "sourceMaps": true,
         "outFiles": ["${workspaceFolder}/dist/**/*.js"]
       },
       {
         "type": "node",
         "request": "attach",
         "name": "Attach to REPL Process",
         "port": 9333,
         "skipFiles": ["<node_internals>/**"],
         "sourceMaps": true,
         "outFiles": ["${workspaceFolder}/dist/**/*.js"]
       }
     ],
     "compounds": [
       {
         "name": "Attach to MCP Server",
         "configurations": ["Attach to Debug Hook Process", "Attach to REPL Process"]
       }
     ]
   }
   ```

3. Create `.vscode/tasks.json`:

   ```json
   {
     "version": "2.0.0",
     "tasks": [
       {
         "type": "npm",
         "script": "build:watch",
         "group": {
           "kind": "build",
           "isDefault": true
         },
         "problemMatcher": ["$tsc"]
       }
     ]
   }
   ```

4. To debug:
   - Set breakpoints in your TypeScript files
   - Press F5 or use the Run and Debug sidebar
   - The debugger will automatically build your TypeScript files before launching
