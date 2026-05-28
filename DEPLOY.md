# 让所有人都能访问 — 发布指南

网站已准备好，任选下面 **一种方式** 即可公网访问（推荐方式 1，永久免费）。

---

## 方式 1：GitHub Pages（推荐，永久地址）

### 第一步：在 GitHub 创建仓库

1. 打开 https://github.com/new  
2. 仓库名填：`zinong2017`（或任意英文名）  
3. 选择 **Public（公开）**  
4. **不要**勾选 “Add a README”  
5. 点击 Create repository  

### 第二步：在本机运行发布脚本

在项目文件夹打开 PowerShell，执行：

```powershell
cd "e:\Study_Ai\Zinong2017"
.\deploy.ps1
```

按提示粘贴仓库地址，例如：

```
https://github.com/你的GitHub用户名/zinong2017.git
```

首次推送会弹出 GitHub 登录窗口，完成登录即可。

### 第三步：开启 GitHub Pages

1. 打开仓库 → **Settings** → **Pages**  
2. **Build and deployment** → Source 选 **GitHub Actions**  
3. 等 1～2 分钟，在 **Actions** 标签看到绿色勾  

### 你的公网地址

```
https://你的GitHub用户名.github.io/zinong2017/
```

（若仓库名是 `zinong2017`，路径就是 `/zinong2017/`；若仓库名是 `你的用户名.github.io`，则地址为 `https://你的用户名.github.io/`）

---

## 方式 2：Netlify 拖拽（无需命令行，约 2 分钟）

1. 打开 https://app.netlify.com/drop  
2. 注册 / 登录 Netlify  
3. 把项目里的 **`zinong2017-site.zip`** 拖进页面  
4. 自动生成类似 `https://随机名.netlify.app` 的网址，可在设置里改自定义域名  

---

## 方式 3：Cloudflare Pages 拖拽

1. 打开 https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Upload assets**  
2. 上传 **`zinong2017-site.zip`**  
3. 部署完成后获得 `https://xxx.pages.dev` 地址  

---

## 国内访问说明

- GitHub Pages / Netlify / Cloudflare 在海外节点，国内可能偶发较慢。  
- 若主要访客在国内，可考虑同步到 **Gitee Pages** 或 **腾讯云静态托管**（把同样文件上传即可）。  

---

## 已为你准备好的内容

| 文件 | 作用 |
|------|------|
| `zinong2017-site.zip` | 整站打包，可直接拖拽部署 |
| `deploy.ps1` | 一键推送到 GitHub |
| `.github/workflows/pages.yml` | 推送后自动发布 |

更新网站内容后，再次运行 `.\deploy.ps1` 或重新上传 zip 即可。
