# Zinong2017 — 个人品牌官网

AI（Agent）产品经理 · 产品设计专业。极简高级风单页，纯 HTML + CSS + JavaScript，字体通过 Google Fonts CDN 加载。

## 图片资源

轮播与作品图已放在 `assets/img/`（本地 JPG，手机端无需访问外网图床）。部署时请**连同 `assets` 文件夹一起上传**。

## 本地预览

> 手机预览请用电脑局域网地址（如 `http://192.168.x.x:8080`），不要只发 `file://` 路径。

在项目根目录启动任意静态服务器，例如：

```bash
# Python 3
python -m http.server 8080

# 或 Node（需已安装 npx）
npx serve .
```

浏览器访问 `http://localhost:8080`。

也可直接双击 `index.html` 打开（部分浏览器对本地图片跨域有限制，推荐用本地服务器）。

## 自定义内容

| 位置 | 说明 |
|------|------|
| `index.html` | 昵称、文案、社交链接 URL、邮箱 |
| 轮播图 | 替换 `carousel__slide` 内图片 URL，建议 16:9，3~5 张 |
| 微信二维码 | 将 `modal__qr` 的 `src` 换为你的二维码图片路径 |
| `css/style.css` `:root` | 若换风格 2/3，修改色值变量即可 |

## 已实现功能

- 固定导航 + 磨砂玻璃 + 滚动实色变化
- 全屏海报轮播（淡入淡出、自动播放 4s、悬停暂停）
- 关于我 / 技能 / 作品 / 随笔 / 联系 / 页脚社交
- 作品大图预览、微信二维码弹窗、邮箱一键复制
- 板块渐入动画、三端响应式、汉堡菜单（手机）

## 文件结构

```
├── index.html
├── css/style.css
├── js/main.js
└── README.md
```
