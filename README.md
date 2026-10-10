# PDF Utilities

Quick, private PDF tools that run entirely in your browser. Nothing is uploaded: your files never leave your computer.

**Live app:** https://ngarciar24.github.io/pdf-utilities/ (⚠️ not online yet, see [Status](#status))

| Tool | What it does |
|---|---|
| **Images → PDF** | PNG, JPG, WebP, GIF… to a PDF, one image per page. Page size (fit / A4 / Letter), orientation, margins, drag to reorder. |
| **Merge** | Combine several PDFs into one, in the order you choose. |
| **Split** | Extract pages (`1-3, 7, 10-`) into a new PDF, or split every page into its own file (zip). |
| **Rotate** | Rotate all or selected pages by 90°, 180° or 270°. |

## Status

Last checked: 2026-10-10, commit `c787c6e` on `main`.

### Live site: not online yet

https://ngarciar24.github.io/pdf-utilities/ returns **404**. The app builds and its tests pass; nothing has been published yet.

**Why:** the first *Deploy to GitHub Pages* run failed at the `actions/configure-pages` step with
`Get Pages site failed ... Not Found`. GitHub Pages is not enabled for the repository, so there is nowhere to deploy to.

**Fix (one time, needs repo admin):**

1. *Settings → Pages → Build and deployment → Source:* choose **GitHub Actions**.
2. *Actions → Deploy to GitHub Pages →* open the failed run and click **Re-run all jobs** (or use **Run workflow** on `main`).
3. When the run is green, the site is live at the URL above, usually within a minute.

### What works

Checked by automated tests: 25 unit tests, plus 6 browser tests that drive the real app in Chromium and open the downloaded files. All pass locally and in CI on `main`.

| Feature | Status |
|---|---|
| Images → PDF: PNG and JPG, one image per page | ✅ Works |
| Images → PDF: page size (fit / A4 / Letter), orientation, margins | ✅ Works |
| Images → PDF: WebP, GIF, BMP and other formats | ✅ Works if your browser can display the format (converted to PNG first) |
| Reorder files by drag-and-drop or the ‹ › buttons, remove files | ✅ Works |
| Merge any number of PDFs in a chosen order | ✅ Works (see limitations) |
| Split: extract pages like `1-3, 7, 10-` into one PDF | ✅ Works (see limitations) |
| Split: one file per page, downloaded as a zip | ✅ Works (see limitations) |
| Rotate all or selected pages by 90° / 180° / 270° | ✅ Works; keeps form fields and document info |
| Clear error messages for non-PDF files, broken PDFs, and page numbers out of range | ✅ Works |
| Light/dark mode, phone-sized screens | ✅ Works (checked by hand in Chromium) |
| CI: lint, typecheck, unit tests, build, browser tests | ✅ Green on `main` |

### Limitations: what does not work

| Case | What happens |
|---|---|
| **Password-protected PDFs** | Refused with "is password-protected and can't be opened". This includes PDFs with only an *owner* password (copy/print restrictions) that open fine in a normal PDF viewer. |
| **Fillable forms** after Merge or Split | Form fields are lost from the output; they are no longer fillable. Rotate keeps them. |
| **Bookmarks** (the outline sidebar) after Merge or Split | Not kept. |
| **Document info** (title, author, subject) after Merge or Split | Not kept. Rotate keeps it. |
| **HEIC/HEIF photos** (iPhone default) | Only work in browsers that can display HEIC (Safari). In Chrome, Edge and Firefox you get "is not an image your browser can read". Export as JPG first. |
| **Page previews** | Merge, Split and Rotate show the file name and page count only, not page thumbnails. You need to know the page numbers yourself. |
| **Very large files** | Everything runs in browser memory. Files of a few hundred MB may be slow or make the tab run out of memory. There is no size warning yet. |

### Not tested yet

These are built but nobody has checked them yet. Treat them as unknown, not as working:

- **Firefox and Safari.** The automated tests only run in Chromium (Chrome/Edge).
- **Installing as an app and offline use.** The service worker and manifest are generated at build time, but installing and working offline have not been tried.
- **Docker image.** The `Dockerfile` has never been built, and no image has been published to `ghcr.io` (that only happens when a `v*` tag is pushed).
- **Netlify / Vercel / Cloudflare Pages.** Should work as described below, but have not been tried.

### Not built yet

PDF → images, page editor (reorder/delete pages with thumbnails), metadata editing, page numbers and watermarks, compression, password protect/unlock, OCR. See [PLAN.md](PLAN.md).

## Install it on your laptop

> Not tested yet, and only possible once the [live site is online](#live-site-not-online-yet).

Open the live app in Chrome or Edge and click the **Install** icon in the address bar (Safari on macOS: *File → Add to Dock*). It should then open in its own window and work offline after the first visit.

Until the site is online, run it locally (below).

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
  Without it the deploy fails with `Get Pages site failed ... Not Found` (see [Status](#live-site-not-online-yet)).
- **Docker** (any server; not tested yet):
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
