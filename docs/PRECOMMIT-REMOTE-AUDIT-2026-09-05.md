# 提交前复查与远端配置审计（2026-09-05）

本记录承接当天的治理记录，覆盖提交前补充修复和已执行的远端设置操作。**本地 commit、远端 push、生产部署是三件事，本轮不推送或部署。**

## 新发现与修复

### 1. Release 重复创建导致失败

GitHub 历史运行 `33227731658` 的 Publish GitHub Release 步骤返回 HTTP 422：同名 tag 的 Release 已存在。前面的安装、lint、测试和构建均成功，因此不能误判为构建失败或权限不足。

- 新增 `scripts/publish-release.mjs`，先查询同 tag Release，存在则保留，不覆盖现有标题、说明或发布状态。
- 仅确认 HTTP 404 后创建；401/403/429/网络异常不能冒充“不存在”。
- 创建遇到 422 时再次确认是否被并发创建，否则仍失败。
- 新增 10 项回归测试；工作流调用该脚本。未重跑历史发布、未修改历史 tag 或 Release。
- 此项是本地工作流修复，须推送后才会进入后续远端运行。

### 2. 依赖漏洞审计与定向升级

启用远端依赖告警后，用 npm 官方审计接口核对当前锁文件。原本地 registry 镜像未实现审计 API（404），不能把该失败当作零漏洞；本轮仅审计命令指定官方 registry，未更改全局配置。

初次有效审计：根 11 项（含 1 严重、5 高危）、旧客户端 9 项、ESLint 工具链 0 项。这是 npm 的包级统计，不是可利用线上漏洞的数量。

处理：

- Vitest 2.1.9 → 3.2.7，Vite 5.4.21 → 6.4.3。现有 Vue 插件 5.2.4 支持 Vite 6；没有直接跳到最新主版本。
- 将弃用的 environmentMatchGlobs 改为 node/dom 两个显式测试 project，确保测试发现不丢失、不重复。
- Hono 4.12.29 → 4.13.7；旧客户端 Axios 1.16.1 → 1.20.0、DOMPurify 3.4.12 → 3.4.14；相关传递依赖按审计修复。
- js-beautify 内嵌 glob 单独通过正常 audit fix 更新到 10.5.0；没有 force、没有 legacy-peer-deps。
- **Next 16.3.1、React/React DOM 19.2.8 未升级。**
- 修复后根、旧客户端、隔离 ESLint 工具链均为 **0 项已知审计告警**。这是当前审计库结果，不保证没有未知漏洞；旧工具的弃用提示与生命周期债仍应逐步处理。

### 3. 提交钩子加固与纠偏

`.husky/pre-commit` 显式增加 `set -e`，确保直接运行脚本时也遇错即停。核对 Husky 包装脚本发现它原本就使用 `sh -e`，因此这属于防御性加固，**不是已经确认的正常 Git 提交绕过漏洞**。

## 远端 CLI 实际操作

目标仓库 `sparkmio/Bangmio`，默认分支 `master`。

| 项目                   | 发现                       | 本轮处理                                                     |
| ---------------------- | -------------------------- | ------------------------------------------------------------ |
| Dependabot 漏洞告警    | 关闭                       | **通过 GitHub API 启用，读回成功**                           |
| Dependabot 安全修复 PR | 关闭                       | **启用，读回 enabled=true、paused=false**                    |
| 自动合并               | 关闭                       | 保持关闭；不会自动上线升级                                   |
| Actions 默认权限       | read，不能批准 PR          | 正常，保持最小权限                                           |
| Secret 扫描及推送保护  | 已启用，查询未解决告警为 0 | 保持；不读取告警中的秘密内容                                 |
| 最近 master CI         | 旧 HEAD 436b59e 成功       | 不等于本次提交远端已通过                                     |
| master 分支保护        | 未启用                     | 记录风险；不擅自引入强制 PR 流程或锁住独立开发者当前提交方式 |

启用安全修复 PR 不代表 PR 已创建、已验证或已合并。未关闭现有告警来伪造修复状态；当前远端锁文件尚未收到本轮本地升级。

## Cloudflare 只读检查

- 生产 Worker：`bangmio-next`，当前流量版本 `979c92df-377d-476d-984c-26f572c84114`，创建于 2026-08-29。
- ASSETS、D1 DB 绑定存在且 D1 标识与本地配置一致。
- BANGMIO_API_ORIGIN、OAuth 主域回调、Turnstile hostnames、邮件发送方和邮件验证码开关与本地配置一致。
- 所需 BGM_APP_SECRET、JWT_SECRET、RESEND_API_KEY、TURNSTILE_SECRET_KEY、ZHIPU_API_KEY 名称存在；仅核对名称和类型，未读取、输出或替换值。
- 旧 `bangmio-vue` Pages 项目仍关联 `bangmio.site`。仅凭此信息不能认定冲突：现有 Worker 使用 Route，而非独立自定义域，Pages 可能承担底层来源。**未删除旧项目、域名或路由。**
- 未取得完整 Workers Builds 触发器配置或 DNS 解析拓扑的审计证据；不声称已检查所有 Cloudflare 设置。下一步若清理 Pages，必须先核对路由优先级、DNS 来源及回滚方式。

## 验证与提交范围

- 全量测试：46 文件 / 372 项通过（含 10 项发布回归）。
- 质量门禁：JS/Vue lint、React/Hooks/a11y lint、TS7 类型检查、Next 生产构建。
- 旧 Vue Vite 6 构建通过；首次因沙箱无法复制 dist 文件失败，授权后重试成功。
- 独立 `.cache` 目录运行三份锁文件的根 npm ci，不覆盖正在开发的 node_modules。HUSKY=0 仅用于无 Git 的安装测试目录，实际提交不跳过钩子。
- Git 提交会运行 lint-staged 和已有 server bundle 同步钩子；functions/api 跟踪产物按原约定纳入，不提交 client/dist、.cache、.next 或密钥。
- 未执行 Worker dry-run/生产部署、邮件发送或真实账号写入。

剩余未验收项：多尺寸/读屏/键盘交互全量回归、测试账号写入读回、远端 CI 与 Worker 运行验证，仍按治理记录推进。本轮安全依赖与工作流修复不等于整站审计完成。
