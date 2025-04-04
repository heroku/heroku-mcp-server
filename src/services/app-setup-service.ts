import * as Heroku from '@heroku-cli/schema';
export type AppSetupCreatePayload = {
  /**
   * optional parameters for created app
   */
  app?: AppSetupCreatePayloadApp;
  /**
   * gzipped tarball of source code containing app.json manifest file
   */
  source_blob: SourceBlob;
  /**
   * overrides of keys in the app.json manifest file
   *
   * @example {"buildpacks":[{"url":"https://example.com/buildpack.tgz"}],"env":{"FOO":"bar","BAZ":"qux"}}
   */
  overrides?: Overrides;
};
/**
 *
 * overrides of keys in the app.json manifest file
 */
export type Overrides = {
  /**
   * overrides the buildpacks specified in the app.json manifest file
   *
   * @example [{"url":"https://example.com/buildpack.tgz"}]
   */
  buildpacks?: BuildpackOverride[];
  /**
   * overrides of the env specified in the app.json manifest file
   *
   * @example {"FOO":"bar","BAZ":"qux"}
   */
  readonly env?: Record<string, unknown>;
};
/**
 *
 * a buildpack override
 */
export type BuildpackOverride = {
  /**
   * location of the buildpack
   *
   * @example "https://example.com/buildpack.tgz"
   */
  url?: string;
};
/**
 *
 * gzipped tarball of source code containing app.json manifest file
 */
export type SourceBlob = {
  /**
   * an optional checksum of the gzipped tarball for verifying its integrity
   *
   * @example "SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
   */
  readonly checksum?: null | string;
  /**
   * URL of gzipped tarball of source code containing app.json manifest file
   *
   * @example "https://example.com/source.tgz?token=xyz"
   */
  readonly url?: string;
  /**
   * Version of the gzipped tarball.
   *
   * @example "v1.3.0"
   */
  readonly version?: string | null;
};
/**
 *
 * [Heroku Platform API - app](https://devcenter.heroku.com/articles/platform-api-reference#app)
 * optional parameters for created app
 */
export type AppSetupCreatePayloadApp = {
  /**
   * are other team members forbidden from joining this app.
   */
  locked?: boolean;
  /**
   * unique name of app
   *
   * @example "example"
   */
  name?: string;
  /**
   * unique name of team
   *
   * @example "example"
   */
  readonly organization?: string;
  /**
   * force creation of the app in the user account even if a default team is set.
   */
  personal?: boolean;
  /**
   * unique name of region
   *
   * @example "us"
   */
  readonly region?: string;
  /**
   * unique name of space
   *
   * @example "nasa"
   */
  space?: string;
  /**
   * unique name of stack
   *
   * @example "heroku-18"
   */
  readonly stack?: string;
};
/**
 * [Heroku Setup API - App Setup](https://devcenter.heroku.com/articles/platform-api-reference#app-setup)
 * An app setup represents an app on Heroku that is setup using an environment, addons, and scripts described in an app.json manifest file.
 */
export default class AppSetupService {
  /**
   *
   * @param endpoint The endpoint to use for the app setup service.
   */
  public constructor(protected readonly endpoint: string) {}

  /**
   * Create a new app setup from a gzipped tar archive containing an app.json manifest file.
   *
   * @param payload Object to send to the endpoint.
   * @param requestInit The initializer for the request.
   * @returns The app setup.
   */
  public async create(
    payload: AppSetupCreatePayload,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Heroku.AppSetup> {
    const response = await fetch(`${this.endpoint}/app-setups`, {
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
      return (await response.json()) as Promise<Heroku.AppSetup>;
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
   * Get the status of an app setup.
   *
   * @param appSetupIdentity unique identifier of app setup.
   * @param requestInit The initializer for the request.
   * @returns The app setup.
   */
  public async info(
    appSetupIdentity: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Heroku.AppSetup> {
    const response = await fetch(`${this.endpoint}/app-setups/${appSetupIdentity}`, {
      ...requestInit,

      method: 'GET',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Heroku.AppSetup>;
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
