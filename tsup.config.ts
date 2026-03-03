// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  publicDir: false,
  external: ['react', 'react-dom'],
  async onSuccess() {
    const { copyFileSync } = await import('fs');
    copyFileSync('src/styles.css', 'dist/styles.css');
  },
});