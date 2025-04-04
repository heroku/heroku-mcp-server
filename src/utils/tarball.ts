import zlib from 'node:zlib';
import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import * as tar from 'tar-stream';

export type GeneratedContent = { relativePath: string; contents: Uint8Array };
/**
 * Creates a compressed tarball (tar.gz) from the contents of a workspace folder.
 * The function respects git ignore rules and excludes node_modules directory.
 *
 * @param root - The workspace folder to create a tarball from
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
export async function packSources(root: string, additionalContents: GeneratedContent[] = []): Promise<Uint8Array> {
  const files = await getSourceFilePaths(root);

  const pack = tar.pack();
  const gzip = zlib.createGzip();
  const chunks: Buffer[] = [];

  gzip.on('data', (chunk) => chunks.push(chunk as Buffer));

  pack.pipe(gzip);

  for (const file of files) {
    const content = await readFile(file);
    const relativePath = path.relative(root, file);
    pack.entry({ name: relativePath }, Buffer.from(content));
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
 * that are not images
 *
 * @param root The root directory of the workspace
 * @returns An array of file paths that are not images
 */
export async function getSourceFilePaths(root: string): Promise<string[]> {
  const result = execSync('git ls-files -c -o --exclude-standard', { cwd: root });
  const imagePathRegex = /([^'"\\s]+?\.(?:png|jpe?g|gif))$/i;

  const paths = result
    .toString()
    .split('\n')
    .filter((file) => file && !imagePathRegex.test(file));

  const allFiles: string[] = [];

  for (const p of paths) {
    const fullPath = path.join(root, p);
    try {
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        // Recursively get all files in directory
        const files = await walkDirectory(fullPath);
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
 * Walks a directory and returns all file paths
 *
 * @param dir The directory to walk
 * @returns An array of file paths
 */
async function walkDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await walkDirectory(fullPath);
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
