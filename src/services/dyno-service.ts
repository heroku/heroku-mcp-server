import * as Heroku from '@heroku-cli/schema';
/**
 * [Heroku Platform API - Dyno](https://devcenter.heroku.com/articles/platform-api-reference#dyno)
 * Dynos encapsulate running processes of an app on Heroku. Detailed information about dyno sizes can be found at: [https://devcenter.heroku.com/articles/dyno-types](https://devcenter.heroku.com/articles/dyno-types).
 */
export default class DynoService {
  /**
   * @param endpoint The endpoint to the API.
   */
  public constructor(protected readonly endpoint: string) {}

  /**
   * Create a new dyno.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param payload Object to send to the endpoint.
   * @param requestInit The initializer for the request.
   * @returns The response from the API.
   */
  public async create(
    appIdentity: string,
    payload: DynoCreatePayload,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Heroku.Dyno> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/dynos`, {
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
      return (await response.json()) as Promise<Heroku.Dyno>;
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
   * Restart dyno.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param dynoIdentity unique identifier of this dyno or the name of this process on this dyno.
   * @param requestInit The initializer for the request.
   * @returns The response from the API.
   */
  public async restart(
    appIdentity: string,
    dynoIdentity: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/dynos/${dynoIdentity}`, {
      ...requestInit,

      method: 'DELETE',
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
  /**
   * Restart dynos of a given formation type.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param dynoFormationType the formation type of this process on this dyno
   * @example "run".
   * @param requestInit The initializer for the request.
   * @returns The response from the API.
   */
  public async restartFormation(
    appIdentity: string,
    dynoFormationType: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/formations/${dynoFormationType}`, {
      ...requestInit,

      method: 'DELETE',
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
  /**
   * Restart all dynos.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param requestInit The initializer for the request.
   * @returns The response from the API.
   */
  public async restartAll(
    appIdentity: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/dynos`, {
      ...requestInit,

      method: 'DELETE',
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
  /**
   * Stop dyno.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param dynoIdentity unique identifier of this dyno or the name of this process on this dyno.
   * @param requestInit The initializer for the request.
   * @returns The response from the API.
   */
  public async stop(
    appIdentity: string,
    dynoIdentity: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/dynos/${dynoIdentity}/actions/stop`, {
      ...requestInit,

      method: 'POST',
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
  /**
   * Stop dynos of a given formation type.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param dynoFormationType the formation type of this process on this dyno
   * @example "run".
   * @param requestInit The initializer for the request.
   * @returns The response from the API.
   */
  public async stopFormation(
    appIdentity: string,
    dynoFormationType: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/formations/${dynoFormationType}/actions/stop`, {
      ...requestInit,

      method: 'POST',
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
  /**
   * Info for existing dyno.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param dynoIdentity unique identifier of this dyno or the name of this process on this dyno.
   * @param requestInit The initializer for the request.
   * @returns The response from the API.
   */
  public async info(
    appIdentity: string,
    dynoIdentity: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Heroku.Dyno> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/dynos/${dynoIdentity}`, {
      ...requestInit,

      method: 'GET',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Heroku.Dyno>;
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
   * List existing dynos.
   *
   * @param appIdentity unique identifier of app or unique name of app.
   * @param requestInit The initializer for the request.
   * @returns The response from the API.
   */
  public async list(
    appIdentity: string,
    requestInit: Omit<RequestInit, 'body' | 'method'> = {}
  ): Promise<Heroku.Dyno[]> {
    const response = await fetch(`${this.endpoint}/apps/${appIdentity}/dynos`, {
      ...requestInit,

      method: 'GET',
      headers: {
        ...requestInit?.headers,
        Accept: 'application/vnd.heroku+json; version=3.sdk'
      }
    });
    if (response.ok) {
      return (await response.json()) as Promise<Heroku.Dyno[]>;
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
export type DynoCreatePayload = {
  /**
   * whether to stream output or not
   *
   * @example true
   */
  attach?: boolean;
  /**
   * command used to start this process
   *
   * @example "bash"
   */
  command: string;
  /**
   * custom environment to add to the dyno config vars
   *
   * @example {"COLUMNS":"80","LINES":"24"}
   */
  env?: Record<string, unknown>;
  /**
   * force an attached one-off dyno to not run in a tty
   */
  force_no_tty?: boolean | null;
  /**
   * dyno size
   *
   * @example "standard-1X"
   */
  size?: string;
  /**
   * type of process
   *
   * @example "run"
   */
  type?: string;
  /**
   * seconds until dyno expires, after which it will soon be killed, max 86400 seconds (24 hours)
   *
   * @example 1800
   */
  time_to_live?: number;
};
