# Zinong2017 一键发布到 GitHub Pages
# 用法：在 PowerShell 中执行 .\deploy.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=== Zinong2017 网站发布 ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "未检测到 Git，请先安装: https://git-scm.com" -ForegroundColor Red
  exit 1
}

$remoteUrl = Read-Host "请输入 GitHub 仓库地址 (HTTPS)，例如 https://github.com/你的用户名/zinong2017.git"

if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
  Write-Host "已取消。" -ForegroundColor Yellow
  exit 0
}

$remoteUrl = $remoteUrl.Trim()

if (-not (git remote get-url origin 2>$null)) {
  git remote add origin $remoteUrl
} else {
  git remote set-url origin $remoteUrl
}

git add -A
$status = git status --porcelain
if ($status) {
  git commit -m "Update site content"
}

Write-Host ""
Write-Host "正在推送到 GitHub..." -ForegroundColor Green
git branch -M main
git push -u origin main

Write-Host ""
Write-Host "推送完成！请完成最后一步：" -ForegroundColor Green
Write-Host "1. 打开仓库 Settings -> Pages"
Write-Host "2. Source 选择 GitHub Actions（不要选 Deploy from branch）"
Write-Host "3. 等待 1~2 分钟，访问 Actions 里显示的网址"
Write-Host ""
Write-Host "公网地址一般为: https://你的用户名.github.io/仓库名/" -ForegroundColor Cyan
Write-Host ""
