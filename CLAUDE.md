# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言偏好

始终使用中文回复。所有对话、代码注释、commit 信息都使用中文。技术术语可保留英文，但解释说明必须用中文。

## Project overview

Single-page personal brand website for Zinong2017, an AI Agent product manager. Pure static site: HTML + CSS + vanilla JS, no frameworks or build step. Designed with a minimal, premium aesthetic.

## Local development

```bash
# Start any static server from the project root
python -m http.server 8080
# Or:
npx serve .

# Then open http://localhost:8080
```

No build/lint/test commands — this is a zero-dependency static site. Opening `index.html` directly works but may have cross-origin issues with local images; a local server is preferred.

## Site architecture

The page is composed of 8 sequential modules, all in a single `index.html`:

| Module | `id` | Description |
|---|---|---|
| Fixed navbar | `navbar` | Frosted glass, becomes solid on scroll. Desktop nav links + mobile hamburger menu. |
| Hero carousel | `hero` / `carousel` | Full-viewport fade-in/fade-out carousel, 4 slides, auto-advances every 5s, pauses on hover. Touch swipe on mobile. |
| About | `about` | Avatar (gradient letter "Z"), bio, skill chips. |
| Skills grid | `skills` | 4 skill cards in a responsive CSS grid. |
| Works gallery | `works` | 6-item image gallery (3×2 desktop, 1-col mobile). Click opens lightbox. |
| Journal | `journal` | Dated blog-style entries with images. |
| Contact | `contact` | Email copy-to-clipboard button (Clipboard API with `execCommand` fallback). |
| Footer | `footer` | Social icon links + WeChat QR modal. |

Two overlay components: **lightbox** (image preview) and **wechat modal** (QR code popup).  
Additionally, a **PM Agent workbench** (`pm-agent-btn` + `pm-chat`) floats in the bottom-right corner.

### PM Agent 工作台（右下角悬浮）

PM 技能智能体，定位为「Zinong2017 的 AI 数字分身」。用户输入文字需求（如「帮我写一份 PRD」），智能体调用 DeepSeek API 生成专业文档。

- **入口**：右下角渐变圆形按钮 `#pmAgentBtn`，点击弹出工作台面板 `#pmChat`
- **技能卡片**：6 个 PM 快捷技能按钮（写 PRD / 竞品分析 / 需求拆解 / 指标设计 / 方案评审 / 访谈提纲），点击填入预设 Prompt
- **流式对话**：SSE 逐字输出 + 打字机光标 + Markdown 实时渲染
- **思考链**：发送消息后播放 6 步 PM 思考动画，可折叠查看
- **文档下载**：生成完成后显示「📥 下载 Word」按钮，生成 Word 兼容的 .doc 文件（HTML-as-docx 方案，零依赖）
- **复制全文**：一键复制 Markdown 原文到剪贴板
- **搜索集成**：检测到「搜索/竞品/最新」等关键词时，在请求中标记 `enableSearch`，Worker 端调用 Brave Search API 注入结果
- **API 代理**：Cloudflare Worker（`proxy/worker.js`）保护 DeepSeek API Key，支持速率限制

**JS 初始化**：`initPmAgent()` 在 `boot()` 中通过 `safe()` 注册，约 500 行。

## JavaScript architecture (`js/main.js`)

Single IIFE with `'use strict'`. Each feature is a self-contained `init*()` function, all called from `boot()` wrapped in `safe()` (try/catch that logs to console). The `safe()` pattern ensures one feature's error doesn't break others — important on flaky mobile browsers.

Key patterns:
- **`IntersectionObserver`** is used for scroll-based nav link highlighting (sections `#hero` through `#footer`) and reveal-on-scroll animations (`.reveal` elements). Both degrade gracefully when unsupported.
- **Carousel** uses CSS opacity transitions with absolute-positioned slides. Lazy-loads images via `data-src` → `src` promotion on slide activation (slides 2–4). Touch support: horizontal swipe detection on the carousel element with vertical-scroll prevention.
- **Mobile nav** toggles `body { overflow: hidden }` when open to prevent background scroll.
- **Base path detection** in the `<head>` inline script: on `github.io` domains, sets `<base href="/zinong2017/">` and redirects if the URL doesn't end with a trailing slash. On Android/WeChat, adds `.android-compat` / `.wechat-compat` classes to `<html>`.

## CSS architecture (`css/style.css`)

All design tokens are in `:root` custom properties: colors (`--color-primary`, `--color-accent`, etc.), fonts (`--font-en`, `--font-zh`), radius, shadows, nav height, and animation durations. To change the visual style, edit the `:root` block — everything else references these variables.

Responsive breakpoints:
- **≤1023px**: Tablet — 2-column grids, stacked about layout
- **≤767px**: Mobile — 1-column grids, hamburger menu visible, reduced hero height
- **≤767px + `pointer: coarse`**: Touch-specific — enlarged touch targets (44px min), disabled hover transforms for performance
- **≤360px**: Small phones — further reduced font sizes and avatar

Android/WeChat compat: media queries target `.android-compat` and `.wechat-compat` classes to disable `backdrop-filter` (poor Android WebView support), disable tap highlight, set `touch-action: manipulation`, and fix WeChat `-webkit-text-size-adjust`.

Reveal animations use a two-class system: elements start with just `.reveal` (visible by default), and `.js-ready .reveal:not(.visible)` hides them until they intersect. This prevents a blank page if JS fails to run on mobile.

## Image assets

All images under `assets/img/`: 4 hero slides, 6 work thumbnails, 1 journal image, 1 WeChat QR placeholder. All are local JPGs — no external CDN dependencies for images. The QR image has an inline SVG fallback via `onerror`.

## Deployment

Two GitHub Actions workflows in `.github/workflows/`:
- **`static.yml`** — official `actions/upload-pages-artifact` + `actions/deploy-pages` (deploys from repo root, expects Pages source set to "GitHub Actions")
- **`pages.yml`** — alternative approach using `peaceiris/actions-gh-pages` to publish to `gh-pages` branch (Pages source set to "Deploy from branch" → `gh-pages`)

The `deploy.ps1` PowerShell script does a one-shot `git push` to the configured remote, then the user manually enables Pages in repo settings.

`.nojekyll` at the root tells GitHub Pages to skip Jekyll processing (required for raw static files starting with underscores or dots).

### PM Agent 后端部署

PM Agent 需要额外部署 Cloudflare Worker（`proxy/worker.js`）作为 API 代理：
1. 打开 https://dash.cloudflare.com → Workers & Pages → 创建 Worker
2. 粘贴 `proxy/worker.js` 内容
3. 在设置 → Variables 中添加 Secret：`DEEPSEEK_API_KEY`（必须）和 `BRAVE_SEARCH_API_KEY`（可选）
4. 部署后将 Worker URL 填入 `js/main.js` 中的 `PROXY_URL` 变量
