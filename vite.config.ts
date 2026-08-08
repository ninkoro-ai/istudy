import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'AI Exam OS',
        short_name: 'AI Exam OS',
        description: '本地优先 AI 个性化考试学习系统',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF7F5',
        theme_color: '#FF6B8A',
        start_url: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg,png}']
      }
    })
  ],
  resolve: {
    alias: { '@': srcDir }
  }
});
