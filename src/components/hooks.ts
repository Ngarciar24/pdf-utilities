import { useEffect, useRef } from 'react'

/** Revokes object URLs once they are no longer in the list, and all of them on unmount. */
export function useRevokeUnusedUrls(urls: string[]) {
  const previous = useRef(new Set<string>())
  const key = urls.join('\n')
  useEffect(() => {
    const current = new Set(key ? key.split('\n') : [])
    for (const url of previous.current) if (!current.has(url)) URL.revokeObjectURL(url)
    previous.current = current
  }, [key])
  useEffect(() => () => previous.current.forEach((url) => URL.revokeObjectURL(url)), [])
}

/**
 * Calls `onFiles` with the files pasted anywhere on the page (Ctrl+V / Cmd+V).
 * Text pastes are left alone, so typing in inputs keeps working.
 */
export function usePastedFiles(onFiles: (files: File[]) => void) {
  const handler = useRef(onFiles)
  useEffect(() => {
    handler.current = onFiles
  })
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const files = [...(event.clipboardData?.files ?? [])]
      if (files.length === 0) return
      event.preventDefault()
      handler.current(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])
}
