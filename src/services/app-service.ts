import * as Heroku from '@heroku-cli/schema';
/**
 * [Heroku Platform API - App](https://devcenter.heroku.com/articles/platform-api-reference#app)
 * An app represents the program that you would like to deploy and run on Heroku.
 */
export default class AppService {
  /**
   *
   * @param endpoint The endpoint to use for the app service.
   */
  public constructor(protected readonly endpoint: string) {}
  /**
   * Info for existing app.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param requestInit The initializer for the request.
   * @returns The app.
   */
  public async info(appIdentity: string, requestInit: Omit<RequestInit, 'body' | 'method'> = {}): Promise<Heroku.App> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}`, {
      ...requestInit,

      method: 'GET',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Heroku.App>;
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
