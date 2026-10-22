# PDF Tools Suite

Free browser-based PDF utilities: **merge**, **split**, **compress**, and **rearrange** pages. Files are processed locally in your browser.

## Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [pdf-lib](https://pdf-lib.js.org/) & [pdfjs-dist](https://mozilla.github.io/pdf.js/)

## Development

Requires Node 24 (see `.nvmrc`).

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

For a GitHub **project** site at `https://<you>.github.io/pdf-tool/`, match asset and SEO URLs:

```sh
VITE_BASE_URL=/pdf-tool/ VITE_SITE_URL=https://yourname.github.io/pdf-tool/ npm run build
```

The build also writes `dist/404.html` (a copy of `index.html`) so GitHub Pages serves the SPA for deep links.

## Deploy (GitHub Pages)

The workflow [`.github/workflows/deploy-github-pages.yml`](.github/workflows/deploy-github-pages.yml) runs on push to `main` (or manually via *Run workflow*). It reads the site's base path and URL from [`actions/configure-pages`](https://github.com/actions/configure-pages), passes them to the build as `VITE_BASE_URL` / `VITE_SITE_URL`, and deploys with GitHub Actions. This works for project sites, `*.github.io` user sites and custom domains without editing the workflow.

In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## SEO configuration

- **`VITE_SITE_URL`** — Set in the deploy workflow (or in your shell when building) for canonical URL, Open Graph, Twitter cards, JSON-LD, and `sitemap.xml`. Local builds default to `http://localhost:8080/` if unset.
- **Social preview image** — [`public/og-image.png`](public/og-image.png) (about 1200×630). Replace it if you want different branding.

## License

See the repository license file if one is present.
