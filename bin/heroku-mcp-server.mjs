#!/usr/bin/env node
/* global process */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const flag = process.argv[2];

if (flag === '--version' || flag === '-v') {
  process.stdout.write(`${packageJson.version}\n`);
  process.exit(0);
}

if (flag === '--help' || flag === '-h') {
  process.stdout.write(`heroku-mcp-server ${packageJson.version}

Usage:
  heroku-mcp-server [options]

Options:
  -h, --help      Show this help message
  -v, --version   Show version number
`);
  process.exit(0);
}

try {
  const { runServer } = await import('../dist/index.js');
  await runServer();
} catch (error) {
  const { message } = error;
  process.stderr.write(`Fatal error in main(): ${message}`);
  process.exit(1);
}
