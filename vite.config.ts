import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      // A new version waits until the host applies it between games (docs/tech.md §5).
      registerType: 'prompt',
      pwaAssets: { config: true },
      manifest: {
        name: 'sus.me.st — Mafia host',
        short_name: 'Mafia host',
        description: 'Host panel for a game of sport mafia',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0b0b10',
        theme_color: '#0b0b10',
      },
      workbox: {
        // The built-in night music is precached too, so it plays offline. No webmanifest:
        // the plugin adds it itself, and a second entry makes Workbox cache nothing.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,mp3}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
