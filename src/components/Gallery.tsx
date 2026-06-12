import { Card, Empty, Input, Space, Tag, Typography } from 'antd';
import type { MemeTemplate } from '../types';

interface GalleryProps {
  templates: MemeTemplate[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectTemplate: (template: MemeTemplate) => void;
}

export function Gallery({ templates, searchQuery, onSearchChange, onSelectTemplate }: GalleryProps) {
  return (
    <section aria-labelledby="gallery-heading">
      <div className="gallery-header">
        <div>
          <Typography.Title level={3} id="gallery-heading" style={{ margin: 0 }}>
            选择模板
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
            所有模板都来自本地 JSON 配置和静态图片资源。
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

      {templates.length > 0 ? (
        <div className="template-grid">
          {templates.map((template) => (
            <Card
              key={template.id}
              hoverable
              onClick={() => onSelectTemplate(template)}
              cover={<img src={template.url} alt="" loading="lazy" className="template-cover" />}
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
