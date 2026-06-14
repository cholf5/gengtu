import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Button, ConfigProvider, Layout, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Analytics, track } from '@vercel/analytics/react';
import { About } from './components/About';
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

function getViewFromLocation(): 'gallery' | 'create' | 'about' {
  const path = window.location.pathname;
  if (path.endsWith('/create')) return 'create';
  if (path.endsWith('/about')) return 'about';
  return 'gallery';
}

function getTemplateIdFromLocation(): string | null {
  const id = new URLSearchParams(window.location.search).get('t');
  return id ? id : null;
}

function buildHref(query?: string) {
  const base = import.meta.env.BASE_URL || '/';
  return query ? `${base}?${query}` : base;
}

function App() {
  const [view, setView] = useState<'gallery' | 'create' | 'about'>(() => getViewFromLocation());
  const [selectedTemplate, setSelectedTemplate] = useState<MemeTemplate | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(() =>
    getTemplateIdFromLocation(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [sortMode, setSortModeState] = useState<SortMode>(() => getSortMode());
  const [usage, setUsage] = useState<TemplateUsageMap>(() => getTemplateUsage());

  useEffect(() => {
    const handlePopState = () => {
      setView(getViewFromLocation());
      const id = getTemplateIdFromLocation();
      setPendingTemplateId(id);
      if (!id) setSelectedTemplate(null);
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

  // Resolve ?t=<id> against the loaded manifest. Runs whenever either side changes
  // (initial load, popstate to a deep link, or user-driven selection that set the id).
  useEffect(() => {
    if (view !== 'gallery') return;
    if (!pendingTemplateId) {
      if (selectedTemplate) setSelectedTemplate(null);
      return;
    }
    if (selectedTemplate?.id === pendingTemplateId) return;
    if (templates.length === 0) return;

    const match = templates.find((t) => t.id === pendingTemplateId);
    if (match) {
      setSelectedTemplate(match);
    } else {
      // Unknown id — strip the param without adding a history entry.
      window.history.replaceState({}, '', buildHref());
      setPendingTemplateId(null);
      setSelectedTemplate(null);
    }
  }, [pendingTemplateId, templates, view, selectedTemplate]);

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
    setPendingTemplateId(template.id);
    track('template_open', { templateId: template.id, templateName: template.name });
    // Sentinel marks entries we pushed ourselves so closeEditor can safely back() past them.
    window.history.pushState(
      { gengtuPushed: true },
      '',
      buildHref(`t=${encodeURIComponent(template.id)}`),
    );
  };

  const closeEditor = () => {
    // If we pushed the ?t=<id> entry, popping it gets us back to the previous in-app URL.
    // If the user deep-linked in (no sentinel), back() would leave the site — replace instead.
    if (window.history.state?.gengtuPushed) {
      window.history.back();
    } else {
      window.history.replaceState({}, '', buildHref());
      setPendingTemplateId(null);
      setSelectedTemplate(null);
    }
  };

  const openCreate = () => {
    window.history.pushState({}, '', `${import.meta.env.BASE_URL.replace(/\/$/, '')}/create`);
    setSelectedTemplate(null);
    setPendingTemplateId(null);
    setView('create');
  };

  const buildAboutHref = (hash?: string) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    return `${base}/about${hash ? `#${hash}` : ''}`;
  };

  const openAbout = (hash?: string) => {
    window.history.pushState({}, '', buildAboutHref(hash));
    setSelectedTemplate(null);
    setPendingTemplateId(null);
    setView('about');
    track('about_open', hash ? { hash } : {});
  };

  const handleAboutClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    // 让 Ctrl/⌘ + 点击仍能新开标签页 —— 保留浏览器原生行为
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const hash = e.currentTarget.hash.replace(/^#/, '') || undefined;
    openAbout(hash);
  };

  const goHome = () => {
    window.history.pushState({}, '', buildHref());
    setSelectedTemplate(null);
    setPendingTemplateId(null);
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
            <img className="app-brand-logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="梗图铺 Logo" width={40} height={40} />
            <div className="app-brand-text">
              <Typography.Title level={4} className="app-brand-title">
                梗图铺
              </Typography.Title>
              <Typography.Text className="app-brand-eyebrow">精选模板，一键成梗</Typography.Text>
            </div>
          </button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Create template
          </Button>
        </Layout.Header>
        <Layout.Content className="app-content">
          {view === 'create' ? (
            <TemplateConfigurator onBack={goHome} />
          ) : view === 'about' ? (
            <About onBack={goHome} onOpenCreate={openCreate} />
          ) : selectedTemplate ? (
            <MemeEditor template={selectedTemplate} onBack={closeEditor} />
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
        <Layout.Footer className="app-footer">
          <span className="app-footer-copy">© 2026 cholf5 · 梗图铺</span>
          <nav className="app-footer-links">
            <a href={buildAboutHref()} onClick={handleAboutClick}>
              关于本站
            </a>
            <a href={buildAboutHref('submit')} onClick={handleAboutClick}>
              提交模板
            </a>
            <a href="https://x.com/cholf5" target="_blank" rel="noreferrer noopener">
              @cholf5
            </a>
          </nav>
        </Layout.Footer>
      </Layout>
      <Analytics />
    </ConfigProvider>
  );
}

export default App;
