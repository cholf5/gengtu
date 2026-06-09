# Open Meme

Open Meme 是一个开源、纯前端的 Meme 生成器。它不需要后端服务、数据库或 API Key，可以作为静态站点部署。

## MVP 功能

- 浏览本地内置 Meme 模板
- 按模板名称、ID 或标签搜索
- 输入多个文本框内容
- 调整全局字号、颜色、字体和英文大写开关
- 使用 Canvas 生成 PNG 并下载
- 在支持的浏览器中直接复制生成图片到剪切板

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 添加模板

1. 将模板图片放入 `public/memes/`。
2. 在 `src/memes/` 中添加一个 `.json` 文件。
3. JSON 结构应包含 `id`、`name`、`url`、`tags` 和 `textFields`。

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

完整的可视化模板创建器和自动 JSON Schema 校验会在后续阶段实现。
