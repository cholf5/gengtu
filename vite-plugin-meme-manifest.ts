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

async function readTemplateJson(fileName: string, logger: { warn: (msg: string) => void }): Promise<unknown | null> {
  const filePath = path.join(MEMES_DIR, fileName);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    logger.warn(`[meme-manifest] failed to read ${fileName}: ${(err as Error).message}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    logger.warn(`[meme-manifest] invalid JSON in ${fileName}: ${(err as Error).message}`);
    return null;
  }
}

async function buildManifestPayload(logger: { warn: (msg: string) => void }): Promise<unknown[]> {
  const fileNames = await listTemplateJsons();
  const templates = await Promise.all(fileNames.map((name) => readTemplateJson(name, logger)));
  return templates.filter((t): t is object => t !== null);
}

async function writeManifest(logger: { warn: (msg: string) => void }): Promise<void> {
  const payload = await buildManifestPayload(logger);
  const next = JSON.stringify(payload, null, 2) + '\n';

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

const consoleLogger = {
  warn: (msg: string) => console.warn(msg),
};

/**
 * Generates `public/memes/index.json` — a single bundle that inlines every
 * template's full JSON, so the client only needs ONE fetch to load all
 * metadata. Without this, each template would be a separate request and
 * scaling to 100+ templates would death-by-RTT the gallery (HTTP/1.1
 * concurrency caps, TTFB stacking).
 *
 * - Runs once at `buildStart` for both dev and build.
 * - In dev, watches `public/memes/` and rewrites the manifest on add/unlink
 *   of any JSON file other than `index.json` itself, AND on change events
 *   so editing an existing template's metadata propagates without restart.
 * - The manifest is a generated artifact and is gitignored.
 */
export function memeManifestPlugin(): Plugin {
  return {
    name: 'meme-manifest',
    async buildStart() {
      await writeManifest(consoleLogger);
    },
    configureServer(server) {
      server.watcher.add(MEMES_DIR);
      const handler = (file: string) => {
        const normalized = path.normalize(file);
        if (!normalized.startsWith(MEMES_DIR)) return;
        if (!normalized.endsWith('.json')) return;
        if (path.basename(normalized) === MANIFEST_BASENAME) return;
        writeManifest(server.config.logger).catch((err) => {
          server.config.logger.error(`[meme-manifest] failed to update: ${err}`);
        });
      };
      server.watcher.on('add', handler);
      server.watcher.on('unlink', handler);
      server.watcher.on('change', handler);
    },
  };
}
