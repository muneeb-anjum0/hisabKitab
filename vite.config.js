import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const nativeOnlyAssets = [
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'manifest.webmanifest',
  'sw.js',
];

const trimNativeBundle = () => ({
  name: 'trim-native-bundle',
  transformIndexHtml: (html) =>
    html
      .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
      .replace(/\s*<link rel="manifest"[^>]*>/, ''),
  closeBundle() {
    nativeOnlyAssets.forEach((asset) => rmSync(resolve('dist', asset), { force: true }));
  },
});

export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === 'android' && trimNativeBundle()].filter(Boolean),
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/firebase/') || id.includes('@firebase')) return 'firebase';
          if (id.includes('@capacitor')) return 'capacitor';
          if (id.includes('@dnd-kit')) return 'drag-and-drop';
          if (id.includes('react')) return 'react';
          return 'vendor';
        },
      },
    },
  },
}));
