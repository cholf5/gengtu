# 梗图铺 Logo 设计

日期：2026-06-14

## 背景

为「梗图铺」设计一个 Logo，用于站点 favicon、Header 品牌位、可能的社交头像。站点定位是单人策展、手挑模板的中文梗图工具，纯前端、无后端、无水印无广告，气质克制现代。

## 设计决策

通过 com-brainstorming 一次一选，最终落定：

| 决策项 | 选择 | 理由 |
| --- | --- | --- |
| 整体方向 | 字符 / 印章型 | 中文站点辨识度最强，favicon 尺寸下汉字方块比抽象图形更易识别 |
| 主字 | 「梗」单字 | 站点核心是"梗"不是"铺"，单字最易记，生图模型画单字比合体字稳 |
| 容器形态 | 圆角方块 | 与 Antd `borderRadius: 14` 同源，Logo 自然成为 UI 的一部分；所有尺寸不变形 |
| 字形 | 现代无衬线黑体 | 与站点 Inter + Antd 现代感无缝；标准黑体生图准确率最高，主动规避错字风险 |
| 点缀元素 | 无 | 站点调性即"克制、干净、不打扰"，单元素 prompt 出图稳定性最高 |

## 设计规格

- **形态**：圆角方块 Logo，1:1，圆角半径约占边长 11%（对应 Antd `borderRadius: 14` 在 128px Logo 上的视觉比例）
- **配色**：方块背景 `#4263eb`（站点 `colorPrimary`），主字纯白 `#FFFFFF`
- **主字**：单个汉字「梗」，居中，占方块约 60% 高度，四周留白均匀
- **字形**：现代无衬线黑体（思源黑体 Heavy / 阿里巴巴普惠体 Bold / PingFang SC Heavy 一类），笔画方正等粗，收笔干脆
- **禁用**：渐变、阴影、描边、纹理、毛笔/书法/篆体/隶书、3D / 浮雕、任何角标或装饰
- **背景**：方块外纯透明（PNG）或纯白

## 生图 Prompt

### 主 Prompt（英文）

```
A minimalist square app icon logo, 1:1 aspect ratio, featuring a single Chinese character "梗" (gěng) centered on a solid rounded square background.

Background: solid indigo-blue color #4263eb, no gradient, no texture, no shadow. Rounded square with corner radius approximately 11% of the side length (modern app-icon corner radius).

Character: the Chinese character "梗" in pure white #FFFFFF, rendered in a modern geometric sans-serif Chinese typeface (similar to Source Han Sans Heavy / Alibaba PuHuiTi Bold / PingFang SC Heavy). Strokes are clean, even-weight, squared terminals, no serifs, no brush strokes, no calligraphy. The character occupies about 60% of the icon height, perfectly centered with even padding on all four sides.

Style: flat design, vector-style, ultra-clean, modern, minimal. Crisp edges, no anti-aliasing artifacts, no glow, no embossing, no 3D effects, no inner shadows. Suitable as a favicon and app icon at any size from 16px to 1024px.

Background outside the rounded square: pure transparent or pure white.

The character must be written correctly: 梗 is composed of the radical 木 (tree, on the left) and 更 (on the right). Render it as standard simplified Chinese, not stylized, not abstracted, not as a different character.
```

### Negative Prompt

```
no serif font, no brush calligraphy, no handwriting style, no seal script (篆体), no clerical script (隶书), no traditional ink wash, no gradient, no shadow, no glow, no 3D, no bevel, no emboss, no texture, no noise, no outline around character, no border around square, no decorative elements, no speech bubble, no icon badge, no extra symbols, no English letters, no other Chinese characters, no incorrect or distorted strokes, no Japanese kanji variants
```

## 使用建议

1. **抽 4–8 张选最准**：中文字 Logo 最大风险是写错字——「梗」可能被画成「埂/便/硬」或缺笔多笔，逐张核对只留笔画完全正确的。
2. **模型优先级**：GPT-image-1 / DALL-E 3 > 即梦 / 可灵 > Midjourney v6+ > SDXL（SDXL 中文字几乎必错，不建议）。
3. **后期校正**：拿到满意构图后，建议在 Figma / Photoshop 里把字替换为本地字体（思源黑体 Heavy 即可），生图结果只作构图与配色参考，字形 100% 由本地字体保证。

## 后续

- 拿到 Logo 原图后落到 `public/` 下作为 favicon（多尺寸）和 Header 品牌位。
- Header 当前是纯文字 `app-brand-eyebrow + app-brand-title`，是否插入 Logo 图待定，本次不在范围内。
