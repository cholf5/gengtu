# 关于页 + 模板投稿入口 设计文档

日期：2026-06-14
作者：cholf5（与 Claude Code 协作）

## 目标

在「梗图铺」站点新增三块以往缺失的元信息内容：

1. **提交模板入口** —— 让外部用户能通过邮件向作者投稿表情包模板。
2. **关于本站** —— 解释这个项目存在的理由（imgflip 缺中文模板）。
3. **关于作者** —— 一行自述 + `x.com/cholf5` 外链。

约束：保持站点纯前端、无后端、单人策展的定位（参见 `CLAUDE.md` 的产品定位段），不引入 React Router，不做用户上传通道。

## 总体方案

新增 `/about` 视图（与 `/`、`/create` 同级），三块内容并列在同一页。在站点底部新增 Footer 提供入口。提交模板用 `mailto:` 链接，邮箱做轻度运行时混淆。

### 路由与导航

沿用 `App.tsx` 现有的「读 `pathname` 切 view」手工路由风格：

- `getViewFromLocation()` 返回类型扩为 `'gallery' | 'create' | 'about'`，新增分支 `pathname.endsWith('/about') → 'about'`。
- 新增 `openAbout(hash?)` 与现有 `openCreate()` 对称：`history.pushState` 到 `/about[#hash]` + `setView('about')` + 清掉 `selectedTemplate` / `pendingTemplateId`。
- `Layout.Content` 的三元判断扩成：`view === 'create' ? <Configurator/> : view === 'about' ? <About onBack={goHome}/> : selectedTemplate ? <Editor/> : <Gallery/>`。
- 现有 `popstate` 处理已是 `getViewFromLocation()`，自动覆盖新路由，无需特殊改动。
- Header 不动 —— 保留品牌 + 「Create template」一个主 CTA，避免稀释主操作。
- 入口位于新增的 `<Layout.Footer>`。

### Footer

所有 view 下都显示，保证站点底部一致。结构：

```tsx
<Layout.Footer className="app-footer">
  <span className="app-footer-copy">© 2026 cholf5 · 梗图铺</span>
  <nav className="app-footer-links">
    <a href={buildAboutHref()} onClick={handleAboutClick}>关于本站</a>
    <a href={buildAboutHref('submit')} onClick={handleAboutClick}>提交模板</a>
    <a href="https://x.com/cholf5" target="_blank" rel="noreferrer noopener">@cholf5</a>
  </nav>
</Layout.Footer>
```

辅助函数：

```ts
const buildAboutHref = (hash?: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/about${hash ? `#${hash}` : ''}`;
};

const handleAboutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
  // 让 Ctrl/⌘ + 点击仍能新开标签页 —— 保留浏览器原生行为
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  const hash = e.currentTarget.hash.replace(/^#/, '') || undefined;
  openAbout(hash);
};
```

**为什么用 `<a>` 而不是 Antd `<Button type="link">`**：链接到 `/about` 是真实 URL，需要 `href` 才能让用户右键「在新标签页打开」、被搜索引擎识别。Antd `Button` 渲染的是 `<button>`，不带 href。

样式（追加到 `src/styles.css`，约 20 行）：

- `.app-footer`：背景 `#fafafa`，上 1px border，`display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; font-size: 13px; color: rgba(0,0,0,.55)`。
- `.app-footer-links`：`display: flex; gap: 20px;`，链接 `color: inherit; text-decoration: none;`，hover 时 `color: #4263eb`。
- 移动端 `@media (max-width: 640px)`：`flex-direction: column; gap: 8px;`。

### `<About>` 组件

文件：`src/components/About.tsx`，单文件、纯展示组件。Props `{ onBack: () => void }`（保留接口，目前未使用）。

布局：单列窄容器（`max-width: 720px`，居中），三段式，每段一个 Antd `Card`，节间 24px 间距。复用 `app-content` 内边距，不新增多余 CSS 类。

三个区块按用户阅读顺序：

#### 1. 关于本站 `id="about-site"`

文案（直接落进 `<Typography.Paragraph>`，不分小标题，不加配图）：

> 梗图铺是我自己用着顺手做的小工具。
>
> 平时我常在 imgflip 上拼图，但那里几乎没有国内流行的表情包模板 —— 蔡徐坤、孩子他妈、小丑竟是我自己……每次都要自己找图、对位、画框，挺折腾。
>
> 于是干脆做了这个站：单人策展，模板都是我手挑的，不开放上传，不要登录，不上后端。打开就能用，做完图直接下载。
>
> 如果你也常用 imgflip，希望梗图铺能补上那块中文模板的空白。

#### 2. 提交模板 `id="submit"`

三段：

- 一句话引导：「想看到的梗图模板这里没有？欢迎投稿。」
- 「投稿须知」`<ul>`：
  - 一张清晰底图（PNG/JPG，建议宽边 ≥ 600px）
  - 模板名 + 2–3 个标签
  - 建议的文字框位置（可选，文字描述即可）
  - 声明素材可公开使用
- Antd `<Button type="primary" icon={<MailOutlined />}>邮件投稿</Button>`，`onClick` 跳到运行时拼出的 `mailto:`。
- 按钮右侧浅灰小字：`cholf5 [at] hotmail · com`，方便没有默认邮件客户端的用户手动复制；这里也是混淆形态。

#### 3. 关于作者 `id="author"`

```
我是 cholf5，独立开发者，平时也做点小工具自用。
[𝕏 @cholf5]  (Antd Button，外链 https://x.com/cholf5，target=_blank)
```

#### 锚点滚动

`useEffect` 里读 `window.location.hash`，匹配上就 `getElementById(...).scrollIntoView({ behavior: 'smooth', block: 'start' })`。空 hash 时正常顶到「关于本站」。

### 邮箱混淆 + mailto 拼装

写在 `About.tsx` 里，不抽工具函数（只此一处用，YAGNI）：

```ts
// 拆成片段 + 字符码，运行时拼。源码里搜不到完整字符串。
const EMAIL_USER = ['cho', 'lf', '5'].join('');
const EMAIL_HOST = String.fromCharCode(104, 111, 116, 109, 97, 105, 108) + '.com'; // hotmail.com

const buildMailto = () => {
  const addr = `${EMAIL_USER}@${EMAIL_HOST}`;
  const subject = encodeURIComponent('[梗图铺投稿] ');
  const body = encodeURIComponent(
    [
      '模板名：',
      '标签（2–3 个）：',
      '',
      '素材说明（来源 / 是否可公开使用）：',
      '',
      '建议的文字框位置（可选，文字描述即可）：',
      '',
      '（请将底图作为附件发送，PNG/JPG，建议宽边 ≥ 600px）',
    ].join('\n'),
  );
  return `mailto:${addr}?subject=${subject}&body=${body}`;
};
```

按钮交互用 `onClick={() => { window.location.href = buildMailto(); }}`，**不**用 `<a href>`，避免渲染期就把字符串拼进 DOM 属性。

**为什么够用**：本站是静态构建，不可能完美对抗爬虫；目标是挡掉顺手扫页面 + 跑 `\S+@\S+` 正则的低质量爬虫，简单字符串混淆 + 字符码拼接足够。

### Analytics

- `openAbout` 内 `track('about_open')`。
- 邮件投稿按钮 `onClick` 内 `track('submit_template_click')`。
- X 外链不 track —— 用户已离站，`@vercel/analytics` 也抓不到。

## 不做的事（范围划线）

- ❌ 不做「复制邮箱到剪贴板」按钮（YAGNI，预期投稿量极低）。
- ❌ 不引入 React Router。
- ❌ 不抽 `buildMailto` 到 `src/utils/mailto.ts` + 配套测试 —— 只此一处用，就近内联。
- ❌ 不做 GitHub Pages SPA 兜底（`public/404.html`）。`/create` 路由已经有同样的直接访问 404 问题，本任务不顺手修。
- ❌ 不做更新日志 / FAQ。
- ❌ 不为 About 页做 SEO meta —— 站点本身没有 meta 体系，不单独开洞。
- ❌ 不抽独立 `<Footer>` 组件 —— 20 行 JSX，放 `App.tsx` 内联即可。
- ❌ 不做独立 GitHub 模板仓库 + submodule 投稿流程。决策理由：核心体验是「单人策展」，投稿量预期不高，邮件足以胜任；submodule 在小项目里通常是负资产（构建链复杂、CI 要 `--recurse-submodules`、筛掉非程序员投稿者）。将来量起来了再加 GitHub 路径，邮件保留作非技术用户兜底。

## 测试

按项目惯例（测试只覆盖 `src/utils/` 下的纯函数），本次改动是**纯 UI + 静态文案 + 路由分支**，无新工具函数，不强求加测试。

`buildMailto()` 内联在 `About.tsx`、就用一次，不抽到 `utils/`。

`tsc -b`（即 `npm run build`）会校验：

- `getViewFromLocation()` 返回类型联合扩为 `'gallery' | 'create' | 'about'`；
- `Layout.Content` 三元分支已覆盖。

## 变更清单

- `src/App.tsx`：`getViewFromLocation` 类型扩展、新增 `openAbout` / `buildAboutHref` / `handleAboutClick`、`Layout.Content` 三元分支扩展、新增 `<Layout.Footer>`。
- `src/components/About.tsx`：新建。
- `src/styles.css`：追加 `.app-footer` / `.app-footer-links` 及移动端断点（约 20 行）。

## 后续可选项（不在本任务内）

- 投稿量提高时迁移到独立 GitHub 模板仓库 + submodule，邮件保留兜底。
- 修复 `/about` `/create` 直链 404（GitHub Pages SPA hack：`public/404.html` 复制 `index.html`）。
- About 页加更新日志 / FAQ。
