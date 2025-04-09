import { execSync } from 'node:child_process';
import { ValidatorResult } from 'jsonschema';
import { AppSetup, Build, Dyno } from '@heroku-cli/schema';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpToolResponse } from '../utils/mcp-tool-response.js';
import { AppJson, type EnvironmentVariables, readAppJson } from '../utils/read-app-json.js';
import AppService from '../services/app-service.js';
import SourceService from '../services/source-service.js';
import AppSetupService, { AppSetupCreatePayload } from '../services/app-setup-service.js';
import BuildService, { type BuildCreatePayload } from '../services/build-service.js';
import { generateRequestInit } from '../utils/generate-request-init.js';
import { packSources } from '../utils/tarball.js';
import DynoService from '../services/dyno-service.js';
import { RendezvousConnection } from '../services/rendezvous.js';

const appJsonSchema = await import('../utils/app-json.schema.json', { with: { type: 'json' } });

/**
 * The only successful result is the Build & { name: string } type
 * or a OneOffDynoResult for one-off dyno deployments
 */
export type DeploymentResult =
  | (Build & { name: string; errorMessage?: string })
  | OneOffDynoResult
  | { name?: string; errorMessage: string }
  | null;

/**
 * Type used for the deployment options.
 */
export type DeploymentOptions = {
  rootUri?: string | null;
  tarballUri?: string;
  name?: string;
  teamId?: string;
  spaceId?: string;
  internalRouting?: boolean;
  env?: EnvironmentVariables;
  appJson?: Uint8Array;
};

/**
 * Type used for the one-off dyno configuration.
 */
export type OneOffDynoConfig = DeploymentOptions & {
  command: string;
  sources?: Array<{ relativePath: string; contents: string }>;
  size?: string;
  timeToLive?: number;
} & {
  name: string;
  internalRouting?: never;
  appJson?: never;
};

/**
 * Type used for the one-off dyno result.
 * Contains the dyno details, captured output, and execution status.
 */
export type OneOffDynoResult = {
  /** The dyno object containing details about the created dyno */
  dyno: Dyno;
  /** The complete output captured from the dyno's execution */
  output: string;
  /** The exit code from the dyno execution. 0 indicates success, non-zero indicates failure */
  exitCode: number;
  /** The name of the app the dyno was created in */
  name: string;
  /** Optional error message if the dyno execution failed */
  errorMessage?: string;
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
  protected appService = new AppService('https://api.heroku.com');
  protected sourcesService = new SourceService('https://api.heroku.com');

  protected appSetupService = new AppSetupService('https://api.heroku.com');
  protected buildService = new BuildService('https://api.heroku.com');
  protected dynoService = new DynoService('https://api.heroku.com');

  protected requestInit: RequestInit | undefined;

  protected isExistingDeployment: boolean = false;
  protected deploymentOptions!: DeploymentOptions | OneOffDynoConfig;

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
   * @param deploymentOptions details used for the deployment
   *
   * @throws {Error} If authentication fails or required files are missing
   * @throws {Error} If the app.json validation fails
   * @throws {Error} If the deployment to Heroku fails
   * @see runOperation
   * @see deployToHeroku
   *
   * @returns A promise that resolves when the deployment is complete or rejects if an error occurs during deployment
   */
  public async run(deploymentOptions: DeploymentOptions | OneOffDynoConfig = {}): Promise<DeploymentResult> {
    this.deploymentOptions = deploymentOptions;
    this.requestInit = await generateRequestInit(this.signal);
    try {
      const app = deploymentOptions.name
        ? await this.appService.info(deploymentOptions.name, this.requestInit)
        : undefined;
      this.isExistingDeployment = Boolean(app);
    } catch {
      // no-op
    }
    // rejecting means something went wrong.
    let result: DeploymentResult = null;
    try {
      result = await this.runOperation();
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
   * For regular deployments, it performs:
   * 1. Validates the app.json configuration file
   * 2. Validates the Procfile
   * 3. Creates and deploys a new Heroku application
   * 4. Adds the new Heroku app to the git remote
   * 5. Displays a notification with options to view the app in the explorer
   *
   * For one-off dynos, it:
   * 1. Creates and configures the dyno
   * 2. Waits for the dyno to start
   * 3. Establishes a rendezvous connection to capture output
   * 4. Monitors execution until completion
   * 5. Handles automatic cleanup if timeToLive is specified
   *
   * @returns The deployment process wrapped in a promise
   */
  protected runOperation = async (): Promise<DeploymentResult> => {
    const { tarballUri } = this.deploymentOptions;

    // If command is present, this is a one-off dyno deployment
    if ('command' in this.deploymentOptions) {
      return this.deployOneOffDyno();
    }

    // Regular app deployment flow
    // app.json is required on an initial deployment using this flow
    if (!tarballUri && !this.isExistingDeployment) {
      await this.validateAppJson();
    }
    // We're good to deploy
    return this.deployToHeroku();
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
    const { tarballUri, rootUri, appJson } = this.deploymentOptions;

    let blobUrl = tarballUri?.toString();

    // Create and use an amazon s3 bucket and
    // then upload the newly created tarball
    // from the local sources if no tarballUri was provided.
    if (!blobUrl) {
      const generatedAppJson = appJson ? [{ relativePath: './app.json', contents: appJson }] : [];
      const tarball = await packSources(rootUri!, generatedAppJson);
      const { source_blob: sourceBlob } = await this.sourcesService.create(this.requestInit);
      blobUrl = sourceBlob!.get_url!;
      try {
        const response = await fetch(sourceBlob!.put_url!, {
          method: 'PUT',
          body: tarball
        });

        if (!response.ok) {
          const uploadErrorMessage = `Error uploading tarball to S3 bucket. The server responded with: ${response.status} - ${response.statusText}`;
          throw new Error(uploadErrorMessage);
        }
      } catch (error) {
        throw new DeploymentError((error as Error).message);
      }
    }
    // The user has right-clicked on a
    // Procfile or app.json or has used
    // the deploy to heroku decorator button
    // and we have apps in the remote. Ask
    // the user where to deploy.

    const result = this.isExistingDeployment
      ? await this.createNewBuildForExistingApp(blobUrl, this.deploymentOptions.name ?? '')
      : await this.setupNewApp(blobUrl);

    // This is a new app setup and needs a git remote
    // added to the workspace.
    if (!this.isExistingDeployment && result) {
      // Add the new remote to the workspace
      const app = await this.appService.info(result.name, this.requestInit);
      try {
        execSync(`git remote add heroku-${result.name} ${app.git_url!}`, { cwd: rootUri! });
      } catch {
        // Ignore
      }
    }
    return result;
  }

  /**
   * Deploys a one-off dyno to the app and captures its output.
   * This method:
   * 1. Creates and configures the dyno with the specified settings
   * 2. Waits for the dyno to start
   * 3. Establishes a rendezvous connection to capture output
   * 4. Monitors execution until completion
   * 5. Handles automatic cleanup if timeToLive is specified
   *
   * @returns A promise resolving to an object containing:
   *          - dyno: The Heroku dyno object
   *          - output: The complete output from the dyno's execution
   *          - exitCode: The process exit code (0 for success, non-zero for failure)
   *          - name: The name of the app the dyno was created in
   *          - errorMessage: Optional error message if execution failed
   * @throws {DeploymentError} If the deployment fails, dyno crashes, or no attach URL is available
   * @throws {Error} For general deployment failures with detailed error messages
   */
  protected async deployOneOffDyno(): Promise<OneOffDynoResult> {
    const { name, command, size, timeToLive, env, sources } = this.deploymentOptions as OneOffDynoConfig;
    try {
      // If sources are provided, pack them and modify the command
      let finalCommand = command;
      if (sources?.length) {
        const commands = [
          'TEMP_DIR=$(mktemp -d)',
          'cd $TEMP_DIR',
          ...sources.map(
            (source) => `printf '%s' '${source.contents.replace(/'/g, "'\\''")}' > ${source.relativePath}`
          ),
          command,
          'cd - > /dev/null',
          'rm -rf $TEMP_DIR'
        ];
        finalCommand = commands.join(' && ');
      }

      // Create and start the one-off dyno
      const dyno = await this.dynoService.create(
        name,
        {
          command: finalCommand,
          size: size ?? 'basic',
          type: 'run',
          // eslint-disable-next-line camelcase
          time_to_live: timeToLive,
          attach: true,
          env: env ?? {},
          // eslint-disable-next-line camelcase
          force_no_tty: true
        },
        this.requestInit
      );

      // Connect to the dyno and capture output
      const rendezvous = new RendezvousConnection({
        uri: new URL(dyno.attach_url!),
        rejectUnauthorized: true,
        showStatus: true,
        onStatusChange: (status: string): void => {
          // eslint-disable-next-line no-console
          console.log(`Dyno status: ${status}`);
        }
      });

      // Capture the output and exit code
      const { output, exitCode } = await rendezvous.connect();

      // Set up auto-stop if timeToLive is specified
      if (timeToLive) {
        const timeoutFunc = async (): Promise<void> => {
          try {
            await this.dynoService.stop(name, dyno.id!, this.requestInit);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Failed to stop dyno:', error);
          }
        };
        setTimeout(() => void timeoutFunc(), timeToLive * 1000);
      }

      return {
        dyno,
        output,
        exitCode,
        name,
        errorMessage: exitCode !== 0 ? `Dyno exited with code ${exitCode}` : undefined
      };
    } catch (error) {
      if (error instanceof DeploymentError) {
        throw error;
      }
      throw new Error(`One-off dyno deployment failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
      rootUri!,
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
   * @param appName The name of the app to create the build for
   * @returns Build object with the details of the newly created build
   * @throws {DeploymentError} If the deployment fails
   */
  private async createNewBuildForExistingApp(blobUrl: string, appName: string): Promise<Build & { name: string }> {
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
      const result = await this.buildService.create(appName, payload, this.requestInit);
      let buildOutput = '';
      if (result.output_stream_url) {
        buildOutput = await this.captureBuildOutput(result.output_stream_url);
      }

      const info = await this.buildService.info(appName, result.id!, this.requestInit);
      if (info.status === 'failed') {
        throw new DeploymentError(
          `The request was sent to Heroku successfully but there was a problem with deployment: ${info.status} - ${buildOutput}`,
          appName
        );
      }
      return { ...info, name: appName };
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
      source_blob: { url: blobUrl },
      overrides: { env },
      app: {
        name: name ?? undefined,
        organization: teamId ?? undefined,
        space: spaceId ?? undefined
      }
    };
    Reflect.set(payload.app!, 'internal_routing', !!internalRouting);

    try {
      const result = await this.appSetupService.create(payload, this.requestInit);
      const info = await this.waitForAppSetup(result);
      return {
        ...info.build!,
        name: result.app!.name!,
        postDeployOutput: info.postdeploy?.output,
        buildOutput: info.build?.output
      };
    } catch (error) {
      throw new DeploymentError((error as Error).message);
    }
  }

  /**
   * Waits for the app setup to complete.
   *
   * @param result The app setup result
   * @returns The app setup result
   * @throws {DeploymentError} If the deployment fails
   */
  private async waitForAppSetup(result: AppSetup): Promise<AppSetup> {
    let info: AppSetup | undefined;
    let retriesOnError = 3;

    while (retriesOnError > 0) {
      try {
        info = await this.appSetupService.info(result.id!, this.requestInit);
        if (info?.build?.output_stream_url ?? info?.status === 'failed') {
          break;
        }
      } catch {
        retriesOnError--;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!info) {
      throw new DeploymentError('The request was sent to Heroku successfully but there was a problem with deployment');
    }

    if (info?.build?.output_stream_url) {
      const buildOutput = await this.captureBuildOutput(info.build.output_stream_url as string);
      info.build.output = buildOutput;
    }

    while (info.status === 'pending') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      info = await this.appSetupService.info(result.id!, this.requestInit);
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
        result.app?.id
      );
    }

    return info;
  }

  /**
   * Streams the build output to the console.
   *
   * @param streamUrl the URL of the stream
   * @returns The build output
   */
  private async captureBuildOutput(streamUrl: string): Promise<string> {
    let output = '';
    const stream = await fetch(streamUrl);
    const reader = stream.body?.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    while (!this.signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.length > 1) {
        output += Buffer.from(value).toString();
      }
    }
    return output;
  }
}

/**
 * Schema for validating Heroku deployment parameters.
 * This schema enforces the structure and types of deployment options
 * including required fields and optional configurations.
 */
export const deployToHerokuSchema = z
  .object({
    name: z
      .string()
      .min(5)
      .max(30)
      .describe(
        'Heroku application name for deployment target. If omitted, a new app will be created with a random name. If supplied and the app does not exist, the tool will create a new app with the given name.'
      ),
    rootUri: z
      .string()
      .min(1)
      .describe(
        "The absolute path of the user's workspace unless otherwise specified by the user. Must be a string that can be resolved to a valid directory using node's path module."
      ),
    tarballUri: z
      .string()
      .optional()
      .describe(
        'The URL of the tarball to deploy. If not provided, the rootUri must be provided and the tool will create a new tarball from the contents of the rootUri.'
      ),
    teamId: z
      .string()
      .optional()
      .describe(
        'Heroku team identifier for team-scoped deployments. Use teams_list tool to get a list of teams if needed.'
      ),
    spaceId: z
      .string()
      .optional()
      .describe(
        'Heroku private space identifier for space-scoped deployments. Use spaces_list tool to get a list of spaces if needed.'
      ),
    internalRouting: z
      .boolean()
      .optional()
      .describe(
        'Enables internal routing within private spaces. Use this flag when you need to configure private spaces for internal routing.'
      ),
    env: z
      .record(z.string(), z.any())
      .optional()
      .describe('Key-value pairs of environment variables for the deployment that override the ones in app.json'),
    appJson: z.string()
      .describe(`Stringified app.json configuration for deployment. Used for dynamic configurations or converted projects.
  The app.json string must be valid and conform to the following schema: ${JSON.stringify(appJsonSchema, null, 0)}`)
  })
  .strict();

export type DeployToHerokuParams = z.infer<typeof deployToHerokuSchema>;

/**
 * Registers the deploy_to_heroku tool with the MCP server.
 * This tool handles deployment of applications to Heroku using app.json configuration.
 * It supports team and private space deployments, environment variable configuration,
 * and custom app.json specifications.
 *
 * @param server - The MCP server instance to register the tool with
 */
export const registerDeployToHerokuTool = (server: McpServer): void => {
  server.tool(
    'deploy_to_heroku',
    'Deploy projects to Heroku, replaces manual git push workflows. Use this tool when you need to: ' +
      '1) Deploy a new application with specific app.json configuration, 2) Update an existing application with new code, ' +
      '3) Configure team or private space deployments, or 4) Set up environment-specific configurations. ' +
      'Important: Check for an app.json file first. If an app.json does not exist in the workspace, you must create one and pass it in via the appJson parameter. ' +
      'The tool handles app creation, source code deployment, and environment setup. ' +
      'Requires valid app.json in workspace or provided via configuration. ' +
      'Supports team deployments, private spaces, and custom environment variables.' +
      'Use apps_list tool with the "all" param to get a list of apps for the user to choose from when deploying to an existing app and the app name was not provided.',
    deployToHerokuSchema.shape,
    async (options: DeployToHerokuParams): Promise<McpToolResponse> => {
      const deployToHeroku = new DeployToHeroku();
      const result = await deployToHeroku.run({
        rootUri: options.rootUri,
        tarballUri: options.tarballUri,
        name: options.name,
        teamId: options.teamId,
        spaceId: options.spaceId,
        internalRouting: options.internalRouting,
        env: options.env as EnvironmentVariables,
        appJson: options.appJson ? new TextEncoder().encode(options.appJson) : undefined
      });

      if (result?.errorMessage) {
        return {
          success: false,
          message: result.errorMessage,
          content: [{ type: 'text', text: result.errorMessage }]
        };
      }

      const successMessage = `Successfully deployed to ${result?.name ?? 'Heroku'}`;
      return {
        success: true,
        message: successMessage,
        content: [{ type: 'text', text: successMessage }],
        data: result
      };
    }
  );
};

// Define the schema for deploying to a one-off dyno
export const deployOneOffDynoSchema = z
  .object({
    name: z.string().min(5).max(30).describe('Name of the Heroku app for the one-off dyno.'),
    command: z.string().describe('Command to execute in the one-off dyno.'),
    sources: z
      .array(
        z.object({
          relativePath: z
            .string()
            .describe('A virtual path to the source file used to create the tarball entry for this file.'),
          contents: z.string().describe('Contents of the source file represented as a string.')
        })
      )
      .optional()
      .describe('Array of objects representing the source files to include in the dyno.'),
    size: z.string().optional().describe('Dyno size (optional).').default('standard-1x'),
    timeToLive: z.number().optional().describe('Dyno lifespan in seconds (optional).').default(3600),
    env: z.record(z.string(), z.any()).optional().describe('Environment variables for the dyno (optional).')
  })
  .strict();

export const execToolSchemaDescription = `
Execute code or a command on a Heroku one-off dyno in a sandboxed environment with network and filesystem access.

**Requirements:**
- Display command output to the user.
- Determine app language using the 'app_info' tool to identify the Heroku buildpack.
- Use shell commands for environment setup (e.g., package installations) before execution.
- Output must utilize standard input/output.

**Capabilities:**
- Network and filesystem access
- Environment variables support
- File creation and execution in supported languages
- Temporary directory management

**Guidelines:**
1. Use the appropriate Heroku-supported language runtime.
2. Ensure correct syntax and module imports for the chosen language.
3. Organize code into classes/functions, executed from the top level.
4. For external packages:
   - Specify in the appropriate package manager file.
   - Minimize dependencies.
   - Prefer native modules when possible.

**Example (Node.js package manager file):**
\`\`\`json
{
  "type": "module",
  "dependencies": {
    "axios": "^1.6.0"
  }
}
\`\`\`
`;
/**
 * Registers the deploy_one_off_dyno tool with the MCP server.
 * This tool handles deployment of one-off dynos to Heroku using the specified command and configuration.
 *
 * @param server - The MCP server instance to register the tool with
 */
export const registerDeployOneOffDynoTool = (server: McpServer): void => {
  server.tool(
    'deploy_one_off_dyno',
    execToolSchemaDescription,
    deployOneOffDynoSchema.shape,
    async (options: OneOffDynoConfig): Promise<McpToolResponse> => {
      const deployToHeroku = new DeployToHeroku();
      const result = (await deployToHeroku.run(options)) as OneOffDynoResult;

      if (result?.errorMessage) {
        return {
          success: false,
          message: result.errorMessage,
          content: [{ type: 'text', text: result.errorMessage }]
        };
      }

      return {
        success: true,
        message: result.output ?? 'Successfully deployed one-off dyno to Heroku',
        content: [{ type: 'text', text: result.output }],
        data: result
      };
    }
  );
};
