/**
 * Bottom-center URL watermark stamped onto exported memes — see
 * `.docs/plans/2026-06-14-watermark-design.md` for the full design rationale.
 *
 * Two render paths share the same constants below to keep the live preview
 * (CSS) visually consistent with the exported PNG (canvas):
 *   - `<WatermarkOverlay>` for the React preview
 *   - `drawWatermark()` for the canvas export
 *
 * Default-on, can be toggled off via the editor's "水印" checkbox.
 * Sizes/padding scale with `imageHeight` so the watermark looks visually
 * consistent across image resolutions, mirroring `resolveSizeForImage`'s
 * approach for text fields. The visual goal is "small enough not to be
 * worth cropping out" — see `imgflip` for prior art.
 */

import type { CSSProperties } from 'react';

export const WATERMARK_TEXT = 'gengtupu.vercel.app';

const HEIGHT_RATIO = 0.018;
const PADDING_RATIO = 0.015;
// Drop-shadow tuned to the same visual language as the text-field `shadow`
// effect in `canvas.ts` — offset + blur near-opaque black — but scaled down
// for the watermark's smaller font. The offset (not just blur) is what
// rescues legibility on white backgrounds: a soft glow alone makes a
// low-contrast `#CECECE` glyph mush.
const SHADOW_BLUR_RATIO = 0.0015;
const SHADOW_OFFSET_RATIO = 0.001;
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.85)';
// Pure-Latin domain — Helvetica/Arial reads cleaner at 18px than CJK stacks.
const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const FONT_WEIGHT = 400;
const COLOR = '#CECECE';

export interface WatermarkLayout {
  /** Right edge of the text, in canvas pixels (= imageWidth - padding). */
  rightX: number;
  /** Vertical baseline center of the text, in canvas pixels. */
  centerY: number;
  /** Distance from the right and bottom edges of the canvas. */
  padding: number;
  /** Text font size, in canvas pixels. */
  fontSize: number;
  /** Soft-glow shadow blur radius, in canvas pixels. */
  shadowBlur: number;
  /** Drop-shadow offset (applied to both x and y), in canvas pixels. */
  shadowOffset: number;
}

/**
 * Pure layout calculator — no canvas, no DOM. Bottom-right placement: the
 * watermark hugs the bottom-right corner with `padding` of breathing room
 * on both edges.
 */
export function computeWatermarkLayout(
  imageWidth: number,
  imageHeight: number,
): WatermarkLayout {
  const fontSize = imageHeight * HEIGHT_RATIO;
  const padding = imageHeight * PADDING_RATIO;
  const shadowBlur = imageHeight * SHADOW_BLUR_RATIO;
  const shadowOffset = imageHeight * SHADOW_OFFSET_RATIO;
  const rightX = imageWidth - padding;
  const centerY = imageHeight - padding - fontSize / 2;
  return { rightX, centerY, padding, fontSize, shadowBlur, shadowOffset };
}

/**
 * Draw the watermark in the bottom-right of `canvas`. Pure text, no logo —
 * the goal is "small unobtrusive credit", not a brand stamp.
 */
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): void {
  const layout = computeWatermarkLayout(canvas.width, canvas.height);

  ctx.save();
  ctx.fillStyle = COLOR;
  ctx.font = `${FONT_WEIGHT} ${layout.fontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = SHADOW_COLOR;
  ctx.shadowBlur = layout.shadowBlur;
  ctx.shadowOffsetX = layout.shadowOffset;
  ctx.shadowOffsetY = layout.shadowOffset;
  ctx.fillText(WATERMARK_TEXT, layout.rightX, layout.centerY);
  ctx.restore();
}

/**
 * CSS counterpart of `drawWatermark` for the live preview. Returns the inline
 * style for an absolutely-positioned text element. Sized in displayed CSS
 * pixels so the preview proportions match the exported PNG at any zoom.
 *
 * `previewHeightPx` is the displayed height of the image in CSS pixels —
 * usually `imageNaturalHeight * previewScale` from `useImagePreviewScale`.
 */
export function getWatermarkPreviewStyle(previewHeightPx: number): CSSProperties {
  const fontSize = previewHeightPx * HEIGHT_RATIO;
  const padding = previewHeightPx * PADDING_RATIO;
  const shadowBlur = previewHeightPx * SHADOW_BLUR_RATIO;
  const shadowOffset = previewHeightPx * SHADOW_OFFSET_RATIO;

  return {
    position: 'absolute',
    right: `${padding}px`,
    bottom: `${padding}px`,
    color: COLOR,
    fontFamily: FONT_STACK,
    fontWeight: FONT_WEIGHT,
    fontSize: `${fontSize}px`,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    textShadow: `${shadowOffset}px ${shadowOffset}px ${shadowBlur}px ${SHADOW_COLOR}`,
    // Watermark should never block clicks on text boxes that overlap the
    // bottom — drag/select must keep working.
    pointerEvents: 'none',
    userSelect: 'none',
    // Above the image, below text-box overlays' own stacking.
    zIndex: 1,
  };
}
