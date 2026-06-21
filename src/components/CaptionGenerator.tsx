import { CopyOutlined, DownloadOutlined, InboxOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Empty, Form, Input, Space, Tooltip, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { track } from '@vercel/analytics';
import type { TextStyleSettings } from '../types';
import { useImagePreviewScale } from '../hooks/useImagePreviewScale';
import {
  calculateCaptionBlockHeight,
  calculateCaptionCanvasSize,
  calculateCaptionOutputPixels,
  copyCaptionImageToClipboard,
  downloadCaptionImage,
  getCaptionLineCount,
  getDefaultCaptionStyle,
  MAX_CAPTION_IMAGE_PIXELS,
  MAX_CAPTION_LINES,
  parseCaptionLines,
} from '../utils/captionCanvas';
import { getPreviewText, getPreviewTextStyle, getVerticalAlignClass, resolveSizeForImage } from '../utils/textStyles';
import { getWatermarkPreviewStyle, WATERMARK_TEXT } from '../utils/watermark';
import { TextStyleInspector } from './TextStyleInspector';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const DEFAULT_CAPTION_TEXT = '第一句字幕\n第二句字幕\n第三句字幕';
const CAPTION_HORIZONTAL_PADDING = 48;

interface CaptionGeneratorProps {
  onBack: () => void;
}

export function CaptionGenerator({ onBack }: CaptionGeneratorProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [captionText, setCaptionText] = useState(DEFAULT_CAPTION_TEXT);
  const [style, setStyle] = useState<TextStyleSettings>(() => getDefaultCaptionStyle());
  const [statusMessage, setStatusMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [withWatermark, setWithWatermark] = useState(true);
  const { imageRef, imageSize, previewScale, updatePreviewScale } = useImagePreviewScale(imageUrl);
  const [api, contextHolder] = message.useMessage();
  const blobUrlRef = useRef<string | null>(null);

  const captionLines = useMemo(() => parseCaptionLines(captionText), [captionText]);
  const rawLineCount = useMemo(() => getCaptionLineCount(captionText), [captionText]);
  const skippedLineCount = Math.max(0, rawLineCount - MAX_CAPTION_LINES);
  const blockHeight = useMemo(
    () => (imageSize.height > 0 ? calculateCaptionBlockHeight(style, imageSize.height) : 0),
    [imageSize.height, style],
  );
  const previewBlockHeight = blockHeight * previewScale;
  const previewPadding = imageSize.height > 0 ? resolveSizeForImage(CAPTION_HORIZONTAL_PADDING, imageSize.height) * previewScale : 0;
  const previewOutputHeight =
    imageSize.width > 0 && imageSize.height > 0
      ? calculateCaptionCanvasSize(imageSize.width, imageSize.height, captionLines.length, blockHeight).height * previewScale
      : 0;
  const outputPixels =
    imageSize.width > 0 && imageSize.height > 0
      ? calculateCaptionOutputPixels(imageSize.width, imageSize.height, captionLines.length, blockHeight)
      : 0;
  const isOutputTooLarge = outputPixels > MAX_CAPTION_IMAGE_PIXELS;
  const canExport = Boolean(imageUrl && captionLines.length > 0 && imageSize.width > 0 && imageSize.height > 0 && !isOutputTooLarge);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const setPreviewImage = (nextUrl: string | null) => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (nextUrl) {
      blobUrlRef.current = nextUrl;
    }

    setImageUrl(nextUrl ?? '');
    setStatusMessage('');
  };

  const validateImageFile = (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      api.error('请选择 PNG、JPEG 或 WebP 图片。');
      return false;
    }

    return true;
  };

  const handleImageFile = (file: File) => {
    if (!validateImageFile(file)) return Upload.LIST_IGNORE;
    setPreviewImage(URL.createObjectURL(file));
    track('caption_image_upload', { type: file.type });
    return false;
  };

  const uploadProps: UploadProps = {
    accept: ACCEPTED_IMAGE_TYPES.join(','),
    maxCount: 1,
    showUploadList: false,
    beforeUpload: handleImageFile,
  };

  const updateStyle = <K extends keyof TextStyleSettings>(key: K, value: TextStyleSettings[K]) => {
    setStyle((current) => ({ ...current, [key]: value }));
    setStatusMessage('');
  };

  const runImageAction = async (action: 'download' | 'copy') => {
    if (!canExport) return;

    setIsBusy(true);
    setStatusMessage('');

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const exportScale = previewScale * dpr;

    try {
      if (action === 'download') {
        await downloadCaptionImage(imageUrl, captionLines, style, withWatermark, exportScale);
        setStatusMessage('图片已开始下载。');
      } else {
        await copyCaptionImageToClipboard(imageUrl, captionLines, style, withWatermark, exportScale);
        setStatusMessage('图片已复制到剪切板。');
      }

      track('caption_export', { action, ok: true, lineCount: captionLines.length, watermark: withWatermark });
    } catch (error) {
      const fallback = action === 'copy' ? '复制不可用，请下载图片。' : '生成图片失败，请稍后重试。';
      setStatusMessage(error instanceof Error ? error.message : fallback);
      track('caption_export', { action, ok: false, lineCount: captionLines.length, watermark: withWatermark });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="editor-layout" aria-label="连续字幕截图生成器">
      {contextHolder}
      <div className="editor-toolbar">
        <Button onClick={onBack}>返回首页</Button>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            连续字幕
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
            上传一张底图，第一句覆盖在原图底部，后续每句复制底部画面继续往下说。
          </Typography.Paragraph>
        </div>
      </div>

      <div className="editor-grid inspector-mode">
        <Card className="preview-panel">
          <Space direction="vertical" size="middle" className="full-width-stack">
            <Alert
              type="info"
              showIcon
              message="图片只在浏览器本地处理，不上传、不保存。底部原有文字不会被自动擦除。"
            />

            {!imageUrl ? (
              <Upload.Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽上传底图</p>
                <p className="ant-upload-hint">支持 PNG、JPEG、WebP。连续字幕工具不会保存你的图片。</p>
              </Upload.Dragger>
            ) : (
              <Space direction="vertical" size="middle" className="full-width-stack">
                <div className="preview-actions">
                  <Upload {...uploadProps}>
                    <Button>更换图片</Button>
                  </Upload>
                </div>
                <CaptionPreview
                  imageRef={imageRef}
                  imageUrl={imageUrl}
                  captionLines={captionLines}
                  style={style}
                  imageHeight={imageSize.height}
                  previewScale={previewScale}
                  previewOutputHeight={previewOutputHeight}
                  previewBlockHeight={previewBlockHeight}
                  previewPadding={previewPadding}
                  withWatermark={withWatermark}
                  onImageLoad={updatePreviewScale}
                />
              </Space>
            )}
          </Space>
        </Card>

        <aside className="control-panel inspector-panel">
          <Card size="small" title={<Typography.Text strong>字幕内容</Typography.Text>}>
            <Form layout="vertical" size="small" colon={false} style={{ marginBottom: 0 }}>
              <Form.Item label="每行一句字幕" style={{ marginBottom: 8 }}>
                <Input.TextArea
                  value={captionText}
                  onChange={(event) => {
                    setCaptionText(event.target.value);
                    setStatusMessage('');
                  }}
                  autoSize={{ minRows: 5, maxRows: 10 }}
                  placeholder="第一句\n第二句\n第三句"
                />
              </Form.Item>
              <Typography.Text type="secondary">
                已读取 {captionLines.length} 行{skippedLineCount > 0 ? `，另有 ${skippedLineCount} 行因超过上限被忽略` : ''}。
              </Typography.Text>
            </Form>
          </Card>

          <TextStyleInspector title="字幕样式" style={style} onChange={updateStyle} />

          <Checkbox checked={withWatermark} onChange={(event) => setWithWatermark(event.target.checked)}>
            水印
            <Tooltip title="留着水印能让看到这张图的人顺着找回来。不需要可以取消。">
              <QuestionCircleOutlined style={{ marginLeft: 4, opacity: 0.55 }} />
            </Tooltip>
          </Checkbox>

          <Space.Compact block>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={isBusy}
              disabled={!canExport}
              onClick={() => runImageAction('download')}
              style={{ flex: 1 }}
            >
              下载 PNG
            </Button>
            <Button
              icon={<CopyOutlined />}
              loading={isBusy}
              disabled={!canExport}
              onClick={() => runImageAction('copy')}
              style={{ flex: 1 }}
            >
              复制图片
            </Button>
          </Space.Compact>

          {!imageUrl && <Alert type="warning" showIcon message="请先上传一张底图。" />}
          {isOutputTooLarge && (
            <Alert type="warning" showIcon message="生成图片太大，请缩小图片或减少字幕行数。" />
          )}
          {imageUrl && captionLines.length === 0 && <Alert type="warning" showIcon message="请输入至少一行字幕。" />}
          {statusMessage && <Alert type="info" showIcon message={statusMessage} />}
        </aside>
      </div>
    </section>
  );
}

interface CaptionPreviewProps {
  imageRef: RefObject<HTMLImageElement | null>;
  imageUrl: string;
  captionLines: string[];
  style: TextStyleSettings;
  imageHeight: number;
  previewScale: number;
  previewOutputHeight: number;
  previewBlockHeight: number;
  previewPadding: number;
  withWatermark: boolean;
  onImageLoad: () => void;
}

function CaptionPreview({
  imageRef,
  imageUrl,
  captionLines,
  style,
  imageHeight,
  previewScale,
  previewOutputHeight,
  previewBlockHeight,
  previewPadding,
  withWatermark,
  onImageLoad,
}: CaptionPreviewProps) {
  const previewTextStyle = getPreviewTextStyle(style, previewScale || 1, imageHeight || 720);
  const baseLine = captionLines[0] ?? '';
  const extraLines = captionLines.slice(1);

  if (!captionLines.length) {
    return (
      <div className="caption-preview-empty">
        <img ref={imageRef} src={imageUrl} alt="连续字幕底图" onLoad={onImageLoad} />
        <Empty description="输入字幕后会在这里预览。" />
      </div>
    );
  }

  return (
    <div className="caption-preview">
      <div className="caption-preview-base">
        <img ref={imageRef} src={imageUrl} alt="连续字幕底图" onLoad={onImageLoad} />
        <CaptionLineOverlay
          text={baseLine}
          style={style}
          imageHeight={imageHeight}
          top="auto"
          bottom={0}
          height={previewBlockHeight}
          padding={previewPadding}
          previewTextStyle={previewTextStyle}
        />
      </div>

      {extraLines.map((line, index) => (
        <div
          key={`${line}_${index}`}
          className="caption-repeat-block"
          style={{
            height: previewBlockHeight,
            backgroundImage: `url(${imageUrl})`,
            backgroundPosition: 'bottom center',
            backgroundSize: '100% auto',
          }}
        >
          <CaptionLineOverlay
            text={line}
            style={style}
            imageHeight={imageHeight}
            top={0}
            bottom="auto"
            height={previewBlockHeight}
            padding={previewPadding}
            previewTextStyle={previewTextStyle}
          />
        </div>
      ))}

      {withWatermark && previewOutputHeight > 0 ? <WatermarkPreview previewHeightPx={previewOutputHeight} /> : null}
    </div>
  );
}

interface CaptionLineOverlayProps {
  text: string;
  style: TextStyleSettings;
  imageHeight: number;
  top: number | 'auto';
  bottom: number | 'auto';
  height: number;
  padding: number;
  previewTextStyle: CSSProperties;
}

function CaptionLineOverlay({ text, style, imageHeight, top, bottom, height, padding, previewTextStyle }: CaptionLineOverlayProps) {
  return (
    <div
      className="caption-line-overlay"
      style={{
        top,
        bottom,
        left: padding,
        right: padding,
        height,
      }}
    >
      <div className={`preview-text ${getVerticalAlignClass(style.verticalAlign)}`} style={previewTextStyle}>
        {getPreviewText(text, style)}
      </div>
    </div>
  );
}

function WatermarkPreview({ previewHeightPx }: { previewHeightPx: number }) {
  return (
    <span style={getWatermarkPreviewStyle(previewHeightPx, 'top-right')} aria-hidden="true">
      {WATERMARK_TEXT}
    </span>
  );
}
