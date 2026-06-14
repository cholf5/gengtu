/**
 * Bottom-right corner watermark stamped onto exported memes — see
 * `.docs/plans/2026-06-14-watermark-design.md` for the full design rationale.
 *
 * Two render paths share the same constants below to keep the live preview
 * (CSS) visually consistent with the exported PNG (canvas):
 *   - `<WatermarkOverlay>` for the React preview
 *   - `drawWatermark()` for the canvas export
 *
 * Default-on, can be toggled off via the editor's "导出时带水印" checkbox.
 * Sizes/padding scale with `imageHeight` so the watermark looks visually
 * consistent across image resolutions, mirroring `resolveSizeForImage`'s
 * approach for text fields.
 */

import type { CSSProperties } from 'react';

export const WATERMARK_TEXT = '梗图铺';
export const WATERMARK_LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

const HEIGHT_RATIO = 0.035;
const PADDING_RATIO = 0.02;
const FONT_TO_HEIGHT = 0.85;
const GAP_TO_HEIGHT = 0.35;
const SHADOW_BLUR_RATIO = 0.004;
const ALPHA = 0.85;
// System Chinese-friendly stack — Impact (the meme default) ships no CJK
// glyphs so we deliberately use a different font here. No new font asset.
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif";
const FONT_WEIGHT = 600;

export interface WatermarkLayout {
  /** Top-left x of the watermark group, in canvas pixels. */
  x: number;
  /** Top-left y of the watermark group, in canvas pixels. */
  y: number;
  /** Total width of the watermark group (logo + gap + text). */
  totalWidth: number;
  /** Total height of the watermark group (== logo size == font size's bounding box). */
  height: number;
  /** Distance from the right and bottom edges of the canvas. */
  padding: number;
  /** Logo square edge length, in canvas pixels. */
  logoSize: number;
  /** Text font size, in canvas pixels. */
  fontSize: number;
  /** Horizontal gap between logo and text, in canvas pixels. */
  gap: number;
  /** Soft-glow shadow blur radius, in canvas pixels. */
  shadowBlur: number;
}

/**
 * Pure layout calculator — no canvas, no DOM. The caller measures the text
 * width with their canvas context and passes it in so we can right-align the
 * group against the image's right padding edge.
 */
export function computeWatermarkLayout(
  imageWidth: number,
  imageHeight: number,
  textWidth: number,
): WatermarkLayout {
  const height = imageHeight * HEIGHT_RATIO;
  const padding = imageHeight * PADDING_RATIO;
  const logoSize = height;
  const fontSize = height * FONT_TO_HEIGHT;
  const gap = height * GAP_TO_HEIGHT;
  const shadowBlur = imageHeight * SHADOW_BLUR_RATIO;
  const totalWidth = logoSize + gap + textWidth;
  const x = imageWidth - padding - totalWidth;
  const y = imageHeight - padding - height;
  return { x, y, totalWidth, height, padding, logoSize, fontSize, gap, shadowBlur };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('水印 logo 加载失败。'));
    image.src = src;
  });
}

let logoPromise: Promise<HTMLImageElement> | null = null;

/**
 * Cache the logo load across exports — it never changes, so re-fetching on
 * every download is wasted work. Failures aren't cached: a transient error
 * shouldn't poison subsequent attempts.
 */
function getLogo(): Promise<HTMLImageElement> {
  if (!logoPromise) {
    logoPromise = loadImage(WATERMARK_LOGO_URL).catch((err) => {
      logoPromise = null;
      throw err;
    });
  }
  return logoPromise;
}

/**
 * Draw the watermark in the bottom-right corner of `canvas`. Failure to load
 * the logo is logged and swallowed — we never block a user's export over the
 * watermark.
 */
export async function drawWatermark(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): Promise<void> {
  let logo: HTMLImageElement;
  try {
    logo = await getLogo();
  } catch (err) {
    console.warn('Skipping watermark:', err);
    return;
  }

  // Measure the text first so the layout can right-align the whole group.
  // We set the font twice (here + after restore-into-save) which is cheap.
  const probeFontSize = canvas.height * HEIGHT_RATIO * FONT_TO_HEIGHT;
  ctx.save();
  ctx.font = `${FONT_WEIGHT} ${probeFontSize}px ${FONT_STACK}`;
  const textWidth = ctx.measureText(WATERMARK_TEXT).width;
  ctx.restore();

  const layout = computeWatermarkLayout(canvas.width, canvas.height, textWidth);

  ctx.save();
  ctx.globalAlpha = ALPHA;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = layout.shadowBlur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Logo on the left, vertically centered with the text baseline (both share
  // `height`, so a top-aligned draw lines up naturally).
  ctx.drawImage(logo, layout.x, layout.y, layout.logoSize, layout.logoSize);

  // Text to the right of the logo. `textBaseline = 'middle'` + the layout's
  // vertical center keeps Chinese glyphs visually aligned with the logo even
  // though their natural bounding boxes differ.
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${FONT_WEIGHT} ${layout.fontSize}px ${FONT_STACK}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(WATERMARK_TEXT, layout.x + layout.logoSize + layout.gap, layout.y + layout.height / 2);

  ctx.restore();
}

/**
 * CSS counterpart of `drawWatermark` for the live preview. Returns the inline
 * styles for a positioned wrapper, the inner logo, and the inner text — all
 * sized in CSS pixels so the preview matches the export at any zoom level.
 *
 * The shared constants above guarantee the preview and export render the
 * watermark with the same proportions; only the absolute pixel scale differs
 * (preview = displayed pixels, export = natural pixels).
 *
 * `previewHeightPx` is the displayed height of the image in CSS pixels —
 * usually `imageNaturalHeight * previewScale` from `useImagePreviewScale`.
 */
export function getWatermarkPreviewStyles(previewHeightPx: number): {
  container: CSSProperties;
  logo: CSSProperties;
  text: CSSProperties;
} {
  const height = previewHeightPx * HEIGHT_RATIO;
  const padding = previewHeightPx * PADDING_RATIO;
  const fontSize = height * FONT_TO_HEIGHT;
  const gap = height * GAP_TO_HEIGHT;
  const shadowBlur = previewHeightPx * SHADOW_BLUR_RATIO;

  return {
    container: {
      position: 'absolute',
      right: `${padding}px`,
      bottom: `${padding}px`,
      display: 'flex',
      alignItems: 'center',
      gap: `${gap}px`,
      height: `${height}px`,
      opacity: ALPHA,
      // Watermark should never block clicks on text boxes that overlap the
      // bottom-right corner — drag/select must keep working.
      pointerEvents: 'none',
      // Above the image, below the text-box overlays (which use react-rnd's
      // own stacking). z-index intentionally low.
      zIndex: 1,
      filter: `drop-shadow(0 0 ${shadowBlur}px rgba(0, 0, 0, 0.45))`,
      userSelect: 'none',
    },
    logo: {
      height: `${height}px`,
      width: `${height}px`,
      display: 'block',
    },
    text: {
      color: '#FFFFFF',
      fontFamily: FONT_STACK,
      fontWeight: FONT_WEIGHT,
      fontSize: `${fontSize}px`,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    },
  };
}
