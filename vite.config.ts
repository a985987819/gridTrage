import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// 项目名称，对应GitHub仓库名
const GITHUB_REPO_NAME = 'grid-trade'; // Updated to match the actual repository name

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? `/${GITHUB_REPO_NAME}/` : '/',
  resolve: {
    // 显式指定 react 路径，解决解析问题
    alias: {
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'react-router-dom'],
  }, // 新增：关闭 TS 类型校验（关键）
  esbuild: {
    tsconfigRaw: '{}' // 忽略 tsconfig.json 的类型规则
  },
  // Additional configurations for GitHub Pages
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
        }
      }
    }
  }
});
