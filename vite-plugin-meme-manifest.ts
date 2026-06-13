import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const MEMES_DIR = path.resolve('public/memes');
const MANIFEST_PATH = path.join(MEMES_DIR, 'index.json');
const MANIFEST_BASENAME = 'index.json';

async function listTemplateJsons(): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(MEMES_DIR);
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
  return entries
    .filter((name) => name.endsWith('.json') && name !== MANIFEST_BASENAME)
    .sort();
}

async function writeManifest(): Promise<void> {
  const fileNames = await listTemplateJsons();
  const next = JSON.stringify(fileNames, null, 2) + '\n';

  // Avoid touching the file when contents are unchanged so the dev watcher
  // doesn't reload itself in a loop.
  try {
    const current = await fs.readFile(MANIFEST_PATH, 'utf8');
    if (current === next) return;
  } catch (err) {
    if ((err as { code?: string }).code !== 'ENOENT') throw err;
  }

  await fs.mkdir(MEMES_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_PATH, next, 'utf8');
}

/**
 * Generates `public/memes/index.json`, a sorted list of template JSON file
 * names, so the runtime can discover templates without `import.meta.glob`
 * (assets in `public/` are not part of the module graph).
 *
 * - Runs once at `buildStart` for both dev and build.
 * - In dev, watches `public/memes/` and rewrites the manifest on add/unlink
 *   of any JSON file other than `index.json` itself.
 * - The manifest is a generated artifact and is gitignored.
 */
export function memeManifestPlugin(): Plugin {
  return {
    name: 'meme-manifest',
    async buildStart() {
      await writeManifest();
    },
    configureServer(server) {
      server.watcher.add(MEMES_DIR);
      const handler = (file: string) => {
        const normalized = path.normalize(file);
        if (!normalized.startsWith(MEMES_DIR)) return;
        if (!normalized.endsWith('.json')) return;
        if (path.basename(normalized) === MANIFEST_BASENAME) return;
        writeManifest().catch((err) => {
          server.config.logger.error(`[meme-manifest] failed to update: ${err}`);
        });
      };
      server.watcher.on('add', handler);
      server.watcher.on('unlink', handler);
    },
  };
}
