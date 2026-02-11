# 🚀 Bangmio 快速开始指南

## 一键部署到 GitHub

如果你遇到 GitHub 推送问题，请按以下步骤操作：

### 方案 A：使用全自动部署脚本 (推荐)

```bash
# 1. 运行部署脚本
./deploy-all.sh

# 2. 按照脚本提示操作
#    - 配置 Git 用户信息
#    - 提交代码
#    - 推送到 GitHub
#    - 构建前端
#    - 部署到 GitHub Pages
```

### 方案 B：如果推送失败，使用问题诊断脚本

```bash
# 1. 诊断并修复 GitHub 推送问题
./fix-github-push.sh

# 2. 选择你遇到的问题类型
#    - 身份验证失败
#    - SSH 密钥问题  
#    - 网络连接问题
#    - 权限不足
```

### 方案 C：手动部署

```bash
# 1. 提交代码到本地仓库
git add .
git commit -m "Initial commit"

# 2. 如果推送失败，尝试以下方法之一：

# 方法1: 使用SSH协议 (推荐)
git remote set-url origin git@github.com:你的用户名/仓库名.git

# 方法2: 使用个人访问令牌
# 推送时，密码使用GitHub生成的Personal Access Token

# 方法3: 使用GitHub Desktop客户端
# 下载: https://desktop.github.com/
```

## 配置 GitHub Pages

1. 推送代码后，访问 GitHub 仓库
2. 点击 Settings → Pages
3. Source 选择: `gh-pages` 分支
4. 保存后等待几分钟
5. 访问: `https://你的用户名.github.io/仓库名/`

## 项目脚本汇总

- `./deploy-all.sh` - 全自动部署脚本
- `./fix-github-push.sh` - GitHub推送问题诊断
- `./deploy-to-gh-pages.sh` - GitHub Pages部署
- `./deploy.sh` - 后端部署脚本

## 快速测试

```bash
# 测试前端开发服务器
cd frontend
npm install
npm run dev
# 访问 http://localhost:5173

# 测试后端API
cd backend
npm install
npm run dev
# API运行在 http://localhost:8787
```

## 获取帮助

如果遇到问题：
1. 查看详细文档: [README.md](README.md)
2. 运行问题诊断脚本: `./fix-github-push.sh`
3. 检查网络连接和GitHub权限

## 项目状态检查

✅ 前端代码完整 (Vue 3 + Element Plus)  
✅ 后端API就绪 (Cloudflare Workers)  
✅ 粉色主题UI完成  
✅ OAuth登录功能  
✅ 本地收藏系统  
✅ 响应式设计  
✅ 部署脚本齐全  
✅ 文档完整  

现在可以部署你的 Bangmio 番剧管理网站了！ 🎉