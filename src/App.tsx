import { useEffect, useMemo, useState } from 'react';
import { ConfigProvider } from 'antd';
import { Gallery } from './components/Gallery';
import { MemeEditor } from './components/MemeEditor';
import { TemplateConfigurator } from './components/TemplateConfigurator';
import { memeTemplates } from './memes';
import type { MemeTemplate } from './types';

function getInitialView() {
  return window.location.pathname.endsWith('/create') ? 'create' : 'gallery';
}

function App() {
  const [view, setView] = useState<'gallery' | 'create'>(() => getInitialView());
  const [selectedTemplate, setSelectedTemplate] = useState<MemeTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handlePopState = () => {
      setView(getInitialView());
      setSelectedTemplate(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const openCreate = () => {
    window.history.pushState({}, '', `${import.meta.env.BASE_URL.replace(/\/$/, '')}/create`);
    setSelectedTemplate(null);
    setView('create');
  };

  const goHome = () => {
    window.history.pushState({}, '', import.meta.env.BASE_URL || '/');
    setSelectedTemplate(null);
    setView('gallery');
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#4263eb',
          borderRadius: 14,
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <main className="app-shell">
        <header className="hero">
          <p className="eyebrow">Open Meme</p>
          <h1>开源、纯前端的 Meme 生成器</h1>
          <p className="hero-copy">选择一个模板，输入文字，然后下载或复制你的梗图。</p>
          <div className="hero-actions">
            <button className="secondary-button" type="button" onClick={openCreate}>
              Create template
            </button>
          </div>
        </header>

        {view === 'create' ? (
          <TemplateConfigurator onBack={goHome} />
        ) : selectedTemplate ? (
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
    </ConfigProvider>
  );
}

export default App;
