import { spawnSync, type SpawnSyncOptionsWithStringEncoding, type SpawnSyncReturns } from 'node:child_process';

type SpawnSyncFn = (
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding
) => SpawnSyncReturns<string>;

/**
 * Detects if a Heroku CLI plugin is installed
 *
 * @param pluginName - The name of the plugin to check (e.g., '@heroku/plugin-ai')
 * @param spawnFn - Optional spawn function for testing
 * @returns true if the plugin is installed, false otherwise
 */
export function isPluginInstalled(pluginName: string, spawnFn: SpawnSyncFn = spawnSync): boolean {
  try {
    // Use plugins:inspect to detect if specific plugin is installed
    const result = spawnFn('heroku', ['plugins:inspect', pluginName], {
      encoding: 'utf-8',
      timeout: 5000
    });

    // If the command succeeds (status 0), the plugin is installed
    // If it fails (non-zero status), the plugin is not installed
    return result.status === 0 && !result.error;
  } catch {
    // If any error occurs, assume plugin is not installed
    return false;
  }
}
