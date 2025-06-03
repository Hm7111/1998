import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    {
      name: 'copy-redirects',
      closeBundle() {
        // Ensure _redirects file is copied with correct permissions
        const publicRedirects = path.resolve(__dirname, 'public', '_redirects');
        const distRedirects = path.resolve(__dirname, 'dist', '_redirects');
        
        if (fs.existsSync(publicRedirects)) {
          try {
            fs.copyFileSync(publicRedirects, distRedirects);
            // Make sure file has appropriate permissions
            fs.chmodSync(distRedirects, 0o644);
            console.log('✅ _redirects file copied successfully');
          } catch (error) {
            console.error('⚠️ Error copying _redirects file:', error);
          }
        }
      }
    }
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tinymce/tinymce-react',
      'tinymce/tinymce',
      'zustand',
      'framer-motion',
      'html2canvas',
      'jspdf'
    ],
    exclude: [],
  },
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'tinymce/plugins': path.resolve(__dirname, 'node_modules/tinymce/plugins')
    }
  },
  server: {
    hmr: {
      overlay: true,
    },
  },
  css: {
    devSourcemap: true,
  },
  preview: {
    port: 5000,
    strictPort: false,
  },
})
