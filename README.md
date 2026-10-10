# PDF Utilities

Quick, private PDF tools that run entirely in your browser. Nothing is uploaded: your files never leave your computer.

**Live app:** https://ngarciar24.github.io/pdf-utilities/

| Tool | What it does |
|---|---|
| **Images → PDF** | PNG, JPG, WebP, GIF… to a PDF, one image per page. Page size (fit / A4 / Letter), orientation, margins, drag to reorder. |
| **Merge** | Combine several PDFs into one, in the order you choose. |
| **Split** | Extract pages (`1-3, 7, 10-`) into a new PDF, or split every page into its own file (zip). |
| **Rotate** | Rotate all or selected pages by 90°, 180° or 270°. |

## Install it on your laptop

Open the live app in Chrome, Edge or another Chromium browser and click the **Install** icon in the address bar (Safari: *File → Add to Dock*). It then opens in its own window and works offline.

## Run it locally

Requires Node.js 22+.

```sh
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Deploy

The build output in `dist/` is a plain static site, so any static host works.

- **GitHub Pages** (automatic): every push to `main` deploys via `.github/workflows/deploy.yml`.
  One-time setup: *Settings → Pages → Build and deployment → Source: GitHub Actions*.
- **Docker** (any server):
  ```sh
  docker build -t pdf-utilities .
  docker run -p 8080:80 pdf-utilities     # http://localhost:8080
  ```
  Pushing a tag like `v0.1.0` publishes `ghcr.io/ngarciar24/pdf-utilities`.
- **Netlify / Vercel / Cloudflare Pages**: build command `npm run build`, output directory `dist`.

The app is served from `/` by default. To serve it from a sub-path, build with `BASE_PATH=/sub/path/ npm run build`.

## Development

```sh
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright); run `npx playwright install chromium` once first
```

Project layout:

- `src/core/` – PDF logic with no UI code (pdf-lib), covered by unit tests in `tests/unit/`
- `src/tools/` – one screen per tool
- `src/components/` – shared UI (drop zone, sortable file list, buttons)
- `tests/e2e/` – Playwright tests that drive the real app and check the downloaded files

See [PLAN.md](PLAN.md) for the roadmap.

## License

[MIT](LICENSE)
