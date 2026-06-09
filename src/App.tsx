import { useMemo, useState } from 'react';
import { Gallery } from './components/Gallery';
import { MemeEditor } from './components/MemeEditor';
import { memeTemplates } from './memes';
import type { MemeTemplate } from './types';

function App() {
  const [selectedTemplate, setSelectedTemplate] = useState<MemeTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return memeTemplates;
    }

    return memeTemplates.filter((template) => {
      const searchable = [template.name, template.id, ...template.tags].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [searchQuery]);

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Open Meme</p>
        <h1>开源、纯前端的 Meme 生成器</h1>
        <p className="hero-copy">选择一个模板，输入文字，然后下载或复制你的梗图。</p>
      </header>

      {selectedTemplate ? (
        <MemeEditor template={selectedTemplate} onBack={() => setSelectedTemplate(null)} />
      ) : (
        <Gallery
          templates={filteredTemplates}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectTemplate={setSelectedTemplate}
        />
      )}
    </main>
  );
}

export default App;
