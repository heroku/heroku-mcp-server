/* eslint-disable prefer-arrow-callback */
import { expect } from 'chai';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as pjson from '../package.json' with { type: 'json' };

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = pjson.default.version;

function runCli(flag: string) {
  return spawnSync(process.execPath, ['bin/heroku-mcp-server.mjs', flag], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 3000
  });
}

describe('CLI metadata flags', function () {
  it('prints the package version without starting the server', function () {
    const result = runCli('--version');

    expect(result.status, result.stderr).to.equal(0);
    expect(result.stdout.trim()).to.equal(VERSION);
    expect(result.stderr).to.equal('');
  });

  it('prints help without starting the server', function () {
    const result = runCli('--help');

    expect(result.status, result.stderr).to.equal(0);
    expect(result.stdout).to.include('heroku-mcp-server');
    expect(result.stdout).to.include('--version');
    expect(result.stderr).to.equal('');
  });
});
