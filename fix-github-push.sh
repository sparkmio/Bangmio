#!/bin/bash

set -e

echo "🔧 GitHub推送问题解决脚本"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查当前状态
log_info "检查Git状态..."
current_branch=$(git branch --show-current)
remote_url=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$remote_url" ]; then
    log_error "未配置远程仓库"
    echo ""
    echo "请先配置远程仓库:"
    echo "1. 在GitHub创建新仓库: https://github.com/new"
    echo "2. 不要初始化README、.gitignore或license"
    echo "3. 复制仓库的SSH或HTTPS URL"
    echo ""
    read -p "请输入GitHub仓库URL: " repo_url
    if [ -n "$repo_url" ]; then
        git remote add origin "$repo_url"
        remote_url="$repo_url"
        log_info "远程仓库已添加"
    else
        log_error "未提供URL，退出脚本"
        exit 1
    fi
fi

log_info "当前分支: $current_branch"
log_info "远程仓库: $remote_url"

# 检测URL类型
if [[ "$remote_url" == *"git@"* ]]; then
    url_type="ssh"
    log_info "远程仓库使用SSH协议"
else
    url_type="https"
    log_info "远程仓库使用HTTPS协议"
fi

echo ""
echo "常见推送问题解决方案:"
echo "1. 身份验证失败 (HTTPS)"
echo "2. SSH密钥问题"
echo "3. 网络连接问题"
echo "4. 权限不足"
echo ""
read -p "请选择问题类型 (1-4) 或直接尝试推送 (0): " issue_type

case $issue_type in
    0)
        log_info "尝试推送..."
        if git push -u origin "$current_branch"; then
            log_info "✅ 推送成功!"
            exit 0
        else
            log_error "推送失败，请尝试其他解决方案"
        fi
        ;;
    1)
        log_info "HTTPS身份验证解决方案"
        echo ""
        echo "HTTPS推送需要以下身份验证方式之一:"
        echo "1. GitHub凭据管理器 (Windows)"
        echo "2. 个人访问令牌 (PAT)"
        echo "3. 切换到SSH协议"
        echo ""
        read -p "请选择解决方案 (1/2/3): " https_solution
        
        case $https_solution in
            1)
                log_info "使用GitHub凭据管理器"
                log_info "在Windows上，Git通常会使用Git Credential Manager"
                log_info "尝试推送，系统会提示输入凭据"
                read -p "是否尝试推送? (y/n): " try_push
                if [[ $try_push =~ ^[Yy]$ ]]; then
                    git push -u origin "$current_branch"
                fi
                ;;
            2)
                log_info "使用个人访问令牌 (PAT)"
                echo ""
                echo "步骤:"
                echo "1. 访问 https://github.com/settings/tokens"
                echo "2. 生成新令牌 (token)"
                echo "3. 权限选择: repo (完全控制仓库)"
                echo "4. 复制生成的令牌"
                echo ""
                echo "推送时使用令牌作为密码:"
                echo "用户名: 你的GitHub用户名"
                echo "密码: 生成的令牌"
                echo ""
                read -p "是否尝试推送? (y/n): " try_push
                if [[ $try_push =~ ^[Yy]$ ]]; then
                    git push -u origin "$current_branch"
                fi
                ;;
            3)
                log_info "切换到SSH协议"
                # 提取仓库路径
                if [[ "$remote_url" == *"https://github.com/"* ]]; then
                    repo_path=$(echo "$remote_url" | sed 's|https://github.com/||;s|\.git$||')
                    ssh_url="git@github.com:$repo_path.git"
                    log_info "新的SSH URL: $ssh_url"
                    git remote set-url origin "$ssh_url"
                    log_info "已切换到SSH协议"
                    log_info "请确保已配置SSH密钥"
                    echo ""
                    echo "SSH密钥配置:"
                    echo "1. 检查是否存在SSH密钥: ~/.ssh/id_rsa"
                    echo "2. 如果没有，生成新密钥: ssh-keygen -t rsa -b 4096"
                    echo "3. 添加公钥到GitHub: https://github.com/settings/keys"
                    echo ""
                    read -p "是否尝试推送? (y/n): " try_push
                    if [[ $try_push =~ ^[Yy]$ ]]; then
                        git push -u origin "$current_branch"
                    fi
                else
                    log_error "无法转换URL类型"
                fi
                ;;
        esac
        ;;
    2)
        log_info "SSH密钥解决方案"
        echo ""
        echo "SSH密钥配置检查:"
        echo "1. 检查SSH密钥是否存在"
        echo "2. 测试SSH连接"
        echo "3. 添加SSH密钥到GitHub"
        echo ""
        
        # 检查SSH密钥
        if [ -f ~/.ssh/id_rsa ] || [ -f ~/.ssh/id_ed25519 ]; then
            log_info "找到SSH密钥"
            ls -la ~/.ssh/id_*
        else
            log_warn "未找到SSH密钥"
            read -p "是否生成新的SSH密钥? (y/n): " gen_key
            if [[ $gen_key =~ ^[Yy]$ ]]; then
                ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
                log_info "SSH密钥已生成"
                echo ""
                echo "请将公钥添加到GitHub:"
                echo "1. 复制公钥内容:"
                echo "   cat ~/.ssh/id_rsa.pub"
                echo "2. 访问 https://github.com/settings/keys"
                echo "3. 点击 'New SSH key'"
                echo "4. 粘贴公钥并保存"
                echo ""
                read -p "添加完成后按回车继续..." dummy
            fi
        fi
        
        # 测试SSH连接
        log_info "测试SSH连接..."
        if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
            log_info "✅ SSH连接成功"
        else
            log_warn "SSH连接失败"
            echo "错误信息:"
            ssh -T git@github.com 2>&1
        fi
        
        read -p "是否尝试推送? (y/n): " try_push
        if [[ $try_push =~ ^[Yy]$ ]]; then
            git push -u origin "$current_branch"
        fi
        ;;
    3)
        log_info "网络连接问题解决方案"
        echo ""
        echo "可能的问题:"
        echo "1. 防火墙阻止Git连接"
        echo "2. 代理设置问题"
        echo "3. GitHub访问不稳定"
        echo ""
        echo "解决方案:"
        echo "1. 检查网络连接"
        echo "2. 配置Git代理 (如果需要)"
        echo "3. 使用SSH替代HTTPS"
        echo "4. 尝试使用GitHub CLI"
        echo ""
        
        # 检查Git代理设置
        log_info "检查Git代理设置..."
        git_proxy=$(git config --global http.proxy || echo "未设置")
        log_info "Git代理: $git_proxy"
        
        read -p "是否配置代理? (y/n): " setup_proxy
        if [[ $setup_proxy =~ ^[Yy]$ ]]; then
            read -p "请输入代理地址 (例如: http://proxy.example.com:8080): " proxy_url
            if [ -n "$proxy_url" ]; then
                git config --global http.proxy "$proxy_url"
                git config --global https.proxy "$proxy_url"
                log_info "代理已配置"
            fi
        fi
        
        log_info "尝试使用SSH协议 (可能更稳定)..."
        if [[ "$remote_url" == *"https://"* ]]; then
            repo_path=$(echo "$remote_url" | sed 's|https://github.com/||;s|\.git$||')
            ssh_url="git@github.com:$repo_path.git"
            git remote set-url origin "$ssh_url"
            log_info "已切换到SSH: $ssh_url"
        fi
        
        read -p "是否尝试推送? (y/n): " try_push
        if [[ $try_push =~ ^[Yy]$ ]]; then
            git push -u origin "$current_branch"
        fi
        ;;
    4)
        log_info "权限不足解决方案"
        echo ""
        echo "可能的原因:"
        echo "1. 没有写入权限"
        echo "2. 仓库不存在"
        echo "3. 分支受保护"
        echo ""
        echo "解决方案:"
        echo "1. 确认你有仓库的写入权限"
        echo "2. 确认仓库存在且URL正确"
        echo "3. 尝试推送到不同分支"
        echo ""
        
        log_info "当前仓库URL: $remote_url"
        read -p "是否验证仓库URL? (y/n): " verify_url
        if [[ $verify_url =~ ^[Yy]$ ]]; then
            echo "请在浏览器中打开:"
            if [[ "$remote_url" == *"https://"* ]]; then
                repo_url=$(echo "$remote_url" | sed 's|\.git$||')
                echo "  $repo_url"
            else
                repo_name=$(echo "$remote_url" | sed 's|git@github.com:||;s|\.git$||')
                echo "  https://github.com/$repo_name"
            fi
            echo ""
            echo "确认:"
            echo "1. 仓库存在"
            echo "2. 你有写入权限"
            echo "3. 分支不受保护"
            echo ""
            read -p "验证完成后按回车继续..." dummy
        fi
        
        read -p "是否尝试推送到其他分支? (y/n): " try_other_branch
        if [[ $try_other_branch =~ ^[Yy]$ ]]; then
            read -p "请输入新分支名 (例如: main): " new_branch
            git checkout -b "$new_branch"
            current_branch="$new_branch"
        fi
        
        read -p "是否尝试推送? (y/n): " try_push
        if [[ $try_push =~ ^[Yy]$ ]]; then
            git push -u origin "$current_branch"
        fi
        ;;
    *)
        log_info "尝试标准推送..."
        if git push -u origin "$current_branch"; then
            log_info "✅ 推送成功!"
        else
            log_error "推送失败"
            echo ""
            echo "请运行此脚本并选择具体问题类型获取帮助"
        fi
        ;;
esac

echo ""
echo "========================================"
log_info "如果问题仍未解决，请尝试:"
echo "1. 使用GitHub Desktop客户端"
echo "2. 使用GitHub CLI (gh)"
echo "3. 手动上传ZIP文件到GitHub"
echo ""
echo "手动上传步骤:"
echo "1. 在GitHub仓库页面点击 'Add file' → 'Upload files'"
echo "2. 选择项目文件夹中的所有文件 (排除node_modules)"
echo "3. 提交更改"
echo ""
log_info "脚本执行完毕"