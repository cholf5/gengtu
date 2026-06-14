import type { EditableTextField, MemeTemplate, TextStyleOptions, TextStyleSettings, TextValues } from '../types';
import { createEditableFields, DEFAULT_TEXT_STYLE, getCanvasFont, resolveSizeForImage, resolveTextStyle } from './textStyles';
import { drawWatermark } from './watermark';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败，请检查模板资源。'));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('生成图片失败，请稍后重试。'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const sourceLines = text.split('\n');
  const lines: string[] = [];

  sourceLines.forEach((sourceLine) => {
    const words = sourceLine.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      lines.push('');
      return;
    }

    let currentLine = '';

    words.forEach((word) => {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
        return;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      if (ctx.measureText(word).width <= maxWidth) {
        currentLine = word;
        return;
      }

      let chunk = '';
      Array.from(word).forEach((char) => {
        const nextChunk = `${chunk}${char}`;
        if (ctx.measureText(nextChunk).width <= maxWidth) {
          chunk = nextChunk;
        } else {
          if (chunk) {
            lines.push(chunk);
          }
          chunk = char;
        }
      });
      currentLine = chunk;
    });

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, field: EditableTextField, style: TextStyleSettings, imageHeight: number) {
  const pixelMax = resolveSizeForImage(Math.min(style.fontSize, style.maxFontSize), imageHeight);
  const pixelMin = resolveSizeForImage(12, imageHeight);
  let fontSize = pixelMax;
  let lines: string[] = [];
  let lineHeight = fontSize * 1.12;

  while (fontSize >= pixelMin) {
    ctx.font = getCanvasFont(style, fontSize);
    lineHeight = fontSize * 1.12;
    lines = wrapText(ctx, text, field.width);

    if (lines.length * lineHeight <= field.height) {
      break;
    }

    fontSize -= 2;
  }

  const maxLines = Math.max(1, Math.floor(field.height / lineHeight));
  return { fontSize, lineHeight, lines: lines.slice(0, maxLines) };
}

function getStartY(field: EditableTextField, totalHeight: number, lineHeight: number, verticalAlign: TextStyleSettings['verticalAlign']) {
  // Coordinates are local to the field's center (see drawTextField's translate).
  if (verticalAlign === 'top') {
    return -field.height / 2 + lineHeight / 2;
  }

  if (verticalAlign === 'bottom') {
    return field.height / 2 - totalHeight + lineHeight / 2;
  }

  return -totalHeight / 2 + lineHeight / 2;
}

function drawTextField(ctx: CanvasRenderingContext2D, field: EditableTextField, imageHeight: number) {
  const style = resolveTextStyle(field);
  const text = style.uppercase ? field.text.toUpperCase() : field.text;
  const { fontSize, lineHeight, lines } = fitText(ctx, text, field, style, imageHeight);
  const totalHeight = lines.length * lineHeight;
  const startY = getStartY(field, totalHeight, lineHeight, style.verticalAlign);
  // x is also relative to the field's center.
  const x =
    style.textAlign === 'left'
      ? -field.width / 2
      : style.textAlign === 'right'
        ? field.width / 2
        : 0;
  const rotation = field.rotation ?? 0;
  // Outline / shadow widths are stored on the REFERENCE_IMAGE_HEIGHT scale, same as fontSize.
  const pixelOutlineWidth = resolveSizeForImage(style.outlineWidth, imageHeight);

  ctx.save();
  ctx.translate(field.x + field.width / 2, field.y + field.height / 2);
  if (rotation) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  ctx.globalAlpha = style.opacity;
  ctx.font = getCanvasFont(style, fontSize);
  ctx.textAlign = style.textAlign;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.fontColor;
  ctx.strokeStyle = style.outlineColor;
  ctx.lineWidth = Math.max(0, pixelOutlineWidth);
  ctx.lineJoin = 'round';

  if (style.effect === 'shadow') {
    ctx.shadowColor = style.outlineColor;
    ctx.shadowBlur = Math.max(4, pixelOutlineWidth * 2);
    ctx.shadowOffsetX = Math.max(2, pixelOutlineWidth);
    ctx.shadowOffsetY = Math.max(2, pixelOutlineWidth);
  }

  const glowBlur = Math.max(8, pixelOutlineWidth * 4);
  const glowLineWidth = Math.max(1, pixelOutlineWidth);

  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;

    if (style.effect === 'outline' && style.outlineWidth > 0) {
      ctx.strokeText(line, x, y, field.width);
    }

    if (style.effect === 'glow') {
      // Stack shadowed strokes to build a soft halo along the glyph contour.
      ctx.save();
      ctx.shadowColor = style.outlineColor;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = glowBlur;
      ctx.lineWidth = glowLineWidth;
      ctx.strokeStyle = style.outlineColor;
      for (let i = 0; i < 3; i += 1) {
        ctx.strokeText(line, x, y, field.width);
      }
      ctx.restore();
    }

    ctx.fillText(line, x, y, field.width);
  });

  ctx.restore();
}

export async function renderEditableMemeToCanvas(
  template: MemeTemplate,
  fields: EditableTextField[],
  withWatermark = true,
): Promise<HTMLCanvasElement> {
  const image = await loadImage(template.url);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 渲染。');
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  fields
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .forEach((field) => drawTextField(ctx, field, canvas.height));

  if (withWatermark) {
    drawWatermark(ctx, canvas);
  }

  return canvas;
}

export async function downloadEditableMemeImage(
  template: MemeTemplate,
  fields: EditableTextField[],
  withWatermark = true,
) {
  const canvas = await renderEditableMemeToCanvas(template, fields, withWatermark);
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.id}-meme.png`;
  link.click();
}

export async function copyEditableMemeToClipboard(
  template: MemeTemplate,
  fields: EditableTextField[],
  withWatermark = true,
) {
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function' || typeof ClipboardItem === 'undefined') {
    throw new Error('复制不可用，请下载图片。');
  }

  const canvas = await renderEditableMemeToCanvas(template, fields, withWatermark);
  const blob = await canvasToBlob(canvas);

  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
}

export async function renderMemeToCanvas(
  template: MemeTemplate,
  textValues: TextValues,
  style: TextStyleOptions,
  withWatermark = true,
): Promise<HTMLCanvasElement> {
  const fields = createEditableFields(template.textFields).map((field) => ({
    ...field,
    text: textValues[field.id] || field.placeholder,
  }));
  const globalStyle: TextStyleSettings = {
    ...DEFAULT_TEXT_STYLE,
    fontSize: style.fontSize,
    maxFontSize: style.fontSize,
    fontColor: style.color,
    fontFamily: style.fontFamily,
    uppercase: style.uppercase,
  };

  return renderEditableMemeToCanvas(
    template,
    fields.map((field) => ({
      ...field,
      styleOverrides: {
        ...field.styleOverrides,
        ...globalStyle,
      },
    })),
    withWatermark,
  );
}

export async function downloadTemplateImage(
  template: MemeTemplate,
  textValues: TextValues,
  style: TextStyleOptions,
  withWatermark = true,
) {
  const canvas = await renderMemeToCanvas(template, textValues, style, withWatermark);
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.id}-meme.png`;
  link.click();
}

export async function copyTemplateToClipboard(
  template: MemeTemplate,
  textValues: TextValues,
  style: TextStyleOptions,
  withWatermark = true,
) {
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function' || typeof ClipboardItem === 'undefined') {
    throw new Error('复制不可用，请下载图片。');
  }

  const canvas = await renderMemeToCanvas(template, textValues, style, withWatermark);
  const blob = await canvasToBlob(canvas);

  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
}
