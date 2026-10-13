import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test, type Download, type Page } from '@playwright/test'
import { unzipSync } from 'fflate'
import { PDFDocument } from 'pdf-lib'

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url))

async function downloaded(download: Download): Promise<Uint8Array> {
  return new Uint8Array(await readFile(await download.path()))
}

async function clickAndDownload(page: Page, button: string): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: button, exact: true }).click(),
  ])
  return download
}

/** Decodes an image in the browser and reports its size and how much of it is dark (i.e. text). */
async function inspectImage(page: Page, bytes: Uint8Array, type: string) {
  return page.evaluate(
    async ({ data, type }) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)], { type }))
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(bitmap, 0, 0)
      const pixels = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data
      let dark = 0
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 128 && pixels[i + 3] > 0) dark++
      return { width: bitmap.width, height: bitmap.height, dark }
    },
    { data: [...bytes], type },
  )
}

/** Simulates Ctrl+V with the given files on the clipboard. */
async function pasteFiles(page: Page, files: { name: string; type: string; path: string }[]) {
  // Tools load lazily; wait until one is on screen so its paste listener exists.
  await page.locator('main h2').waitFor()
  const payload = await Promise.all(
    files.map(async (f) => ({ ...f, data: [...(await readFile(f.path))] })),
  )
  await page.evaluate((files) => {
    const transfer = new DataTransfer()
    for (const f of files) transfer.items.add(new File([new Uint8Array(f.data)], f.name, { type: f.type }))
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true }))
  }, payload)
}

test.describe('PDF → Images', () => {
  test('converts all pages to PNG images in a zip', async ({ page }) => {
    await page.goto('/#/pdf-to-images')
    await page.locator('input[type=file]').setInputFiles(fixture('sample.pdf'))
    await expect(page.getByText('3 pages')).toBeVisible()
    await page.getByText('Screen (72 dpi)').click()

    const zip = await clickAndDownload(page, 'Convert to images')
    expect(zip.suggestedFilename()).toBe('sample (images).zip')
    const files = unzipSync(await downloaded(zip))
    expect(Object.keys(files).sort()).toEqual(['sample - page 1.png', 'sample - page 2.png', 'sample - page 3.png'])

    const image = await inspectImage(page, files['sample - page 2.png'], 'image/png')
    expect(image).toMatchObject({ width: 595, height: 842 })
    expect(image.dark).toBeGreaterThan(200) // the page's text was rendered
  })

  test('saves a single selected page as a JPG at 150 dpi', async ({ page }) => {
    await page.goto('/#/pdf-to-images')
    await page.locator('input[type=file]').setInputFiles(fixture('sample.pdf'))
    await page.getByText('JPG', { exact: true }).click()
    await page.getByText('Selected pages').click()
    await page.getByLabel('Pages to convert').fill('3')

    const file = await clickAndDownload(page, 'Convert to images')
    expect(file.suggestedFilename()).toBe('sample - page 3.jpg')
    const image = await inspectImage(page, await downloaded(file), 'image/jpeg')
    expect(image).toMatchObject({ width: 1239, height: 1754 })
    expect(image.dark).toBeGreaterThan(200)
  })

  test('opens PDFs that only have an owner password', async ({ page }) => {
    await page.goto('/#/pdf-to-images')
    await page.locator('input[type=file]').setInputFiles(fixture('owner-password.pdf'))
    await expect(page.getByText('3 pages')).toBeVisible()
  })

  test('explains when a PDF needs a password to open', async ({ page }) => {
    await page.goto('/#/pdf-to-images')
    await page.locator('input[type=file]').setInputFiles(fixture('user-password.pdf'))
    await expect(page.getByRole('alert')).toContainText('password-protected')
  })
})

test.describe('Paste image', () => {
  test('pastes with Ctrl+V and downloads as PNG or JPG', async ({ page }) => {
    await page.goto('/#/paste-image')
    await pasteFiles(page, [{ name: 'image.png', type: 'image/png', path: fixture('landscape.png') }])
    const list = page.getByRole('list', { name: 'Files, in output order' })
    await expect(list.getByRole('listitem')).toHaveCount(1)
    await expect(list.getByText(/^Pasted image \d{4}-\d\d-\d\d \d\d\.\d\d\.\d\d\.png$/)).toBeVisible()

    const png = await clickAndDownload(page, 'Download image')
    expect(png.suggestedFilename()).toMatch(/^Pasted image .*\.png$/)
    expect(await inspectImage(page, await downloaded(png), 'image/png')).toMatchObject({ width: 400, height: 300 })

    await page.getByText('JPG', { exact: true }).click()
    const jpg = await clickAndDownload(page, 'Download image')
    expect(jpg.suggestedFilename()).toMatch(/^Pasted image .*\.jpg$/)
    expect(await inspectImage(page, await downloaded(jpg), 'image/jpeg')).toMatchObject({ width: 400, height: 300 })
  })

  test('collects several pastes into a zip or a PDF', async ({ page }) => {
    await page.goto('/#/paste-image')
    await pasteFiles(page, [{ name: 'image.png', type: 'image/png', path: fixture('landscape.png') }])
    await pasteFiles(page, [{ name: 'photo.jpg', type: 'image/jpeg', path: fixture('portrait.jpg') }])
    await expect(page.getByText('photo.jpg')).toBeVisible()

    const zip = await clickAndDownload(page, 'Download 2 images (zip)')
    const names = Object.keys(unzipSync(await downloaded(zip)))
    expect(names).toHaveLength(2)
    expect(names).toContain('photo.png')

    const pdf = await clickAndDownload(page, 'Save as PDF')
    expect((await PDFDocument.load(await downloaded(pdf))).getPageCount()).toBe(2)
  })

  test('pastes from the clipboard with the button', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Clipboard permissions are Chromium-specific')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/#/paste-image')
    const data = [...(await readFile(fixture('landscape.png')))]
    await page.evaluate(async (data) => {
      const blob = new Blob([new Uint8Array(data)], { type: 'image/png' })
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    }, data)
    await page.getByRole('button', { name: /click here to paste/ }).click()
    await expect(page.getByRole('list', { name: 'Files, in output order' }).getByRole('listitem')).toHaveCount(1)
  })

  test('says so when the clipboard has no image', async ({ page }) => {
    await page.goto('/#/paste-image')
    await page.locator('main h2').waitFor()
    await page.evaluate(() => {
      const transfer = new DataTransfer()
      transfer.items.add(new File(['hello'], 'notes.txt', { type: 'text/plain' }))
      document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true }))
    })
    await expect(page.getByRole('alert')).toContainText('no image')
  })
})

test('Images → PDF accepts pasted images', async ({ page }) => {
  await page.goto('/#/images-to-pdf')
  await pasteFiles(page, [{ name: 'image.png', type: 'image/png', path: fixture('landscape.png') }])
  await expect(page.getByRole('list', { name: 'Files, in output order' }).getByRole('listitem')).toHaveCount(1)
  const pdf = await clickAndDownload(page, 'Create PDF')
  expect((await PDFDocument.load(await downloaded(pdf))).getPageCount()).toBe(1)
})
