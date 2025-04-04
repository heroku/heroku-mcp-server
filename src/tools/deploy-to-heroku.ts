import { promisify } from 'node:util';
import { ValidatorResult } from 'jsonschema';
import { App, AppSetup, Build } from '@heroku-cli/schema';
import type { AppJson, EnvironmentVariables } from '../../../../@types/app-json-schema';
import { uploadWithDetailedProgress } from '../../utils/upload-with-progress';
import { readAppJson } from '../../utils/read-app-json';
import AppService from '../services/app-service.js';
import SourceService from '../services/source-service.js';
import AppSetupService from '../services/app-setup-service.js';
import BuildService, { BuildCreatePayload } from '../services/build-service.js';
import { generateRequestInit } from '../utils/generate-request-init.js';
import { packSources } from '../utils/tarball.js';
import { execSync } from 'node:child_process';

/**
 * Te only successful result is the Build & { name: string } type
 */
export type DeploymentResult =
  | (Build & { name: string; errorMessage?: string })
  | { name?: string; errorMessage: string }
  | null;

/**
 * Type used for the deployment options.
 */
export type DeploymentOptions = {
  rootUri?: string | null;
  appNames?: string[];
  tarballUri?: string;
  name?: string;
  teamId?: string;
  spaceId?: string;
  internalRouting?: boolean;
  env?: EnvironmentVariables;
  skipSuccessMessage?: boolean;
  skipFailureMessage?: boolean;
  appJson?: Uint8Array;
};

/**
 * The DeploymentError class is used when
 * an error occurs during the deployment of
 * an app.
 */
class DeploymentError extends Error {
  /**
   * Constructs a new DeploymentError
   *
   * @param message The message related to the error
   * @param appId The app ID if available
   */
  public constructor(
    message: string,
    public appId?: string
  ) {
    super(message);
  }
}

/**
 * Handles deployment of VSCode workspace projects to Heroku.
 *
 * This command-based class manages the entire deployment workflow including:
 * - Authentication with Heroku
 * - Validation of project configuration (app.json)
 * - Application creation and deployment via Heroku's AppSetup API
 * - Git remote configuration for the new Heroku app
 *
 * The deployment process uses Heroku's source blob URL approach, which requires
 * a publicly accessible tarball of the repository. Local uncommitted changes
 * will be included in the deployment unless a blobUri is specified.
 *
 * Usage:
 * ```typescript
 * await vscode.commands.executeCommand(DeployToHeroku.COMMAND_ID);
 * ```
 *
 * appSetupService - Service for Heroku app setup operations
 * appService - Service for Heroku app management
 *
 * @see {@link HerokuCommand}
 * @see {@link AppSetupService}
 * @see {@link AppService}
 */
export class DeployToHeroku extends AbortController {
  public static COMMAND_ID = 'heroku:deploy-to-heroku';
  protected appService = new AppService('https://api.heroku.com');
  protected sourcesService = new SourceService('https://api.heroku.com');

  protected appSetupService = new AppSetupService('https://api.heroku.com');
  protected buildService = new BuildService('https://api.heroku.com');

  protected requestInit: RequestInit | undefined;

  protected target: string | App | null | undefined;
  protected deploymentOptions!: DeploymentOptions;

  /**
   * Deploys the current workspace to Heroku by means
   * of the AppSetup apis.
   *
   * This function orchestrates the following steps:
   * 1. Determines if the app.json configuration file exists and is valid
   * 2. Determines if the the Procfile exists
   * 2. Creates and deploys a new Heroku application
   *
   * The deployment process is displayed in a progress notification that can be cancelled
   * by the user. Upon successful deployment, the new app is added to the git
   * remote and the user is notified with options to view the app in the explorer
   *
   * Note that the AppSetupService requires a URL to download a tarball. If
   * the blobUri argument is provided (such as the git repo's archive link) and the
   * local branch has uncommitted changes, those changes will not be reflected
   * in the deployment (obviously).
   *
   * Requirements:
   * - Valid app.json file in the workspace root
   * - Profile must exist in the workspace root
   * - Valid Heroku authentication token
   *
   * @param target (provided by VSCode) the Uri of the target file or the App object or null.
   * When a Procfile is selected, the target and the selectedFileUris contains the Procfile Uri.
   * When the app.json is selected, the target and the selectedFileUris contains the app.json Uri.
   * When an App is selected, the target contains the App object and the selectedFileUris is null.
   * @param deploymentOptions details used for the deployment
   *
   * @throws {Error} If authentication fails or required files are missing
   * @throws {Error} If the app.json validation fails
   * @throws {Error} If the deployment to Heroku fails
   * @see runOperationWithProgress
   * @see deployToHeroku
   *
   * @returns A promise that resolves when the deployment is complete
   *                         or rejects if an error occurs during deployment
   */
  public async run(target: string | App | null, deploymentOptions: DeploymentOptions = {}): Promise<DeploymentResult> {
    this.target = target;
    this.deploymentOptions = deploymentOptions;
    this.requestInit = await generateRequestInit(this.signal);

    // Resolving to a falsy value indicates the user cancelled
    // rejecting means something went wrong.
    let result: DeploymentResult = null;
    try {
      // Main entry for this command is the runOperationWithProgress
      result = await this.runOperationWithProgress();
      if (!result) {
        this.abort();
        const abortMessage = 'Deployment cancelled';
        throw new DeploymentError(abortMessage);
      }
    } catch (error) {
      const message = (error as Error).message;
      return { errorMessage: message };
    }
    return result;
  }

  /**
   * Orchestrates the deployment tasks and handles cancellations.
   * This function wraps the deployment process into a Promise
   * and returns it. The Promise returned from this function
   * is expected to be awaited on in a try...catch.
   *
   * It performs the following tasks:
   * 1. Validates the app.json configuration file
   * 2. Validates the Procfile
   * 3. Creates and deploys a new Heroku application
   * 4. Adds the new Heroku app to the git remote
   * 5. Displays a notification with options to view the app in the explorer
   *
   * @returns The deployment process wrapped in a promise
   */
  protected runOperationWithProgress = async (): Promise<DeploymentResult> => {
    const operationPromise = async (): Promise<DeploymentResult> => {
      const { tarballUri } = this.deploymentOptions;
      const taskPromise = (async (): Promise<(Build & { name: string }) | null> => {
        // app.json is required on an initial deployment using this flow
        if (!tarballUri && !this.isApp(this.target)) {
          await this.validateAppJson();
        }
        // Procfile is not necessary but deployment might fail.
        if (!tarballUri) {
          const hasProcfile = await this.validateProcfile();
          if (!hasProcfile) {
            const warning =
              'Warning: No Procfile found. Heroku will attempt to automatically detect the type of application being deployed.';
          }
        }
        // We're good to deploy
        const deployResult = await this.deployToHeroku();
        return deployResult;
      })();

      return taskPromise;
    };

    return operationPromise();
  };

  /**
   * Builds and sends the payload to Heroku for setting
   * up a new app. If a tarballUri is provided, it will be used
   * as the source_blob url. Otherwise, the AppSetup service will
   * create a new tarball and upload it to the source_blob url created
   * by the SourceService.
   *
   * - If the target argument is provided and this is an App object,
   * a new build is created and deployed to the app.
   * - If the target argument is not an App object and existing apps are found
   * in the workspace, a dialog is presented to ask the user
   * where to deploy.
   * - If the target argument is not an App object and no existing
   * apps are found in the workspace, a new app is created and deployed.
   *
   * @returns an AppSetup object with the details of the newly setup app
   * @throws {DeploymentError} If the deployment fails
   */
  protected async deployToHeroku(): Promise<(Build & { name: string }) | null> {
    const { tarballUri, rootUri, appNames, name, appJson } = this.deploymentOptions;

    let blobUrl = tarballUri?.toString();

    // Create and use an amazon s3 bucket and
    // then upload the newly created tarball
    // from the local sources if no tarballUri was provided.
    if (!blobUrl) {
      const generatedAppJson = appJson ? [{ relativePath: './app.json', contents: appJson }] : [];
      const tarball = await packSources(rootUri!, generatedAppJson);
      const { source_blob: sourceBlob } = await this.sourcesService.create(this.requestInit);
      blobUrl = sourceBlob!.get_url;
      // trim off the s3 bucket key and signature
      const response = await uploadWithDetailedProgress(sourceBlob!.put_url, tarball, this.signal);

      if (response.ok) {
      } else {
        const uploadErrorMessage = `Error uploading tarball to ${blobUriBase}. The server responded with: ${response.status} - ${response.statusText}`;
        throw new Error(uploadErrorMessage);
      }
    }
    // The user has right-clicked on a
    // Procfile or app.json or has used
    // the deploy to heroku decorator button
    // and we have apps in the remote. Ask
    // the user where to deploy.
    const isExistingDeployment = this.isApp(this.target);

    const result = isExistingDeployment
      ? await this.createNewBuildForExistingApp(blobUrl, this.target as App)
      : await this.setupNewApp(blobUrl);

    // This is a new app setup and needs a git remote
    // added to the workspace.
    if (!isExistingDeployment && result) {
      // Add the new remote to the workspace
      const app = await this.appService.info(result.name, this.requestInit);
      try {
        execSync(`git remote add heroku-${result.name} ${app.git_url}`, { cwd: rootUri! });
      } catch {
        // Ignore
      }
    }
    return result;
  }

  /**
   * Checks for the existence of the Procfile.
   *
   * @returns boolean indicating whether a Procfile was found
   * @throws {Error} If the Procfile is missing or invalid
   */
  protected async validateProcfile(): Promise<boolean> {
    try {
      const procFileUri = vscode.Uri.joinPath(this.deploymentOptions.rootUri as vscode.Uri, 'Procfile');
      await vscode.workspace.fs.stat(procFileUri);
    } catch {
      return false;
    }
    return true;
  }
  /**
   * Reads and validates the app.json. If it is invalid,
   * the errors are logged and the user is informed that
   * the app will not be deployed and the action is aborted.
   *
   * @returns The app.json as an object or undefined if it is invalid
   * @throws {Error} If the app.json is invalid or cannot be read
   */
  protected async validateAppJson(): Promise<AppJson | undefined> {
    const { appJson, rootUri } = this.deploymentOptions;
    const readAppJsonResult: AppJson | ValidatorResult = await readAppJson(
      rootUri as vscode.Uri,
      appJson ? Buffer.from(appJson) : undefined
    );

    if (readAppJsonResult instanceof ValidatorResult) {
      let message =
        'invalid app.json\nThe following errors were found in app.json:\n--------------------------------\n';
      readAppJsonResult.errors.forEach((error) => {
        message += error.stack + '\n';
      });
      message += '--------------------------------';
      throw new Error(message);
    }
    return readAppJsonResult;
  }

  /**
   * Creates a new build for the given appIdentity.
   * This function is used when creating a new build
   * for an existing app.
   *
   * @param blobUrl The url of the blob to sent to the app setup service
   * @param app The App object to create the build for
   * @returns Build object with the details of the newly created build
   * @throws {DeploymentError} If the deployment fails
   */
  private async createNewBuildForExistingApp(blobUrl: string, app: App): Promise<Build & { name: string }> {
    const payload: BuildCreatePayload = {
      // eslint-disable-next-line camelcase
      source_blob: {
        url: blobUrl,
        checksum: null,
        version: null,
        // eslint-disable-next-line camelcase
        version_description: null
      }
    };

    try {
      const result = await this.buildService.create(app.id!, payload, this.requestInit);
      if (result.output_stream_url) {
        // logExtensionEvent(`---------- begin build output for ${app.name!} ----------`);
        await this.streamBuildOutput(result.output_stream_url);
        // logExtensionEvent(`----------- end build output for ${app.name!} -----------`);
      }

      const info = await this.buildService.info(app.id!, result.id!, this.requestInit);
      if (info.status === 'failed') {
        throw new DeploymentError(
          `The request was sent to Heroku successfully but there was a problem with deployment: ${info.status}`,
          app.name
        );
      }
      return { ...info, name: app.name! };
    } catch (error) {
      throw new DeploymentError((error as Error).message);
    }
  }

  /**
   * Sets up a new app using the AppSetup service and the
   * supplied blobUrl.
   *
   * @param blobUrl The url of the blob to sent to the app setup service
   * @returns Build object with the details of the newly setup app
   * @throws {DeploymentError} If the deployment fails
   */
  private async setupNewApp(blobUrl: string): Promise<Build & { name: string }> {
    const { name, spaceId, teamId, env, internalRouting } = this.deploymentOptions;
    const payload: AppSetupCreatePayload = {
      // eslint-disable-next-line camelcase
      source_blob: {
        url: blobUrl
      },
      overrides: { env },
      app: {
        name: name ?? undefined,
        // undefined instead of '' for these 2
        organization: teamId ?? undefined,
        space: spaceId ?? undefined
      }
    };
    // internal_routing appears to be missing from the schema
    // but this field is included when the dashboard makes the call
    // and is successful.
    Reflect.set(payload.app!, 'internal_routing', !!internalRouting);

    try {
      const result = await this.appSetupService.create(payload, this.requestInit);
      let info: AppSetup | undefined;
      let retriesOnError = 3;
      while (retriesOnError > 0) {
        try {
          info = await this.appSetupService.info(result.id, this.requestInit);
          if (info?.build?.output_stream_url ?? info?.status === 'failed') {
            break;
          }
        } catch (error) {
          retriesOnError--;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (!info) {
        throw new DeploymentError(
          `The request was sent to Heroku successfully but there was a problem with deployment`
        );
      }
      if (info?.build?.output_stream_url) {
        await this.streamBuildOutput(info.build.output_stream_url);
      }
      // get the info one last time to determine if the build was successful.
      while (info.status === 'pending') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        info = await this.appSetupService.info(result.id, this.requestInit);
      }
      if (info.failure_message) {
        let errorMessage = `Error: deployment failed with "${info.failure_message}"\n`;

        if (info.manifest_errors?.length) {
          errorMessage += '-----------------------\n';
          info.manifest_errors.forEach((error) => (errorMessage += error + '\n'));
          errorMessage += '-----------------------\n';
        }
        throw new DeploymentError(
          `The request was sent to Heroku successfully but there was a problem with deployment:\n${errorMessage}`,
          result.app.id
        );
      }
      if (info.postdeploy?.output) {
        // logExtensionEvent(`post deploy: ${info.postdeploy.output}`);
      }
      return { ...info.build!, name: result.app.name };
    } catch (error) {
      // logExtensionEvent(`${(error as Error).stack}`);
      throw new DeploymentError((error as Error).message);
    }
  }

  /**
   * Streams the build output to the console.
   *
   * @param streamUrl the URL of the stream
   */
  private async streamBuildOutput(streamUrl: string): Promise<void> {
    const stream = await fetch(streamUrl);
    const reader = stream.body?.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    while (!this.signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.length > 1) {
        // logExtensionEvent(Buffer.from(value).toString(), 'build');
        continue;
      }
      // logExtensionEvent('waiting....');
    }
  }

  /**
   * Determines if the target is an App object.
   *
   * @param target The object to test.
   * @returns true if the target object is an App object, false otherwise
   */
  private isApp(target: unknown): target is App {
    return !!target && typeof target === 'object' && 'id' in target && 'name' in target;
  }

  /**
   * Formats the given file size in bytes into a human-readable string.
   *
   * @param bytes the number of bytes to format
   * @returns a formatted string representing the file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const thresholds = [
      1, // Bytes:  0 - 1023 bytes
      1024, // KB:     1024 bytes - 1,048,575 bytes
      1_048_576, // MB:     1,048,576 bytes - 1,073,741,823 bytes
      1_073_741_824 // GB:     1,073,741,824 bytes and up
    ];

    let unitIndex = 0;
    while (unitIndex < thresholds.length - 1 && bytes >= thresholds[unitIndex + 1]) {
      unitIndex++;
    }
    const value = bytes / thresholds[unitIndex];
    // No fractional Bytes or KB - all other units are 2 decimals
    const precision = unitIndex === 0 ? 0 : unitIndex === 1 ? 1 : 2;

    return `${value.toFixed(precision)} ${units[unitIndex]}`;
  }
}
