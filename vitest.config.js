import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.js'],
    // 允许 client/src 下的 .test.js 被执行；仅排除 client 构建产物与 node_modules
    exclude: [
      '**/node_modules/**',
      'functions/**',
      'dist/**',
      'client/dist/**',
      'client/node_modules/**'
    ]
  }
})
