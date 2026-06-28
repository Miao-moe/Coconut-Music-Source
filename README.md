一个免费的落雪音源的音源开源项目
# 🎵 Sound-source-for-all

[English](#en) · [简体中文](#zh-cn) · [繁體中文](#zh-tw)

---

<a name="en"></a>
## 🇬🇧 English

**A free, open‑source music source aggregator for LX Music (洛雪音乐) – bring multiple platforms together in one script.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Latest Release](https://img.shields.io/github/v/release/nkolp/Sound-source-for-all)](https://github.com/nkolp/Sound-source-for-all/releases)
[![Stars](https://img.shields.io/github/stars/nkolp/Sound-source-for-all)](https://github.com/nkolp/Sound-source-for-all/stargazers)

### 📖 About

**Sound-source-for-all** is a unified JavaScript source for [LX Music](https://github.com/lyswhut/lx-music-desktop). It aggregates multiple free music APIs so you can search, play, and get lyrics from major Chinese music platforms – all without needing separate premium accounts.

> ⚠️ **Current Status**  
> - ✅ Fully supported: **NetEase Cloud (wy)**, **Kuwo (kw)**, **Kugou (kg)**, **Migu (mg)**  
> - ⚠️ Experimental / limited: **QQ Music (tx)** – works only if you obtain and configure a **Yuningxi API key** (see below).  
> - ❌ Not supported: **Qishui (汽水)** – removed due to API instability.

### ✨ Features

- **Multi‑platform** – One script for NetEase, Kuwo, Kugou, Migu, and (partially) QQ.
- **Intelligent fallback** – Automatically tries alternative sources if one fails.
- **High‑quality audio** – Supports FLAC, Hi‑Res, 320k, 192k, and 128k (depending on source).
- **Request caching** – Reduces API load and speeds up repeated playback.
- **Customisable** – Easily enable/disable sources, set timeouts, or plug in your own API keys.
- **Lightweight** – No external dependencies; runs directly inside LX Music's script engine.
- **Open Source** – GPL‑v3 licensed – contributions are welcome!

### 🎯 Supported Platforms & Quality

| Platform      | Code | Support Level | Available Qualities          |
|---------------|------|---------------|------------------------------|
| NetEase Cloud | `wy` | ✅ Full       | 128k, 192k, 320k, FLAC, 24bit |
| Kuwo          | `kw` | ✅ Full       | 128k, 192k, 320k, FLAC       |
| Kugou         | `kg` | ✅ Full       | 128k, 192k, 320k, FLAC       |
| Migu          | `mg` | ✅ Full       | 128k, 192k, 320k, FLAC       |
| QQ Music      | `tx` | ⚠️ Conditional | Depends on the source used   |

> For QQ Music, you need to **obtain a Yuningxi API key** (`http://api-v2.yuafeng.cn`) and set it in the script. Without it, QQ may fail or return low quality.

### 🚀 Installation & Usage

**For LX Music Desktop / Mobile**

1. Open LX Music and go to **Settings → Music Source**.
2. Click **"Import from URL"** and paste:
3. 3. The script will load automatically. You can then select it as your active music source.

**Manual Installation**

- Download the latest `source.js` from the [Releases](https://github.com/nkolp/Sound-source-for-all/releases) page.
- Place it in LX Music's `custom_sources` folder (or import via the GUI).

### ⚙️ Configuration (Optional)

Edit the top of `source.js` to adjust these variables:

| Variable               | Purpose                                                                 |
|------------------------|-------------------------------------------------------------------------|
| `DEBUG`                | Set `true` for verbose console logs (helpful for troubleshooting).      |
| `CACHE_TTL_MS`         | Cache duration (default: 6 hours).                                      |
| `REQUEST_TIMEOUT`      | Request timeout in milliseconds (default: 15000).                       |
| `YUNINGXI_KEY`         | **Required for QQ Music** – obtain from [http://api-v2.yuafeng.cn].     |
| `HUIBQ_API` / `KEY`    | Optional: add your own Huibq credentials.                               |
| `LINGCHUAN_API`        | Optional: custom Lingchuan endpoint.                                    |

> **Note:** Most sources work without any key. Only QQ (via Yuningxi) needs manual configuration.

### 🛠️ Development & Contribution

We welcome contributions! Here’s how you can help:

1. **Fork** the repository.
2. **Create a new branch** for your feature or bug fix.
3. **Make your changes** – keep code clean, add comments, and update this README if needed.
4. **Test** thoroughly in LX Music.
5. **Submit a Pull Request** with a clear description.

**Reporting Issues**

If a source stops working or you encounter errors:

- Enable `DEBUG` to capture logs.
- Open an issue with:
  - The platform (e.g., NetEase, Kuwo).
  - The song/track you tried.
  - Any error messages from the console.

### 📜 License

This project is licensed under the **GNU General Public License v3.0**.  
See the [LICENSE](LICENSE) file for details.

### 🙏 Acknowledgements

- [LX Music](https://github.com/lyswhut/lx-music-desktop) – the excellent player that powers this.
- All the public music APIs and their developers.
- The community for testing and feedback.

### 📬 Community & Support

- **GitHub Issues**: [https://github.com/nkolp/Sound-source-for-all/issues](https://github.com/nkolp/Sound-source-for-all/issues)
- **LX Music Official Group**: [QQ Group 822317725](https://qm.qq.com/q/822317725) (Chinese)

---

<a name="zh-cn"></a>
## 🇨🇳 简体中文

**一个免费、开源的洛雪音乐音源聚合脚本 – 将多个平台集成到一个脚本中。**

[![许可证: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![最新发布](https://img.shields.io/github/v/release/nkolp/Sound-source-for-all)](https://github.com/nkolp/Sound-source-for-all/releases)
[![星标](https://img.shields.io/github/stars/nkolp/Sound-source-for-all)](https://github.com/nkolp/Sound-source-for-all/stargazers)

### 📖 项目介绍

**Sound-source-for-all** 是为 [洛雪音乐](https://github.com/lyswhut/lx-music-desktop) 编写的统一 JavaScript 音源。它聚合了多个免费音乐 API，让您可以搜索、播放和获取歌词，涵盖主流中文音乐平台，无需单独购买会员。

> ⚠️ **当前状态**  
> - ✅ 完全支持：**网易云音乐 (wy)**、**酷我音乐 (kw)**、**酷狗音乐 (kg)**、**咪咕音乐 (mg)**  
> - ⚠️ 实验性/受限：**QQ音乐 (tx)** – 需自行获取并配置 **玉宁熙 API Key**（见下文）方可使用。  
> - ❌ 不支持：**汽水音乐** – 因 API 不稳定已移除。

### ✨ 功能特性

- **多平台** – 一套脚本覆盖网易、酷我、酷狗、咪咕和部分 QQ。
- **智能降级** – 若某个源失败，自动尝试其他备用源。
- **高品质音频** – 支持 FLAC、Hi‑Res、320k、192k、128k（取决于源）。
- **请求缓存** – 减少重复 API 调用，提升播放速度。
- **可定制** – 轻松启用/禁用源、设置超时、填入自定义 API 密钥。
- **轻量** – 无外部依赖，直接在洛雪音乐脚本引擎中运行。
- **开源** – GPL‑v3 许可，欢迎贡献。

### 🎯 支持的平台与音质

| 平台         | 代码 | 支持级别 | 可用音质                     |
|--------------|------|----------|------------------------------|
| 网易云音乐   | `wy` | ✅ 完整   | 128k, 192k, 320k, FLAC, 24bit |
| 酷我音乐     | `kw` | ✅ 完整   | 128k, 192k, 320k, FLAC       |
| 酷狗音乐     | `kg` | ✅ 完整   | 128k, 192k, 320k, FLAC       |
| 咪咕音乐     | `mg` | ✅ 完整   | 128k, 192k, 320k, FLAC       |
| QQ音乐       | `tx` | ⚠️ 有条件 | 取决于所使用的源              |

> 对于 QQ 音乐，您需要**获取玉宁熙 API Key**（`http://api-v2.yuafeng.cn`）并在脚本中配置。若无 Key，QQ 可能失败或只返回低音质。

### 🚀 安装与使用

**洛雪音乐桌面版/移动版**

1. 打开洛雪音乐，进入 **设置 → 音乐来源**。
2. 点击 **“从 URL 导入”**，粘贴：
3. 3. 脚本会自动加载，然后您可以选择它作为当前音源。

**手动安装**

- 从 [Releases](https://github.com/nkolp/Sound-source-for-all/releases) 页面下载最新的 `source.js`。
- 将其放入洛雪音乐的 `custom_sources` 文件夹（或通过图形界面导入）。

### ⚙️ 配置（可选）

编辑 `source.js` 顶部的变量：

| 变量                   | 作用                                                         |
|------------------------|--------------------------------------------------------------|
| `DEBUG`                | 设为 `true` 可输出详细控制台日志（便于调试）。                |
| `CACHE_TTL_MS`         | 缓存有效期（毫秒，默认 6 小时）。                             |
| `REQUEST_TIMEOUT`      | 请求超时（毫秒，默认 15000）。                                |
| `YUNINGXI_KEY`         | **QQ 音乐必需** – 从 [http://api-v2.yuafeng.cn] 获取。        |
| `HUIBQ_API` / `KEY`    | 可选：填入自己的 Huibq 凭证。                                 |
| `LINGCHUAN_API`        | 可选：自定义聆川端点。                                        |

> **注意：** 大多数源无需任何 Key，仅 QQ（通过玉宁熙）需要手动配置。

### 🛠️ 开发与贡献

欢迎贡献！参与方式：

1. **复刻** 本仓库。
2. **创建新分支** 进行功能或修复。
3. **进行修改** – 保持代码整洁，添加注释，必要时更新此 README。
4. **在洛雪音乐中充分测试**。
5. **提交拉取请求**，附上清晰的修改说明。

**报告问题**

如果某个源失效或遇到错误：

- 开启 `DEBUG` 捕获日志。
- 提交 Issue，包含：
  - 平台（如网易、酷我）。
  - 尝试的歌曲。
  - 控制台输出的错误信息。

### 📜 许可证

本项目采用 **GNU General Public License v3.0** 许可。  
详见 [LICENSE](LICENSE) 文件。

### 🙏 致谢

- [洛雪音乐](https://github.com/lyswhut/lx-music-desktop) – 优秀的播放器。
- 所有公开音乐 API 及其开发者。
- 社区测试和反馈。

### 📬 社区与支持

- **GitHub Issues**：[https://github.com/nkolp/Sound-source-for-all/issues](https://github.com/nkolp/Sound-source-for-all/issues)
- **洛雪音乐官方群**：[QQ群 822317725](https://qm.qq.com/q/822317725)

---

<a name="zh-tw"></a>
## 🇹🇼 繁體中文

**一個免費、開源的洛雪音樂音源聚合腳本 – 將多個平台集成到一個腳本中。**

[![許可證: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![最新發佈](https://img.shields.io/github/v/release/nkolp/Sound-source-for-all)](https://github.com/nkolp/Sound-source-for-all/releases)
[![星標](https://img.shields.io/github/stars/nkolp/Sound-source-for-all)](https://github.com/nkolp/Sound-source-for-all/stargazers)

### 📖 專案介紹

**Sound-source-for-all** 是為 [洛雪音樂](https://github.com/lyswhut/lx-music-desktop) 編寫的統一 JavaScript 音源。它聚合了多個免費音樂 API，讓您可以搜尋、播放和獲取歌詞，涵蓋主流中文音樂平台，無需單獨購買會員。

> ⚠️ **當前狀態**  
> - ✅ 完全支援：**網易雲音樂 (wy)**、**酷我音樂 (kw)**、**酷狗音樂 (kg)**、**咪咕音樂 (mg)**  
> - ⚠️ 實驗性/受限：**QQ音樂 (tx)** – 需自行獲取並配置 **玉寧熙 API Key**（見下文）方可使用。  
> - ❌ 不支援：**汽水音樂** – 因 API 不穩定已移除。

### ✨ 功能特性

- **多平台** – 一套腳本覆蓋網易、酷我、酷狗、咪咕和部分 QQ。
- **智慧降級** – 若某個源失敗，自動嘗試其他備用源。
- **高品質音訊** – 支援 FLAC、Hi‑Res、320k、192k、128k（取決於源）。
- **請求快取** – 減少重複 API 呼叫，提升播放速度。
- **可定制** – 輕鬆啟用/停用源、設定逾時、填入自訂 API 金鑰。
- **輕量** – 無外部依賴，直接在洛雪音樂腳本引擎中運行。
- **開源** – GPL‑v3 許可，歡迎貢獻。

### 🎯 支援的平台與音質

| 平台         | 代碼 | 支援級別 | 可用音質                     |
|--------------|------|----------|------------------------------|
| 網易雲音樂   | `wy` | ✅ 完整   | 128k, 192k, 320k, FLAC, 24bit |
| 酷我音樂     | `kw` | ✅ 完整   | 128k, 192k, 320k, FLAC       |
| 酷狗音樂     | `kg` | ✅ 完整   | 128k, 192k, 320k, FLAC       |
| 咪咕音樂     | `mg` | ✅ 完整   | 128k, 192k, 320k, FLAC       |
| QQ音樂       | `tx` | ⚠️ 有條件 | 取決於所使用的源              |

> 對於 QQ 音樂，您需要**獲取玉寧熙 API Key**（`http://api-v2.yuafeng.cn`）並在腳本中配置。若無 Key，QQ 可能失敗或只回傳低音質。

### 🚀 安裝與使用

**洛雪音樂桌面版/行動版**

1. 開啟洛雪音樂，進入 **設定 → 音樂來源**。
2. 點擊 **「從 URL 匯入」**，貼上：
