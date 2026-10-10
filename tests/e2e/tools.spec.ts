import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test, type Download, type Page } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { unzipSync } from 'fflate'

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url))

async function downloaded(download: Download): Promise<Uint8Array> {
  return new Uint8Array(await readFile(await download.path()))
}

async function clickAndDownload(page: Page, button: string): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: button }).click(),
  ])
  return download
}

test('shows the privacy note and navigates between tools', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('never uploaded')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Images → PDF' })).toBeVisible()
  await page.getByRole('link', { name: 'Merge' }).click()
  await expect(page).toHaveURL(/#\/merge$/)
  await expect(page.getByRole('heading', { name: 'Merge PDFs' })).toBeVisible()
})

test('converts images to a PDF', async ({ page }) => {
  await page.goto('/#/images-to-pdf')
  await page.locator('input[type=file]').setInputFiles([fixture('landscape.png'), fixture('portrait.jpg')])
  await expect(page.getByRole('list', { name: 'Files, in output order' }).getByRole('listitem')).toHaveCount(2)

  // Move the JPEG first.
  await page.getByRole('button', { name: 'Move portrait.jpg earlier' }).click()
  await page.getByText('A4', { exact: true }).click()

  const download = await clickAndDownload(page, 'Create PDF')
  expect(download.suggestedFilename()).toBe('images.pdf')
  const doc = await PDFDocument.load(await downloaded(download))
  const sizes = doc.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())])
  expect(sizes).toEqual([
    [595, 842],
    [842, 595],
  ])
  await expect(page.getByText('Created images.pdf (2 pages')).toBeVisible()
})

test('merges PDFs in order', async ({ page }) => {
  await page.goto('/#/merge')
  await page.locator('input[type=file]').setInputFiles([fixture('sample.pdf')])
  await expect(page.getByRole('button', { name: 'Merge 1 PDFs' })).toBeDisabled()
  await page.locator('input[type=file]').setInputFiles([fixture('sample.pdf')])
  await expect(page.getByText('3 pages').first()).toBeVisible()

  const download = await clickAndDownload(page, 'Merge 2 PDFs')
  expect(download.suggestedFilename()).toBe('merged.pdf')
  expect((await PDFDocument.load(await downloaded(download))).getPageCount()).toBe(6)
})

test('rejects files that are not PDFs', async ({ page }) => {
  await page.goto('/#/merge')
  await page.locator('input[type=file]').setInputFiles([fixture('landscape.png')])
  await expect(page.getByRole('alert')).toContainText('landscape.png is not a PDF')
})

test('extracts pages and splits every page', async ({ page }) => {
  await page.goto('/#/split')
  await page.locator('input[type=file]').setInputFiles(fixture('sample.pdf'))
  await expect(page.getByText('3 pages')).toBeVisible()

  await page.getByLabel('Pages to extract').fill('2-3')
  const extract = await clickAndDownload(page, 'Extract pages')
  expect(extract.suggestedFilename()).toBe('sample (pages 2-3).pdf')
  expect((await PDFDocument.load(await downloaded(extract))).getPageCount()).toBe(2)

  await page.getByLabel('Pages to extract').fill('9')
  await page.getByRole('button', { name: 'Extract pages' }).click()
  await expect(page.getByRole('alert')).toContainText('does not exist')

  await page.getByText('One file per page').click()
  const zip = await clickAndDownload(page, 'Split into 3 files')
  expect(Object.keys(unzipSync(await downloaded(zip))).sort()).toEqual([
    'sample - page 1.pdf',
    'sample - page 2.pdf',
    'sample - page 3.pdf',
  ])
})

test('rotates selected pages', async ({ page }) => {
  await page.goto('/#/rotate')
  await page.locator('input[type=file]').setInputFiles(fixture('sample.pdf'))
  await page.getByText('180°').click()
  await page.getByText('Selected pages').click()
  await page.getByLabel('Pages to rotate').fill('2')

  const download = await clickAndDownload(page, 'Rotate & download')
  const doc = await PDFDocument.load(await downloaded(download))
  expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([0, 180, 0])
})
