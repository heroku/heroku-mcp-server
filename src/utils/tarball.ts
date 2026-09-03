import zlib from 'node:zlib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import * as tar from 'tar-stream';

export type GeneratedContent = { relativePath: string; contents: Uint8Array };
/**
 * Creates a compressed tarball (tar.gz) from the contents of a workspace folder.
 * The function respects git ignore rules and excludes node_modules directory.
 *
 * @param root - The workspace folder to create a tarball from or undefined when only generated content should be included
 * @param additionalContents - Additional contents to include in the tarball
 * @returns A Promise that resolves to a Uint8Array containing the compressed tarball data
 *
 * @example
 * const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
 * if (workspaceFolder) {
 *   const tarballData = await packSources(workspaceFolder);
 * }
 *
 * - Files in node_modules are automatically excluded
 * - Files matched by .gitignore rules are excluded
 * - File paths in the archive are relative to the workspace root
 * - The function uses streaming to handle large directories efficiently
 *
 * @throws {Error} If unable to read workspace files or create the tarball
 */
export async function packSources(
  root: string | undefined,
  additionalContents: GeneratedContent[] = []
): Promise<Uint8Array> {
  const files = root ? await getSourceFilePaths(root) : [];

  const pack = tar.pack();
  const gzip = zlib.createGzip();
  const chunks: Buffer[] = [];

  gzip.on('data', (chunk) => chunks.push(chunk as Buffer));

  pack.pipe(gzip);

  for (const file of files) {
    try {
      const content = await fs.readFile(file);
      const relativePath = path.relative(root!, file);
      pack.entry({ name: relativePath }, Buffer.from(content));
    } catch {
      // Unreadable file or directory
    }
  }

  for (const additionalContent of additionalContents) {
    const { contents, relativePath } = additionalContent;
    pack.entry({ name: relativePath }, Buffer.from(contents));
  }

  pack.finalize();
  await new Promise((resolve) => gzip.on('end', resolve));
  return Buffer.concat(chunks);
}

/**
 * Gets all file paths from the root directory of the workspace
 *
 * @param root The root directory of the workspace
 * @returns A promise that resolves to an array of file paths
 */
export async function getSourceFilePaths(root: string): Promise<string[]> {
  let result: string;
  try {
    // We expect most users to have a git repo in their workspace
    result = execSync('git ls-files -c -o --exclude-standard', { cwd: root }).toString();
  } catch {
    // If no git repo is found, we'll just return the root directory
    result = './';
  }

  const paths = result.split('\n').filter((file) => Boolean(file));

  const realRoot = await fs.realpath(root);
  const allFiles: string[] = [];

  for (const p of paths) {
    const fullPath = path.join(root, p);
    try {
      const stats = await fs.lstat(fullPath);
      // Never follow a symlink whose target escapes the workspace root: doing so
      // would read files outside the deploy source and place them in the uploaded
      // tarball (W-23510157, CWE-59).
      if (stats.isSymbolicLink() && (await escapesRoot(realRoot, fullPath))) {
        continue;
      }
      // Resolve the (possibly in-root symlinked) entry to decide file vs. directory.
      const resolved = await fs.stat(fullPath);
      if (resolved.isDirectory()) {
        // Recursively get all files in directory
        const files = await walkDirectory(fullPath, realRoot);
        allFiles.push(...files);
      } else {
        allFiles.push(fullPath);
      }
    } catch {
      // Ignore
    }
  }

  return allFiles;
}

/**
 * Determines whether a path's real (symlink-resolved) location escapes the
 * workspace root. Following a repository symlink whose target lives outside the
 * selected root would let a malicious repository smuggle unrelated files from the
 * developer's machine into the uploaded source archive (W-23510157, CWE-59).
 *
 * @param realRoot The canonical (realpath-resolved) workspace root
 * @param candidate The path whose resolved target should be checked
 * @returns true when the resolved target is outside realRoot or cannot be resolved
 */
async function escapesRoot(realRoot: string, candidate: string): Promise<boolean> {
  try {
    const realCandidate = await fs.realpath(candidate);
    const relative = path.relative(realRoot, realCandidate);
    return relative.startsWith('..') || path.isAbsolute(relative);
  } catch {
    // A dangling or otherwise unresolvable link is excluded rather than read.
    return true;
  }
}

/**
 * Walks a directory and returns all file paths
 *
 * @param dir The directory to walk
 * @param realRoot The canonical (realpath-resolved) workspace root used to reject
 *   symlinks that resolve outside of it (W-23510157, CWE-59)
 * @returns A promise that resolves to an array of file paths
 */
async function walkDirectory(dir: string, realRoot: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Never follow a symlink whose target escapes the workspace root.
      if (entry.isSymbolicLink() && (await escapesRoot(realRoot, fullPath))) {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await walkDirectory(fullPath, realRoot);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore
  }

  return files;
}
