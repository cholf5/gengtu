# 连续字幕截图生成器 Review

日期：2026-06-21

范围：`src/App.tsx` `src/components/CaptionGenerator.tsx` `src/utils/captionCanvas.ts` `src/utils/captionCanvas.test.ts` `src/utils/canvas.ts` `src/utils/watermark.ts` `src/utils/watermark.test.ts` `src/styles.css`

## 统计

- 审查文件：8
- 发现问题：3 （全部为 P0 高风险，均在审查过程中已修复）
- 遗留未修复：0

## 问题

### P0-1：像素预算只检查原图未考虑最终画布 (已修复)

**问题**：`renderCaptionImageToCanvas` 和 UI 的 `canExport` 只检查 `naturalWidth * naturalHeight > MAX_CAPTION_IMAGE_PIXELS`。连续字幕在追加 N-1 个块后，最终画布可能膨胀到原图的数倍，超出浏览器 Canvas/DataURL 安全阈值。

**修复**：新增 `calculateCaptionOutputPixels` 基于最终画布尺寸计算；Canvas 渲染时 `outputPixels > MAX_CAPTION_IMAGE_PIXELS` 即抛错；UI 同条件设 `canExport = false`。

### P0-2：渲染核心未对传入字幕行数做上限截断 (已修复)

**问题**：UI 的 `parseCaptionLines` 做了 `slice(0, MAX_CAPTION_LINES)`，但 `renderCaptionImageToCanvas` 信任传入的完整数组。如果未来其他调用者未截断就传入，绕过行数上限将重新引入超大画布风险。

**修复**：`renderCaptionImageToCanvas` 内部执行 `safeCaptionLines = captionLines.slice(0, MAX_CAPTION_LINES)`，并以此计算尺寸和绘制。

### P0-3：水印位置与字幕冲突 (已修复)

**问题**：连续字幕底部追加块后，水印（预览/导出均位于整图底部）会和最后一行字幕重叠。

**修复**：`watermark.ts` 新增 `WatermarkPosition` 类型 (`bottom-right | top-right`)，`computeWatermarkLayout`/`drawWatermark`/`getWatermarkPreviewStyle` 增加 position 参数；CaptionGenerator 导出和预览统一传 `'top-right'`，MemeEditor 默认 `'bottom-right'` 不变。

## 已确认的非问题

- `buildCaptionTextField` 坐标计算：文档确认 field 使用 image pixels，`drawTextField` 使用 center-based translate，坐标定位正确。
- `styleOverrides` 含完整 `TextStyleSettings`：`resolveTextStyle` 做 `{...DEFAULT_TEXT_STYLE, ...styleOverrides}`，即使全量覆盖也正确。
- 字体缩放基准使用 `naturalHeight`：首行和追加块均以原图高度缩放，语义一致（追加块的文字观看体验应与首行一致）。