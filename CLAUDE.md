# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, client-only PDF utility site (merge, split, rearrange, compress) built with Vite 8 + React 19 + TypeScript, Tailwind CSS 4, and shadcn/ui. All PDF processing happens in the browser; there is no backend. Deployed to GitHub Pages.

## Commands

```sh
npm install
npm run dev          # dev server on http://localhost:8080
npm run build        # production build to dist/
npm run build:dev    # build in development mode
npm run lint         # eslint over the repo
npm run preview      # serve dist/
```

There is no test runner configured. TypeScript is non-strict (`strict: false`, `noImplicitAny: false` in `tsconfig.app.json`), and `vite build` does not type-check; run `npx tsc -p tsconfig.app.json --noEmit` to check types.

Use Node 24 (`.nvmrc`; CI reads it) and npm (`package-lock.json`, `npm ci` in CI).

TypeScript is held at 6.x on purpose: `typescript-eslint` only supports `typescript <6.1`, so don't bump to 7 until it does. ESLint uses the flat config in `eslint.config.js`, which includes the React Compiler rules from `eslint-plugin-react-hooks` 7 (e.g. `set-state-in-effect`).

## Architecture

- **Routing**: `src/App.tsx` defines one route per tool (`/merge`, `/split`, `/rearrange`, `/compress`). `BrowserRouter`'s `basename` is derived from `import.meta.env.BASE_URL`, so routes work under a sub-path like `/pdf-tool/`.
- **Pages vs. logic split**: each tool page in `src/pages/` owns UI state and wraps its content in `ToolPageShell`. The actual PDF work lives in pure-ish async functions in `src/lib/pdf/*.ts`, and output is saved via helpers in `src/lib/download.ts` (single PDF, blob, or zip via JSZip).
- **Two PDF libraries with different roles**:
  - `pdf-lib` writes PDFs: copying/reordering pages for merge/split/rearrange, and building the compressed output.
  - `pdfjs-dist` reads/renders PDFs: thumbnails, previews, page counts, and rasterizing pages for compression. Always import it via `@/lib/pdfjs`, which sets the worker `workerSrc` (bundled with Vite's `?url` import). Importing `pdfjs-dist` directly will skip worker setup. With pdfjs-dist 6, render with `page.render({ canvas, viewport })` (no `canvasContext`), and release documents with `pdf.loadingTask.destroy()`, since `PDFDocumentProxy.destroy()` no longer exists.
- **Compression is lossy rasterization**: `src/lib/pdf/compress.ts` renders each page to a canvas with pdf.js, re-encodes it as JPEG, and embeds it in a new pdf-lib document. It tries progressively stronger quality/scale settings and returns the original bytes (`isReduced: false`) if nothing came out smaller. Text and vector content are not preserved.
- **Byte buffer copies**: pdf.js transfers (detaches) the `ArrayBuffer` it is given, so code passes `.slice()` copies of `Uint8Array`s to `pdfjsLib.getDocument` when the bytes are reused afterwards. Keep this when touching PDF loading code.
- **Drag-and-drop ordering** (merge file list, rearrange pages) uses `@dnd-kit`.
- **UI components**: `src/components/ui/` is shadcn/ui-generated (see `components.json`); only the components in use are present. Add new ones with the shadcn CLI rather than hand-writing them. Toasts use `sonner`. Path alias `@/` maps to `src/`.
- **Styling (Tailwind 4, CSS-first)**: there is no `tailwind.config.ts` or PostCSS config. Tailwind runs through `@tailwindcss/vite`, and theme tokens live in `src/index.css`. Raw HSL triplets are defined in `:root`/`.dark` (e.g. `--border: 0 0% 0% / 0.05`) and exposed as utilities via `@theme inline` (`--color-border: hsl(var(--border))`). Animations come from `tw-animate-css`. Unlayered third-party CSS (e.g. sonner) beats Tailwind's layered utilities, so style sonner via its `--normal-*` variables in `src/components/ui/sonner.tsx`, not with utility classes.

## Build-time SEO and deployment

`vite.config.ts` includes an inline `seo` plugin that:
- replaces every `__SITE_URL__` placeholder in `index.html` (canonical, Open Graph, Twitter, JSON-LD) with `VITE_SITE_URL`,
- emits `sitemap.xml` from a hard-coded `routes` array,
- appends a `Sitemap:` line to `dist/robots.txt`.

**When adding a new tool route, update both `src/App.tsx` and the `routes` array in `vite.config.ts`**, and add a card to the `tools` list in `src/pages/Index.tsx`.

Env vars (read at build time):
- `VITE_BASE_URL`: Vite `base` / router basename (default `/`).
- `VITE_SITE_URL`: absolute public URL for SEO tags and sitemap (default `http://localhost:8080/`).

Deployment is via `.github/workflows/deploy-github-pages.yml` on push to `main`/`master`. It sets both env vars (`/pdf-tool/` for a project site, `/` for a `*.github.io` repo), builds, and copies `dist/index.html` to `dist/404.html` for SPA fallback. To reproduce a project-site build locally:

```sh
VITE_BASE_URL=/pdf-tool/ VITE_SITE_URL=https://<owner>.github.io/pdf-tool/ npm run build
```
