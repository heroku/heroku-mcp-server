/**
 * [Heroku Platform API - Config Vars](https://devcenter.heroku.com/articles/platform-api-reference#config-var)
 * Config Vars allow you to manage the configuration information provided to an app on Heroku.
 */
export default class ConfigVarService {
  /**
   * @param endpoint The endpoint to use for the config-var service.
   */
  public constructor(protected readonly endpoint: string) {}

  /**
   * Get config-vars for app.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param requestInit The initializer for the request.
   * @returns The config-vars for the app.
   */
  public async infoForApp(
    appIdentity: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/config-vars`, {
      ...requestInit,

      method: 'GET',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Record<string, unknown>>;
    }
    let message = response.statusText;
    try {
      ({ message } = (await response.json()) as { message: string });
    } catch {
      // no-op
    }
    throw new Error(`${response.status}: ${message}`, { cause: response });
  }
  /**
   * Get config-vars for a release.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param releaseIdentity unique identifier of release or unique version assigned to the release.
   * @param requestInit The initializer for the request.
   * @returns The config-vars for the release.
   */
  public async infoForAppRelease(
    appIdentity: string,
    releaseIdentity: string | number,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/releases/${releaseIdentity}/config-vars`, {
      ...requestInit,

      method: 'GET',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Record<string, unknown>>;
    }
    let message = response.statusText;
    try {
      ({ message } = (await response.json()) as { message: string });
    } catch {
      // no-op
    }
    throw new Error(`${response.status}: ${message}`, { cause: response });
  }
  /**
   * Update config-vars for app. You can update existing config-vars by setting them again, and remove by setting it to `null`.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param payload Object to send to the endpoint.
   * @param requestInit The initializer for the request.
   * @returns The updated config-vars for the app.
   */
  public async update(
    appIdentity: string,
    payload: Record<string, unknown>,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/config-vars`, {
      ...requestInit,
      body: JSON.stringify(payload, null, 2),
      method: 'PATCH',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk',
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Record<string, unknown>>;
    }
    let message = response.statusText;
    try {
      ({ message } = (await response.json()) as { message: string });
    } catch {
      // no-op
    }
    throw new Error(`${response.status}: ${message}`, { cause: response });
  }
}
