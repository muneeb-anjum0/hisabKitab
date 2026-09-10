import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
});
