# PDF Utilities

Quick, private PDF tools that run entirely in your browser. Nothing is uploaded: your files never leave your computer.

**Live app:** https://ngarciar24.github.io/pdf-utilities/ (⚠️ not online yet, see [Status](#status))

| Tool | What it does |
|---|---|
| **Images → PDF** | PNG, JPG, WebP, GIF… to a PDF, one image per page. Page size (fit / A4 / Letter), orientation, margins, drag to reorder. Images can also be pasted with Ctrl+V. |
| **PDF → Images** | Save all or selected pages as PNG or JPG at 72, 150 or 300 dpi. One page downloads as an image, several as a zip. |
| **Merge** | Combine several PDFs into one, in the order you choose. |
| **Split** | Extract pages (`1-3, 7, 10-`) into a new PDF, or split every page into its own file (zip). |
| **Rotate** | Rotate all or selected pages by 90°, 180° or 270°. |
| **Paste image** | Paste a screenshot or copied image (Ctrl+V, or the paste button) and download it as PNG, JPG or its original format. Several pastes download as a zip or one PDF. |

## Status

Last checked: 2026-10-13.

### Live site: not online yet

https://ngarciar24.github.io/pdf-utilities/ returns **404**. The app builds and its tests pass; nothing has been published yet.

**Why:** the first *Deploy to GitHub Pages* run failed at the `actions/configure-pages` step with
`Get Pages site failed ... Not Found`. GitHub Pages is not enabled for the repository, so there is nowhere to deploy to.

**Fix (one time, needs repo admin):**

1. *Settings → Pages → Build and deployment → Source:* choose **GitHub Actions**.
2. *Actions → Deploy to GitHub Pages →* open the failed run and click **Re-run all jobs** (or use **Run workflow** on `main`).
3. When the run is green, the site is live at the URL above, usually within a minute.

### What works

Checked by automated tests: 25 unit tests, plus 15 browser tests that drive the real app in Chromium and open the downloaded files.

| Feature | Status |
|---|---|
| Images → PDF: PNG and JPG, one image per page | ✅ Works |
| Images → PDF: page size (fit / A4 / Letter), orientation, margins | ✅ Works |
| Images → PDF: WebP, GIF, BMP and other formats | ✅ Works if your browser can display the format (converted to PNG first) |
| Images → PDF: paste images with Ctrl+V | ✅ Works |
| PDF → Images: all or selected pages, PNG or JPG, 72 / 150 / 300 dpi | ✅ Works; tests check the image size and that the page's text is drawn |
| PDF → Images: PDFs with only an *owner* password (copy/print restrictions) | ✅ Works (Merge, Split and Rotate still refuse these) |
| PDF → Images: scanned PDFs with JPEG 2000 images | ✅ Works (checked by hand with a test PDF) |
| Paste image: Ctrl+V, download as PNG / JPG / original format | ✅ Works |
| Paste image: "click here to paste" button | ✅ Works in Chromium after allowing clipboard access |
| Paste image: several pastes as a zip, or as one PDF | ✅ Works |
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
| **Password-protected PDFs** | PDFs that need a password to open are refused by every tool. PDFs with only an *owner* password (copy/print restrictions) work in PDF → Images, but Merge, Split and Rotate refuse them with "is password-protected and can't be opened". |
| **Fillable forms** after Merge or Split | Form fields are lost from the output; they are no longer fillable. Rotate keeps them. |
| **Bookmarks** (the outline sidebar) after Merge or Split | Not kept. |
| **Document info** (title, author, subject) after Merge or Split | Not kept. Rotate keeps it. |
| **HEIC/HEIF photos** (iPhone default) | Only work in browsers that can display HEIC (Safari). In Chrome, Edge and Firefox you get "is not an image your browser can read". Export as JPG first. |
| **Page previews** | Merge, Split, Rotate and PDF → Images show the file name and page count only, not page thumbnails. You need to know the page numbers yourself. |
| **Very large files** | Everything runs in browser memory. Files of a few hundred MB may be slow or make the tab run out of memory. There is no size warning yet. |
| **PDF → Images on long documents** | All images are kept in memory until the zip is made. Hundreds of pages at 300 dpi may make the tab run out of memory; convert in batches of selected pages instead. |
| **PDF → Images on huge pages** | Images are capped at 16,384 px per side and 100 megapixels (a browser limit). Larger pages are scaled down to fit, so the result has a lower resolution than chosen. |
| **PDF → Images offline** | Works offline for ordinary PDFs. PDFs that need extra fonts, Asian character maps or scan decoders (JBIG2 / JPEG 2000) only work offline after a PDF needing them has been opened once online. |
| **Paste image: pasting copied *files*** | Copying an image file in File Explorer / Files and pressing Ctrl+V depends on the browser and may add nothing. Drop the file onto the page instead. |
| **Paste image: the paste button outside Chromium** | Firefox and Safari may not allow it. Ctrl+V (⌘V on Mac) still works. |

### Not tested yet

These are built but nobody has checked them yet. Treat them as unknown, not as working:

- **Firefox and Safari.** The automated tests only run in Chromium (Chrome/Edge). This includes pasting and PDF → Images.
- **The browser's "Install app" step** on a real Windows or Linux desktop, and all of the Windows installation steps. Tested so far, in Chromium: after one visit, the app loads and processes PDFs with no network and with the local server stopped.
- **Docker image.** The `Dockerfile` has never been built, and no image has been published to `ghcr.io` (that only happens when a `v*` tag is pushed).
- **Netlify / Vercel / Cloudflare Pages.** Should work as described below, but have not been tried.

### Not built yet

Page editor (reorder/delete pages with thumbnails), metadata editing, page numbers and watermarks, compression, password protect/unlock, OCR. See [PLAN.md](PLAN.md).

## Installation

There are two ways to get PDF Utilities on your laptop. Both end with the same result: a **PDF Utilities** app in your Start menu (Windows) or app launcher (Linux) that opens in its own window and **works without internet**.

| | Option A: from the website | Option B: from your own computer |
|---|---|---|
| Needs | Chrome or Edge | Chrome or Edge, Git, Node.js 22+ |
| Effort | 2 clicks | ~5 minutes, a few commands |
| Available | ⚠️ Not yet: the [live site is offline](#live-site-not-online-yet) | ✅ Now |

Use Chrome or Edge. Firefox has not been tested, and as far as we know it cannot install web apps as desktop apps.

### Option A: install from the website (Windows and Linux)

> Works once the live site is online.

1. Open https://ngarciar24.github.io/pdf-utilities/ in **Chrome** or **Edge**.
2. Install it:
   - **Chrome:** click the install icon (a screen with a down arrow) at the right end of the address bar. If you don't see it, use the **⋮** menu → *Cast, save and share* → *Install page as app…*
   - **Edge:** click the install icon in the address bar, or use the **…** menu → *Apps* → *Install this site as an app*.
3. Confirm with **Install**.

Browser menus change between versions, so the labels may differ slightly.

### Option B: install from your own computer

This builds the app from the source code, serves it on `http://localhost:4173`, and then installs it from there. **After installing, you can stop the local server**: the app keeps working because the browser stores a copy (checked in Chromium).

#### Windows

> These Windows steps have not been tested yet. Please report anything that doesn't match.

1. Open **PowerShell** (Start menu → type "PowerShell").
2. Install Git and Node.js (skip any you already have):
   ```powershell
   winget install --id Git.Git -e
   winget install --id OpenJS.NodeJS.LTS -e
   ```
   Close and reopen PowerShell, then check: `node -v` should print `v22` or higher.
3. Download and start the app:
   ```powershell
   git clone https://github.com/Ngarciar24/pdf-utilities.git
   cd pdf-utilities
   npm ci
   npm start
   ```
   Your browser opens at http://localhost:4173. If it doesn't, open that address yourself in Chrome or Edge.
4. Install it as an app, following step 2 of [Option A](#option-a-install-from-the-website-windows-and-linux).
5. Go back to PowerShell and press **Ctrl+C** to stop the server. Start the app from the Start menu from now on.

#### Linux

> Tested on Linux: a fresh clone, `npm ci` and `npm start` serve the app. The final install click needs a desktop session and has not been tested.

1. Install Git and Node.js 22+ (skip any you already have):
   - **Ubuntu / Debian:** the `nodejs` package from `apt` is often too old. Install Node through [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) instead, then run `nvm install 22`. Git: `sudo apt install git`.
   - **Fedora:** `sudo dnf install git nodejs`
   - **Arch:** `sudo pacman -S git nodejs npm`

   Check with `node -v`: it should print `v22` or higher.
2. Download and start the app:
   ```sh
   git clone https://github.com/Ngarciar24/pdf-utilities.git
   cd pdf-utilities
   npm ci
   npm start
   ```
   Your browser opens at http://localhost:4173. If it doesn't, open that address yourself in Chrome or Edge.
3. Install it as an app, following step 2 of [Option A](#option-a-install-from-the-website-windows-and-linux). Chrome and Edge add it to your app launcher.
4. Press **Ctrl+C** in the terminal to stop the server. Start the app from your launcher from now on.

#### Updating (Option B)

The installed app does not update itself, because it only checks for updates when the local server is running. To update:

```sh
cd pdf-utilities
git pull
npm ci
npm start
```

Open the installed app once while the server is running. It downloads the new version and switches to it, either by reloading itself or the next time you open it. Then stop the server with **Ctrl+C**. (This update path has not been tested yet.)

With Option A, updates arrive automatically the next time you open the app while online.

### Uninstall

- **The app:** open it, click the **⋮** (Chrome) or **…** (Edge) menu in its title bar → *Uninstall PDF Utilities*. Or go to `chrome://apps` or `edge://apps` and remove it there.
- **The source code (Option B):** delete the `pdf-utilities` folder.

Note: clearing your browser's site data for the app also removes its stored copy. It then needs the server (Option B) or the internet (Option A) once more.

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

Requires Node.js 22+.

```sh
npm ci             # install dependencies
npm run dev        # development server with live reload at http://localhost:5173
npm start          # production build, served at http://localhost:4173
npm run build      # production build in dist/
npm run preview    # serve an existing build
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
