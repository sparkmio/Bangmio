import { spawnSync } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const env = {
  ...process.env,
  WRANGLER_WRITE_LOGS: 'false',
  XDG_CONFIG_HOME: path.join(root, '.wrangler', 'config-home')
}
const wranglerBin = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const result = spawnSync(process.execPath, [wranglerBin, 'd1', 'execute', 'bangmio-users', '--local', '--file=server/db/schema.sql'], {
  cwd: root,
  env,
  stdio: 'inherit'
})
if (result.error) throw result.error
process.exit(result.status ?? 1)