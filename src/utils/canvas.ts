import type { MemeTemplate, MemeTextField, TextStyleOptions, TextValues } from '../types';

interface RenderTextField extends MemeTextField {
  text: string;
}

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

function drawTextField(ctx: CanvasRenderingContext2D, field: RenderTextField, style: TextStyleOptions) {
  const fontSize = style.fontSize || field.fontSize;
  const lineHeight = fontSize * 1.12;
  const maxLines = Math.max(1, Math.floor(field.height / lineHeight));
  const text = style.uppercase ? field.text.toUpperCase() : field.text;

  ctx.font = `900 ${fontSize}px ${style.fontFamily}`;
  ctx.textAlign = field.align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.color || field.color;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.12));
  ctx.lineJoin = 'round';

  const lines = wrapText(ctx, text, field.width).slice(0, maxLines);
  const totalHeight = lines.length * lineHeight;
  const startY = field.y + field.height / 2 - totalHeight / 2 + lineHeight / 2;
  const x = field.align === 'left' ? field.x : field.align === 'right' ? field.x + field.width : field.x + field.width / 2;

  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    ctx.strokeText(line, x, y, field.width);
    ctx.fillText(line, x, y, field.width);
  });
}

export async function renderMemeToCanvas(
  template: MemeTemplate,
  textValues: TextValues,
  style: TextStyleOptions,
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

  template.textFields.forEach((field) => {
    drawTextField(ctx, { ...field, text: textValues[field.id] || field.placeholder }, style);
  });

  return canvas;
}

export async function downloadTemplateImage(
  template: MemeTemplate,
  textValues: TextValues,
  style: TextStyleOptions,
) {
  const canvas = await renderMemeToCanvas(template, textValues, style);
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
) {
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function' || typeof ClipboardItem === 'undefined') {
    throw new Error('复制不可用，请下载图片。');
  }

  const canvas = await renderMemeToCanvas(template, textValues, style);
  const blob = await canvasToBlob(canvas);

  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
}
