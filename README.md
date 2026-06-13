# 梗图铺

中文梗图铺：精选模板，一键成梗。所有模板由店主手工挑选并配置，**不开放用户上传**。

## MVP 功能

- 浏览本地内置 Meme 模板
- 按模板名称、ID 或标签搜索
- 输入、拖动、缩放、新增和删除文本框
- 使用 Selected Text Inspector 编辑单个文本框的字体、Font Color、Outline Color、层级和内容
- 支持 Outline / Shadow / None 效果、ALL CAPS、Bold、Italic、对齐、透明度和自动字号适配
- 使用 Canvas 生成 PNG 并下载
- 在支持的浏览器中直接复制生成图片到剪切板
- 有未导出的编辑时，刷新或关闭页面会触发浏览器提醒

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 添加模板（仅作者）

模板由作者本人维护，图片和 JSON 都放在 `public/memes/`：

1. 把图片放入 `public/memes/`（如 `doge.jpg`）。
2. 在同目录添加一个同名 `.json`（推荐用站内 `/create` 页面可视化生成后下载）。
3. JSON 结构应包含 `id`、`name`、`url`、`tags` 和 `textFields`。

`vite-plugin-meme-manifest` 会在 dev / build 时扫描 `public/memes/*.json` 自动生成 `public/memes/index.json` 清单；运行时由 `src/memes/index.ts` 的 `loadMemeTemplates()` 取回，无需手动注册。

示例：

```json
{
  "id": "two-buttons",
  "name": "Two Buttons",
  "url": "/memes/two-buttons.svg",
  "tags": ["classic", "choice"],
  "textFields": [
    {
      "id": "text_left",
      "placeholder": "Option A",
      "x": 80,
      "y": 320,
      "width": 120,
      "height": 60,
      "fontSize": 24,
      "color": "#ffffff",
      "align": "center"
    }
  ]
}
```

