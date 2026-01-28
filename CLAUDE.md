# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **uTools plugin** built with **Vue 3** that translates Chinese variable names to English programming conventions. It uses OpenAI-compatible APIs (OpenAI, Qwen, DeepSeek, Zhipu GLM, Kimi) for translation.

### Build & Development

```bash
# Development (runs Vite dev server on port 5173)
npm run dev

# Production build (outputs to dist/)
npm run build
```

**Development Mode:** In uTools, the `plugin.json` `development.main` points to `http://localhost:5173`. After building, copy `dist/` contents along with `plugin.json`, `logo.png`, and `preload/` to the uTools plugin directory.

## Architecture

### Entry Points

| File | Purpose |
|------|---------|
| [index.html](index.html) | HTML entry point, mounts `#app` |
| [src/main.js](src/main.js) | Vue app initialization |
| [src/App.vue](src/App.vue) | Root component - handles routing, theme, uTools lifecycle |
| [src/VariableTranslator/index.vue](src/VariableTranslator/index.vue) | Main translation feature component |

### uTools Integration

**Plugin Configuration:** [public/plugin.json](public/plugin.json)
- Feature code: `translator`
- Commands: "variable translation", "translate", "chinese translation", "naming assistant", "translator"
- Supports "over" type (text selection translation)

**Preload Script:** [public/preload/services.js](public/preload/services.js)
- Injects Node.js capabilities via `window.services` (file I/O, compression)
- Sets up uTools feature handlers via `window.exports`
- Passes search input to Vue via `window.translatorPayload`

**Data Flow:**
1. User invokes plugin via uTools search or text selection
2. `preload/services.js` captures payload in `window.translatorPayload`
3. `App.vue` receives via `window.utools.onPluginEnter()`, sets `enterAction` prop
4. `VariableTranslator/index.vue` watches `enterAction`, triggers translation

### Data Persistence

| Storage | Key | Purpose |
|---------|-----|---------|
| `window.utools.db` | `translator_api_config` | API endpoint, key, model, preset |
| `localStorage` | `translator_theme` | Theme preference (light/dark) |

**Important:** When modifying API config persistence, be aware of race conditions between:
- `loadApiConfig()` called in `onMounted` (50ms delay)
- `watch(() => props.enterAction)` with `immediate: true`
- The `isLoadingConfig` flag (module-level, reset after 100ms)

### CSS Architecture

Theme system uses CSS custom properties defined in [src/main.css](src/main.css):
- `data-theme="light"` or `data-theme="dark"` on `:root`
- Variables: `--bg-primary`, `--bg-secondary`, `--text-primary`, `--border`, etc.

## Key Implementation Details

### Translation Prompt Structure

The `getPrompt()` function ([VariableTranslator/index.vue:375-416](src/VariableTranslator/index.vue#L375-L416)) defines the AI prompt. The output format is JSON with 4 naming types per Chinese term:
- `variable`: noun phrases (camelCase, snake_case, PascalCase, phonetic)
- `method`: verb-prefixed (camelCase, snake_case, PascalCase, phonetic)
- `constant`: UPPER_SNAKE_CASE
- `class`: PascalCase nouns

### Debounced Auto-Translation

Input is watched with a 1.5s debounce ([VariableTranslator/index.vue:590-627](src/VariableTranslator/index.vue#L590-L627)). When text comes from uTools (`isFromUtools` flag), it translates immediately after 100ms to ensure API config is loaded.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` / `Cmd+Enter` | Immediate translation |
| `Ctrl+K` / `Cmd+K` | Clear input and results |
| `Esc` | Close API config modal |
