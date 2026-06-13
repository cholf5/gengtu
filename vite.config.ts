import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { memeManifestPlugin } from './vite-plugin-meme-manifest';

export default defineConfig(({ mode }) => ({
  plugins: [react(), memeManifestPlugin()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
  },
}));
