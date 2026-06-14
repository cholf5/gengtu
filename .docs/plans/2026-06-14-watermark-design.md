# 导出水印功能设计

**日期**：2026-06-14
**目标**：在导出的梗图上默认添加站点水印，提升传播度，吸引更多用户。水印需"漂亮、有艺术感"，让用户愿意保留而非反感；同时提供清晰的取消入口，尊重用户选择。

---

## 一、目标与非目标

**目标**

- 导出的梗图（下载 / 复制到剪贴板）默认在右下角带一枚"梗图铺"水印。
- 水印视觉极简、克制，做到"漂亮到用户愿意留下"。
- 在编辑器导出按钮旁提供清晰的"导出时带水印"开关，默认勾选。

**非目标 / YAGNI 边界**（写明防止滑坡）

- 不做智能避让（不检测水印位置是否压到用户文字框）。
- 不做 localStorage / 任何持久化记忆——每次打开编辑器恢复默认勾选。
- 不做用户自定义水印（位置 / 文字 / 不透明度 / 颜色 / 字体均固定）。
- 不在预览（CSS 渲染那条管线）里显示水印——只在导出 canvas 时叠加。
- 不引入新字体，复用项目现有中文字体栈。

---

## 二、决策记录

每条决策附"为什么不选其他选项"。

### 1. 水印内容：站点名 + 小图标

最终：项目已有的 `logo.png` + "梗图铺" 三字，横向排列。

不选「站点名 + 域名」：域名让视觉重量翻倍，难做艺术感，更像传统水印，用户取消意愿高。
不选「站点名 + 二维码」：二维码本身是"丑/廉价"视觉符号，跟"让用户感到自豪"直接冲突，占地最大。

### 2. 位置：固定右下角

不选左下角：中文阅读习惯下右下注意力更集中，且右下是惯例"署名位"。
不选底部居中横条：太商业化，跟艺术感相悖。
不选智能避让：边界 case 多、位置漂移显得不专业；用户真被压住可一键关掉。

### 3. 视觉形态：极简印章风（纯白 logo + 文字）

不选手写签名风：手写中文字库支持差或体积大，落款风易显老气。
不选双色徽章风（胶囊托底）：会有明显的"框"，跟极简相悖，更像广告位。

### 4. 可读性方案：纯白 + 柔光阴影 + 整体 0.85 不透明度

不选自适应反色：颜色跳变破坏品牌一致性，看着像 bug；半亮半暗背景两难；实现复杂度上升。
不选半透明深色底板：等同于胶囊徽章，跟极简印章相悖。

### 5. 取消入口：导出按钮旁一个 Antd Checkbox

不选设置页 / 偏好菜单：项目无设置页，YAGNI；藏功能不尊重用户。
不选水印本身可点击关闭：×图标破坏极简观感；预览不显示水印时该入口无法存在。

### 6. 不持久化用户选择

每次默认勾选——传播效果最大化，且无后端站点为单个开关引入 localStorage 基础设施不划算。

### 7. 预览不显示水印

预览是 CSS 渲染（`TextFieldsPreview` + `react-rnd`），导出是 canvas，两套实现会违反"预览/导出语义同步"原则。
导出结果固定可预期（右下角 + 极简印章），不需要预览确认。
开关下加一行 12px 灰字「导出时在右下角添加水印」即可解释。

### 8. 尺寸：按图片高度比例缩放

不选固定像素 + 上下限：跟现有 `resolveSizeForImage` 的比例缩放哲学不一致。
比例值：整体高度 = `imageHeight × 3.5%`；padding = `imageHeight × 2%`。

---

## 三、行为规格

**默认状态**：编辑器打开时，「导出时带水印」开关默认 `checked = true`。

**水印渲染**：当 `withWatermark === true`，导出生成的 canvas 在原图 + 文字渲染完成后，在右下角额外绘制水印层。

**水印组成**：
- 左侧：`logo.png`（项目根 `public/logo.png`，URL 走 `import.meta.env.BASE_URL`）
- 右侧："梗图铺" 三字
- 横向排列，logo 在左、文字在右

**水印尺寸（基于导出 canvas 的 `height`）**：
- 整体高度 H = `height × 0.035`
- logo 边长 = H
- 字号 = H × 0.85
- logo 与文字间距 = H × 0.35
- 距右边 / 下边 padding = `height × 0.02`

**水印样式**：
- 颜色：纯白 `#FFFFFF`
- 整体不透明度：`globalAlpha = 0.85`
- 柔光阴影：`shadowColor = 'rgba(0,0,0,0.45)'`，`shadowBlur ≈ height × 0.004`，`shadowOffsetX = shadowOffsetY = 0`
- 字体：复用项目现有中文字体栈（与 `DEFAULT_TEXT_STYLE.fontFamily` 同源），不引新字体

**UI 改动**：`MemeEditor` 底部「下载 / 复制」按钮区域旁加 Antd `Checkbox`「导出时带水印」，下方一行 12px 灰色小字「导出时在右下角添加水印」。

**用户取消水印**：取消 Checkbox 后，下载 / 复制操作传入 `withWatermark = false`，跳过水印绘制。

---

## 四、代码结构与改动点

### 新文件 `src/utils/watermark.ts`

导出两个符号：

1. `computeWatermarkLayout(imageWidth, imageHeight)`：纯函数，返回 `{ x, y, totalWidth, height, padding, fontSize, logoSize, gap, shadowBlur }`，所有值已按上述比例算好且坐标定位到右下角内边距处。**这是测试目标**。

2. `drawWatermark(ctx, canvas, logo)`：调用 `computeWatermarkLayout`，在 ctx 上绘制 logo（`drawImage`）+ 文字（`fillText`），应用纯白 + 0.85 alpha + 柔光阴影。

辅助：复用 `canvas.ts` 的 `loadImage` 思路，水印 logo 加载 URL 用 `import.meta.env.BASE_URL + 'logo.png'`。

### 改动 `src/utils/canvas.ts`

- `renderEditableMemeToCanvas(template, fields, withWatermark = true)`：新增第三参数，默认 `true` 保持向后兼容。在现有 `forEach(drawTextField)` 之后，若 `withWatermark`，加载 logo 并调用 `drawWatermark`。
- `downloadEditableMemeImage` / `copyEditableMemeToClipboard`：新增 `withWatermark` 参数透传。
- `renderMemeToCanvas` / `downloadTemplateImage` / `copyTemplateToClipboard`：同步加 `withWatermark` 参数（保持两条导出管线对称，即便目前只有 editable 那条管线在用）。

### 改动 `src/components/MemeEditor.tsx`

- `const [withWatermark, setWithWatermark] = useState(true)`
- 在按钮区域加 `<Checkbox checked={withWatermark} onChange={...}>导出时带水印</Checkbox>` + 下方 `<Text type="secondary" style={{ fontSize: 12 }}>导出时在右下角添加水印</Text>`
- `downloadEditableMemeImage` / `copyEditableMemeToClipboard` 调用处传入 `withWatermark`

### 测试 `src/utils/watermark.test.ts`

针对 `computeWatermarkLayout` 写：

- 500 / 1000 / 2000 三档 imageHeight，断言：
  - `height` 等于 `imageHeight × 0.035`
  - `padding` 等于 `imageHeight × 0.02`
  - 水印右边缘 = `imageWidth - padding`
  - 水印下边缘 = `imageHeight - padding`
  - `fontSize` / `logoSize` / `gap` 之间的比例关系正确
- 极小图（如 200px）下数值仍为正且合理（不需要做 clamp，但断言不会出现 NaN / 负数）

`drawWatermark` 的 canvas API 调用不测，跟现有 `canvas.ts` 无单测一致；jsdom 也跑不了真实 canvas 渲染。

---

## 五、风险与权衡

**风险 1：纯白水印在纯白图片上几乎不可见**
缓解：柔光阴影提供"隐形托底"。极端纯白图片用户可视情况自己关水印。已在决策 4 接受这个取舍。

**风险 2：水印压到用户文字**
缓解：靠"用户可一键关闭"兜底。已明确不做智能避让（决策 2）。

**风险 3：logo.png 加载失败**
处理：`drawWatermark` 内部 `loadImage` 失败时 catch 并 console.warn，跳过水印绘制——不阻断用户的导出主流程。

**风险 4：BASE_URL 在 Pages 部署下的拼接错误**
缓解：复用 `src/memes/index.ts` 里 `resolveTemplateUrl` 的同款 `import.meta.env.BASE_URL` 拼接逻辑，确保两个环境一致。

---

## 六、不做的事（再次明确）

为防止后续滑坡复述：

- ❌ 智能避让 / 检测压到文字
- ❌ localStorage 记忆用户选择
- ❌ 用户自定义水印（位置 / 文字 / 不透明度 / 颜色 / 字体）
- ❌ 预览中显示水印
- ❌ 引入新字体
- ❌ 多档水印样式 / 主题
- ❌ 二维码 / 域名嵌入
