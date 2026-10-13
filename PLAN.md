# PDF Utilities — Project Plan

A small, fast, privacy-friendly app to handle everyday PDF chores on a laptop:
convert images to PDF, merge, split, reorder, rotate, and so on.

## 1. Goals

- **Quick to use**: drag files in, click one button, download the result.
- **Private**: files never leave your machine. No uploads, no server-side processing.
- **Runs anywhere**: open it in a browser, install it on the laptop like a desktop app,
  or self-host it with one command.
- **Public and easy to contribute to**: an open-source GitHub repo with CI and automatic deploys.

## 2. Architecture decision

**A static web app that does all PDF processing in the browser**, installable as a
PWA (Progressive Web App).

| Option | Pros | Cons |
|---|---|---|
| **Static web app + PWA (chosen)** | Free hosting on GitHub Pages; works offline; files stay local; no backend to maintain; installs like a desktop app on any OS | Heavy operations (real compression, OCR) are harder in the browser |
| Python CLI/GUI (pypdf + Tkinter/PySide) | Simple code, strong PDF libraries | Must be installed per machine; packaging for Win/macOS/Linux is painful; nothing to "deploy" |
| Python web server (FastAPI/Streamlit) | Full power of Python libs | Needs a server; files get uploaded; hosting costs money |
| Desktop app (Electron/Tauri) | Native feel | Large build/release pipeline for a small tool |

The static approach covers "on my laptop" (PWA, works offline) and "deploy wherever"
(it is just HTML/JS/CSS files, so any static host works). If heavy features are needed
later, a Tauri wrapper or WebAssembly tools can be added without rewriting the core.

## 3. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript | Type safety, good tooling |
| Build tool | [Vite](https://vitejs.dev) | Fast dev server, simple static build |
| UI | React (or Svelte) + Tailwind CSS | Small component set, quick styling |
| PDF editing | [`pdf-lib`](https://pdf-lib.js.org) | Create, merge, split, rotate, embed PNG/JPG, all in-browser |
| PDF preview/thumbnails | [`pdfjs-dist`](https://github.com/mozilla/pdf.js) | Render pages for previews and PDF→image export |
| Drag-and-drop reordering | `@dnd-kit` | Reorder files and pages |
| Zip downloads | `fflate` | Bundle multi-file outputs (e.g. split pages) |
| Offline/installable | `vite-plugin-pwa` | Service worker and manifest |
| Tests | Vitest (unit) + Playwright (end-to-end) | Fast, runs in CI |
| Lint/format | ESLint + Prettier | Consistent code |

## 4. Features

### MVP (v0.1)
1. **Images → PDF**: PNG/JPG to PDF, one image per page. Options: page size
   (fit to image / A4 / Letter), margins, orientation. Drag to reorder.
2. **Merge PDFs**: combine several PDFs, drag to reorder files.
3. **Split PDF**: extract a page range (e.g. `1-3,7`) or split every page into its own file (zip).
4. **Rotate pages**: rotate all or selected pages by 90°/180°.

### v0.2
5. **Reorder / delete pages**: thumbnail grid with drag-and-drop.
6. **PDF → images**: export pages as PNG/JPG (via pdf.js), zipped.
7. **Edit metadata**: title, author, subject; option to remove metadata.
8. **Page numbers / text watermark**.

### Later (optional)
9. **Compress PDF**: re-render images at lower quality, or use a WASM build of qpdf/Ghostscript.
10. **Password protect / unlock** (qpdf-wasm).
11. **OCR** (tesseract.js) to make scanned PDFs searchable.
12. **Desktop wrapper** with Tauri, if a native app becomes worthwhile.

## 5. User interface

One page with a tool picker and a shared workspace:

```
┌─────────────────────────────────────────────────────────────┐
│  📄 PDF Utilities                         [🌙]  [GitHub ↗]   │
├──────────────┬──────────────────────────────────────────────┤
│ Tools        │  Images → PDF                                │
│              │                                              │
│ ▸ Images→PDF │  ┌────────────────────────────────────────┐  │
│   Merge      │  │   Drop PNG / JPG files here            │  │
│   Split      │  │   or click to browse                   │  │
│   Rotate     │  └────────────────────────────────────────┘  │
│   Reorder    │                                              │
│   PDF→Images │  [img1] [img2] [img3]   ← drag to reorder     │
│   Metadata   │                                              │
│              │  Page size: (•) Fit  ( ) A4  ( ) Letter      │
│              │  Margin:    [ 0 mm ]                         │
│              │                                              │
│              │              [ Create PDF ⬇ ]                │
├──────────────┴──────────────────────────────────────────────┤
│  🔒 Your files are processed locally and never uploaded.    │
└─────────────────────────────────────────────────────────────┘
```

- Sidebar on desktop, collapses to a top menu on narrow screens.
- Each tool follows the same flow: **drop files → adjust options → process → download**.
- Light/dark mode follows the system setting.
- The URL hash selects the tool (`#/merge`), so tools can be bookmarked.

## 6. Repository layout

```
pdf-utilities/
├── .github/
│   └── workflows/
│       ├── ci.yml            # lint, typecheck, test on every push/PR
│       └── deploy.yml        # build and publish to GitHub Pages on main
├── public/
│   ├── icons/                # PWA icons
│   └── favicon.svg
├── src/
│   ├── core/                 # pure PDF logic, no UI; unit tested
│   │   ├── imagesToPdf.ts
│   │   ├── merge.ts
│   │   ├── split.ts
│   │   ├── rotate.ts
│   │   ├── pageRanges.ts     # parses "1-3,7"
│   │   └── download.ts       # Blob/zip helpers
│   ├── components/           # Dropzone, FileList, PageGrid, ToolLayout…
│   ├── tools/                # one screen per tool, wired to core/
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── unit/                 # Vitest tests for core/
│   ├── e2e/                  # Playwright tests (drop file → download)
│   └── fixtures/             # sample.pdf, sample.png
├── Dockerfile                # nginx serving dist/ (self-hosting)
├── index.html
├── package.json
├── vite.config.ts
├── LICENSE                   # MIT
├── README.md
└── PLAN.md
```

Keeping `src/core/` free of UI code makes it easy to test, and lets a CLI
(Node) or a Tauri app reuse it later.

## 7. Deployment

The build output (`dist/`) is plain static files, so it can go anywhere:

| Target | How | Use case |
|---|---|---|
| **GitHub Pages** (primary) | `deploy.yml` builds on push to `main` and publishes to `https://ngarciar24.github.io/pdf-utilities/` | Public, free, zero maintenance |
| **Install on laptop** | Open the site → browser "Install app" button (PWA) | Desktop icon, works offline |
| **Run locally** | `npm install && npm run dev`, or `npx serve dist` | Development, or no internet |
| **Docker** | `docker run -p 8080:80 ghcr.io/ngarciar24/pdf-utilities` | Home server, university server, any VPS |
| **Netlify / Vercel / Cloudflare Pages** | Connect repo; build `npm run build`, output `dist` | Alternative hosting, preview deploys for PRs |

Note: set Vite `base: '/pdf-utilities/'` for GitHub Pages (project sites live under a sub-path).

## 8. CI/CD

- **`ci.yml`**: on every push and PR, run `npm ci`, `lint`, `typecheck`, `test`, `build`.
- **`deploy.yml`**: on push to `main`, build and deploy to GitHub Pages using
  `actions/upload-pages-artifact` and `actions/deploy-pages`.
- Optional: on tag `v*`, build and push the Docker image to GitHub Container Registry.

## 9. Milestones

| # | Milestone | Deliverable |
|---|---|---|
| 1 | **Scaffold** | Vite + React + TS + Tailwind, lint/test setup, CI, empty app deployed to GitHub Pages |
| 2 | **Images → PDF** | First tool working end to end, with unit and e2e tests |
| 3 | **Merge + Split + Rotate** | MVP complete → tag `v0.1.0` |
| 4 | **PWA + Docker** | Installable, works offline, self-host image |
| 5 | **Page editor, PDF→Images, Metadata** | `v0.2.0` |
| 6 | **Extras** | Compress, password, OCR, as needed |

### Progress

- [ ] 1. Scaffold: done and CI green, **except** the GitHub Pages deploy, which fails until Pages is enabled in the repo settings (see README → Status)
- [x] 2. Images → PDF
- [x] 3. Merge, Split, Rotate (known limitations listed in README → Status)
- [ ] 4. PWA and Docker: code written, but install/offline and the Docker image are untested
- [ ] 5. v0.2: PDF → Images ✅ and Paste image ✅ (added on request) are done; page editor and metadata are not
- [ ] 6. Extras

## 10. Open questions

- **UI framework**: React (larger ecosystem) or Svelte (smaller bundle, less code)? Decided: React.
- **License**: MIT (decided).
- **Name**: keep `pdf-utilities`, or choose a catchier name for the deployed site?
- **Large files**: browsers handle files of a few hundred MB fine; a size warning is enough for now.
