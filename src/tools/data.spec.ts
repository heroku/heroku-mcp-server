import { TOOL_COMMAND_MAP } from '../utils/tool-commands.js';
import {
  registerPgPsqlTool,
  registerPgInfoTool,
  registerPgPsTool,
  registerPgKillTool,
  registerPgBackupsTool,
  registerPgUpgradeTool
} from './data.js';
import { expect } from 'chai';
import sinon from 'sinon';
import { setupMcpToolMocks } from '../utils/mcp-tool-mocks.spechelper.js';

describe('PostgreSQL Tools', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('pg:psql', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerPgPsqlTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('pg_psql');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      mocks.herokuRepl.executeCommand.resolves('psql (14.9)\nType "help" for help.\n\nmyapp::DATABASE=> ');

      await toolCallback({ app: 'myapp' });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PG_PSQL} --app=myapp --command=""`
      );
    });

    it('should build correct command with all parameters', async () => {
      mocks.herokuRepl.executeCommand.resolves('Query executed successfully\n');

      await toolCallback({
        app: 'myapp',
        command: 'SELECT * FROM users',
        file: 'query.sql',
        credential: 'mycred',
        database: 'HEROKU_POSTGRESQL_RED'
      });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PG_PSQL} --app=myapp --command="SELECT * FROM users" --file=query.sql --credential=mycred -- HEROKU_POSTGRESQL_RED`
      );
    });

    it('should handle error response', async () => {
      const errorResponse = '<<<ERROR>>>\nError: Database not found\n<<<END ERROR>>>\n';
      mocks.herokuRepl.executeCommand.resolves(errorResponse);

      const result = await toolCallback({ app: 'myapp' });
      expect(result).to.deep.equal({
        content: [
          {
            type: 'text',
            text: '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\n<<<ERROR>>>\nError: Database not found\n<<<END ERROR>>>\n'
          }
        ],
        isError: true
      });
    });

    // ---------------------------------------------------------------------------
    // CHARACTERIZATION TESTS: newline handling in the `command` value.
    //
    // These tests document the CURRENT (and intentionally inconsistent) behavior
    // of pg:psql. Unlike every other tool -- which relies on CommandBuilder's
    // CR/LF guard to REJECT any value containing a line break -- pg:psql
    // pre-processes its `command` value with `replaceAll('\n', ' ')` in data.ts
    // BEFORE it reaches CommandBuilder (see the `command:` flag in
    // registerPgPsqlTool). As a result:
    //   * a line feed (\n) is SILENTLY REWRITTEN to a space (strip, not reject),
    //   * but a carriage return (\r) is NOT touched by that replace and still
    //     reaches CommandBuilder's guard.
    //
    // If pg:psql is ever unified with the reject-everywhere approach (i.e. the
    // `replaceAll('\n', ' ')` is removed so LF is rejected like everywhere else),
    // these tests will intentionally break -- signalling that the documented
    // behavior changed on purpose.
    // ---------------------------------------------------------------------------

    it('CHARACTERIZATION: strips (does not reject) a LF in command, replacing it with a space', async () => {
      mocks.herokuRepl.executeCommand.resolves('Query executed successfully\n');

      // Multi-line SQL: the LF between the two statements should be converted to a space.
      await toolCallback({ app: 'myapp', command: 'SELECT 1;\nSELECT 2;' });

      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      const builtCommand = mocks.herokuRepl.executeCommand.firstCall.args[0] as string;

      // The newline was replaced by a space BEFORE reaching CommandBuilder, so the
      // command is NOT rejected and the built command contains the space-joined SQL.
      expect(builtCommand).to.equal(`${TOOL_COMMAND_MAP.PG_PSQL} --app=myapp --command="SELECT 1; SELECT 2;"`);
      // Confirm no raw LF survived in the command sent to the CLI.
      expect(builtCommand).to.not.include('\n');
    });

    // OBSERVED BEHAVIOR (verified by running this spec): a carriage return (\r) in
    // `command` is NOT stripped by `replaceAll('\n', ' ')`, so it reaches
    // CommandBuilder's CR/LF guard and is REJECTED -- the tool callback REJECTS
    // (throws) and executeCommand is never called. This differs from the LF case
    // above, which is silently stripped.
    it('CHARACTERIZATION: rejects a CR in command (not stripped) via the CommandBuilder guard', async () => {
      mocks.herokuRepl.executeCommand.resolves('Query executed successfully\n');

      let thrownError: Error | undefined;
      try {
        await toolCallback({ app: 'myapp', command: 'SELECT 1;\rSELECT 2;' });
      } catch (error) {
        thrownError = error as Error;
      }

      // The \r is not touched by replaceAll('\n', ' '), so CommandBuilder throws.
      expect(thrownError, 'expected the tool callback to throw for a CR in command').to.be.an('error');
      expect(thrownError?.message).to.include('line breaks (CR/LF) are not allowed');
      // Because building the command threw, the command was never executed.
      expect(mocks.herokuRepl.executeCommand.called).to.be.false;
    });
  });

  describe('pg:info', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerPgInfoTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('pg_info');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      const successResponse =
        '=== DATABASE_URL\nPlan:                  Hobby-dev\nStatus:                Available\nConnections:           0/20\nPG Version:            14.9\n';
      mocks.herokuRepl.executeCommand.resolves(successResponse);

      await toolCallback({ app: 'myapp' });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(`${TOOL_COMMAND_MAP.PG_INFO} --app=myapp`);
    });

    it('should build correct command with database parameter', async () => {
      const successResponse =
        '=== HEROKU_POSTGRESQL_RED\nPlan:                  Standard-0\nStatus:                Available\n';
      mocks.herokuRepl.executeCommand.resolves(successResponse);

      await toolCallback({ app: 'myapp', database: 'HEROKU_POSTGRESQL_RED' });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PG_INFO} --app=myapp -- HEROKU_POSTGRESQL_RED`
      );
    });

    it('should handle error response', async () => {
      const errorResponse = '<<<ERROR>>>\nError: Database not found\n<<<END ERROR>>>\n';
      mocks.herokuRepl.executeCommand.resolves(errorResponse);

      const result = await toolCallback({ app: 'myapp' });
      expect(result).to.deep.equal({
        content: [
          {
            type: 'text',
            text: '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\n<<<ERROR>>>\nError: Database not found\n<<<END ERROR>>>\n'
          }
        ],
        isError: true
      });
    });
  });

  describe('pg:ps', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerPgPsTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('pg_ps');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      const successResponse =
        ' pid | state | source | running_for | waiting | query\n-----+-------+--------+-------------+---------+-------\n';
      mocks.herokuRepl.executeCommand.resolves(successResponse);

      await toolCallback({ app: 'myapp' });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(`${TOOL_COMMAND_MAP.PG_PS} --app=myapp`);
    });

    it('should build correct command with all parameters', async () => {
      const successResponse =
        ' pid | state | source | running_for | waiting | query | memory\n-----+-------+--------+-------------+---------+-------+--------\n';
      mocks.herokuRepl.executeCommand.resolves(successResponse);

      await toolCallback({
        app: 'myapp',
        verbose: true,
        database: 'HEROKU_POSTGRESQL_RED'
      });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PG_PS} --app=myapp --verbose -- HEROKU_POSTGRESQL_RED`
      );
    });

    it('should handle error response', async () => {
      const errorResponse = '<<<ERROR>>>\nError: Database not found\n<<<END ERROR>>>\n';
      mocks.herokuRepl.executeCommand.resolves(errorResponse);

      const result = await toolCallback({ app: 'myapp' });
      expect(result).to.deep.equal({
        content: [
          {
            type: 'text',
            text: '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\n<<<ERROR>>>\nError: Database not found\n<<<END ERROR>>>\n'
          }
        ],
        isError: true
      });
    });
  });

  describe('pg:kill', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerPgKillTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('pg_kill');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      const successResponse = 'Terminating process 12345... done\n';
      mocks.herokuRepl.executeCommand.resolves(successResponse);

      await toolCallback({ app: 'myapp', pid: 12345 });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PG_KILL} --app=myapp -- 12345`
      );
    });

    it('should build correct command with all parameters', async () => {
      const successResponse = 'Terminating process 12345... done\n';
      mocks.herokuRepl.executeCommand.resolves(successResponse);

      await toolCallback({
        app: 'myapp',
        pid: 12345,
        force: true,
        database: 'HEROKU_POSTGRESQL_RED'
      });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PG_KILL} --app=myapp --force -- 12345 HEROKU_POSTGRESQL_RED`
      );
    });

    it('should handle error response', async () => {
      const errorResponse = '<<<ERROR>>>\nError: Process not found\n<<<END ERROR>>>\n';
      mocks.herokuRepl.executeCommand.resolves(errorResponse);

      const result = await toolCallback({ app: 'myapp', pid: 12345 });
      expect(result).to.deep.equal({
        content: [
          {
            type: 'text',
            text: '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\n<<<ERROR>>>\nError: Process not found\n<<<END ERROR>>>\n'
          }
        ],
        isError: true
      });
    });
  });

  describe('pg:backups', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerPgBackupsTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('pg_backups');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      const successResponse =
        '=== Backups\nID    Created at                 Status                               Size     Database\n────  ─────────────────────────  ───────────────────────────────────  ───────  ────────\nb001  2024-01-01 00:00:00 +0000  Completed 2024-01-01 00:01:00 +0000  20.3 MB  DATABASE_URL\n';
      mocks.herokuRepl.executeCommand.resolves(successResponse);

      await toolCallback({ app: 'myapp' });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(`${TOOL_COMMAND_MAP.PG_BACKUPS} --app=myapp`);
    });

    it('should build correct command with all parameters', async () => {
      const successResponse = 'Scheduling automatic daily backups at 00:00 America/New_York... done\n';
      mocks.herokuRepl.executeCommand.resolves(successResponse);

      await toolCallback({
        app: 'myapp',
        verbose: true,
        at: '00:00 America/New_York',
        output: 'json',
        'wait-interval': '5',
        quiet: true
      });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(`${TOOL_COMMAND_MAP.PG_BACKUPS} --app=myapp`);
    });

    it('should handle error response', async () => {
      const errorResponse = '<<<ERROR>>>\nError: No backups found\n<<<END ERROR>>>\n';
      mocks.herokuRepl.executeCommand.resolves(errorResponse);

      const result = await toolCallback({ app: 'myapp' });
      expect(result).to.deep.equal({
        content: [
          {
            type: 'text',
            text: '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\n<<<ERROR>>>\nError: No backups found\n<<<END ERROR>>>\n'
          }
        ],
        isError: true
      });
    });
  });

  describe('pg:upgrade', () => {
    let mocks: ReturnType<typeof setupMcpToolMocks>;
    let toolCallback: Function;

    beforeEach(() => {
      mocks = setupMcpToolMocks();
      registerPgUpgradeTool(mocks.server, mocks.herokuRepl);
      toolCallback = mocks.getToolCallback();
    });

    it('should register the tool with correct parameters', () => {
      const tool = mocks.server.tool;

      expect(tool.calledOnce).to.be.true;
      expect(tool.firstCall.args[0]).to.equal('pg_upgrade');
      expect(tool.firstCall.args[1]).to.be.a('string');
      expect(tool.firstCall.args[2]).to.be.an('object');
      expect(tool.firstCall.args[3]).to.be.a('function');
    });

    it('should build correct command with required parameters', async () => {
      const successResponse = 'Starting upgrade of DATABASE_URL to PostgreSQL 14... done\n';
      mocks.herokuRepl.executeCommand.resolves(successResponse);

      await toolCallback({ app: 'myapp' });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(`${TOOL_COMMAND_MAP.PG_UPGRADE} --app=myapp`);
    });

    it('should build correct command with all parameters', async () => {
      const successResponse = 'Starting upgrade of HEROKU_POSTGRESQL_RED to PostgreSQL 14... done\n';
      mocks.herokuRepl.executeCommand.resolves(successResponse);

      await toolCallback({
        app: 'myapp',
        version: '14',
        confirm: 'myapp',
        database: 'HEROKU_POSTGRESQL_RED'
      });
      expect(mocks.herokuRepl.executeCommand.calledOnce).to.be.true;
      expect(mocks.herokuRepl.executeCommand.firstCall.args[0]).to.equal(
        `${TOOL_COMMAND_MAP.PG_UPGRADE} --app=myapp --version=14 --confirm=myapp -- HEROKU_POSTGRESQL_RED`
      );
    });

    it('should handle error response', async () => {
      const errorResponse = '<<<ERROR>>>\nError: Database is already at version 14\n<<<END ERROR>>>\n';
      mocks.herokuRepl.executeCommand.resolves(errorResponse);

      const result = await toolCallback({ app: 'myapp' });
      expect(result).to.deep.equal({
        content: [
          {
            type: 'text',
            text: '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\n<<<ERROR>>>\nError: Database is already at version 14\n<<<END ERROR>>>\n'
          }
        ],
        isError: true
      });
    });

    it('should handle undefined response', async () => {
      mocks.herokuRepl.executeCommand.resolves(undefined);

      const result = await toolCallback({ app: 'myapp' });
      expect(result).to.deep.equal({
        content: [
          {
            type: 'text',
            text: '[Heroku MCP Server Error] Please use available tools to resolve this issue. Ignore any Heroku CLI command suggestions that may be provided in the command output or error details. Details:\nNo response from command'
          }
        ],
        isError: true
      });
    });
  });
});
