import { Suspense, lazy, useEffect, useState, type ComponentType } from 'react'

// Tools load on demand so the page shell appears before pdf-lib is downloaded.
const ImagesToPdfTool = lazy(() => import('./tools/ImagesToPdfTool').then((m) => ({ default: m.ImagesToPdfTool })))
const MergeTool = lazy(() => import('./tools/MergeTool').then((m) => ({ default: m.MergeTool })))
const SplitTool = lazy(() => import('./tools/SplitTool').then((m) => ({ default: m.SplitTool })))
const RotateTool = lazy(() => import('./tools/RotateTool').then((m) => ({ default: m.RotateTool })))
const PdfToImagesTool = lazy(() => import('./tools/PdfToImagesTool').then((m) => ({ default: m.PdfToImagesTool })))
const GifTool = lazy(() => import('./tools/GifTool').then((m) => ({ default: m.GifTool })))
const PasteImageTool = lazy(() => import('./tools/PasteImageTool').then((m) => ({ default: m.PasteImageTool })))

interface Tool {
  id: string
  name: string
  component: ComponentType
}

const TOOLS: Tool[] = [
  { id: 'images-to-pdf', name: 'Images → PDF', component: ImagesToPdfTool },
  { id: 'pdf-to-images', name: 'PDF → Images', component: PdfToImagesTool },
  { id: 'merge', name: 'Merge', component: MergeTool },
  { id: 'split', name: 'Split', component: SplitTool },
  { id: 'rotate', name: 'Rotate', component: RotateTool },
  { id: 'paste-image', name: 'Paste image', component: PasteImageTool },
  { id: 'gif', name: 'Make a GIF', component: GifTool },
]

const REPO_URL = 'https://github.com/ngarciar24/pdf-utilities'

function toolFromHash(): Tool {
  const id = window.location.hash.replace(/^#\/?/, '')
  return TOOLS.find((t) => t.id === id) ?? TOOLS[0]
}

export function App() {
  const [tool, setTool] = useState(toolFromHash)

  useEffect(() => {
    const onHashChange = () => setTool(toolFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    document.title = `${tool.name} · PDF Utilities`
  }, [tool])

  const Active = tool.component

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-8 w-8" />
          <h1 className="text-lg font-bold">PDF Utilities</h1>
          <a
            href={REPO_URL}
            className="ml-auto text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            GitHub ↗
          </a>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
        <nav aria-label="Tools" className="border-b border-slate-200 p-3 md:w-52 md:border-r md:border-b-0 dark:border-slate-800">
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {TOOLS.map((t) => (
              <li key={t.id}>
                <a
                  href={`#/${t.id}`}
                  aria-current={t.id === tool.id ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm whitespace-nowrap ${
                    t.id === tool.id
                      ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-100'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                  }`}
                >
                  {t.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 p-4 md:p-8">
          {/* key resets the tool's state when switching tools */}
          <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
            <Active key={tool.id} />
          </Suspense>
        </main>
      </div>

      <footer className="border-t border-slate-200 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        🔒 Your files are processed locally in your browser and never uploaded.
      </footer>
    </div>
  )
}
