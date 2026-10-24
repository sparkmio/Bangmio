# GitHub 仓库清理计划

**执行日期**: 2024-10-24  
**仓库**: sparkmio/Bangmio

## 当前仓库状态

### 基本信息

- **仓库**: sparkmio/Bangmio
- **描述**: 基于Bangumi的一站式便捷追番网站
- **默认分支**: master
- **可见性**: PUBLIC
- **最后更新**: 2026-10-24T07:52:05Z

### 分支状况

- **总分支数**: 12
- **活跃分支**: master, codex/next-migration, local-app
- **Dependabot 分支**: 9 个

### Pull Requests

- **开放的 PR**: 9 个（全部是 Dependabot 自动创建的依赖更新）
- **最新 PR**: #17 (follow-redirects 更新)
- **最旧未合并 PR**: #9 (brace-expansion 更新, 2026-10-01)

### 安全问题

- **Dependabot 警告**: 25 个漏洞
  - 1 个严重 (Critical)
  - 8 个高危 (High)
  - 11 个中危 (Moderate)
  - 5 个低危 (Low)
- **查看详情**: https://github.com/sparkmio/Bangmio/security/dependabot

## 清理建议

### 优先级 1: 安全修复 🚨

#### 立即执行

1. **撤销暴露的 Resend API 密钥**

   ```bash
   # 在 Resend 控制台执行
   # 1. 撤销密钥: re_NRTy98hx_JuF6JcyHAJ424da8jpMyvMXE
   # 2. 生成新密钥
   # 3. 更新 Cloudflare Workers Secret
   wrangler secret put RESEND_API_KEY
   ```

2. **处理 Dependabot 警告**
   - 访问: https://github.com/sparkmio/Bangmio/security/dependabot
   - 审查 1 个严重和 8 个高危漏洞
   - 评估是否需要立即升级

### 优先级 2: Dependabot PR 处理

#### 推荐操作策略

**批量合并策略**（建议）:

```bash
# 1. 本地测试所有 Dependabot 更新
gh pr checkout 17  # follow-redirects
npm ci && npm run check

gh pr checkout 16  # hono
npm ci && npm run check

# ... 依次测试其他 PR

# 2. 如果测试通过，批量合并
gh pr merge 17 --merge --delete-branch
gh pr merge 16 --merge --delete-branch
# ... 依次合并
```

**按类型处理**:

1. **客户端依赖** (已废弃的 Vue client/):
   - PR #17: follow-redirects (client)
   - PR #14: postcss-selector-parser & tailwindcss (client)
   - PR #13: source-map-js (client)

   **建议**: 关闭这些 PR，因为 client/ 目录已不再使用

   ```bash
   gh pr close 17 --comment "Client directory deprecated, closing"
   gh pr close 14 --comment "Client directory deprecated, closing"
   gh pr close 13 --comment "Client directory deprecated, closing"
   ```

2. **主要依赖更新**:
   - PR #16: hono 4.13.7 → 4.13.13
   - PR #11: next 16.3.6 → 16.4.2
   - PR #12: proxy-addr 2.0.7 → 2.0.8

   **建议**: 测试后合并

   ```bash
   # 测试每个 PR
   gh pr checkout <number>
   npm ci && npm run check

   # 如果通过，合并
   gh pr merge <number> --merge --delete-branch
   ```

3. **工具链依赖**:
   - PR #15: postcss-selector-parser & eslint-plugin-vue
   - PR #9: brace-expansion (tooling/eslint)

   **建议**: eslint-plugin-vue 已不需要，关闭 PR #15；测试后合并 PR #9

4. **多包更新**:
   - PR #10: undici & wrangler

   **建议**: 测试后合并

### 优先级 3: 分支清理

#### 需要处理的分支

1. **Dependabot 分支** (9 个):
   - 随 PR 合并/关闭自动删除
   - 或手动删除已关闭 PR 的分支

2. **开发分支**:
   - `codex/next-migration` - 检查是否已完成，可能需要删除
   - `local-app` - 检查是否仍在使用

**删除分支命令**:

```bash
# 删除已合并的分支
gh api repos/sparkmio/Bangmio/git/refs/heads/codex/next-migration -X DELETE

# 批量删除 dependabot 分支（如果 PR 已关闭）
gh api repos/sparkmio/Bangmio/git/refs/heads/dependabot/npm_and_yarn/client/follow-redirects-1.16.1 -X DELETE
```

### 优先级 4: 文档和配置清理

#### 需要更新的文档

1. **README.md** ✅ 已完成
   - 已更新技术栈为 Next.js 16 + React 19
   - 已移除 Vue 相关描述

2. **GOVERNANCE-2026-09-05.md**
   - 需要更新以反映最新架构（client/ 目录已废弃）

3. **GitHub Actions / CI**
   - 检查是否需要更新构建流程
   - 移除 client/ 相关的构建步骤

#### 配置文件清理建议

1. **可以删除的配置**:
   - `.eslintrc.cjs` (不再使用)
   - `client/` 整个目录（确认无隐藏依赖后）

2. **需要更新的配置**:
   - `.github/workflows/*.yml` - 移除 Vue/client 相关步骤
   - `vitest.config.js` - 简化配置

## 执行步骤

### 第一阶段: 紧急安全修复

- [ ] 撤销 Resend API 密钥
- [ ] 生成并配置新密钥
- [ ] 验证邮件功能正常
- [ ] 处理严重和高危的 Dependabot 警告

### 第二阶段: PR 和分支清理

- [ ] 关闭与 client/ 相关的 Dependabot PR (3个)
- [ ] 测试并合并主要依赖更新 PR (4个)
- [ ] 测试并处理工具链更新 PR (2个)
- [ ] 删除已合并/关闭的 Dependabot 分支
- [ ] 检查并清理开发分支 (codex/next-migration, local-app)

### 第三阶段: 文档和配置清理

- [ ] 更新 GOVERNANCE-2026-09-05.md
- [ ] 检查并更新 GitHub Actions 配置
- [ ] 删除不再使用的配置文件
- [ ] 考虑完全删除 client/ 目录

### 第四阶段: 验证

- [ ] 运行完整测试套件
- [ ] 本地开发服务器测试
- [ ] 生产构建测试
- [ ] Cloudflare Workers 部署测试

## 预期结果

- ✅ 安全漏洞得到修复
- ✅ PR 数量从 9 个减少到 0-2 个
- ✅ 分支数量从 12 个减少到 1-2 个
- ✅ 文档准确反映当前架构
- ✅ 仓库更整洁、更易维护

## 风险评估

### 低风险

- 关闭 client/ 相关的 PR
- 删除已合并的分支
- 更新文档

### 中风险

- 合并依赖更新（需要测试）
- 删除开发分支（需要确认状态）

### 高风险

- 完全删除 client/ 目录（需要彻底验证无依赖）

## 后续维护建议

1. **配置 Dependabot 自动合并**
   - 对于补丁版本更新，配置自动合并
   - 减少手动处理 PR 的工作量

2. **定期清理**
   - 每月检查一次未合并的 PR
   - 每季度清理一次不活跃的分支

3. **分支保护规则**
   - 为 master 分支设置保护规则
   - 要求 PR review
   - 要求 CI 通过

4. **安全扫描**
   - 启用 GitHub Code Scanning
   - 定期审查 Dependabot 警告
   - 设置安全策略文件 (SECURITY.md)
