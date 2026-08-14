import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 统一 vue 运行时到根目录的单一副本：
      // @vue/test-utils（根依赖）解析的是根 node_modules 里的 vue（peer 自动安装），
      // 而 client 源码解析的是 client/node_modules 里的 vue —— 两者会形成双实例，
      // 导致挂载后的响应式更新（v-if 切换、watch）全部失效；
      // 此处把测试环境内所有 vue 导入强制指向根目录副本
      vue: fileURLToPath(
        new URL('./node_modules/vue/dist/vue.runtime.esm-bundler.js', import.meta.url)
      )
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.js'],
    // 组件测试需要 DOM 环境，其余（纯函数/后端）保持 node 环境
    environmentMatchGlobs: [['client/src/components/**/*.test.js', 'jsdom']],
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
