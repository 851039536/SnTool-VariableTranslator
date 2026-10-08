import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue()
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/variables.scss" as *;\n`
      }
    }
  },
  build: {
    cssCodeSplit: false,
    // 注意：不再使用 vite-plugin-singlefile。
    // 单文件构建会把动态 import() 一并内联，导致词典懒加载失效
    // （实测：动态 import + singlefile 产物仍是单个 561KB HTML）。
    // 改为多文件产物后，词典独立成 chunk，仅在首次查词时加载。
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // 让词典 chunk 有稳定、可辨识的文件名，便于确认懒加载生效
        manualChunks(id) {
          if (id.includes('dictionaries/words.json')) return 'dict';
          return undefined;
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    }
  }
});
