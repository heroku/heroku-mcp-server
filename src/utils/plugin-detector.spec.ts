import { expect } from 'chai';
import type { SpawnSyncReturns } from 'node:child_process';
import { isPluginInstalled } from './plugin-detector.js';

describe('isPluginInstalled', () => {
  it('returns true when plugin is installed (plugins:inspect succeeds)', () => {
    const mockSpawn = (cmd: string, args: string[]): SpawnSyncReturns<string> => {
      // Verify correct command is called
      expect(cmd).to.equal('heroku');
      expect(args).to.deep.equal(['plugins:inspect', '@heroku/plugin-ai']);

      return {
        status: 0,
        stdout: 'Plugin info...',
        stderr: '',
        error: undefined,
        signal: null,
        output: [null, 'Plugin info...', ''],
        pid: 12345
      } as SpawnSyncReturns<string>;
    };

    const result = isPluginInstalled('@heroku/plugin-ai', mockSpawn);
    expect(result).to.be.true;
  });

  it('returns false when plugin is not installed (plugins:inspect fails)', () => {
    const mockSpawn = (): SpawnSyncReturns<string> =>
      ({
        status: 1,
        stdout: '',
        stderr: 'Error: Plugin not found',
        error: undefined,
        signal: null,
        output: [null, '', 'Error: Plugin not found'],
        pid: 12345
      }) as SpawnSyncReturns<string>;

    const result = isPluginInstalled('@heroku/plugin-ai', mockSpawn);
    expect(result).to.be.false;
  });

  it('returns false when heroku command has an error', () => {
    const mockSpawn = (): SpawnSyncReturns<string> =>
      ({
        status: 1,
        stdout: '',
        stderr: 'Command failed',
        error: new Error('Command failed'),
        signal: null,
        output: [null, '', 'Command failed'],
        pid: 12345
      }) as SpawnSyncReturns<string>;

    const result = isPluginInstalled('@heroku/plugin-ai', mockSpawn);
    expect(result).to.be.false;
  });

  it('returns false when spawnSync throws an exception', () => {
    const mockSpawn = (): SpawnSyncReturns<string> => {
      throw new Error('Spawn error');
    };

    const result = isPluginInstalled('@heroku/plugin-ai', mockSpawn);
    expect(result).to.be.false;
  });
});
