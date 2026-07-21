import { readFileSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const bundlePath = join(__dirname, '..', 'functions', 'api', '_server.js')

try {
  const stats = statSync(bundlePath)
  const sizeKB = (stats.size / 1024).toFixed(2)
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2)

  console.log('\n📦 Bundle 体积报告')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`文件: functions/api/_server.js`)
  console.log(`大小: ${sizeKB} KB (${sizeMB} MB)`)

  if (stats.size > 1024 * 1024) {
    console.log('⚠️  警告: Bundle 超过 1MB，建议检查依赖')
  } else if (stats.size > 500 * 1024) {
    console.log('💡 提示: Bundle 超过 500KB，可考虑优化')
  } else {
    console.log('✅ Bundle 体积正常')
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
} catch (err) {
  console.error('无法读取 bundle 文件，请先运行 npm run server:build')
}
