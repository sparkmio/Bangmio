# Bangmio v4 项目全面优化计划

## 执行日期

2024-10-24

## 项目现状分析

### 架构概况

- **前端主线**: Next.js 16 + React 19 (生产环境)
- **遗留代码**: Vue 3 客户端 (104MB，已弃用但未清理)
- **后端**: Hono API (集成在 Next.js API 路由)
- **部署**: Cloudflare Workers (通过 OpenNext)

### 发现的主要问题

#### 1. **严重安全问题**

- ✗ `send_email.js` 硬编码 API 密钥 (已删除，密钥已屏蔽)
- ✗ 该密钥已暴露在代码中，需要立即撤销
- ✗ 包含特定邮件内容（YUZUSOFT 配音邀请），应该是测试/临时文件

#### 2. **大量冗余代码和目录 (约 762MB)**

- `bangmio-site-clone/` (760MB) - 完整的重复项目
- `dist-pc/` (1.4MB) - 旧版构建产物
- `ScrapyDouban-analysis/` (361KB) - Python 爬虫分析脚本
- `client/` (104MB) - 废弃的 Vue 应用，但仍被 Next.js 引用

#### 3. **架构混乱**

- Next.js 应用中通过包装组件引用 Vue 代码
- `components/vue-*.tsx` 文件仍在使用
- Vue 和 React 样式耦合，无法安全删除
- 两套 ESLint 配置 (Vue + React)

#### 4. **测试覆盖率问题**

- 45,626 行测试代码
- 21,856 行生产代码
- 测试代码是生产代码的 2.09 倍（不正常）
- 可能存在过度测试或测试质量问题

#### 5. **构建和缓存问题**

- `.cache/` 目录包含大量临时文件和日志
- `.open-next/` 和 `.next/` 构建产物未正确忽略
- 包含敏感的旧版配置和代码备份

## 优化方案

### Phase 1: 紧急安全修复 (立即执行)

**1.1 撤销暴露的 API 密钥**

- 删除 `send_email.js` 文件
- 在 Resend 控制台撤销 `re_NRTy98hx_*` 密钥
- 生成新密钥并仅存储在 Cloudflare Workers Secrets

**1.2 更新 .gitignore**

- 确保敏感文件不被提交
- 添加构建产物和缓存目录

### Phase 2: 清理冗余目录 (约释放 762MB)

**2.1 删除重复项目**

```bash
rm -rf bangmio-site-clone/
rm -rf dist-pc/
rm -rf ScrapyDouban-analysis/
```

**2.2 清理缓存和构建产物**

```bash
rm -rf .cache/
rm -rf .open-next/
rm -rf .wrangler/
```

**2.3 清理临时文件**

- 删除 `.DS_Store` 文件
- 删除日志文件
- 清理旧版备份文件

### Phase 3: 解决 Vue/React 混用问题

**3.1 评估 Vue 组件使用情况**

- `vue-anime-detail.tsx` - 番剧详情页核心组件
- `vue-groups-client.tsx` - 小组页面客户端
- `vue-bind-bangumi-modal.tsx` - Bangumi 绑定弹窗

**3.2 迁移策略**

- 这些组件已经是 React 组件（只是命名有 vue 前缀）
- 重命名组件移除 vue 前缀
- 验证无 Vue 依赖后删除 client/ 目录

### Phase 4: 代码质量优化

**4.1 统一 ESLint 配置**

- 合并 `.eslintrc.cjs` 和 `.eslintrc.react.cjs`
- 移除 Vue 相关规则
- 简化工具链

**4.2 优化测试策略**

- 审查测试文件，移除重复测试
- 关注核心业务逻辑测试
- 减少单元测试，增加集成测试

**4.3 清理依赖**

- 移除 Vue 相关依赖
- 清理 `client/package.json`
- 更新 `package.json` 中的废弃脚本

### Phase 5: 文档和配置清理

**5.1 清理配置文件**

- 移除 Vue 相关的 Vite 配置
- 简化 `vitest.config.js`
- 更新 `tsconfig.json`

**5.2 更新文档**

- 修正 README.md 中的过时信息
- 移除 Vue 相关描述
- 更新技术栈说明

## 执行顺序和风险评估

### 优先级排序

1. **P0 (紧急)**: Phase 1 - 安全修复
2. **P1 (高)**: Phase 2.1, 2.2 - 删除大型冗余目录
3. **P2 (中)**: Phase 3 - 解决架构混乱
4. **P3 (低)**: Phase 4, 5 - 质量优化和文档

### 风险评估

- **高风险**: Phase 3 (可能影响现有功能)
- **中风险**: Phase 4.3 (依赖清理)
- **低风险**: Phase 1, 2, 5 (文件删除和文档)

## 预期收益

- **磁盘空间**: 释放约 762MB
- **构建速度**: 减少不必要的文件扫描
- **代码清晰度**: 移除混淆的 Vue/React 混用
- **安全性**: 修复密钥泄露问题
- **维护性**: 简化项目结构，便于后续维护

## 验证标准

每个 Phase 完成后验证：

- [ ] `npm run lint` 通过
- [ ] `npm test` 通过
- [ ] `npm run next:build` 成功
- [ ] 本地开发服务器正常运行
- [ ] 关键页面功能正常

## 备注

根据 `docs/GOVERNANCE-2026-09-05.md`，项目已经经过一轮治理：

- 已建立质量门禁
- 已修复数据契约问题
- 已增加测试覆盖

本次优化主要关注：

- 清理历史遗留
- 移除冗余代码
- 修复安全问题
