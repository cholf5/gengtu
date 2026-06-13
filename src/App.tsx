import { useEffect, useMemo, useState } from 'react';
import { Button, ConfigProvider, Layout, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Gallery } from './components/Gallery';
import { MemeEditor } from './components/MemeEditor';
import { TemplateConfigurator } from './components/TemplateConfigurator';
import { loadMemeTemplates } from './memes';
import type { MemeTemplate } from './types';
import {
  getSortMode,
  getTemplateUsage,
  recordTemplateUsage,
  setSortMode as persistSortMode,
  sortTemplates,
  type SortMode,
  type TemplateUsageMap,
} from './utils/templateUsage';

function getInitialView() {
  return window.location.pathname.endsWith('/create') ? 'create' : 'gallery';
}

function App() {
  const [view, setView] = useState<'gallery' | 'create'>(() => getInitialView());
  const [selectedTemplate, setSelectedTemplate] = useState<MemeTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [sortMode, setSortModeState] = useState<SortMode>(() => getSortMode());
  const [usage, setUsage] = useState<TemplateUsageMap>(() => getTemplateUsage());

  useEffect(() => {
    const handlePopState = () => {
      setView(getInitialView());
      setSelectedTemplate(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadMemeTemplates().then((loaded) => {
      if (!cancelled) setTemplates(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = sortTemplates(templates, sortMode, usage);

    if (!query) {
      return sorted;
    }

    return sorted.filter((template) => {
      const searchable = [template.name, template.id, ...template.tags].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [templates, searchQuery, sortMode, usage]);

  const handleSortModeChange = (mode: SortMode) => {
    setSortModeState(mode);
    persistSortMode(mode);
  };

  const handleSelectTemplate = (template: MemeTemplate) => {
    setUsage(recordTemplateUsage(template.id));
    setSelectedTemplate(template);
  };

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
      <Layout className="app-layout">
        <Layout.Header className="app-header">
          <button className="app-brand" type="button" onClick={goHome}>
            <Typography.Text className="app-brand-eyebrow">OPEN MEME</Typography.Text>
            <Typography.Title level={4} className="app-brand-title">
              开源 · 纯前端的 Meme 生成器
            </Typography.Title>
          </button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Create template
          </Button>
        </Layout.Header>
        <Layout.Content className="app-content">
          {view === 'create' ? (
            <TemplateConfigurator onBack={goHome} />
          ) : selectedTemplate ? (
            <MemeEditor template={selectedTemplate} onBack={() => setSelectedTemplate(null)} />
          ) : (
            <Gallery
              templates={filteredTemplates}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectTemplate={handleSelectTemplate}
              sortMode={sortMode}
              onSortModeChange={handleSortModeChange}
            />
          )}
        </Layout.Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
