import { Card, Empty, Input, Segmented, Space, Tag, Typography } from 'antd';
import type { MemeTemplate } from '../types';
import type { SortMode } from '../utils/templateUsage';

interface GalleryProps {
  templates: MemeTemplate[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectTemplate: (template: MemeTemplate) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
}

export function Gallery({
  templates,
  searchQuery,
  onSearchChange,
  onSelectTemplate,
  sortMode,
  onSortModeChange,
}: GalleryProps) {
  return (
    <section aria-labelledby="gallery-heading">
      <div className="gallery-header">
        <div>
          <Typography.Title level={3} id="gallery-heading" style={{ margin: 0 }}>
            选择模板
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
            全部由站长精挑细选，持续更新。
          </Typography.Paragraph>
        </div>
        <Input.Search
          allowClear
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="按名称或标签搜索"
          className="gallery-search"
        />
      </div>

      <div className="gallery-toolbar">
        <Segmented<SortMode>
          value={sortMode}
          onChange={onSortModeChange}
          options={[
            { label: '字母序', value: 'alphabetical' },
            { label: '常用优先', value: 'frequency' },
          ]}
        />
      </div>

      {templates.length > 0 ? (
        <div className="template-grid">
          {templates.map((template) => (
            <Card
              key={template.id}
              hoverable
              onClick={() => onSelectTemplate(template)}
              cover={renderTemplateCover(template)}
              styles={{ body: { padding: 14 } }}
            >
              <Card.Meta
                title={template.name}
                description={
                  <Space size={[4, 4]} wrap>
                    {template.tags.map((tag) => (
                      <Tag key={tag} color="blue">
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                }
              />
            </Card>
          ))}
        </div>
      ) : (
        <Empty description="没有找到匹配的模板。换个关键词试试。" />
      )}
    </section>
  );
}

/**
 * Gallery card cover. When the template has a `thumbnail` crop we wrap the
 * image in a 4:3 container and scale + offset it via percentages so only the
 * chosen region is visible. No JS layout work, no naturalWidth needed.
 *
 * `width` / `height` percentages are relative to the parent's width / height
 * respectively, but `margin-top` percentages are also resolved against parent
 * **width** (CSS quirk) — using marginTop here would mis-position the image
 * vertically whenever the parent isn't square. `transform: translate(%, %)`
 * resolves percentages against the **element's own** width/height, which
 * exactly cancels the scaling and works for any aspect ratio.
 */
function renderTemplateCover(template: MemeTemplate) {
  const crop = template.thumbnail;
  if (!crop) {
    return <img src={template.url} alt="" loading="lazy" className="template-cover" />;
  }

  return (
    <div className="template-cover-crop">
      <img
        src={template.url}
        alt=""
        loading="lazy"
        style={{
          width: `${100 / crop.width}%`,
          height: `${100 / crop.height}%`,
          transform: `translate(${-crop.x * 100}%, ${-crop.y * 100}%)`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
}
