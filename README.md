# Proxy - GitHub 文件及 API 加速

基于 EdgeOne 边缘函数的 GitHub 代理服务，通过全球节点加速 GitHub 资源访问，提升下载速度与访问体验。

## 功能特性

- **高速下载** — 全球边缘节点加速，大幅提升 GitHub 文件下载速度
- **API 加速** — 支持 GitHub API 请求代理加速
- **安全可靠** — 透明代理，不修改任何文件内容
- **协议还原** — 支持 `ht-tps` / `ht-tp` 协议占位符还原为 `https` / `http`，防止链接被平台拦截
- **智能分流** — 文本类响应缓冲读取，二进制响应流式转发，避免大文件 OOM
- **暗色模式** — 前端页面支持亮色/暗色主题切换

## 项目结构

```
├── cloud-functions/p/
│   └── index.js          # 边缘函数（代理核心逻辑）
├── .edgeone/             # EdgeOne 构建产物（已忽略）
├── index.html            # 前端页面
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

直接在页面输入框中粘贴 GitHub 链接，点击「加速访问」即可在新窗口打开加速后的链接。

### API 调用

```
GET /p?url=<目标URL>
```

**参数说明：**

| 参数 | 必填 | 说明 |
|---|---|---|
| `url` | 是 | 目标 GitHub URL，支持带 `https://` 或不带的格式 |

**协议占位符：**

为防止链接被平台拦截，URL 中的协议可使用占位符：
- `ht-tps://` → `https://`
- `ht-tp://` → `http://`

**示例：**

```
# 加速下载 Release 文件
/p?url=ht-tps://github.com/user/repo/releases/download/v1.0/file.zip

# 加速 API 请求
/p?url=ht-tps://api.github.com/repos/user/repo
```

### 支持的资源类型

- 分支源码包（zip / tar.gz）
- Release 源码包
- Release 附件文件
- Commit 文件
- Gist 文件
- GitHub API 接口

## 部署

本项目基于腾讯云 EdgeOne 边缘函数部署，构建产物位于 `.edgeone/` 目录。

## License

[MIT](LICENSE)
