import { expect } from 'chai';
import { CommandBuilder } from './command-builder.js';
import { TOOL_COMMAND_MAP } from './tool-commands.js';

/**
 * Unit tests for the CommandBuilder class.
 * Some of these tests do not produce valid commands, but they are designed to test the CommandBuilder class.
 */

describe('CommandBuilder', () => {
  describe('constructor', () => {
    it('creates a new instance with the base command', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS);
      expect(builder.build()).to.equal('apps');
    });
  });

  describe('addFlags', () => {
    it('adds boolean flags correctly', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS);
      builder.addFlags({ all: true, json: true });
      expect(builder.build()).to.equal('apps --all --json');
    });

    it('adds string flags with values correctly', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS);
      builder.addFlags({ team: 'my-team', space: 'my-space' });
      expect(builder.build()).to.equal('apps --team=my-team --space=my-space');
    });

    it('handles mixed boolean and string flags', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS);
      builder.addFlags({ all: true, team: 'my-team', json: true });
      expect(builder.build()).to.equal('apps --all --team=my-team --json');
    });

    it('ignores undefined flag values', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS);
      builder.addFlags({ all: true, team: undefined, json: true });
      expect(builder.build()).to.equal('apps --all --json');
    });

    it('ignores false boolean flags', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS);
      builder.addFlags({ all: false, json: true });
      expect(builder.build()).to.equal('apps --json');
    });

    it('supports method chaining', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS);
      const result = builder.addFlags({ all: true });
      expect(result).to.equal(builder);
    });

    it('rejects flag values containing line breaks to prevent REPL command injection', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS);
      expect(() => builder.addFlags({ team: 'my-team\napps:destroy --confirm victim' })).to.throw(
        /line breaks \(CR\/LF\) are not allowed/
      );
      expect(() => builder.addFlags({ team: 'my-team\rother' })).to.throw(/line breaks/);
    });

    it('still allows flag values that contain spaces (only line breaks are rejected)', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS);
      expect(() => builder.addFlags({ team: 'my team' })).to.not.throw();
    });
  });

  describe('addPositionalArguments', () => {
    it('adds positional arguments correctly', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.RENAME_APP);
      builder.addPositionalArguments({ new_name: 'new-app-name' });
      expect(builder.build()).to.equal('apps:rename -- new-app-name');
    });

    it('adds multiple positional arguments in order', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.TRANSFER_APP);
      builder.addPositionalArguments({ app: 'my-app', recipient: 'user@example.com' });
      expect(builder.build()).to.equal('apps:transfer -- my-app user@example.com');
    });

    it('ignores undefined argument values', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.RENAME_APP);
      builder.addPositionalArguments({ app: undefined, new_name: 'new-app-name' });
      expect(builder.build()).to.equal('apps:rename -- new-app-name');
    });

    it('supports method chaining', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.RENAME_APP);
      const result = builder.addPositionalArguments({ new_name: 'new-app-name' });
      expect(result).to.equal(builder);
    });

    it('rejects positional argument values containing line breaks', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.RENAME_APP);
      expect(() => builder.addPositionalArguments({ new_name: 'ok\napps:destroy --confirm victim' })).to.throw(
        /line breaks \(CR\/LF\) are not allowed/
      );
    });
  });

  describe('build', () => {
    it('combines flags and positional arguments correctly', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.CREATE_APP);
      builder.addFlags({ region: 'eu', team: 'my-team' }).addPositionalArguments({ app: 'my-new-app' });
      expect(builder.build()).to.equal('apps:create --region=eu --team=my-team -- my-new-app');
    });

    it('handles commands with no flags or arguments', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS);
      expect(builder.build()).to.equal('apps');
    });

    it('handles commands with only flags', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.LIST_APPS);
      builder.addFlags({ all: true, json: true });
      expect(builder.build()).to.equal('apps --all --json');
    });

    it('handles commands with only positional arguments', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.RENAME_APP);
      builder.addPositionalArguments({ new_name: 'new-app-name' });
      expect(builder.build()).to.equal('apps:rename -- new-app-name');
    });

    it('maintains flag and argument order across multiple calls', () => {
      const builder = new CommandBuilder(TOOL_COMMAND_MAP.CREATE_APP);
      builder.addFlags({ region: 'eu' }).addPositionalArguments({ app: 'my-app' }).addFlags({ team: 'my-team' });
      expect(builder.build()).to.equal('apps:create --region=eu --team=my-team -- my-app');
    });
  });
});
