import * as Heroku from '@heroku-cli/schema';
export type BuildCreatePayload = {
  /**
   * buildpacks executed for this build, in order (only applicable to Cedar-generation apps)
   */
  buildpacks?: Array<{
    /**
     * the URL of the buildpack for the app
     *
     * @example "https://github.com/heroku/heroku-buildpack-ruby"
     */
    url?: string;
    /**
     * Buildpack Registry name of the buildpack for the app
     *
     * @example "heroku/ruby"
     */
    name?: string;
  }> | null;
  /**
   * location of gzipped tarball of source code used to create build
   */
  source_blob: BuildCreatePayloadSourceBlob;
};
/**
 *
 * location of gzipped tarball of source code used to create build
 */
export type BuildCreatePayloadSourceBlob = {
  /**
   * an optional checksum of the gzipped tarball for verifying its integrity
   *
   * @example "SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
   */
  readonly checksum: null | string;
  /**
   * URL where gzipped tar archive of source code for build was downloaded.
   *
   * @example "https://example.com/source.tgz?token=xyz"
   */
  readonly url: string;
  /**
   * Version of the gzipped tarball.
   *
   * @example "v1.3.0"
   */
  readonly version: string | null;
  /**
   * Version description of the gzipped tarball.
   *
   * @example "* Fake User: Change session key"
   */
  readonly version_description: string | null;
};
/**
 * [Heroku Build API - Build](https://devcenter.heroku.com/articles/platform-api-reference#build)
 * A build represents the process of transforming a code tarball into build artifacts
 */
export default class BuildService {
  /**
   *
   * @param endpoint The endpoint to use for the build service.
   */
  public constructor(protected readonly endpoint: string) {}

  /**
   * Create a new build.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param payload Object to send to the endpoint.
   * @param requestInit The initializer for the request.
   * @returns The build.
   */
  public async create(
    appIdentity: string,
    payload: BuildCreatePayload,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Heroku.Build> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/builds`, {
      ...requestInit,
      body: JSON.stringify(payload, null, 2),
      method: 'POST',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk',
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Heroku.Build>;
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
   * Info for existing build.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param buildIdentity unique identifier of build.
   * @param requestInit The initializer for the request.
   * @returns The build.
   */
  public async info(
    appIdentity: string,
    buildIdentity: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Heroku.Build> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/builds/${buildIdentity}`, {
      ...requestInit,

      method: 'GET',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Heroku.Build>;
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
   * List existing build.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param requestInit The initializer for the request.
   * @returns The builds.
   */
  public async list(
    appIdentity: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Heroku.Build[]> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/builds`, {
      ...requestInit,

      method: 'GET',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Heroku.Build[]>;
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
   * Destroy a build cache.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param requestInit The initializer for the request.
   */
  public async deleteCache(appIdentity: string, requestInit: Omit<RequestInit, 'body' | 'method'> = {}): Promise<void> {
    await fetch(`/apps/${appIdentity}/build-cache`, {
      ...requestInit,

      method: 'DELETE',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk',
        'Content-Type': 'application/json'
      }
    });
  }
  /**
   * Cancel running build.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param buildIdentity unique identifier of build.
   * @param requestInit The initializer for the request.
   * @returns The build.
   */
  public async cancel(
    appIdentity: string,
    buildIdentity: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Heroku.Build> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/builds/${buildIdentity}`, {
      ...requestInit,

      method: 'DELETE',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk',
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Heroku.Build>;
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
