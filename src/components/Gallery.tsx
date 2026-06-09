import type { MemeTemplate } from '../types';

interface GalleryProps {
  templates: MemeTemplate[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectTemplate: (template: MemeTemplate) => void;
}

export function Gallery({ templates, searchQuery, onSearchChange, onSelectTemplate }: GalleryProps) {
  return (
    <section className="gallery panel" aria-labelledby="gallery-heading">
      <div className="gallery-header">
        <div>
          <h2 id="gallery-heading">选择模板</h2>
          <p>所有模板都来自本地 JSON 配置和静态图片资源。</p>
        </div>
        <label className="search-box">
          <span>搜索</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="按名称或标签搜索"
          />
        </label>
      </div>

      {templates.length > 0 ? (
        <div className="template-grid">
          {templates.map((template) => (
            <button
              className="template-card"
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template)}
            >
              <img src={template.url} alt="" loading="lazy" />
              <span className="template-card-title">{template.name}</span>
              <span className="tag-list">
                {template.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-state">没有找到匹配的模板。换个关键词试试。</p>
      )}
    </section>
  );
}
