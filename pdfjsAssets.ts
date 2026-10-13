import { createReadStream, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, sep } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Serves and bundles the runtime files pdf.js loads on demand: character maps
 * (CJK text), standard fonts (PDFs that don't embed their fonts) and the
 * decoders for JBIG2 / JPEG 2000 images, which scanned PDFs often use.
 * They are published under `<base>pdfjs/`.
 */
const DIRS = ['cmaps', 'standard_fonts', 'wasm']
// The JavaScript sandbox for PDF scripting is not used.
const SKIP = /^quickjs/

const root = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'))

function listFiles(): string[] {
  const files: string[] = []
  for (const dir of DIRS) {
    for (const name of readdirSync(join(root, dir))) {
      if (SKIP.test(name) || name.startsWith('LICENSE')) continue
      if (statSync(join(root, dir, name)).isFile()) files.push(`${dir}/${name}`)
    }
  }
  return files
}

export function pdfjsAssets(): Plugin {
  return {
    name: 'pdfjs-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const prefix = `${server.config.base}pdfjs/`
        const path = req.url?.split('?')[0]
        if (!path?.startsWith(prefix)) return next()
        const file = join(root, path.slice(prefix.length))
        const rel = relative(root, file)
        if (rel.startsWith('..') || !DIRS.includes(rel.split(sep)[0]) || !statSync(file, { throwIfNoEntry: false })?.isFile()) {
          return next()
        }
        if (file.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm')
        createReadStream(file).pipe(res)
      })
    },
    generateBundle() {
      for (const file of listFiles()) {
        this.emitFile({ type: 'asset', fileName: `pdfjs/${file}`, source: readFileSync(join(root, file)) })
      }
    },
  }
}
