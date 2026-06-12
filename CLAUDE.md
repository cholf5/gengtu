# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow

- **不要主动 `git commit`。** 合作模式是：Claude 改代码 → 用户验收 → 用户明确说"提交" / "commit" 后才执行 `git commit`。
- 改完一组改动只汇报"改了什么 / 测试结果"，等用户回复。
- 仅当用户明确指示提交时才运行 `git add` / `git commit`。

## Commands

```bash
npm run dev            # Vite dev server
npm run build          # tsc -b && vite build  (root base)
npm run build:pages    # tsc -b && vite build --base=/open-meme/  (GitHub Pages)
npm run preview        # preview the production build
npm run test           # vitest run (jsdom env, single pass)
npx vitest run path/to/file.test.ts            # run one test file
npx vitest run -t "derives template draft"     # run by test name
npx vitest                                     # watch mode
```

There is no lint task; rely on `tsc -b` (run as part of `build`) for type checks.

## Architecture

Pure-frontend, no backend. Static site, vanilla Vite + React + TypeScript + Ant Design v6, deployable to any static host.

### Routing — handcrafted, not React Router

`src/App.tsx` switches between three views by reading `window.location.pathname`:

- `/` (or `/open-meme/` under Pages base) → `<Gallery>`; clicking a card opens `<MemeEditor>` inline (state-driven, no URL change).
- `/create` → `<TemplateConfigurator>`. Entered via the header "Create template" button which calls `history.pushState` and listens to `popstate` to keep the back button working.

Anything that constructs URLs must respect `import.meta.env.BASE_URL` (see `App.tsx`'s `openCreate`/`goHome` and `src/memes/index.ts`'s `resolveTemplateUrl`).

### Templates load via Vite glob

`src/memes/index.ts` does `import.meta.glob('./*.json', { eager: true })`, runs each through `isMemeTemplate` runtime validation, prefixes the `url` with `BASE_URL`, and sorts by name. **To add a template:** drop the image into `public/memes/` and a sibling JSON into `src/memes/` — no registry edit needed. Invalid JSONs are warned to console and skipped, not thrown.

### Two text-field shapes — don't confuse them

- `MemeTextField` (in JSON / serialized template): minimal, includes only `fontSize / color / align`.
- `EditableTextField` (in-memory while editing): adds `text`, `zIndex`, and `styleOverrides: Partial<TextStyleSettings>`.

`createEditableFields` in `src/utils/textStyles.ts` lifts the JSON's `fontSize / color / align` into `styleOverrides` so `resolveTextStyle = { ...DEFAULT_TEXT_STYLE, ...styleOverrides }` reproduces the original look. `DEFAULT_TEXT_STYLE` is the source of truth for every property (italic, effect, opacity, max font size, etc.) the JSON shape doesn't carry. When loading existing templates, expect everything outside `fontSize/color/align` to come from this default.

### Editor and Configurator share the preview/drag pipeline

Both `MemeEditor.tsx` and `TemplateConfigurator.tsx` reuse:

- `useImagePreviewScale(url)` — returns `{ imageRef, imageSize, previewScale, updatePreviewScale }`. The image's `clientWidth / naturalWidth` ratio is the scale; a `ResizeObserver` keeps it fresh.
- `<TextFieldsPreview>` + `<TextBoxOverlay>` — render the image plus react-rnd boxes. Coordinates are stored in **natural image pixels**; the overlay multiplies by `previewScale` for display and divides back via `fromPreviewRect` on drag/resize end. `clampBoxToImage` keeps boxes inside the image and above min size.
- `src/utils/geometry.ts` — `toPreviewRect / fromPreviewRect / clampBoxToImage / roundRect` are the only conversion functions; do not inline scale math.

When editing a feature that touches preview/drag, change it in these shared modules — the user has explicitly pushed back on duplicating MemeEditor logic into the configurator.

### Canvas rendering vs preview

`src/utils/canvas.ts` has the only PNG-export path: `renderEditableMemeToCanvas` walks fields by `zIndex`, calls `drawTextField` which uses `fitText` to shrink the font until lines fit `field.height`, then strokes (effect=outline) or shadows (effect=shadow). `MemeEditor.tsx` has a separate CSS preview in `getPreviewTextStyle` — these two must stay in sync semantically (e.g. shadow distance scales with `outlineWidth`). Note `:root` deliberately does **not** set `font-synthesis: none`; that flag breaks Bold/Italic for fonts like Impact that ship no real bold glyphs.

### Configurator's name-driven form

In `TemplateConfigurator`, the user only types `Name` (and tags). `Template ID` and `Image URL` are computed via `deriveTemplateDraftFromName(name, ext)` in `src/utils/templateConfigurator.ts` (id = name with whitespace/underscores collapsed to `-`, case preserved; url = `/memes/<id-lowercased>.<ext>`). On image upload, `deriveTemplateDraftFromFilename` fills Name only when empty so a user-typed Name is never clobbered; `extractFileExtension` keeps the URL's extension in sync with the latest file. The "Generated JSON" card writes via `buildTemplateJson` and `stringifyTemplateJson`; downloads use `<derived.id.toLowerCase()>.json`.

### UI conventions

- Ant Design v6 wrapped in a single `<ConfigProvider>` in `App.tsx` (token: `colorPrimary: '#4263eb'`, `borderRadius: 14`). Prefer Antd components over hand-rolled controls — the user has explicitly chosen this over KISS.
- Forms in inspectors use `layout="horizontal" size="small" colon={false} labelAlign="left"` with a fixed `labelCol` flex (≈92–104px) and `marginBottom: 8`. Pair related fields with `Row + Col span={12}`.
- `src/styles.css` is intentionally small — only layout shell, preview/RND box visuals, and responsive breakpoints. Do not re-add hand-rolled button/card/input rules; use Antd.

## Tests

Vitest with the jsdom environment (configured in `package.json` devDeps; `@testing-library/react` is set up but currently unused). Tests live next to the code as `*.test.ts(x)`. Current coverage is the pure utilities under `src/utils/` (`geometry`, `templateConfigurator`). When adding utility helpers — especially anything touching string normalization, geometry, or the JSON builder — add a test alongside.
