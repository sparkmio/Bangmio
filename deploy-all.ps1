#!powershell

# 🚀 Bangmio 全自动部署脚本 (PowerShell版本)
# 注意: 首次运行可能需要设置执行策略
# 管理员权限下运行: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

$ErrorActionPreference = "Stop"

Write-Host "🚀 Bangmio 全自动部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 颜色定义已经在Write-Host中直接使用

# 日志函数
function Log-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Log-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 检查命令是否存在
function Test-Command {
    param(
        [string]$CommandName,
        [string]$InstallInstructions
    )
    
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        Log-Error "未找到命令: $CommandName"
        Log-Info "请安装: $InstallInstructions"
        exit 1
    }
}

# 检查必要命令
Log-Info "检查必要工具..."
Test-Command "git" "Git (https://git-scm.com/)"
Test-Command "node" "Node.js (https://nodejs.org/)"
Test-Command "npm" "npm (随Node.js安装)"

# 1. 检查Git配置
Log-Info "检查Git配置..."
$gitUserName = git config user.name
$gitUserEmail = git config user.email

if ([string]::IsNullOrEmpty($gitUserName) -or [string]::IsNullOrEmpty($gitUserEmail)) {
    Log-Warn "Git用户信息未配置"
    Write-Host ""
    Write-Host "请配置Git用户信息:"
    Write-Host "----------------------------------------"
    
    $gitUsernameInput = Read-Host "请输入你的GitHub用户名"
    $gitEmailInput = Read-Host "请输入你的GitHub邮箱"
    
    git config user.name $gitUsernameInput
    git config user.email $gitEmailInput
    
    Log-Info "Git用户信息已配置: $gitUsernameInput <$gitEmailInput>"
} else {
    Log-Info "Git用户信息已配置: $gitUserName <$gitUserEmail>"
}

# 2. 检查远程仓库
Log-Info "检查远程仓库配置..."
try {
    $remoteUrl = git remote get-url origin
} catch {
    $remoteUrl = $null
}

if ([string]::IsNullOrEmpty($remoteUrl)) {
    Log-Warn "未配置远程仓库"
    Write-Host ""
    Write-Host "请配置GitHub远程仓库:"
    Write-Host "----------------------------------------"
    Write-Host "1. 访问 https://github.com/new 创建新仓库"
    Write-Host "2. 仓库名建议: bangumi-manager 或 Bangmio"
    Write-Host "3. 不要初始化README、.gitignore或license"
    Write-Host ""
    
    $repoUrl = Read-Host "请输入GitHub仓库URL (例如: https://github.com/用户名/仓库名.git)"
    
    if (-not [string]::IsNullOrEmpty($repoUrl)) {
        git remote add origin $repoUrl
        $remoteUrl = $repoUrl
        Log-Info "远程仓库已添加: $repoUrl"
    } else {
        Log-Error "未提供仓库URL，跳过远程仓库配置"
    }
} else {
    Log-Info "远程仓库已配置: $remoteUrl"
}

# 3. 检查当前更改
Log-Info "检查文件更改..."
$gitStatus = git status --porcelain
if ($gitStatus) {
    Log-Info "发现未提交的更改"
    
    # 显示更改摘要
    Write-Host ""
    Write-Host "更改摘要:"
    Write-Host "----------------------------------------"
    git status --short
    
    Write-Host ""
    $commitChanges = Read-Host "是否提交这些更改? (y/n)"
    
    if ($commitChanges -match "^[Yy]$") {
        # 添加所有文件
        git add .
        
        # 提交
        $commitMessage = "Deploy Bangmio: Complete anime management website with pink theme, OAuth login, and favorites"
        if ($args.Count -gt 0) {
            $commitMessage = $args[0]
        }
        
        git commit -m $commitMessage
        Log-Info "更改已提交"
    } else {
        Log-Warn "跳过提交更改"
    }
} else {
    Log-Info "没有未提交的更改"
}

# 4. 推送到远程仓库
Log-Info "推送代码到GitHub..."
if (-not [string]::IsNullOrEmpty($remoteUrl)) {
    Write-Host ""
    $pushRemote = Read-Host "是否推送到远程仓库? (y/n)"
    
    if ($pushRemote -match "^[Yy]$") {
        # 尝试推送
        $currentBranch = git branch --show-current
        
        Log-Info "推送到 origin/$currentBranch..."
        try {
            git push -u origin $currentBranch
            Log-Info "✅ 代码推送成功!"
            Log-Info "仓库地址: $remoteUrl"
        } catch {
            Log-Error "推送失败"
            Log-Info "可能的原因:"
            Log-Info "1. 没有写入权限"
            Log-Info "2. 需要身份验证"
            Log-Info "3. 网络问题"
            Write-Host ""
            Log-Info "手动推送命令: git push -u origin $currentBranch"
        }
    } else {
        Log-Warn "跳过推送"
    }
} else {
    Log-Warn "未配置远程仓库，跳过推送"
}

# 5. 构建前端
Log-Info "构建前端应用..."
Write-Host ""
$buildFrontend = Read-Host "是否构建前端? (y/n)"

if ($buildFrontend -match "^[Yy]$") {
    # 保存当前目录
    $originalDir = Get-Location
    
    try {
        Set-Location "frontend"
        
        Log-Info "安装依赖..."
        try {
            npm install
            Log-Info "依赖安装成功"
        } catch {
            Log-Error "依赖安装失败"
            exit 1
        }
        
        Log-Info "构建生产版本..."
        try {
            npm run build
            Log-Info "✅ 前端构建成功!"
            Log-Info "构建文件位于: frontend/dist/"
        } catch {
            Log-Error "构建失败"
            exit 1
        }
    } finally {
        Set-Location $originalDir
    }
} else {
    Log-Warn "跳过前端构建"
}

# 6. 部署到GitHub Pages
Log-Info "部署到GitHub Pages..."
Write-Host ""
Write-Host "GitHub Pages部署选项:"
Write-Host "1. 自动部署 (使用GitHub Actions)"
Write-Host "2. 手动部署 (推送到gh-pages分支)"
Write-Host "3. 跳过部署"
Write-Host ""
$deployOption = Read-Host "请选择部署方式 (1/2/3)"

switch ($deployOption) {
    "1" {
        Log-Info "使用GitHub Actions自动部署"
        
        # 提取仓库名
        if ($remoteUrl -match "github\.com[:/]([^/]+/[^/.]+)") {
            $repoPath = $matches[1] -replace '\.git$', ''
            $repoUser = $repoPath.Split('/')[0]
            $repoName = $repoPath.Split('/')[1]
            
            Log-Info "确保仓库已启用GitHub Pages:"
            Log-Info "1. 访问 https://github.com/$repoPath/settings/pages"
            Log-Info "2. Source选择 'GitHub Actions'"
            Log-Info "3. 推送代码后，GitHub会自动构建和部署"
        } else {
            Log-Warn "无法从远程URL提取仓库信息"
        }
    }
    
    "2" {
        Log-Info "手动部署到gh-pages分支..."
        
        # 保存当前分支
        $currentBranch = git branch --show-current
        
        try {
            # 检查gh-pages分支是否存在
            $ghPagesExists = $false
            try {
                git show-ref --verify --quiet refs/heads/gh-pages
                $ghPagesExists = $true
            } catch {
                $ghPagesExists = $false
            }
            
            if ($ghPagesExists) {
                git checkout gh-pages
                git rm -rf .
            } else {
                git checkout --orphan gh-pages
                git rm -rf .
            }
            
            # 复制构建文件
            if (Test-Path "frontend/dist") {
                Copy-Item -Path "frontend/dist/*" -Destination "." -Recurse -Force
            } else {
                Log-Error "找不到frontend/dist目录，请先构建前端"
                git checkout $currentBranch
                exit 1
            }
            
            # 添加和提交
            git add .
            git commit -m "Deploy to GitHub Pages"
            
            # 推送到gh-pages分支
            Log-Info "推送到gh-pages分支..."
            try {
                git push -u origin gh-pages --force
                
                # 获取仓库名和生成URL
                if ($remoteUrl -match "github\.com[:/]([^/]+/[^/.]+)") {
                    $repoPath = $matches[1] -replace '\.git$', ''
                    $repoUser = $repoPath.Split('/')[0]
                    $repoName = $repoPath.Split('/')[1]
                    $pagesUrl = "https://$repoUser.github.io/$repoName/"
                    
                    Log-Info "✅ GitHub Pages部署成功!"
                    Log-Info "网站地址: $pagesUrl"
                    Log-Info "注意: 可能需要几分钟才能访问"
                }
            } catch {
                Log-Error "gh-pages推送失败"
            }
        } finally {
            # 切回原分支
            try {
                git checkout $currentBranch
            } catch {
                Log-Warn "无法切回原分支，请手动执行: git checkout $currentBranch"
            }
        }
    }
    
    "3" {
        Log-Warn "跳过GitHub Pages部署"
    }
    
    default {
        Log-Warn "无效选项，跳过部署"
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Log-Info "🎉 部署流程完成!"
Write-Host ""
Write-Host "下一步:"
Write-Host "1. 访问GitHub仓库检查代码"
Write-Host "2. 如果需要，配置GitHub Pages设置"
Write-Host "3. 测试网站功能"
Write-Host ""
Write-Host "项目结构:"
Write-Host "├── frontend/        # Vue 3前端应用"
Write-Host "├── backend/         # Cloudflare Workers后端"
Write-Host "├── README.md        # 项目说明"
Write-Host "├── deploy-all.ps1   # 本部署脚本 (PowerShell)"
Write-Host "└── deploy-all.sh    # Shell脚本版本"
Write-Host ""
Write-Host "前端开发: cd frontend; npm run dev"
Write-Host "后端开发: cd backend; npm run dev"
Write-Host ""
Write-Host "如果首次运行PowerShell脚本遇到权限问题:"
Write-Host "1. 以管理员身份打开PowerShell"
Write-Host "2. 运行: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser"
Write-Host "3. 选择 [Y] 确认"
Write-Host ""
Write-Host "感谢使用Bangmio! ✨" -ForegroundColor Cyan