import type { EditableTextField, TextStyleSettings } from '../types';
import { canvasToBlob, drawTextField, loadImage } from './canvas';
import { DEFAULT_TEXT_STYLE, resolveSizeForImage } from './textStyles';
import { drawWatermark } from './watermark';

export const MAX_CAPTION_LINES = 20;
export const MAX_CAPTION_IMAGE_PIXELS = 16_000_000;

const CAPTION_HORIZONTAL_PADDING = 48;
const CAPTION_VERTICAL_PADDING = 18;
const CAPTION_LINE_HEIGHT_RATIO = 1.18;
const CAPTION_EFFECT_PADDING_MULTIPLIER = 3;

export function parseCaptionLines(text: string, maxLines = MAX_CAPTION_LINES): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

export function getCaptionLineCount(text: string): number {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

export function calculateCaptionBlockHeight(style: TextStyleSettings, imageHeight: number): number {
  const fontSize = resolveSizeForImage(Math.min(style.fontSize, style.maxFontSize), imageHeight);
  const outlineWidth = resolveSizeForImage(style.outlineWidth, imageHeight);
  const verticalPadding = resolveSizeForImage(CAPTION_VERTICAL_PADDING, imageHeight);
  const effectPadding = style.effect === 'none' ? 0 : outlineWidth * CAPTION_EFFECT_PADDING_MULTIPLIER;

  return Math.max(1, Math.ceil(fontSize * CAPTION_LINE_HEIGHT_RATIO + verticalPadding * 2 + effectPadding * 2));
}

export function calculateCaptionCanvasSize(
  imageWidth: number,
  imageHeight: number,
  captionLineCount: number,
  blockHeight: number,
) {
  const extraBlocks = Math.max(0, captionLineCount - 1);
  return {
    width: imageWidth,
    height: imageHeight + extraBlocks * blockHeight,
  };
}

export function calculateCaptionOutputPixels(
  imageWidth: number,
  imageHeight: number,
  captionLineCount: number,
  blockHeight: number,
) {
  const size = calculateCaptionCanvasSize(imageWidth, imageHeight, captionLineCount, blockHeight);
  return size.width * size.height;
}

export function buildCaptionTextField(
  id: string,
  text: string,
  y: number,
  imageWidth: number,
  imageHeight: number,
  blockHeight: number,
  style: TextStyleSettings,
): EditableTextField {
  const horizontalPadding = resolveSizeForImage(CAPTION_HORIZONTAL_PADDING, imageHeight);
  const width = Math.max(1, imageWidth - horizontalPadding * 2);

  return {
    id,
    text,
    placeholder: text,
    x: horizontalPadding,
    y,
    width,
    height: blockHeight,
    rotation: 0,
    zIndex: 1,
    styleOverrides: style,
  };
}

export function getDefaultCaptionStyle(): TextStyleSettings {
  return {
    ...DEFAULT_TEXT_STYLE,
    fontSize: 56,
    maxFontSize: 96,
    fontColor: '#ffffff',
    outlineColor: '#000000',
    effect: 'outline',
    outlineWidth: 3,
    textAlign: 'center',
    verticalAlign: 'middle',
    uppercase: false,
    bold: true,
  };
}

export async function renderCaptionImageToCanvas(
  imageSrc: string,
  captionLines: string[],
  style: TextStyleSettings,
  withWatermark = true,
  exportScale = 1,
): Promise<HTMLCanvasElement> {
  const image = await loadImage(imageSrc, '图片加载失败，请重新选择一张图片。');
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;

  const safeCaptionLines = captionLines.slice(0, MAX_CAPTION_LINES);
  const blockHeight = calculateCaptionBlockHeight(style, naturalHeight);
  const size = calculateCaptionCanvasSize(naturalWidth, naturalHeight, safeCaptionLines.length, blockHeight);
  const outputPixels = size.width * size.height;

  if (outputPixels > MAX_CAPTION_IMAGE_PIXELS) {
    throw new Error('生成图片太大，请缩小图片或减少字幕行数。');
  }
  const safeScale = exportScale > 0 ? exportScale : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(size.width * safeScale));
  canvas.height = Math.max(1, Math.round(size.height * safeScale));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 渲染。');
  }

  ctx.save();
  ctx.scale(safeScale, safeScale);
  ctx.drawImage(image, 0, 0, naturalWidth, naturalHeight);

  safeCaptionLines.forEach((line, index) => {
    const y = index === 0 ? naturalHeight - blockHeight : naturalHeight + (index - 1) * blockHeight;

    if (index > 0) {
      ctx.drawImage(image, 0, naturalHeight - blockHeight, naturalWidth, blockHeight, 0, y, naturalWidth, blockHeight);
    }

    drawTextField(ctx, buildCaptionTextField(`caption_${index}`, line, y, naturalWidth, naturalHeight, blockHeight, style), naturalHeight);
  });
  ctx.restore();

  if (withWatermark) {
    drawWatermark(ctx, canvas, 'top-right');
  }

  return canvas;
}

export async function downloadCaptionImage(
  imageSrc: string,
  captionLines: string[],
  style: TextStyleSettings,
  withWatermark = true,
  exportScale = 1,
) {
  const canvas = await renderCaptionImageToCanvas(imageSrc, captionLines, style, withWatermark, exportScale);
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = 'caption-meme.png';
  link.click();
}

export async function copyCaptionImageToClipboard(
  imageSrc: string,
  captionLines: string[],
  style: TextStyleSettings,
  withWatermark = true,
  exportScale = 1,
) {
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function' || typeof ClipboardItem === 'undefined') {
    throw new Error('复制不可用，请下载图片。');
  }

  const canvas = await renderCaptionImageToCanvas(imageSrc, captionLines, style, withWatermark, exportScale);
  const blob = await canvasToBlob(canvas);

  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
}
