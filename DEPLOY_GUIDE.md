# Bangmio 部署指南

## 当前状态

✅ **已完成**：
- 前端 (Vue 3 + Element Plus) 构建成功
- 后端 (Cloudflare Workers) 已部署并运行
- GitHub Actions 工作流已配置
- gh-pages 分支已创建（包含构建文件）

🚨 **待解决**：GitHub 推送认证问题

## 手动推送解决方案

由于自动推送遇到认证问题，请按以下步骤手动完成：

### 方案1：使用GitHub个人访问令牌（推荐）

1. **生成个人访问令牌**：
   - 访问 https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 选择权限：`repo` (完全控制仓库)
   - 生成并复制令牌（以 `ghp_` 开头）

2. **使用令牌推送**：
   ```bash
   # 在项目目录中执行
   cd bangumi-manager
   
   # 添加令牌到远程URL
   git remote set-url origin https://ghp_YOUR_TOKEN@github.com/sparkmio/Bangmio.git
   
   # 推送代码
   git push origin master
   git push origin gh-pages
   ```

### 方案2：配置SSH密钥

1. **生成SSH密钥**：
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # 按Enter接受默认位置
   # 设置密码（可选）
   ```

2. **添加公钥到GitHub**：
   - 复制公钥：`cat ~/.ssh/id_ed25519.pub`
   - 访问 https://github.com/settings/keys
   - 点击 "New SSH key"
   - 粘贴公钥并保存

3. **使用SSH推送**：
   ```bash
   git remote set-url origin git@github.com:sparkmio/Bangmio.git
   git push origin master
   git push origin gh-pages
   ```

### 方案3：使用GitHub桌面客户端

1. 下载并安装 [GitHub Desktop](https://desktop.github.com/)
2. 克隆仓库：`File` → `Clone Repository` → `URL`
3. 输入：`https://github.com/sparkmio/Bangmio.git`
4. 使用客户端界面提交和推送

## 启用GitHub Pages

推送成功后：

1. 访问 https://github.com/sparkmio/Bangmio
2. 点击 `Settings` → `Pages`
3. 在 `Source` 下选择：
   - Branch: `gh-pages`
   - Folder: `/ (root)`
4. 点击 `Save`

网站将在几分钟后上线：`https://sparkmio.github.io/Bangmio/`

## 验证部署

1. **检查GitHub Actions**：
   - 访问仓库的 `Actions` 标签页
   - 确认部署工作流运行成功

2. **测试网站功能**：
   - 打开 https://sparkmio.github.io/Bangmio/
   - 测试搜索、详情、收藏功能
   - 验证后端API连接

## 故障排除

### 如果推送仍然失败：

1. **检查网络连接**：
   ```bash
   ping github.com
   ```

2. **检查Git配置**：
   ```bash
   git config --list
   ```

3. **清除凭据缓存**：
   ```bash
   git credential-manager reject https://github.com
   ```

4. **使用详细模式查看错误**：
   ```bash
   GIT_TRACE=1 GIT_CURL_VERBOSE=1 git push origin master
   ```

### 如果GitHub Pages未显示：

1. 等待最多10分钟让页面生效
2. 检查 `gh-pages` 分支是否有 `index.html`
3. 查看仓库设置的 `Pages` 部分是否有错误提示

## 自动化部署（未来）

一旦推送成功，GitHub Actions将自动处理后续部署：
- 每次推送到 `master` 分支时自动构建
- 自动部署到GitHub Pages
- 无需手动操作

---

**需要帮助？** 提供具体的错误信息以便进一步诊断。