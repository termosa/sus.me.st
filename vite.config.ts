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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
