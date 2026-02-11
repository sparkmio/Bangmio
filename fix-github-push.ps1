#!powershell

# 🔧 GitHub推送问题解决脚本 (PowerShell版本)

$ErrorActionPreference = "Stop"

Write-Host "🔧 GitHub推送问题解决脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

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

# 检查当前状态
Log-Info "检查Git状态..."
try {
    $currentBranch = git branch --show-current
} catch {
    Log-Error "无法获取当前分支，请确保在Git仓库中"
    exit 1
}

try {
    $remoteUrl = git remote get-url origin
} catch {
    $remoteUrl = $null
}

if ([string]::IsNullOrEmpty($remoteUrl)) {
    Log-Error "未配置远程仓库"
    Write-Host ""
    Write-Host "请先配置远程仓库:"
    Write-Host "1. 在GitHub创建新仓库: https://github.com/new"
    Write-Host "2. 不要初始化README、.gitignore或license"
    Write-Host "3. 复制仓库的SSH或HTTPS URL"
    Write-Host ""
    
    $repoUrl = Read-Host "请输入GitHub仓库URL"
    if (-not [string]::IsNullOrEmpty($repoUrl)) {
        git remote add origin $repoUrl
        $remoteUrl = $repoUrl
        Log-Info "远程仓库已添加"
    } else {
        Log-Error "未提供URL，退出脚本"
        exit 1
    }
}

Log-Info "当前分支: $currentBranch"
Log-Info "远程仓库: $remoteUrl"

# 检测URL类型
if ($remoteUrl -match "git@") {
    $urlType = "ssh"
    Log-Info "远程仓库使用SSH协议"
} else {
    $urlType = "https"
    Log-Info "远程仓库使用HTTPS协议"
}

Write-Host ""
Write-Host "常见推送问题解决方案:" -ForegroundColor Cyan
Write-Host "1. 身份验证失败 (HTTPS)"
Write-Host "2. SSH密钥问题"
Write-Host "3. 网络连接问题"
Write-Host "4. 权限不足"
Write-Host ""
$issueType = Read-Host "请选择问题类型 (1-4) 或直接尝试推送 (0)"

switch ($issueType) {
    "0" {
        Log-Info "尝试推送..."
        try {
            git push -u origin $currentBranch
            Log-Info "✅ 推送成功!"
            exit 0
        } catch {
            Log-Error "推送失败，请尝试其他解决方案"
        }
    }
    
    "1" {
        Log-Info "HTTPS身份验证解决方案"
        Write-Host ""
        Write-Host "HTTPS推送需要以下身份验证方式之一:" -ForegroundColor Yellow
        Write-Host "1. GitHub凭据管理器 (Windows)"
        Write-Host "2. 个人访问令牌 (PAT)"
        Write-Host "3. 切换到SSH协议"
        Write-Host ""
        $httpsSolution = Read-Host "请选择解决方案 (1/2/3)"
        
        switch ($httpsSolution) {
            "1" {
                Log-Info "使用GitHub凭据管理器"
                Log-Info "在Windows上，Git通常会使用Git Credential Manager"
                Log-Info "尝试推送，系统会提示输入凭据"
                $tryPush = Read-Host "是否尝试推送? (y/n)"
                if ($tryPush -match "^[Yy]$") {
                    try {
                        git push -u origin $currentBranch
                    } catch {
                        Log-Error "推送失败"
                    }
                }
            }
            
            "2" {
                Log-Info "使用个人访问令牌 (PAT)"
                Write-Host ""
                Write-Host "步骤:" -ForegroundColor Yellow
                Write-Host "1. 访问 https://github.com/settings/tokens"
                Write-Host "2. 生成新令牌 (token)"
                Write-Host "3. 权限选择: repo (完全控制仓库)"
                Write-Host "4. 复制生成的令牌"
                Write-Host ""
                Write-Host "推送时使用令牌作为密码:" -ForegroundColor Yellow
                Write-Host "用户名: 你的GitHub用户名"
                Write-Host "密码: 生成的令牌"
                Write-Host ""
                $tryPush = Read-Host "是否尝试推送? (y/n)"
                if ($tryPush -match "^[Yy]$") {
                    try {
                        git push -u origin $currentBranch
                    } catch {
                        Log-Error "推送失败"
                    }
                }
            }
            
            "3" {
                Log-Info "切换到SSH协议"
                # 提取仓库路径
                if ($remoteUrl -match "https://github\.com/([^/]+/[^/.]+)") {
                    $repoPath = $matches[1] -replace '\.git$', ''
                    $sshUrl = "git@github.com:$repoPath.git"
                    Log-Info "新的SSH URL: $sshUrl"
                    git remote set-url origin $sshUrl
                    $remoteUrl = $sshUrl
                    Log-Info "已切换到SSH协议"
                    Log-Info "请确保已配置SSH密钥"
                    Write-Host ""
                    Write-Host "SSH密钥配置:" -ForegroundColor Yellow
                    Write-Host "1. 检查是否存在SSH密钥: ~/.ssh/id_rsa"
                    Write-Host "2. 如果没有，生成新密钥: ssh-keygen -t rsa -b 4096"
                    Write-Host "3. 添加公钥到GitHub: https://github.com/settings/keys"
                    Write-Host ""
                    $tryPush = Read-Host "是否尝试推送? (y/n)"
                    if ($tryPush -match "^[Yy]$") {
                        try {
                            git push -u origin $currentBranch
                        } catch {
                            Log-Error "推送失败"
                        }
                    }
                } else {
                    Log-Error "无法转换URL类型"
                }
            }
        }
    }
    
    "2" {
        Log-Info "SSH密钥解决方案"
        Write-Host ""
        Write-Host "SSH密钥配置检查:" -ForegroundColor Yellow
        Write-Host "1. 检查SSH密钥是否存在"
        Write-Host "2. 测试SSH连接"
        Write-Host "3. 添加SSH密钥到GitHub"
        Write-Host ""
        
        # 检查SSH密钥
        $sshKeyRsa = "$HOME\.ssh\id_rsa"
        $sshKeyEd25519 = "$HOME\.ssh\id_ed25519"
        
        if (Test-Path $sshKeyRsa -PathType Leaf) {
            Log-Info "找到RSA SSH密钥: $sshKeyRsa"
            Get-Item $sshKeyRsa
        } elseif (Test-Path $sshKeyEd25519 -PathType Leaf) {
            Log-Info "找到Ed25519 SSH密钥: $sshKeyEd25519"
            Get-Item $sshKeyEd25519
        } else {
            Log-Warn "未找到SSH密钥"
            $genKey = Read-Host "是否生成新的SSH密钥? (y/n)"
            if ($genKey -match "^[Yy]$") {
                Write-Host "正在生成SSH密钥..."
                ssh-keygen -t rsa -b 4096 -f $sshKeyRsa -N ""
                Log-Info "SSH密钥已生成"
                Write-Host ""
                Write-Host "请将公钥添加到GitHub:" -ForegroundColor Yellow
                Write-Host "1. 复制公钥内容:"
                Write-Host "   cat $sshKeyRsa.pub"
                Write-Host "2. 访问 https://github.com/settings/keys"
                Write-Host "3. 点击 'New SSH key'"
                Write-Host "4. 粘贴公钥并保存"
                Write-Host ""
                Read-Host "添加完成后按回车继续..." | Out-Null
            }
        }
        
        # 测试SSH连接
        Log-Info "测试SSH连接..."
        $sshTest = ssh -T git@github.com 2>&1
        if ($sshTest -match "successfully authenticated") {
            Log-Info "✅ SSH连接成功"
        } else {
            Log-Warn "SSH连接失败"
            Write-Host "错误信息:" -ForegroundColor Red
            Write-Host $sshTest
        }
        
        $tryPush = Read-Host "是否尝试推送? (y/n)"
        if ($tryPush -match "^[Yy]$") {
            try {
                git push -u origin $currentBranch
            } catch {
                Log-Error "推送失败"
            }
        }
    }
    
    "3" {
        Log-Info "网络连接问题解决方案"
        Write-Host ""
        Write-Host "可能的问题:" -ForegroundColor Yellow
        Write-Host "1. 防火墙阻止Git连接"
        Write-Host "2. 代理设置问题"
        Write-Host "3. GitHub访问不稳定"
        Write-Host ""
        Write-Host "解决方案:" -ForegroundColor Yellow
        Write-Host "1. 检查网络连接"
        Write-Host "2. 配置Git代理 (如果需要)"
        Write-Host "3. 使用SSH替代HTTPS"
        Write-Host "4. 尝试使用GitHub CLI"
        Write-Host ""
        
        # 检查Git代理设置
        Log-Info "检查Git代理设置..."
        try {
            $gitProxy = git config --global http.proxy
        } catch {
            $gitProxy = "未设置"
        }
        Log-Info "Git代理: $gitProxy"
        
        $setupProxy = Read-Host "是否配置代理? (y/n)"
        if ($setupProxy -match "^[Yy]$") {
            $proxyUrl = Read-Host "请输入代理地址 (例如: http://proxy.example.com:8080)"
            if (-not [string]::IsNullOrEmpty($proxyUrl)) {
                git config --global http.proxy $proxyUrl
                git config --global https.proxy $proxyUrl
                Log-Info "代理已配置"
            }
        }
        
        Log-Info "尝试使用SSH协议 (可能更稳定)..."
        if ($remoteUrl -match "https://") {
            if ($remoteUrl -match "https://github\.com/([^/]+/[^/.]+)") {
                $repoPath = $matches[1] -replace '\.git$', ''
                $sshUrl = "git@github.com:$repoPath.git"
                git remote set-url origin $sshUrl
                $remoteUrl = $sshUrl
                Log-Info "已切换到SSH: $sshUrl"
            }
        }
        
        $tryPush = Read-Host "是否尝试推送? (y/n)"
        if ($tryPush -match "^[Yy]$") {
            try {
                git push -u origin $currentBranch
            } catch {
                Log-Error "推送失败"
            }
        }
    }
    
    "4" {
        Log-Info "权限不足解决方案"
        Write-Host ""
        Write-Host "可能的原因:" -ForegroundColor Yellow
        Write-Host "1. 没有写入权限"
        Write-Host "2. 仓库不存在"
        Write-Host "3. 分支受保护"
        Write-Host ""
        Write-Host "解决方案:" -ForegroundColor Yellow
        Write-Host "1. 确认你有仓库的写入权限"
        Write-Host "2. 确认仓库存在且URL正确"
        Write-Host "3. 尝试推送到不同分支"
        Write-Host ""
        
        Log-Info "当前仓库URL: $remoteUrl"
        $verifyUrl = Read-Host "是否验证仓库URL? (y/n)"
        if ($verifyUrl -match "^[Yy]$") {
            Write-Host "请在浏览器中打开:" -ForegroundColor Yellow
            if ($remoteUrl -match "https://") {
                $repoUrl = $remoteUrl -replace '\.git$', ''
                Write-Host "  $repoUrl"
            } elseif ($remoteUrl -match "git@github\.com:([^/.]+/[^/.]+)") {
                $repoName = $matches[1]
                Write-Host "  https://github.com/$repoName"
            }
            Write-Host ""
            Write-Host "确认:" -ForegroundColor Yellow
            Write-Host "1. 仓库存在"
            Write-Host "2. 你有写入权限"
            Write-Host "3. 分支不受保护"
            Write-Host ""
            Read-Host "验证完成后按回车继续..." | Out-Null
        }
        
        $tryOtherBranch = Read-Host "是否尝试推送到其他分支? (y/n)"
        if ($tryOtherBranch -match "^[Yy]$") {
            $newBranch = Read-Host "请输入新分支名 (例如: main)"
            git checkout -b $newBranch
            $currentBranch = $newBranch
        }
        
        $tryPush = Read-Host "是否尝试推送? (y/n)"
        if ($tryPush -match "^[Yy]$") {
            try {
                git push -u origin $currentBranch
            } catch {
                Log-Error "推送失败"
            }
        }
    }
    
    default {
        Log-Info "尝试标准推送..."
        try {
            git push -u origin $currentBranch
            Log-Info "✅ 推送成功!"
        } catch {
            Log-Error "推送失败"
            Write-Host ""
            Write-Host "请运行此脚本并选择具体问题类型获取帮助" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Log-Info "如果问题仍未解决，请尝试:"
Write-Host "1. 使用GitHub Desktop客户端"
Write-Host "2. 使用GitHub CLI (gh)"
Write-Host "3. 手动上传ZIP文件到GitHub"
Write-Host ""
Write-Host "手动上传步骤:" -ForegroundColor Yellow
Write-Host "1. 在GitHub仓库页面点击 'Add file' → 'Upload files'"
Write-Host "2. 选择项目文件夹中的所有文件 (排除node_modules)"
Write-Host "3. 提交更改"
Write-Host ""
Log-Info "脚本执行完毕"