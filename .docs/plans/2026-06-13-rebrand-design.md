# 重新命名 / Rebrand 设计

**日期**：2026-06-13
**背景**：项目最初命名 `Open Meme`，原因是计划开源；后来决定不再开源（仓库已转私有），原名与原 Slogan 不再贴合。重新定位品牌。

## 决策

| 项 | 旧 | 新 |
|---|---|---|
| 域名 | （未注册） | `gengtu.app` |
| 项目名 | Open Meme | 梗图铺 |
| 主 Slogan | 开源 · 纯前端的 Meme 生成器 | 中文梗图铺 |
| 副 Slogan | —— | 精选模板，一键成梗 |

## 决策依据

### 为什么不再叫 Open Meme

- `Open` 暗示开源，仓库已私有，外部 PR 路径已关闭，名字与现状矛盾。
- 「纯前端」是实现细节，用户不关心；继续宣传只是技术自嗨。

### 为什么是 `gengtu.app`

候选域名对比后选定：

- `gengtu.app`（中选）—— 拼音直白、中文用户秒懂、`.app` 现代且强制 HTTPS、价格合理（< US$20）。
- `dedicated.meme`（落选）—— 英文方向最佳，但产品决定不进入英文市场（避开 imgflip）。
- `memeji.*`（落选）—— 生造词漂亮但对中文用户不直白，和产品中文优先的现状拧巴。
- `biaoqingbao.*`（落选）—— 9 个字母太长，输入/记忆成本高。
- `generator.meme`（落选）—— US$187.5 偏贵，且 `generator` 太通用，与"策展精品"调性反向。

### 为什么品牌名是「梗图铺」而不是「梗图」

- 裸「梗图」是通用词，无法注册商标、SEO 不友好。
- **「铺」** 字契合"单一策展人、店主精选模板"的产品定位（参见 `CLAUDE.md` 的 Product positioning：no user-upload path）。
- 三个字好念好记，比「工坊 / 工厂」轻盈，比「局 / 匠」不装。
- 域名输入时仍是 `gengtu`，品牌叙事在文案/首页/视觉中围绕"铺子"展开。

### 为什么 Slogan 用双行

单行 Slogan 装不下两个卖点（**中文世界定位** + **策展精选**）。

- 主 Slogan「中文梗图铺」—— 一句话讲清产品是什么、面向谁；「中文」前置抢占"中文梗图工具"这个心智位（暗示与 imgflip 的差异化），「铺」呼应单一策展人定位。
- 副 Slogan「精选模板，一键成梗」—— 上半句讲"凭什么用你"（精选 ≠ 模板大全），下半句讲"用了能得到什么"（一键 = 即时结果）。两个四字短句节奏对仗，比长句更有记忆点。

## 战略前提

- 产品**只服务中文世界**，不进入英文市场（imgflip 已占据生态位，正面竞争性价比低）。
- 保留单一策展人模式：模板由作者手挑提交 PNG + JSON，不开放用户上传，不做后端、账号系统。

## 落地范围（本次已实施）

活文档与活代码全部替换；历史档案（旧 plans / handoff / PRD）作为时间快照保留。

已替换的文件：

- `index.html` —— `<html lang>` → `zh-CN`；title 与 meta description 改为新文案
- `src/App.tsx` —— eyebrow `OPEN MEME` → 「梗图铺」；主标题 → 「精选模板，一键成梗」
- `README.md` —— 标题与首段全部重写
- `package.json` / `package-lock.json` —— `name`: `open-meme` → `gengtu`
- `package.json` 的 `build:pages` —— `--base=/open-meme/` → `--base=/gengtu/`
- `CLAUDE.md` —— 同步注释里的 `--base=/gengtu/` 与路由说明
- `src/utils/templateUsage.ts` —— `localStorage` key `open-meme:*` → `gengtu:*`（项目未上线，无兼容负担）
- `src/utils/templateUsage.test.ts` / `templateImport.test.ts` —— 测试样例同步

不动（历史档案，保留语境）：

- `.docs/plans/2026-06-09-*.md`、`.docs/plans/2026-06-11-create-configurator-mvp.md`
- `.docs/handoff/260610-handoff.md`
- `.docs/PRD.md`（含一段过时的 GitHub PR 跳转流程，仓库已私有，文档本身已过时）

## 部署方案

- 注册独立域名 `gengtu.app`（外部步骤，待办）
- GitHub 仓库改名 `open-meme` → `gengtu`，`build:pages` 的 `/gengtu/` 才会生效
- 域名拿到后配 CNAME 到 `cholf5.github.io`，Pages 切自定义域
