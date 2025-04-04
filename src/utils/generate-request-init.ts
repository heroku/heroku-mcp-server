/**
 * Generates a request init object for making API requests to the Heroku API.
 *
 * @param signal An optional abort signal to pass to the request init object.
 * @returns A promise that resolves to a request init object.
 */
export async function generateRequestInit(signal?: AbortSignal): Promise<RequestInit> {
  const pkg = await import('../../package.json', { assert: { type: 'json' } });
  const { version } = pkg.default;
  return {
    signal,
    headers: {
      Authorization: `Bearer ${process.env.HEROKU_API_KEY?.trim() ?? ''}`,
      Referer: `heroku-mcp/${version}`,
      'User-Agent': `Heroku-MCP-Server/${version} (${process.platform}; ${process.arch}; node/${process.version})`
    }
  };
}
