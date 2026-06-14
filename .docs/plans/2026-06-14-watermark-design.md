# 导出水印功能设计

**日期**：2026-06-14
**目标**：在导出的梗图上默认添加站点水印，让"想用的人能找到本站"。借鉴 imgflip 的极简风格——小到不值得裁、不抢戏，但凑近看可识别。

> 本文档经过两轮迭代。第一版尝试"logo + 中文站名 + 漂亮印章"路线（追求美观→自愿保留），实测后发现：
> 1. 水印再美观也无法"让用户主动保留"——保留动机其实是"懒得去掉"
> 2. "梗图铺"三个字 + 一个 logo 没有可检索性（百度不索引 Vercel，Google 中文搜索命中率低）
> 3. 真要传播必须靠"可直达"的字符串
>
> 因此重新定位为"被动可追溯的小痕迹"，照搬 imgflip 模式：纯文字 URL、极小字号、不抢戏。

---

## 一、目标与非目标

**目标**

- 导出的梗图（下载 / 复制到剪贴板）默认在右下角带一行 `gengtupu.vercel.app` 水印
- 实时预览也显示水印，让用户编辑时就能看到最终效果
- 视觉上极简、克制，"小到不值得裁"
- 在编辑器导出按钮旁提供清晰的"导出时带水印"开关，默认勾选

**非目标 / YAGNI 边界**

- 不做智能避让（不检测水印位置是否压到用户文字框）
- 不做 localStorage / 任何持久化记忆——每次打开编辑器恢复默认勾选
- 不做用户自定义水印（位置 / 文字 / 不透明度 / 颜色 / 字体均固定）
- 不做"位置可选"（imgflip 的 4 角 + HUGE 是付费墙副产品，免费可关的站点不需要）
- 不在配置器（`TemplateConfigurator`）里显示水印——作者编辑模板时画面应该干净
- 不引入新字体，复用系统字体栈

---

## 二、关键决策与变更历史

### 第一轮（已废弃）

最初方案：右下角 logo + "梗图铺" 三字、纯白 + 0.85 alpha + 柔光阴影。
预览不显示水印，仅导出时叠加。

**用户反馈推翻的点**：
1. 预览不显示水印 → "很不方便" → 改为实时预览
2. 美观度未达预期 + 站点名无可搜索性 → 整体路线推倒

### 第二轮（最终方案）

照搬 imgflip 风格：纯文字 URL、极小字、低对比度灰色 + offset 阴影。

**最终参数**：

| 参数 | 值 | 决策依据 |
|---|---|---|
| 内容 | `gengtupu.vercel.app` | 唯一可被搜索/直达的字符串 |
| 位置 | 右下角 | 用户实测对比后选定（vs 底部居中） |
| padding | `imageHeight × 1.5%` | 极小水印贴边更"页脚"感 |
| 字号 | `imageHeight × 1.8%` | 1000px 高图 ≈ 18px，imgflip 量级 |
| 颜色 | `#CECECE` | 用户 Color Picker 实测 imgflip 同色域 |
| 字体栈 | Helvetica / Arial 系，weight 400 | 纯英文 URL，CJK 字体栈不命中；细体小字不糊 |
| 阴影 blur | `imageHeight × 0.15%` ≈ 1.5px | 比文字框 shadow 缩比例 |
| 阴影 offset | `imageHeight × 0.1%` ≈ 1px（右下） | **关键**：靠 offset 而非 blur 在白底立体化 |
| 阴影颜色 | `rgba(0, 0, 0, 0.85)` | 近不透明黑，给低对比度灰字"刻"出边缘 |
| globalAlpha | 1（不叠透明度） | 颜色已是浅灰，再叠 alpha 会糊掉 |

**为什么 shadow 用 offset 不用 blur**：
- 软 blur 阴影是"环绕光晕"，给纯白字托底有效
- 但 `#CECECE` 灰字 + 白底已经低对比度，再加软光晕只会让字边缘更模糊
- 1px offset 阴影是"右下方刻痕"，强行制造锐利边缘
- 黑底场景下黑刻痕融进黑底自动消失，跨背景表现稳定
- 与 `canvas.ts` 中文字框 `effect: shadow` 的视觉语言一致（offset + blur 暗投影），保持站点风格统一

---

## 三、行为规格

**默认状态**：编辑器打开时，「导出时带水印」开关默认 `checked = true`。

**实时预览**：水印在 `MemeEditor` 的预览区实时显示，位置/字号随 `previewScale` 缩放。`pointer-events: none` 不挡住右下角文字框的点击/拖动。

**导出**：当 `withWatermark === true`，导出生成的 canvas 在原图 + 文字渲染完成后，在右下角额外绘制水印层。

**预览 / 导出同步**：`watermark.ts` 顶部所有比例常量 + 颜色 / 字体栈是单一数据源，`getWatermarkPreviewStyle`（CSS）和 `drawWatermark`（canvas）共用，保证两条管线视觉一致。

**UI 入口**：`MemeEditor` 底部按钮区域旁加 Antd `Checkbox`「导出时带水印」，无额外说明文案（实时预览已是最直接说明）。

---

## 四、代码结构

### `src/utils/watermark.ts`

- 顶部常量集中所有比例 / 颜色 / 字体 / 阴影参数（要调样式只改这里）
- `WATERMARK_TEXT` / `computeWatermarkLayout` 导出供测试与预览使用
- `drawWatermark(ctx, canvas)`：canvas 同步绘制（无图片加载，纯文字）
- `getWatermarkPreviewStyle(previewHeightPx)`：返回 inline CSS 给预览组件

### `src/utils/canvas.ts`

- `renderEditableMemeToCanvas` / `downloadEditableMemeImage` / `copyEditableMemeToClipboard` / `renderMemeToCanvas` / `downloadTemplateImage` / `copyTemplateToClipboard` 全部加 `withWatermark = true` 默认参数透传

### `src/components/TextFieldsPreview.tsx`

- 新增可选 prop `topOverlay`（仿照已有 `cropOverlay`），在所有文字框之上渲染。`cropOverlay`（在文字框下方）和 `topOverlay`（在文字框上方）语义独立

### `src/components/MemeEditor.tsx`

- `withWatermark` state（默认 true，不持久化）
- `<WatermarkPreview>` 内部组件，通过 `topOverlay` 注入
- analytics `meme_export` 事件加 `watermark` 字段

### `src/utils/watermark.test.ts`

- 测试 `computeWatermarkLayout` 的纯计算部分
- 覆盖：fontSize/padding/shadowBlur/shadowOffset 的比例正确性、`rightX = width - padding` 贴右、`centerY + padding + fontSize/2 = imageHeight` 贴底、小图下数值仍为正

---

## 五、不做的事（边界明确）

- ❌ 智能避让 / 检测压到文字
- ❌ localStorage 记忆用户选择
- ❌ 用户自定义水印（位置 / 文字 / 不透明度 / 颜色 / 字体）
- ❌ 多档水印样式 / 主题
- ❌ 二维码 / 自适应反色 / 半透明深色底板
- ❌ 配置器 (`TemplateConfigurator`) 中显示水印
- ❌ 引入新字体
