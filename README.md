<p align="center">
  <img src="Lyricify.Lyrics.Helper/Resources/icon.png" width="96" alt="Lyricify Lyrics Helper icon">
</p>

# Lyricify Lyrics Helper

Lyricify 的歌词解析、生成、搜索和处理工具集。仓库同时提供可部署到 Cloudflare Workers 的逐行歌词 API，便于移动端或其他客户端通过 HTTP 接入歌词来源。

## 功能

### .NET 工具库

- 解析 Lyricify Syllable、Lyricify Lines、LRC、QRC、KRC、YRC、TTML、Spotify 和 Musixmatch 歌词
- 生成 Lyricify Syllable、Lyricify Lines、LRC、QRC、KRC 和 YRC 歌词
- 搜索 QQ 音乐、网易云音乐、酷狗音乐、汽水音乐、Apple Music 和 Musixmatch
- 处理 Explicit、YRC、Musixmatch、Apple Music、同步级别降级和信息行
- 解密 QRC 和 KRC 歌词

### Cloudflare Worker API

- 按 `LRCLIB`、网易云音乐、QQ 音乐顺序回退
- 统一输出带毫秒时间戳的逐行歌词，不输出逐字歌词或无时间戳歌词
- 支持按时间戳对齐翻译
- 使用 Cloudflare Cache API 缓存成功响应
- 可选 Bearer Token 或 `X-API-Key` 鉴权
- 单个来源失败不会阻断后续来源

## 项目结构

```text
Lyricify.Lyrics.Helper/  .NET Standard 2.1 歌词工具库
Lyricify.Lyrics.Demo/    .NET 6 演示程序
worker/                  Cloudflare Worker 与测试
```

## Worker API

### 获取歌词

```http
GET /v1/lyrics?title=Hello&artist=Adele&album=25&durationMs=295000&spotifyId=4sPmO7WMQUAf45kwMOtONw&language=zh
```

参数：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 歌曲名 |
| `artist` | 是 | 艺术家名 |
| `album` | 否 | 专辑名，用于提高匹配准确度 |
| `durationMs` | 否 | 歌曲时长，单位毫秒 |
| `spotifyId` | 否 | Spotify 曲目 ID，作为请求上下文及缓存键的一部分 |
| `language` | 否 | 翻译语言代码，默认 `zh` |
| `providers` | 否 | 本次请求的来源顺序，例如 `lrclib,netease` |

成功响应：

```json
{
  "provider": "lrclib",
  "providerDisplayName": "LRCLIB",
  "providerLyricsId": "7136713",
  "timeSynced": true,
  "lines": [
    { "content": "Hello, it's me", "offsetMs": 12000 }
  ],
  "translation": {
    "languageCode": "zh",
    "lines": ["你好，是我"]
  }
}
```

`translation` 仅在来源返回翻译时存在。找不到逐行歌词时返回 `404 lyrics_not_found`。

### 健康检查

直接访问 Worker 根地址 `/` 会显示只读服务信息页，包括运行状态、来源顺序、API 参数、鉴权状态和缓存时间。页面不包含请求测试功能。

```http
GET /health
```

### 鉴权

未配置 `API_TOKEN` 时 API 公开访问。配置后，歌词接口接受以下任一请求头：

```http
Authorization: Bearer your-token
X-API-Key: your-token
```

## 本地开发

需要 Node.js 20 或更高版本。

```bash
cd worker
npm install
npm test
npm run build
npm run dev
```

本地服务启动后，可访问 Wrangler 输出的地址：

```bash
curl "http://localhost:8787/v1/lyrics?title=Hello&artist=Adele&durationMs=295000"
```

## 部署到 Cloudflare

### 连接 GitHub 自动部署

在 Cloudflare Workers & Pages 中导入本 GitHub 仓库，保持仓库根目录不变，并设置：

| 设置 | 值 |
| --- | --- |
| Build command | 留空 |
| Deploy command | `npx wrangler deploy` |
| Production branch | `master` |

根目录的 `wrangler.jsonc` 会让 Wrangler 自动定位 `worker/src/index.ts`。推送到 `master` 后，Cloudflare 会自动重新部署。

### Wrangler 部署

1. 登录 Cloudflare：

   ```bash
   cd worker
   npx wrangler login
   ```

2. 如需鉴权，写入 secret：

   ```bash
   npx wrangler secret put API_TOKEN
   ```

3. 部署：

   ```bash
   npm run deploy
   ```

根目录的 `wrangler.jsonc` 提供以下默认变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PROVIDER_ORDER` | `lrclib,netease,qqmusic` | 来源回退顺序 |
| `CACHE_TTL_SECONDS` | `86400` | 成功响应缓存秒数；设为 `0` 禁用缓存 |

> [!IMPORTANT]
> 网易云音乐和 QQ 音乐使用其公开 Web 接口，接口可能调整、限流或受地区网络策略影响。部署者应自行确认使用方式符合服务条款。LRCLIB 数据遵循其自身许可和使用要求。

## .NET 构建

```bash
dotnet restore "Lyricify Lyrics Helper.sln"
dotnet build "Lyricify Lyrics Helper.sln"
dotnet run --project Lyricify.Lyrics.Demo
```

## 致谢

感谢 [@cnbluefire](https://github.com/cnbluefire) 和 [@Raspberry Kan](https://github.com/Raspberry-Monster) 提供帮助和支持。

- [LyricParser](https://github.com/HyPlayer/LyricParser)（MIT）
- [163MusicLyrics](https://github.com/jitwxs/163MusicLyrics)（Apache-2.0）
