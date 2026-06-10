# /create Visual Template Configurator MVP 代码审查

**关联计划**: `.docs/plans/2026-06-11-create-configurator-mvp.md`
**审查范围**: `.docs/plans/2026-06-11-create-configurator-mvp-review-scope.md`

## 审查统计

- 审查文件范围：`package.json`、`package-lock.json`、`src/App.tsx`、`src/main.tsx`、`src/styles.css`、`src/components/*`、`src/hooks/*`、`src/utils/*`
- 发现问题数：3
- 已修复：3
- 待修复：0

## 已修复问题

### P1：Field ID 清空导致 Inspector 消失

**位置**: `src/components/TemplateConfigurator.tsx`

用户清空 Field ID 时，字段 id 变成空字符串，但 `selectedFieldId` 仍是旧值，导致选中字段变为 `null`，Inspector 消失，并可能生成空 id JSON。

**修复**: 在 `updateField` 中拒绝空 id patch，保留旧 id 和选中态。

### P1：Field ID 可以手动改成重复值

**位置**: `src/components/TemplateConfigurator.tsx`

重复 id 会导致 JSON 中 `textFields[].id` 重复，现有编辑器选择、文本映射和 React key 都可能混乱。

**修复**: 在 `updateField` 中检查其他字段是否已占用目标 id；重复时拒绝更新并显示 `Field ID must be unique.`。

### P1：删除字段后新增可能自动生成重复 id

**位置**: `src/components/TemplateConfigurator.tsx`、`src/utils/templateConfigurator.ts`

原先新增字段使用 `fields.length + 1`，删除中间字段后再新增会复用已有 `text_N`。

**修复**: 新增 `getNextTextFieldIndex(fields)`，扫描已有 `text_N` 并选择第一个未使用 index；补充单元测试覆盖该场景。

## 验证

已运行：

```powershell
npm run test
npm run build
npm run build:pages
```

结果：全部通过。Vite 因引入 Ant Design 输出 chunk size warning，但构建成功。

## 已确认非问题

- AntD 引入导致 bundle 增大：当前是工具型页面，且用户明确同意引入 Ant Design；本轮不做 lazy loading。
- `/create` 直接刷新在 GitHub Pages 可能 404：设计阶段已接受当前无 React Router/fallback 的 KISS 路由，MVP 只保证站内跳转。
