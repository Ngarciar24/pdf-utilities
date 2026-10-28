import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { GifReader } from 'omggif'

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url))

/** Waits for the preview to finish, downloads the GIF and decodes it. */
async function downloadGif(page: Page) {
  const button = page.getByRole('button', { name: 'Download GIF' })
  await expect(button).toBeEnabled({ timeout: 20_000 })
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()])
  const gif = new GifReader(new Uint8Array(await readFile(await download.path())))
  const delays = [...Array(gif.numFrames()).keys()].map((i) => gif.frameInfo(i).delay * 10)
  return { name: download.suggestedFilename(), gif, delays }
}

test('makes a looping GIF from images and PDF pages', async ({ page }) => {
  await page.goto('/#/gif')
  await page
    .locator('input[type=file]')
    .setInputFiles([fixture('landscape.png'), fixture('portrait.jpg'), fixture('sample.pdf')])
  const list = page.getByRole('list', { name: 'Files, in output order' })
  await expect(list.getByRole('listitem')).toHaveCount(5)
  await expect(list.getByText('sample – page 3')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Animated preview of the GIF' })).toBeVisible({ timeout: 20_000 })

  const { name, gif, delays } = await downloadGif(page)
  expect(name).toBe('landscape.gif')
  expect([gif.width, gif.height]).toEqual([480, 360]) // shape of the first image
  expect(gif.loopCount()).toBe(0) // forever
  expect(delays).toEqual([500, 500, 500, 500, 500])
})

test('applies speed, direction, repeat, pause and width', async ({ page }) => {
  await page.goto('/#/gif')
  await page.locator('input[type=file]').setInputFiles([fixture('sample.pdf')])
  await expect(page.getByRole('list', { name: 'Files, in output order' }).getByRole('listitem')).toHaveCount(3)

  await page.getByLabel('Time per image').fill('9') // 1 s
  await expect(page.getByText('per image')).toContainText('1 s')
  await page.getByText('Back and forth').click()
  await page.getByText('2 s', { exact: true }).click()
  await page.getByText('320 px').click()

  let result = await downloadGif(page)
  expect(result.delays).toEqual([1000, 1000, 1000, 3000]) // pages 1 2 3 2, pause on the last
  expect(result.gif.width).toBe(320)
  expect(result.gif.loopCount()).toBe(0)

  await page.getByText('Play once').click()
  result = await downloadGif(page)
  expect(result.delays).toEqual([1000, 1000, 1000, 1000, 1000]) // 1 2 3 2 1, no pause
  expect(result.gif.loopCount()).toBeNull() // plays once
})

test('adds fade frames between images', async ({ page }) => {
  await page.goto('/#/gif')
  await page.locator('input[type=file]').setInputFiles([fixture('landscape.png'), fixture('portrait.jpg')])
  await page.getByText('Quick fade').click()
  await expect(page.getByLabel('Preview')).toContainText('8 frames') // 2 images + 3 fade frames each way
  const { delays } = await downloadGif(page)
  expect(delays).toEqual([500, 40, 40, 40, 500, 40, 40, 40])
})

test('reorders and removes frames', async ({ page }) => {
  await page.goto('/#/gif')
  await page.locator('input[type=file]').setInputFiles([fixture('landscape.png'), fixture('portrait.jpg')])
  await page.getByRole('button', { name: 'Move portrait.jpg earlier' }).click()
  const first = await downloadGif(page)
  expect([first.gif.width, first.gif.height]).toEqual([480, 640]) // portrait is now first and sets the shape

  await page.getByRole('button', { name: 'Remove landscape.png' }).click()
  const second = await downloadGif(page)
  expect(second.gif.numFrames()).toBe(1)
})

test('accepts pasted images and rejects other files', async ({ page }) => {
  await page.goto('/#/gif')
  await page.locator('main h2').waitFor()
  const data = [...(await readFile(fixture('landscape.png')))]
  await page.evaluate((data) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([new Uint8Array(data)], 'image.png', { type: 'image/png' }))
    transfer.items.add(new File(['hi'], 'notes.txt', { type: 'text/plain' }))
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true }))
  }, data)
  await expect(page.getByRole('list', { name: 'Files, in output order' }).getByRole('listitem')).toHaveCount(1)
  await expect(page.getByRole('alert')).toContainText('notes.txt is not an image or PDF')
})
