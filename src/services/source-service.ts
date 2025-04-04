import * as Heroku from '@heroku-cli/schema';
/**
 * [Heroku Platform API - Source](https://devcenter.heroku.com/articles/platform-api-reference#source)
 * A source is a location for uploading and downloading an application's source code.
 */
export default class SourceService {
  /**
   *
   * @param endpoint The endpoint to use for the source service.
   */
  public constructor(protected readonly endpoint: string) {}

  /**
   * Create URLs for uploading and downloading source.
   *
   * @param requestInit The initializer for the request.
   * @returns The source.
   */
  public async create(requestInit: Omit<RequestInit, 'body' | 'method'> = {}): Promise<Heroku.Source> {
    const response = await fetch(`${this.endpoint}/sources`, {
      ...requestInit,

      method: 'POST',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk',
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Heroku.Source>;
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
