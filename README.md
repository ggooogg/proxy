# Proxy - GitHub 加速 & 通用代理

基于 EdgeOne 边缘函数的代理服务：GitHub 链接走 gh-proxy 加速节点，其他任意链接走云函数代理转发，提升下载速度与访问体验。

## 功能特性

- **双通道自动分流** — `自动识别`（默认）/ `GitHub 节点` / `云函数代理`，按目标域名自动选择通道
- **GitHub 多节点加速** — 内置 5 个固定加速节点（`gh-proxy.org` / `v4.gh-proxy.org` 推荐 / `v6` / `cdn` / `axisnow`），节点列表写死在前端，不再抓取第三方站点
- **4 种解析方式** — 原始链接 / Git Clone / Wget / cURL，一键切换并同步刷新结果
- **通用链接代理** — 非 GitHub 链接自动通过云函数代理转发（限 6M 以内），如 API 接口、图片等；也可手动强制 GitHub 链接走云函数
- **智能输入解析** — 支持完整链接、裸域名、`user/repo` 简写，并自动剥离已有的 `gh-proxy` 加速前缀
- **API 加速** — 支持 GitHub API 及第三方 API 请求代理加速
- **安全可靠** — 透明代理，不修改任何文件内容
- **协议还原** — 支持 `ht-tps` / `ht-tp` 协议占位符还原为 `https` / `http`，防止链接被平台拦截
- **智能分流** — 文本类响应缓冲读取，二进制响应流式转发，避免大文件 OOM
- **暗色模式** — 前端页面支持亮色/暗色主题切换，自动跟随系统偏好

## 项目结构

```
├── cloud-functions/        # Node 云函数部署目录
│   └── c/[[default]].js    # /c/<目标URL> 路径型代理入口（含完整代理逻辑）
├── edge-functions/         # 边缘函数部署目录
│   └── e/[[default]].js    # /e/<目标URL> 路径型代理入口（前端「云函数代理」通道使用）
├── .edgeone/             # EdgeOne 构建产物（已忽略）
├── index.html            # 前端页面（加速通道 / 节点 / 解析方式 / 快捷示例）
└── .gitignore
```

## 环境要求

> **⚠️ 重要：必须使用 Node.js v20.18.0 进行开发！**

| Node.js 版本 | 是否可用 | 说明 |
|---|---|---|
| **v20.18.0** | ✅ 推荐 | LTS 稳定版，完全兼容 |
| v21.x | ❌ 不可用 | HTTP 解析器过于严格，会触发 `HPE_CLOSED_CONNECTION` 错误导致闪退 |
| v24.x | ❌ 不可用 | 同上，v24 的 HTTP 解析器将 `Connection: close` 后的数据传输视为致命错误，导致本地 dev server 请求 GitHub API 时崩溃 |

### 为什么不能用高版本？

Node.js v21+ 及 v24+ 改进了 HTTP 解析器的安全校验，但过于严格：当上游服务器在响应头中返回 `Connection: close` 后仍有数据传输时，新版解析器会直接抛出致命错误终止连接。而 GitHub 等部分服务器存在此类行为，导致本地开发时 dev server 直接崩溃闪退。

**Node.js v20 LTS 不存在此问题，是目前唯一可用的开发版本。**

### 版本检查与切换

```bash
# 检查当前 Node.js 版本
node -v

# 使用 nvm 切换到 v20.18.0
nvm install 20.18.0
nvm use 20.18.0
```

## 本地开发

```bash
# 安装 EdgeOne CLI（如未安装）
npm install -g edgeone

# 登录 EdgeOne CLI（如未登录）
edgeone login

# 启动本地开发服务器
edgeone makers dev
```

## 使用方式

### 前端页面

在页面输入框粘贴链接，点击「转换」得到结果，再点「复制」或「打开」即可。页面自上而下为：输入框 → 加速通道 → 加速节点 → 解析方式 → 结果卡片 → 快捷示例。

- **加速通道**：`自动识别` / `GitHub 节点` / `云函数代理`。自动识别规则：
  - 命中 GitHub 相关域名 → 走加速节点
  - 其余任意网址 → 走云函数代理（`/e/<目标URL>`）
- **GitHub 链接**：走加速节点，可切换 5 个节点（`gh-proxy.org`、`v4.gh-proxy.org`、`v6.gh-proxy.org`、`cdn.gh-proxy.org`、`axisnow.gh-proxy.org`），解析方式支持 原始链接 / Git Clone / Wget / cURL
- **非 GitHub 链接**：自动走云函数代理（限 6M 以内），此时隐藏「加速节点」一栏
- 命中的 GitHub 域名：`github.com`、`raw.githubusercontent.com`、`gist.github.com`、`gist.githubusercontent.com`、`api.github.com`、`avatars.githubusercontent.com`、`desktop.githubusercontent.com`、`objects.githubusercontent.com`、`codeload.github.com`
- 支持回车键快速提交，支持 `user/repo` 简写与裸域名输入；Git Clone 仅支持走加速节点的 `github.com` 仓库链接
- 点击「快捷示例」chips 可一键填入并直接解析（Git 克隆示例会自动切到 Git Clone 方式，其余回到原始链接）

### API 调用

路径型代理：目标 URL 放在路径后缀中，需对 `://` 中的 `:` 与 `/` 做 URL 编码，或用 `ht-tps` / `ht-tp` 占位符。通过 `/e` 走边缘函数（云函数）代理转发，行为与原 Node 云函数一致。

> 说明：前端页面对 GitHub 链接默认走加速节点，不再生成 `/e/` 链接；但 `/e/` 作为接口仍可直接代理任意网址，包括 GitHub 资源。

```
# 边缘函数（云函数）代理（默认）
/e/ht-tps%3A%2F%2Fmovie.douban.com?name=wei
```

**协议占位符：**

为防止链接被平台拦截，URL 中的协议可使用占位符：
- `ht-tps://` → `https://`
- `ht-tp://` → `http://`

**请求自带的查询参数**（如上面 `?name=wei`）会自动透传给上游目标地址。

**示例：**

```
# 通过云函数代理下载 GitHub Release 文件
/e/ht-tps%3A%2F%2Fgithub.com%2Fuser%2Frepo%2Freleases%2Fdownload%2Fv1.0%2Ffile.zip

# 通过云函数代理 GitHub API 请求
/e/ht-tps%3A%2F%2Fapi.github.com%2Frepos%2Fuser%2Frepo

# 代理第三方 API 接口
/e/ht-tps%3A%2F%2Fmovie.douban.com%2Fj%2Fsearch_subjects%3Ftype%3Dmovie%26tag%3D热门

# 代理图片资源
/e/ht-tps%3A%2F%2Fcn.bing.com%2Fth%3Fid%3DOHR.SaguaroSun_EN-US8982109543_UHD.jpg
```

### 支持的资源类型

**GitHub 资源：**

- 分支源码包（zip / tar.gz）
- Release 源码包
- Release 附件文件
- 仓库文件（blob）
- Raw 文件
- Gist 文件
- GitHub API 接口

**非 GitHub 资源（限 6M 以内）：**

- 第三方 API 接口
- 图片、文件等资源
- 任意可通过 HTTP/HTTPS 访问的链接

## 部署

本项目基于腾讯云 EdgeOne 边缘函数部署，构建产物位于 `.edgeone/` 目录。

## License

[MIT](LICENSE)
