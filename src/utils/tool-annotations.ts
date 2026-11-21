import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

/**
 * Annotation presets for MCP tool registration.
 *
 * MCP clients use these hints to decide which tools can run without asking the
 * user first. Without them the MCP specification defaults apply: every tool is
 * treated as non-read-only and destructive, so clients prompt on every call,
 * including plain reads such as `list_apps`.
 *
 * Every tool talks to the Heroku Platform API, so `openWorldHint` stays at its
 * default of `true`.
 */

/**
 * A tool that only reads state and changes nothing on Heroku.
 *
 * @param title - Human-readable tool name shown by clients
 */
export const readOnlyTool = (title: string): ToolAnnotations => ({
  title,
  readOnlyHint: true
});

/**
 * A tool that creates or adds resources but does not overwrite or remove
 * anything that already exists.
 *
 * @param title - Human-readable tool name shown by clients
 */
export const writeTool = (title: string): ToolAnnotations => ({
  title,
  readOnlyHint: false,
  destructiveHint: false
});

/**
 * A tool that can change, interrupt or remove existing state: running SQL,
 * restarting or scaling dynos, switching maintenance mode, promoting or
 * deploying code, upgrading a database.
 *
 * @param title - Human-readable tool name shown by clients
 */
export const destructiveTool = (title: string): ToolAnnotations => ({
  title,
  readOnlyHint: false,
  destructiveHint: true
});
