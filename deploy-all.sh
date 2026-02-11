#!/bin/bash

set -e

echo "🚀 Bangmio 全自动部署脚本"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "未找到命令: $1"
        log_info "请安装: $2"
        exit 1
    fi
}

# 检查必要命令
log_info "检查必要工具..."
check_command "git" "Git (https://git-scm.com/)"
check_command "node" "Node.js (https://nodejs.org/)"
check_command "npm" "npm (随Node.js安装)"

# 1. 检查Git配置
log_info "检查Git配置..."
if [ -z "$(git config user.name)" ] || [ -z "$(git config user.email)" ]; then
    log_warn "Git用户信息未配置"
    echo ""
    echo "请配置Git用户信息:"
    echo "----------------------------------------"
    read -p "请输入你的GitHub用户名: " git_username
    read -p "请输入你的GitHub邮箱: " git_email
    
    git config user.name "$git_username"
    git config user.email "$git_email"
    
    log_info "Git用户信息已配置: $git_username <$git_email>"
else
    log_info "Git用户信息已配置: $(git config user.name) <$(git config user.email)>"
fi

# 2. 检查远程仓库
log_info "检查远程仓库配置..."
remote_url=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$remote_url" ]; then
    log_warn "未配置远程仓库"
    echo ""
    echo "请配置GitHub远程仓库:"
    echo "----------------------------------------"
    echo "1. 访问 https://github.com/new 创建新仓库"
    echo "2. 仓库名建议: bangumi-manager 或 Bangmio"
    echo "3. 不要初始化README、.gitignore或license"
    echo ""
    read -p "请输入GitHub仓库URL (例如: https://github.com/用户名/仓库名.git): " repo_url
    
    if [ -n "$repo_url" ]; then
        git remote add origin "$repo_url"
        log_info "远程仓库已添加: $repo_url"
    else
        log_error "未提供仓库URL，跳过远程仓库配置"
    fi
else
    log_info "远程仓库已配置: $remote_url"
fi

# 3. 检查当前更改
log_info "检查文件更改..."
if [ -n "$(git status --porcelain)" ]; then
    log_info "发现未提交的更改"
    
    # 显示更改摘要
    echo ""
    echo "更改摘要:"
    echo "----------------------------------------"
    git status --short
    
    echo ""
    read -p "是否提交这些更改? (y/n): " commit_changes
    
    if [[ $commit_changes =~ ^[Yy]$ ]]; then
        # 添加所有文件
        git add .
        
        # 提交
        commit_message="Deploy Bangmio: Complete anime management website with pink theme, OAuth login, and favorites"
        if [ -n "$1" ]; then
            commit_message="$1"
        fi
        
        git commit -m "$commit_message"
        log_info "更改已提交"
    else
        log_warn "跳过提交更改"
    fi
else
    log_info "没有未提交的更改"
fi

# 4. 推送到远程仓库
log_info "推送代码到GitHub..."
if [ -n "$remote_url" ]; then
    echo ""
    read -p "是否推送到远程仓库? (y/n): " push_remote
    
    if [[ $push_remote =~ ^[Yy]$ ]]; then
        # 尝试推送
        current_branch=$(git branch --show-current)
        
        log_info "推送到 origin/$current_branch..."
        if git push -u origin "$current_branch"; then
            log_info "✅ 代码推送成功!"
            log_info "仓库地址: $remote_url"
        else
            log_error "推送失败"
            log_info "可能的原因:"
            log_info "1. 没有写入权限"
            log_info "2. 需要身份验证"
            log_info "3. 网络问题"
            echo ""
            log_info "手动推送命令: git push -u origin $current_branch"
        fi
    else
        log_warn "跳过推送"
    fi
else
    log_warn "未配置远程仓库，跳过推送"
fi

# 5. 构建前端
log_info "构建前端应用..."
echo ""
read -p "是否构建前端? (y/n): " build_frontend

if [[ $build_frontend =~ ^[Yy]$ ]]; then
    cd frontend
    
    log_info "安装依赖..."
    if npm install; then
        log_info "依赖安装成功"
    else
        log_error "依赖安装失败"
        exit 1
    fi
    
    log_info "构建生产版本..."
    if npm run build; then
        log_info "✅ 前端构建成功!"
        log_info "构建文件位于: frontend/dist/"
    else
        log_error "构建失败"
        exit 1
    fi
    
    cd ..
else
    log_warn "跳过前端构建"
fi

# 6. 部署到GitHub Pages
log_info "部署到GitHub Pages..."
echo ""
echo "GitHub Pages部署选项:"
echo "1. 自动部署 (使用GitHub Actions)"
echo "2. 手动部署 (推送到gh-pages分支)"
echo "3. 跳过部署"
echo ""
read -p "请选择部署方式 (1/2/3): " deploy_option

case $deploy_option in
    1)
        log_info "使用GitHub Actions自动部署"
        log_info "确保仓库已启用GitHub Pages:"
        log_info "1. 访问 https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]//;s/\.git$//')/settings/pages"
        log_info "2. Source选择 'GitHub Actions'"
        log_info "3. 推送代码后，GitHub会自动构建和部署"
        ;;
    2)
        log_info "手动部署到gh-pages分支..."
        
        # 保存当前分支
        current_branch=$(git branch --show-current)
        
        # 创建或切换到gh-pages分支
        if git show-ref --verify --quiet refs/heads/gh-pages; then
            git checkout gh-pages
            git rm -rf .
        else
            git checkout --orphan gh-pages
            git rm -rf .
        fi
        
        # 复制构建文件
        cp -r frontend/dist/* .
        
        # 添加和提交
        git add .
        git commit -m "Deploy to GitHub Pages"
        
        # 推送到gh-pages分支
        log_info "推送到gh-pages分支..."
        if git push -u origin gh-pages --force; then
            log_info "✅ GitHub Pages部署成功!"
            
            # 获取仓库名
            repo=$(git remote get-url origin | sed 's/.*github.com[:/]//;s/\.git$//')
            pages_url="https://$(echo $repo | cut -d'/' -f1).github.io/$(echo $repo | cut -d'/' -f2)/"
            
            log_info "网站地址: $pages_url"
            log_info "注意: 可能需要几分钟才能访问"
        else
            log_error "gh-pages推送失败"
        fi
        
        # 切回原分支
        git checkout "$current_branch"
        ;;
    3)
        log_warn "跳过GitHub Pages部署"
        ;;
    *)
        log_warn "无效选项，跳过部署"
        ;;
esac

echo ""
echo "========================================"
log_info "🎉 部署流程完成!"
echo ""
echo "下一步:"
echo "1. 访问GitHub仓库检查代码"
echo "2. 如果需要，配置GitHub Pages设置"
echo "3. 测试网站功能"
echo ""
echo "项目结构:"
echo "├── frontend/     # Vue 3前端应用"
echo "├── backend/      # Cloudflare Workers后端"
echo "├── README.md     # 项目说明"
echo "└── deploy-all.sh # 本部署脚本"
echo ""
echo "前端开发: cd frontend && npm run dev"
echo "后端开发: cd backend && npm run dev"
echo ""
echo "感谢使用Bangmio! ✨"