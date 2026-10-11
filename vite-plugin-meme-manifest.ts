import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Plugin } from 'vite';

const MEMES_DIR = path.resolve('public/memes');
const THUMBS_DIR = path.join(MEMES_DIR, 'thumbs');
const MANIFEST_PATH = path.join(MEMES_DIR, 'index.json');
const MANIFEST_BASENAME = 'index.json';
/** URL prefix (as served by the static host) for generated thumbs. */
const THUMBS_URL_PREFIX = '/memes/thumbs/';

/** Source image extensions we are willing to rasterize gallery thumbnails from. */
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']);

// Gallery cards render at ≤ ~230 CSS px (5-column grid in the 1180px container),
// so a 480px edge covers 2x DPR displays.
const THUMB_MAX_EDGE = 480;
const THUMB_QUALITY = 78;

interface CollectedTemplate {
  data: Record<string, unknown>;
  /** Absolute path of the referenced source image, when it exists in `public/memes/`. */
  imagePath: string | null;
  /** File name of the generated thumb inside `thumbs/`, when a source image exists. */
  thumbName: string | null;
}

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

/**
 * Reads every template JSON and pairs it with the source image its `url`
 * points at (resolved against `public/memes/`, ignoring external URLs).
 */
async function collectTemplates(logger: { warn: (msg: string) => void }): Promise<CollectedTemplate[]> {
  const fileNames = await listTemplateJsons();
  const payloads = await Promise.all(fileNames.map((name) => readTemplateJson(name, logger)));

  return payloads
    .filter((payload): payload is Record<string, unknown> => payload !== null && typeof payload === 'object')
    .map((data) => {
      const url = typeof data.url === 'string' ? data.url : '';
      const baseName = path.basename(url);
      const ext = path.extname(baseName).toLowerCase();
      const imagePath = url.startsWith('/') && IMAGE_EXTENSIONS.has(ext) ? path.join(MEMES_DIR, baseName) : null;
      const thumbName = imagePath ? `${baseName.slice(0, -ext.length)}.webp` : null;
      return { data, imagePath, thumbName };
    });
}

/**
 * Generates `thumbs/<name>.webp` for one source image unless an up-to-date
 * thumb already exists (freshness = thumb mtime ≥ source mtime). Returns the
 * thumb name on success, `null` on failure — the manifest then omits
 * `thumbUrl` and the gallery falls back to the original image.
 *
 * The file is written to a temp name and renamed into place so a crash
 * mid-encode can never leave a corrupt-but-fresh thumb behind.
 */
async function ensureThumb(
  imagePath: string,
  thumbName: string,
  logger: { warn: (msg: string) => void },
): Promise<string | null> {
  const thumbPath = path.join(THUMBS_DIR, thumbName);
  try {
    const sourceStat = await fs.stat(imagePath);
    const thumbStat = await fs.stat(thumbPath);
    if (thumbStat.mtimeMs >= sourceStat.mtimeMs) {
      return thumbName;
    }
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') {
      // Missing thumb is the normal first-run case; a missing source image is
      // the template's own problem (the editor 404s on it too) — skip silently.
      if (!(await fileExists(imagePath))) return null;
    } else {
      throw err;
    }
  }

  const tempPath = path.join(THUMBS_DIR, `${thumbName}.tmp-${process.pid}`);
  try {
    await sharp(imagePath)
      .resize({ width: THUMB_MAX_EDGE, height: THUMB_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toFile(tempPath);
    await fs.rename(tempPath, thumbPath);
    return thumbName;
  } catch (err) {
    logger.warn(`[meme-manifest] failed to generate thumbnail for ${path.basename(imagePath)}: ${(err as Error).message}`);
    await fs.rm(tempPath, { force: true }).catch(() => {});
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Deletes thumbs whose source template/image no longer exists. */
async function pruneThumbs(expected: Set<string>, logger: { warn: (msg: string) => void }): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(THUMBS_DIR);
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') return;
    throw err;
  }
  await Promise.all(
    entries
      .filter((name) => !expected.has(name))
      .map(async (name) => {
        try {
          await fs.rm(path.join(THUMBS_DIR, name), { force: true });
        } catch (err) {
          logger.warn(`[meme-manifest] failed to prune stale thumbnail ${name}: ${(err as Error).message}`);
        }
      }),
  );
}

async function buildManifestPayload(
  logger: { warn: (msg: string) => void },
): Promise<unknown[]> {
  const templates = await collectTemplates(logger);
  await fs.mkdir(THUMBS_DIR, { recursive: true });

  const ensured = await Promise.all(
    templates.map(async (template) => {
      template.data.thumbUrl =
        template.imagePath && template.thumbName
          ? (await ensureThumb(template.imagePath, template.thumbName, logger))
              ? `${THUMBS_URL_PREFIX}${template.thumbName}`
              : null
          : null;
      if (typeof template.data.thumbUrl !== 'string') {
        delete template.data.thumbUrl;
      }
      return template;
    }),
  );

  const expectedThumbs = new Set(
    ensured.map((template) => template.thumbName).filter((name): name is string => name !== null),
  );
  await pruneThumbs(expectedThumbs, logger);

  return ensured.map((template) => template.data);
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
 * Generates two artifacts under `public/memes/` so the client stays at a
 * handful of requests as the template count grows:
 *
 * 1. `index.json` — a single bundle that inlines every template's full JSON,
 *    plus a `thumbUrl` per template pointing at its generated thumbnail.
 *    Without the bundle, each template would be a separate request and scaling
 *    to 100+ templates would death-by-RTT the gallery (HTTP/1.1 concurrency
 *    caps, TTFB stacking).
 * 2. `thumbs/*.webp` — gallery-card covers resized to fit 480×480 (2x DPR for
 *    the ~230px cards), so first paint never downloads the multi-megabyte
 *    originals; those stay reserved for the editor/export paths.
 *
 * - Runs once at `buildStart` for both dev and build; stale thumbs are
 *   regenerated, orphaned ones pruned (the dir is gitignored).
 * - In dev, watches `public/memes/` and re-syncs on add/unlink/change of any
 *   template JSON *or* source image, so editing a template's metadata or
 *   replacing its picture propagates without restart. Writes inside
 *   `thumbs/` and of `index.json` itself are ignored to prevent loops.
 * - Both artifacts are generated and gitignored.
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
        if (normalized.startsWith(THUMBS_DIR)) return;
        if (path.basename(normalized) === MANIFEST_BASENAME) return;
        const ext = path.extname(normalized).toLowerCase();
        if (ext !== '.json' && !IMAGE_EXTENSIONS.has(ext)) return;
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
