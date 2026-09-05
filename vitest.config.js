import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
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
    // Explicit projects replace deprecated environmentMatchGlobs; never run a test twice.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['**/*.test.js', 'lib/**/*.test.ts'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '.cache/**',
            '.next/**',
            '.open-next/**',
            'client/src/components/**/*.test.js',
            'lib/ai-context.test.ts'
          ]
        }
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: [
            'client/src/components/**/*.test.js',
            'components/**/*.test.tsx',
            'app/**/*.test.tsx',
            'lib/ai-context.test.ts'
          ],
          exclude: ['**/node_modules/**', '**/dist/**', '.cache/**', '.next/**', '.open-next/**']
        }
      }
    ]
  }
})
