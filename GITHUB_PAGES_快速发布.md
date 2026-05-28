# GitHub Pages 快速发布（方案 A）

## 第 1 步：创建仓库（约 30 秒）

1. 浏览器打开：https://github.com/new?name=zinong2017  
2. 确认仓库名为 **`zinong2017`**，选择 **Public**  
3. **不要**勾选 “Add a README file”  
4. 点击 **Create repository**  

## 第 2 步：推送代码（在本机 PowerShell）

直接执行（已配置用户名 **Zinong2017**）：

```powershell
cd "e:\Study_Ai\Zinong2017"
.\deploy.ps1 -RepoUrl "https://github.com/Zinong2017/zinong2017.git"
```

或：

```powershell
cd "e:\Study_Ai\Zinong2017"
git push -u origin main
```

首次会弹出 GitHub 登录，按提示完成即可。

## 第 3 步：开启 Pages（约 1 分钟）

1. 打开 **Actions**，等最新一次 **Deploy to GitHub Pages** 变绿 ✓（会生成 `gh-pages` 分支）  
2. 打开 **Settings** → **Pages**  
3. **Build and deployment** → **Source** 选 **Deploy from a branch**  
4. **Branch** 选 **`gh-pages`**，文件夹选 **`/ (root)`**，点 **Save**  

> 若 Actions 失败：先完成上面第 3 步的 branch 设置，再在 Actions 里点 **Re-run all jobs**。

## 你的公网地址

```
https://Zinong2017.github.io/zinong2017/
```
