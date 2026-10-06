import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isFdroidBuild = process.env.F_DROID_BUILD === 'true';
  return {
    base: './',
    define: {
      __BLUENOTE_FDROID_BUILD__: JSON.stringify(isFdroidBuild),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        ...(isFdroidBuild
          ? [
              {
                find: /(^|\\/)firebase$/,
                replacement: path.resolve(__dirname, 'src/firebase.foss.ts'),
              },
            ]
          : []),
        { find: '@', replacement: path.resolve(__dirname, '.') },
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
