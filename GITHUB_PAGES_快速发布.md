# GitHub Pages 快速发布（方案 A）

## 第 1 步：创建仓库（约 30 秒）

1. 浏览器打开：https://github.com/new?name=zinong2017  
2. 确认仓库名为 **`zinong2017`**，选择 **Public**  
3. **不要**勾选 “Add a README file”  
4. 点击 **Create repository**  

## 第 2 步：推送代码（在本机 PowerShell）

把下面命令里的 `你的GitHub用户名` 换成你的账号，然后整段执行：

```powershell
cd "e:\Study_Ai\Zinong2017"
.\deploy.ps1 -RepoUrl "https://github.com/你的GitHub用户名/zinong2017.git"
```

首次会弹出 GitHub 登录，按提示完成即可。

## 第 3 步：开启 Pages（约 1 分钟）

1. 打开你的仓库 → **Settings** → **Pages**  
2. **Build and deployment** → **Source** 选 **GitHub Actions**  
3. 打开 **Actions** 标签，等绿色 ✓  

## 你的公网地址

```
https://你的GitHub用户名.github.io/zinong2017/
```

---

**示例**：若用户名为 `Zinong2017`，则地址为：

https://Zinong2017.github.io/zinong2017/
