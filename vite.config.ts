/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { pdfjsAssets } from './pdfjsAssets.ts'

// GitHub Pages serves project sites under /<repo>/. Set BASE_PATH=/ for other hosts.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    pdfjsAssets(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // Include .mjs so the pdf.js worker is available offline.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png}'],
        // pdf.js fonts, character maps and decoders are cached the first time a PDF needs them.
        globIgnores: ['pdfjs/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/pdfjs/'),
            handler: 'CacheFirst',
            options: { cacheName: 'pdfjs-assets', expiration: { maxEntries: 400 } },
          },
        ],
      },
      manifest: {
        name: 'PDF Utilities',
        short_name: 'PDF Utils',
        description: 'Quick, private PDF tools that run entirely in your browser.',
        theme_color: '#dc2626',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  build: {
    // pdf-lib (~500 kB) and pdf.js (~450 kB) are each loaded lazily by the tools that need them.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
