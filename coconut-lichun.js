/**
 * @name 椰子音源
 * @description 聚合五平台顺序兜底的自定义音源（春·雨水版，原 椰子音源 改版）
 * @version 春·雨水
 * @author 椰椰
 * @homepage https://github.com/Miao-moe/Coconut-Music-Source
 * @tx_cookie null
 * @wy_cookie null
 * @hyw_key null
 * @canxiang_token null
 * @wanfeng_key null
 * @yunmge_token null
 * @apizero_key null
 * @changelog
 *   - 春·雨水 兜底链重写（2026-11-21）：
 *     1) 废除首两后端并发竞速（promiseAny），改为严格按实测可用性排序的顺序兜底——
 *        竞速会把最慢后端的超时叠加进每次取链，导致超过播放器取链窗口而「测试接口失败」；
 *     2) 实测可用后端前置（酷我手机版/官方、网易云官方 EAPI、gdstudio、ikun、酷狗v5签名），
 *        需要填 API/Token 的后端（@apizero_key/@yunmge_token/@hyw_key 等）统一放到队尾；
 *     3) 新增日志输出系统：时间戳+级别+平台标签，环形缓冲最近 300 条，控制台实时输出，
 *        在脚本控制台执行 __coconutLog.dump() 可导出全部日志；
 *     4) 新增失败冷却机制：某后端失败后 10 分钟内自动跳过（全部冷却时忽略冷却照常尝试），
 *        避免每次播放都重复撞死接口；
 *     5) 新增单次请求 9.5 秒时间预算，超预算立即返回已收集的错误摘要，不再无限拖长；
 *     6) 音质降级链简化为「请求音质 → 128k」两轮，减少无效重试；
 *     7) 实测下线后端清理：念心(nxinxz)系列 404、晚风(nonebot)路由 404、远梦(mmp)停服、
 *        长青海棠停止服务、星海(zddyr)失联、笒鬼鬼 Cloudflare 521、ygking/HelloWorld/apibyte 失联、
 *        旧版 FishAPI 签名接口无响应、酷我流媒体服务器音质参数已变更（直链无法校验，移除）；
 *     8) HYWmusic 内置卡密已失效（401 卡密不存在），改为 @hyw_key 用户填写；残像支持
 *        @canxiang_token 覆盖；云萌阁内置 token 实测仍有效；
 *     9) 来源顺序调整为 网易、酷我、QQ、酷狗、咪咕（可用源优先显示）。
 *   - 春·立春 椰子音源首版（由 新星澜音乐源 v0.0.14 改版而来，原项目 Miao-moe/Stellarwave-Music-Source，
 *     原作者 曦&無名&云汀（Miao-moe）；版本号采用「季·节气」制，自二十四节气之首「立春」起）。
 *   - 配置项说明：@tx_cookie / @wy_cookie 为可选平台 Cookie（解锁高音质，按账号权限）；
 *     @hyw_key（HYWmusic 卡密）/ @canxiang_token（残像 API）/ @wanfeng_key / @yunmge_token /
 *     @apizero_key 填写后优先使用你的密钥，不填写则使用内置加密默认值（若有）；这些后端
 *     均排在实测可用后端之后，不填写也不影响主力链路。咪咕官方接口与自建 H5 v2.4 的
 *     token/防爬头均为内置固定配置，不需要用户填写。
 */

const { EVENT_NAMES, request, on, send, utils, env, version, currentScriptInfo } = globalThis.lx

// ==================== 基础工具 ====================
const httpFetch = (url, options = {}) => new Promise((resolve, reject) => {
  request(url, options, (err, resp) => {
    if (err) return reject(err)
    let body = resp.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch (e) { /* 保留原始字符串 */ }
    }
    resolve({ body, statusCode: resp.statusCode, headers: resp.headers || {} })
  })
})

const md5 = (str) => utils.crypto.md5(str)

const randomGuid = () => {
  const hex = '0123456789abcdef'
  let guid = ''
  for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)]
  return guid
}

const objToForm = (obj) => Object.keys(obj || {})
  .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]))
  .join('&')

// ==================== 密钥保险库 ====================
// 设计约定（勿改逻辑）：脚本正文全部明文可读，只有 API 密钥/Token 不以明文出现，
// 统一以「XOR(VAULT_SEED) + Base64」形式存放在 KEY_VAULT，运行时由 unlockKey 还原。
// 注意：该方案用于避免密钥被扫描工具直接命中，属于混淆存储，无法对抗刻意逆向。
const VAULT_SEED = 'StellarWave@2026#vault'
const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const b64Decode = (str) => {
  const clean = String(str || '').replace(/=+$/, '')
  const bytes = []
  let bits = 0
  let acc = 0
  for (let i = 0; i < clean.length; i++) {
    const idx = B64_ALPHABET.indexOf(clean.charAt(i))
    if (idx < 0) continue
    acc = (acc << 6) | idx
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((acc >> bits) & 0xff)
    }
  }
  return bytes
}

const unlockKey = (packed) => {
  const bytes = b64Decode(packed)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i] ^ VAULT_SEED.charCodeAt(i % VAULT_SEED.length))
  }
  return out
}

const KEY_VAULT = {
  wanfeng: 'ZRdXXFhXR29YTwd0BgMFVxFOVBAOTGZEVl1eBRE0BEc=',     // 晚风 API 默认密钥
  yunmge: 'MgQMQVwHRjRYTlJ0AFVRUxNGAkMPQmsWVQ4NB0M0UkRVcQZTUFUWFQVHXhVgQVVeCgRLbg==', // 云萌阁默认 token
  miguToken: 'GBsLCQcOOzsOAAA5XUVyBBNEV1tCWn1aXFVBPg==',       // 自建咪咕 H5 v2.4 token
  miguKoneko: 'GhgKGgkYHSI=',                                   // 固定防爬 header: Koneko
  miguYnx: 'GhgKGgkYHSI=',                                      // 固定防爬 header: ynx
  miguDes: 'YURXWiUNHSEEDwo1e0dTWFdPWDwYUyAnKiMjLj0kERMGKVNc',  // 固定防爬 header: des
  canxiang: 'MBULFAUAHDA+AgorV15tBBNEVw==',                     // 残像 API token
  miguAppToken: 'a0BdWFxQQmdRR1Z0AgICBhZOVEdYQGZNVlhYJEdjVUdWcAcCBHcXT1JHWUVkNVBZX1VGE1Y3UHYGAwZzFkNVQF9GZ0RTVFtVRWNWRlYBAHYAcBRGV0RbR2RHUlxaJ0VlVkJXBQR0BA8VQVZAXjFlR1MpXidEElJGVnABAAEHETBVRVpGYE1WWlpTQWBXQFZ0AQIEBRBAUkdaQGBAVlxfWEFiUk9WcwQGBAAVQlJGX0JlQFZYX1BBblJPVnkBAAEFEEZRRlxEY0BVXlVZNxYnNFV0AgACABBEUkdfRGBEVl5fVUJiUUZUdgZ0BgEWT1JAWTVnQFNfW1lGE1JEUQUECAZzF0JVTF9GZzJQW1lXRBVVM1BxdHYCBhFGVkxZRmVHJ1UtUkFkIEJQeAJ1AwVnMlYzXkxrRlUtVCNLYFlOI3MCAAQEZUBRR1kyEkRdLipQQhQiQyR4c3ECAg==', // 咪咕官方 listen-url v2.4 设备 token
  miguAversionid: 'FzJcWFRYSm5YRSR1cwIKdxVCWENUNWoyIVwtJTNnVkJccwsHCgEbNCJGVTAXQycvWlkxYllCJHFwcXNwYE9XMC9BakddKFQlShIlRyR0CwALAho3WTNVMRFCXVxVWEVlWEAhBnYAdgUaRyVDLTYRN1NVVVNKFiVGJ3UFdAsPFEFYNi9MEUxdLyglNxQkM115BAIKcBtPIERURmQxXFRaJ0tjWEFdAXYDCwRiQSBHVUVlNVxeVCAzY1lBXXELCQUBGjU=', // 咪咕官方 listen-url v2.4 aversionid
}

// ==================== 头部配置解析（用户填写优先，默认值兜底） ====================
const currentScript = currentScriptInfo
  ? currentScriptInfo.rawScript
  : (typeof document !== 'undefined' ? (document.currentScript ? document.currentScript.textContent : '') : '')

const parseHeader = (str) => {
  const comment = /^\/\*\*(?:.|\n)+?\*\//.exec(str)
  const source = comment ? comment[0] : String(str || '')
  const result = {}
  const pairs = [
    { key: 'tx_cookie', regex: /\*\s*@tx_cookie\s+(.+)/ },
    { key: 'wy_cookie', regex: /\*\s*@wy_cookie\s+(.+)/ },
    { key: 'hyw_key', regex: /\*\s*@hyw_key\s+(.+)/ },
    { key: 'canxiang_token', regex: /\*\s*@canxiang_token\s+(.+)/ },
    { key: 'wanfeng_key', regex: /\*\s*@wanfeng_key\s+(.+)/ },
    { key: 'yunmge_token', regex: /\*\s*@yunmge_token\s+(.+)/ },
    { key: 'apizero_key', regex: /\*\s*@apizero_key\s+(.+)/ },
  ]
  for (const { key, regex } of pairs) {
    const match = regex.exec(source)
    const val = match ? match[1].trim() : ''
    result[key] = (!val || val === 'null') ? '' : val
  }
  return result
}

const config = parseHeader(currentScript)

const TX_COOKIE = config.tx_cookie
const WY_COOKIE = config.wy_cookie
const HAS_TX_COOKIE = !!TX_COOKIE
const HAS_WY_COOKIE = !!WY_COOKIE

// 用户密钥优先，内置加密默认值兜底
const WANFENG_KEY = config.wanfeng_key || unlockKey(KEY_VAULT.wanfeng)
const YUNMGE_TOKEN = config.yunmge_token || unlockKey(KEY_VAULT.yunmge)
const APIZERO_KEY = config.apizero_key || ''

// 自建咪咕 H5 v2.4：维护者固定接口，带固定防爬 headers，不需要用户填写（v0.0.12 约定）
const MIGU_H5V24_BASE = 'http://111.170.163.118:3037/migu/url/h5v2.4'
const MIGU_H5V24_TOKEN = unlockKey(KEY_VAULT.miguToken)
const MIGU_H5V24_KONEKO = unlockKey(KEY_VAULT.miguKoneko)
const MIGU_H5V24_YNX = unlockKey(KEY_VAULT.miguYnx)
const MIGU_H5V24_DES = unlockKey(KEY_VAULT.miguDes)

// 咪咕官方 listen-url（2026-11-21 实测接口在线；v2.4 内置设备 token 过期时返回软拒，保留兜底）
const MIGU_APP_V24 = 'https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.4'
const MIGU_APP_V22 = 'https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2'
const MIGU_APP_TOKEN = unlockKey(KEY_VAULT.miguAppToken)
const MIGU_AVERSIONID = unlockKey(KEY_VAULT.miguAversionid)

// 其余密钥（卡密/token 同样只走保险库或用户填写；HYW 内置卡密 2026-11-21 实测 401 失效，
// 春·雨水起改为 @hyw_key 用户填写，不填写则自动跳过该后端）
const HYW_CARD_KEY = config.hyw_key || ''
const CANXIANG_TOKEN = config.canxiang_token || unlockKey(KEY_VAULT.canxiang)
const HYW_API_BASE = 'http://103.79.184.97'

// ==================== 日志输出系统 ====================
// 控制台实时输出（桌面端开发者工具 / 移动端日志页可见），同时保留最近 300 条环形缓冲；
// 在脚本控制台执行 __coconutLog.dump() 导出全部日志，__coconutLog.last(20) 查看最近 20 条。
const LOG_BUFFER_MAX = 300
const LOG_LEVEL_PAD = { debug: 'DEBUG', info: 'INFO ', warn: 'WARN ', error: 'ERROR' }
const logBuffer = []

const logStamp = () => {
  const d = new Date()
  const p2 = (n) => (n < 10 ? '0' + n : '' + n)
  const p3 = (n) => (n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n)
  return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) + '.' + p3(d.getMilliseconds())
}

const pushLog = (level, tag, msg) => {
  const line = '[椰子 ' + logStamp() + ' ' + LOG_LEVEL_PAD[level] + '][' + tag + '] ' + String(msg)
  logBuffer.push(line)
  if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift()
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

const Logger = {
  debug: (tag, msg) => pushLog('debug', tag, msg),
  info: (tag, msg) => pushLog('info', tag, msg),
  warn: (tag, msg) => pushLog('warn', tag, msg),
  error: (tag, msg) => pushLog('error', tag, msg),
  dump: () => logBuffer.join('\n'),
  last: (n) => logBuffer.slice(-(Number(n) || 20)).join('\n'),
}

globalThis.__coconutLog = { dump: Logger.dump, last: Logger.last }

// ==================== 后端失败冷却 ====================
// 某后端失败后 10 分钟内自动跳过，避免每次播放都重复撞死接口；
// 若某次取链时该平台全部后端都在冷却中，则忽略冷却照常尝试。
const BACKEND_COOLDOWN_MS = 600000
const backendCooldown = new Map()

const cooldownKey = (source, name) => source + '/' + name

const markBackendFail = (source, name, reason) => {
  backendCooldown.set(cooldownKey(source, name), { at: Date.now(), reason: String(reason).slice(0, 120) })
}

const clearBackendCooldown = (source, name) => {
  backendCooldown.delete(cooldownKey(source, name))
}

const inBackendCooldown = (source, name) => {
  const hit = backendCooldown.get(cooldownKey(source, name))
  if (!hit) return false
  if (Date.now() - hit.at > BACKEND_COOLDOWN_MS) {
    backendCooldown.delete(cooldownKey(source, name))
    return false
  }
  return true
}

// ==================== 音质列表（对齐官方自定义源文档有效值） ====================
// 平台顺序即音源列表展示顺序：实测可用的网易/酷我优先（春·雨水）
const MUSIC_QUALITY = {
  wy: ['128k', '320k', 'flac', 'flac24bit'],
  kw: ['128k', '320k', 'flac', 'flac24bit'],
  tx: ['128k', '320k', 'flac', 'flac24bit'],
  kg: ['128k', '320k', 'flac', 'flac24bit'],
  mg: ['128k', '320k', 'flac', 'flac24bit'],
}
const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY)
const LOWEST_QUALITY = '128k'

// ==================== 各平台音质参数映射 ====================
const TX_FILE_CONFIG = {
  '128k': { s: 'M500', e: '.mp3' },
  '320k': { s: 'M800', e: '.mp3' },
  flac: { s: 'F000', e: '.flac' },
  flac24bit: { s: 'AI00', e: '.flac' },
}

const WY_LEVEL_MAP = { '128k': 'standard', '320k': 'exhigh', flac: 'lossless', flac24bit: 'hires' }

const KW_BR_MAP = { '128k': '128kmp3', '320k': '320kmp3', flac: '2000kflac', flac24bit: '4000kflac' }
const KW_APIZERO_Q_MAP = { '128k': 'h', '320k': 'p', flac: 'ff', flac24bit: 'ff' }

const KG_LEVEL_MAP = { '128k': 'standard', '320k': 'exhigh', flac: 'lossless', flac24bit: 'hires' }

const MG_TONE_FLAG_MAP = { '128k': 'PQ', '320k': 'HQ', flac: 'SQ', flac24bit: 'ZQ' }

const WY_FISH_BR_MAP = { '128k': 128, '320k': 320, flac: 740, flac24bit: 999 }

// ==================== LRU 缓存（6 小时 / 300 条） ====================
const CACHE_TTL_MS = 21600000
const CACHE_MAX_SIZE = 300
const urlCache = new Map()

const getCachedUrl = (key) => {
  const entry = urlCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    urlCache.delete(key)
    return null
  }
  urlCache.delete(key)
  urlCache.set(key, entry) // 刷新 LRU 顺序
  return entry.url
}

const setCachedUrl = (key, url) => {
  if (urlCache.has(key)) urlCache.delete(key)
  urlCache.set(key, { url, timestamp: Date.now() })
  if (urlCache.size > CACHE_MAX_SIZE) {
    const firstKey = urlCache.keys().next().value
    urlCache.delete(firstKey)
  }
}

const buildCacheKey = (source, songId, quality) => source + '_' + songId + '_' + quality

// ==================== URL 提取与过滤 ====================
const normalizeUrl = (url) => (typeof url === 'string' ? url.trim().replace(/\\u0026/g, '&') : '')

const getUrlHost = (url) => {
  const m = /^https?:\/\/([^/\s?#]+)/i.exec(String(url || ''))
  return m ? m[1].toLowerCase() : ''
}

// 通用字段提取：按候选路径依次取首个有效 URL
const extractUrl = (d, paths) => {
  if (!d) return ''
  for (const path of paths) {
    let cur = d
    let ok = true
    for (const seg of path) {
      if (cur && typeof cur === 'object' && seg in cur) cur = cur[seg]
      else { ok = false; break }
    }
    if (ok && typeof cur === 'string' && cur.startsWith('http')) return cur
  }
  return ''
}

const extractAnyPlayableUrl = (d) => extractUrl(d, [
  ['url'], ['play_url'], ['playUrl'], ['music_url'],
  ['data'], ['data', 'url'], ['data', 'play_url'], ['data', 'playUrl'], ['data', 'music_url'],
  ['data', 'data', 'url'], ['data', 'data', 'play_url'],
  ['result', 'url'], ['result', 'play_url'],
])

// 酷我部分后端会返回需要 Referer/Cookie 防盗链的地址，LX 播放器无法携带这些头，
// 这里不做绕过，只识别高风险链接并继续尝试其他后端。
const isKuwoHotlinkRiskUrl = (url) => {
  const u = normalizeUrl(url)
  const host = getUrlHost(u)
  if (!host) return true
  if (host === 'www.kuwo.cn' || host === 'kuwo.cn' || host === 'mobi.kuwo.cn' || host === 'nmobi.kuwo.cn' || host === 'antiserver.kuwo.cn') return true
  if (u.includes('/url?') || u.includes('/mobi.s') || u.includes('/anti.s')) return true
  // bitrate$1 为酷我试听片段标记（flac 请求被降级为 0.18MB mp3 试听）
  if (u.includes('bitrate$1') || u.includes('bitrate$0')) return true
  if (/防盗链|盗链|forbidden|unauthorized/i.test(u)) return true
  return false
}

const isMiguInvalidUrl = (url) => {
  const u = normalizeUrl(url)
  if (!u) return true
  if (/防盗链|盗链|forbidden|unauthorized|无权限|会员|vip/i.test(u)) return true
  return false
}

// QQ 试听片段识别：RS01/RS02 前缀文件为 60 秒试听，不能冒充正曲返回给播放器
const isTxTrialUrl = (url) => {
  const u = normalizeUrl(url)
  if (!u) return false
  return /\/(RS\d{2})[0-9A-Za-z]+\.(?:mp3|flac|m4a|aac)/i.test(u)
}

const isPlayableUrl = (url, source = '') => {
  const u = normalizeUrl(url)
  if (!(u.startsWith('http://') || u.startsWith('https://'))) return false
  if (source === 'kw' && isKuwoHotlinkRiskUrl(u)) return false
  if (source === 'mg' && isMiguInvalidUrl(u)) return false
  return true
}

// ==================== 网易云官方 EAPI 加密 ====================
const aesEncrypt = (data, key, iv, mode) => {
  if (!version) mode = mode.split('-').pop()
  return utils.crypto.aesEncrypt(data, mode, key, iv)
}

const buf2hex = (buffer) => {
  if (version) return utils.buffer.bufToString(buffer, 'hex')
  return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('')
}

const wyEapi = (url, object) => {
  const eapiKey = 'e82ckenh8dichen8'
  const text = typeof object === 'object' ? JSON.stringify(object) : object
  const digest = md5('nobody' + url + 'use' + text + 'md5forencrypt')
  const data = url + '-36cd479b6b5-' + text + '-36cd479b6b5-' + digest
  return { params: buf2hex(aesEncrypt(data, eapiKey, '', 'aes-128-ecb')).toUpperCase() }
}

// ==================== gdstudio 通用（网易已验证可用） ====================
// 公开接口：GET https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=&br=
// 2026-11 实测 source 仅支持 netease；其余平台由其他后端兜底。
const gdstudioNetease = async (songmid, quality) => {
  const br = WY_FISH_BR_MAP[quality]
  if (!br) throw new Error('gdstudio 不支持的音质')
  const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=' + encodeURIComponent(songmid) + '&br=' + br, {
    method: 'GET', timeout: 5000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Accept: 'application/json' },
  })
  const url = normalizeUrl(res.body && res.body.url)
  if (!url.startsWith('http')) throw new Error('gdstudio: 无数据')
  return url
}

// ==================== HYWmusic 通用公益接口 ====================
// 春·雨水：内置卡密已失效（401 卡密不存在），改为 @hyw_key 用户填写；未填写直接快速失败。
const getHywUrl = async (source, songId, quality) => {
  if (!HYW_CARD_KEY) throw new Error('未配置 @hyw_key（HYW 卡密），已跳过')
  const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=' + source + '&songId=' + encodeURIComponent(songId) + '&quality=' + encodeURIComponent(quality) + '&key=' + encodeURIComponent(HYW_CARD_KEY), {
    method: 'GET', timeout: 5000,
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Card-Key': HYW_CARD_KEY },
  })
  const d = res.body
  if (d && d.code === 200) {
    if (d.url) return d.url
    if (d.data && d.data.url) return d.data.url
  }
  throw new Error('HYWmusic: ' + ((d && (d.message || d.msg)) || '无数据'))
}

// ==================== QQ 音乐后端池 ====================
// 排序策略（春·雨水）：官方接口在前，需要填密钥的后端放最后；2026-11-21 实测
// HelloWorld/念心/ygking/FishAPI旧版/星海 均已失效，仅保留响应正常的后端。
const TX_BACKENDS = [
  {
    name: 'QQ官方vkey',
    fetch: async (songmid, quality) => {
      const fileInfo = TX_FILE_CONFIG[quality]
      if (!fileInfo) throw new Error('QQ官方vkey: 不支持的音质')
      const file = fileInfo.s + songmid + fileInfo.e
      const reqData = {
        req_0: {
          module: 'vkey.GetVkeyServer', method: 'CgiGetVkey',
          param: {
            filename: [file], guid: randomGuid(), songmid: [songmid], songtype: [0],
            uin: '0', loginflag: HAS_TX_COOKIE ? 1 : 0, platform: '20',
          },
        },
        loginUin: '0',
        comm: { uin: '0', format: 'json', ct: 24, cv: 0 },
      }
      const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', Referer: 'https://y.qq.com/' }
      if (HAS_TX_COOKIE) headers.Cookie = TX_COOKIE
      const res = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', { method: 'POST', timeout: 5000, headers, body: JSON.stringify(reqData) })
      const d = res.body
      if (d && d.req_0 && d.req_0.data && d.req_0.data.midurlinfo && d.req_0.data.midurlinfo[0] && d.req_0.data.midurlinfo[0].purl) {
        const sip = (d.req_0.data.sip && d.req_0.data.sip.length) ? d.req_0.data.sip : ['https://dl.stream.qqmusic.qq.com/']
        const full = sip[Math.floor(Math.random() * sip.length)] + d.req_0.data.midurlinfo[0].purl
        if (isTxTrialUrl(full)) throw new Error('QQ官方vkey: 仅试听片段（RS），配置 @tx_cookie 可按账号权限获取')
        return full
      }
      throw new Error('QQ官方vkey: 无数据')
    },
  },
  {
    name: 'vkeys',
    fetch: async (songmid, quality) => {
      const qualityMap = { '128k': '8', '320k': '9', flac: '10', flac24bit: '16' }
      const q = qualityMap[quality]
      if (!q) throw new Error('vkeys: 不支持的音质')
      const res = await httpFetch('https://api.vkeys.cn/v2/music/tencent/geturl?mid=' + encodeURIComponent(songmid) + '&quality=' + q, {
        method: 'GET', timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) {
        if (isTxTrialUrl(d.data.url)) throw new Error('vkeys: 仅试听片段（RS）')
        return d.data.url
      }
      if (d && d.data && d.data.url) {
        if (isTxTrialUrl(d.data.url)) throw new Error('vkeys: 仅试听片段（RS）')
        return d.data.url
      }
      throw new Error('vkeys: ' + ((d && d.message) || '无数据'))
    },
  },
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => getHywUrl('tx', songmid, quality),
  },
]

// ==================== 网易云后端池 ====================
const WY_BACKENDS = [
  {
    name: '网易云官方',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const eapiUrl = '/api/song/enhance/player/url/v1'
      const payload = { ids: [Number(songmid)], level, encodeType: 'flac', immerseType: 'c51' }
      const encrypted = wyEapi(eapiUrl, payload)
      let cookieValue = 'os=pc; appver=; osver=; deviceId=pyncm!'
      if (HAS_WY_COOKIE) cookieValue = WY_COOKIE + '; ' + cookieValue
      const res = await httpFetch('https://interface3.music.163.com/eapi/song/enhance/player/url/v1', {
        method: 'POST', timeout: 5000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/2.10.2.200154',
          Referer: 'https://music.163.com/',
          Cookie: cookieValue,
        },
        body: 'params=' + encrypted.params,
      })
      const d = res.body
      if (d && d.data && d.data[0] && d.data[0].url && !d.data[0].freeTrialInfo) return d.data[0].url
      if (d && d.data && d.data[0] && d.data[0].freeTrialInfo) throw new Error('VIP歌曲仅试听（配置 @wy_cookie 后按账号权限获取）')
      throw new Error('网易云官方: 无数据')
    },
  },
  {
    name: 'gdstudio网易',
    fetch: async (songmid, quality) => gdstudioNetease(songmid, quality),
  },
  {
    name: 'ikun网易云',
    fetch: async (songmid, quality, musicInfo = {}) => {
      const songId = (musicInfo.hash != null) ? musicInfo.hash : songmid
      const res = await httpFetch('https://c.wwwweb.top/music/url', {
        method: 'POST', timeout: 5000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'lx-music-request/2.9.0' },
        body: JSON.stringify({ source: 'wy', musicId: songId, quality }),
        follow_max: 5,
      })
      const d = res.body
      if (!d || isNaN(Number(d.code))) throw new Error('ikun网易云: 未知错误')
      if (d.code === 200 && d.url) return d.url
      if (d.code === 403) throw new Error('ikun网易云: 鉴权失败')
      if (d.code === 429) throw new Error('ikun网易云: 请求过速')
      throw new Error('ikun网易云: ' + (d.message || '获取URL失败'))
    },
  },
  {
    name: '残像WY',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.canxiang.cn/api/wyymusic?token=' + encodeURIComponent(CANXIANG_TOKEN) + '&type=' + encodeURIComponent(quality) + '&id=' + encodeURIComponent(songmid), {
        method: 'GET', timeout: 4500, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const url = extractAnyPlayableUrl(res.body)
      if (url) return url
      throw new Error('残像WY: 无数据')
    },
  },
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => getHywUrl('wy', songmid, quality),
  },
]

// ==================== 酷我后端池 ====================
// 排序策略（春·雨水）：手机版/官方/ikun 三个免密钥后端前置，需 API/Token 的
// 极数/云萌阁/HYW 放最后；2026-11-21 实测酷我流媒体参数变更、晚风路由 404、
// 远梦(mmp)停服、星海失联，均已移除。
const getKwKeyword = (musicInfo = {}, songmid = '') => {
  const name = musicInfo.name || musicInfo.songName || musicInfo.title || ''
  const singer = musicInfo.singer || musicInfo.artist || musicInfo.author || ''
  return ((name + ' ' + singer).trim()) || String(songmid || '')
}

const getKwRid = (musicInfo = {}, songmid = '') => {
  const rid = musicInfo.rid || musicInfo.musicrid || musicInfo.songmid || musicInfo.id || musicInfo.hash || songmid || ''
  return String(rid).replace(/^MUSIC_/, '').trim()
}

const KW_BACKENDS = [
  {
    name: '酷我手机版',
    fetch: async (songmid, quality, musicInfo = {}) => {
      const br = KW_BR_MAP[quality]
      if (!br) throw new Error('酷我手机版: 不支持的音质')
      const rid = getKwRid(musicInfo, songmid)
      if (!rid) throw new Error('酷我手机版: 缺少 rid')
      const res = await httpFetch('https://nmobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayerhd_ar_4.3.0.8_tianbao_T1A_qirui.apk&type=convert_url_with_sign&rid=' + encodeURIComponent(rid) + '&br=' + br, {
        method: 'GET', timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl
      throw new Error('酷我手机版: 无数据')
    },
  },
  {
    name: '酷我官方',
    fetch: async (songmid, quality, musicInfo = {}) => {
      const br = KW_BR_MAP[quality]
      if (!br) throw new Error('酷我官方: 不支持的音质')
      const rid = getKwRid(musicInfo, songmid)
      if (!rid) throw new Error('酷我官方: 缺少 rid')
      const res = await httpFetch('https://mobi.kuwo.cn/mobi.s?f=web&rid=' + encodeURIComponent(rid) + '&br=' + br + '&source=jiakong&type=convert_url_with_sign&surl=1', {
        method: 'GET', timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('酷我官方: 无数据')
    },
  },
  {
    name: 'ikun酷我',
    fetch: async (songmid, quality, musicInfo = {}) => {
      const songId = getKwRid(musicInfo, songmid)
      if (!songId) throw new Error('ikun酷我: 缺少 rid')
      const res = await httpFetch('https://c.wwwweb.top/music/url', {
        method: 'POST', timeout: 5000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'lx-music-request/2.9.0' },
        body: JSON.stringify({ source: 'kw', musicId: songId, quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.url && !isKuwoHotlinkRiskUrl(d.url)) return d.url
      throw new Error('ikun酷我: ' + ((d && (d.message || d.msg)) || '无数据'))
    },
  },
  {
    name: '极数本源酷我',
    fetch: async (songmid, quality, musicInfo = {}) => {
      const q = KW_APIZERO_Q_MAP[quality]
      if (!q) throw new Error('极数本源酷我: 不支持的音质')
      const keyword = getKwKeyword(musicInfo, songmid)
      if (!keyword) throw new Error('极数本源酷我: 缺少关键词')
      const headers = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
      if (APIZERO_KEY) headers['X-Api-Key'] = APIZERO_KEY
      let musicId = String(musicInfo.rid || musicInfo.musicrid || '').replace(/^MUSIC_/, '').trim()
      if (!musicId || !/^\d+$/.test(musicId)) {
        const searchUrl = 'https://apione.apibyte.cn/kwmusic?action=search&type=music&page=0&size=5&quality=' + encodeURIComponent(q) + '&keyword=' + encodeURIComponent(keyword)
        const searchRes = await httpFetch(searchUrl, { method: 'GET', timeout: 5000, headers })
        const rows = (searchRes.body && Array.isArray(searchRes.body.data)) ? searchRes.body.data : []
        musicId = (rows[0] && (rows[0].rid || rows[0].music_id || rows[0].id)) || ''
      }
      if (!musicId) throw new Error('极数本源酷我: 缺少 music_id')
      const res = await httpFetch('https://apione.apibyte.cn/kwmusic?action=music_url&music_id=' + encodeURIComponent(musicId) + '&quality=' + encodeURIComponent(q), {
        method: 'GET', timeout: 5000, headers,
      })
      const play = extractAnyPlayableUrl(res.body)
      if (play && !isKuwoHotlinkRiskUrl(play)) return play
      throw new Error('极数本源酷我: 无可用直链')
    },
  },
  {
    name: '云萌阁酷我',
    fetch: async (songmid, quality, musicInfo = {}) => {
      if (!YUNMGE_TOKEN) throw new Error('云萌阁酷我: 未配置 token')
      const keyword = getKwKeyword(musicInfo, songmid)
      if (!keyword) throw new Error('云萌阁酷我: 缺少歌曲名')
      const res = await httpFetch('https://api.yunmge.com/api/song_kuwo?token=' + encodeURIComponent(YUNMGE_TOKEN) + '&name=' + encodeURIComponent(keyword) + '&n=1&num=10', {
        method: 'GET', timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const list = (d && d.data && d.data.all_bitrates) || (d && d.all_bitrates) || []
      const prefer = quality === '128k' ? [128, '128', '128kmp3']
        : quality === '320k' ? [320, '320', '320kmp3', 128, '128kmp3']
          : [128, '128', '128kmp3', 320, '320kmp3', 2000, 'flac']
      let picked = ''
      if (Array.isArray(list)) {
        for (const p of prefer) {
          const item = list.find(x => x && (x.bitrate === p || x.label === p) && x.play_url)
          if (item) { picked = item.play_url; break }
        }
        if (!picked) {
          const first = list.find(x => x && x.play_url)
          if (first) picked = first.play_url
        }
      }
      const play = picked || extractAnyPlayableUrl(d)
      if (play && !isKuwoHotlinkRiskUrl(play)) return play
      throw new Error('云萌阁酷我: ' + ((d && d.msg) || '无可用直链'))
    },
  },
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => getHywUrl('kw', songmid, quality),
  },
]

// ==================== 酷狗后端池 ====================
// 酷狗 v5 签名直连（gateway.kugou.com/v5/url，2026-11-21 实测免费歌曲返回直链）
const KG_V5_SIGN_A = 'OIlwieks28dk2k092lksi2UIkp'
const KG_V5_KEY_SEED = '57ae12eb6890223e355ccfcb74edf70d10051234560'

const sortedParams = (obj, sep) => {
  const keys = Object.keys(obj).sort()
  return keys.map((k, i) => k + '=' + obj[k] + (i !== keys.length - 1 ? sep : '')).join('')
}

const kgV5Url = async (hash, albumId, quality) => {
  const qMap = { '128k': '128', '320k': '320', flac: 'flac', flac24bit: 'flac24bit' }
  const q = qMap[quality] || '128'
  const key = md5(hash + KG_V5_KEY_SEED)
  const params = {
    album_id: albumId || '', userid: 0, area_code: 1, hash, module: '', mid: 123456,
    appid: '1005', ssa_flag: 'is_fromtrack', clientver: '10086', vipType: 6, ptype: 0,
    token: '', auth: '', mtype: 0, album_audio_id: 0, behavior: 'play',
    clienttime: Math.floor(Date.now() / 1000), pid: 2, key, dfid: '-', pidversion: 3001, quality: q,
  }
  const signature = md5(KG_V5_SIGN_A + sortedParams(params, '') + KG_V5_SIGN_A)
  const api = 'https://gateway.kugou.com/v5/url?' + sortedParams(params, '&') + '&signature=' + signature
  const res = await httpFetch(api, {
    method: 'GET', timeout: 5000,
    headers: {
      'User-Agent': 'Android712-AndroidPhone-8983-18-0-NetMusic-wifi',
      'KG-THash': '3e5ec6b', 'KG-Rec': '1', 'KG-RC': '1', 'x-router': 'tracker.kugou.com',
    },
  })
  const d = res.body
  if (d && d.status === 1 && Array.isArray(d.url) && d.url[0]) return d.url[0]
  if (d && d.status === 2) throw new Error('酷狗v5: 需要会员/付费（无登录态仅试听）')
  throw new Error('酷狗v5: ' + ((d && (d.err_code || d.status)) || '无数据'))
}

const KG_BACKENDS = [
  {
    name: '酷狗v5签名',
    fetch: async (songmid, quality, musicInfo = {}) => {
      const hash = musicInfo.hash || musicInfo.songmid || songmid
      if (!hash) throw new Error('酷狗v5: 缺少 hash')
      return kgV5Url(hash, musicInfo.albumId || musicInfo.album_id || '', quality)
    },
  },
  {
    name: '酷狗官方',
    fetch: async (songmid, quality, musicInfo = {}) => {
      const hash = musicInfo.hash || musicInfo.songmid || songmid
      if (!hash) throw new Error('酷狗官方: 缺少 hash')
      const albumId = musicInfo.albumId || ''
      const mid = randomGuid()
      const res = await httpFetch('https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=' + encodeURIComponent(hash) + '&dfid=-&appid=1014&platid=4&album_id=' + encodeURIComponent(albumId) + '&ctype=51&mid=' + mid + '&clientver=10000', {
        method: 'GET', timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.kugou.com/', Cookie: 'kg_mid=' + mid },
      })
      const d = res.body
      if (d && d.status === 1 && d.data && d.data.play_backup_url) return d.data.play_backup_url
      if (d && d.status === 1 && d.data && d.data.play_url) return d.data.play_url
      throw new Error('酷狗官方: 无数据')
    },
  },
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => getHywUrl('kg', songmid, quality),
  },
]

// ==================== 咪咕后端池 ====================
// 排序策略（春·雨水）：无 token 的轻接口在前（v2.2/直接源/Migu API），带内置 token 的
// 后端（自建H5/官方v2.4）及需 @hyw_key 的后端放最后；2026-11-21 实测星海已移除。
const extractMiguUrl = (d) => extractUrl(d, [
  ['url'], ['playUrl'], ['play_url'],
  ['data'], ['data', 'url'], ['data', 'playUrl'], ['data', 'play_url'],
  ['data', 'data', 'url'], ['data', 'data', 'playUrl'],
  ['data', 'walkmanInfo', 'playUrl'], ['walkmanInfo', 'playUrl'],
  ['result', 'url'], ['result', 'playUrl'],
])

const getMiguContentIds = (musicInfo = {}, fallback = '') => {
  const contentId = musicInfo.contentId || musicInfo.content_id || musicInfo.contentid || musicInfo.songId || musicInfo.songid || musicInfo.id || fallback
  const copyrightId = musicInfo.copyrightId || musicInfo.copyright_id || musicInfo.copyrightid || musicInfo.songmid || musicInfo.hash || fallback
  return { contentId: String(contentId || '').trim(), copyrightId: String(copyrightId || '').trim() }
}

// LX 的咪咕 musicInfo 通常只带 copyrightId（songmid），没有真实 contentId；
// 而自建 H5 v2.4 接口的 contentId 必须是真实值，否则上游 500。
// 这里用咪咕公开搜索接口按「歌名 + 歌手」匹配，解析出真实 contentId/copyrightId 并缓存。
const MIGU_ID_CACHE_TTL_MS = 21600000 // 6 小时
const miguIdCache = new Map()

const fetchMiguSearch = async (keyword) => {
  const url = 'https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/search_all.do?text='
    + encodeURIComponent(keyword)
    + '&pageNo=1&pageSize=10&searchSwitch=' + encodeURIComponent('{"song":1}')
  const res = await httpFetch(url, {
    method: 'GET', timeout: 5000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36',
      Accept: 'application/json',
      Referer: 'https://m.music.migu.cn/',
    },
  })
  const d = res.body
  const rows = (d && d.songResultData && d.songResultData.result) || []
  return Array.isArray(rows) ? rows : []
}

const normalizeCn = (s) => String(s || '').toLowerCase().replace(/\s+/g, '').replace(/[(（].*?[)）]/g, '')

const resolveMiguIds = async (musicInfo = {}, songmid = '') => {
  const cacheKey = 'mgid_' + songmid
  const cached = miguIdCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < MIGU_ID_CACHE_TTL_MS) return cached.ids

  // 先按歌名+歌手匹配，再按歌名匹配
  const name = musicInfo.name || musicInfo.songName || musicInfo.title || ''
  const singer = musicInfo.singer || musicInfo.artist || musicInfo.author || ''
  const candidates = []
  if (name && singer) candidates.push((name + ' ' + singer).trim())
  if (name) candidates.push(name)

  const normName = normalizeCn(name)
  const normSinger = normalizeCn(singer)
  for (const keyword of candidates) {
    let rows = []
    try { rows = await fetchMiguSearch(keyword) } catch (e) { rows = [] }
    let hit = null
    for (const row of rows) {
      if (!row || !row.contentId || !row.copyrightId) continue
      const rowName = normalizeCn(row.name)
      const rowSinger = normalizeCn((row.singers || []).map(x => x && x.name).join(','))
      const nameOk = normName ? (rowName === normName || rowName.indexOf(normName) >= 0) : true
      const singerOk = normSinger ? rowSinger.indexOf(normSinger) >= 0 : true
      if (nameOk && singerOk) { hit = row; break }
    }
    if (!hit) continue
    const ids = { contentId: String(hit.contentId).trim(), copyrightId: String(hit.copyrightId).trim() }
    miguIdCache.set(cacheKey, { ids, timestamp: Date.now() })
    return ids
  }

  // 搜索无结果：回退到 musicInfo 自带字段（若有真实 contentId 则可用）
  const guess = getMiguContentIds(musicInfo, songmid)
  const hasRealContentId = !!(musicInfo.contentId || musicInfo.content_id || musicInfo.contentid)
  if (hasRealContentId && guess.contentId && guess.copyrightId) {
    miguIdCache.set(cacheKey, { ids: guess, timestamp: Date.now() })
    return guess
  }
  throw new Error('咪咕搜索解析: 未匹配到歌曲（' + String(name || songmid || '').slice(0, 40) + '）')
}

const miguFetchH5v24 = async (ids, toneFlag) => {
  const api = MIGU_H5V24_BASE
    + '?token=' + encodeURIComponent(MIGU_H5V24_TOKEN)
    + '&contentId=' + encodeURIComponent(ids.contentId)
    + '&copyrightId=' + encodeURIComponent(ids.copyrightId)
    + '&toneFlag=' + encodeURIComponent(toneFlag)
  const res = await httpFetch(api, {
    method: 'GET', timeout: 4000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android)',
      Koneko: MIGU_H5V24_KONEKO,
      ynx: MIGU_H5V24_YNX,
      des: MIGU_H5V24_DES,
      Accept: 'application/json',
    },
  })
  const d = res.body
  const play = extractMiguUrl(d)
  if (play && !isMiguInvalidUrl(play)) return play
  throw new Error('自建咪咕H5v2.4: ' + ((d && (d.msg || d.message)) || '无可用直链'))
}

// 咪咕官方 listen-url v2.4：songId 用 copyrightId（resourceType=E），返回 data[0].url
const miguAppV24 = async (copyrightId, toneFlag) => {
  const api = MIGU_APP_V24 + '?netType=01&resourceType=E&songId=' + encodeURIComponent(copyrightId) + '&toneFlag=' + encodeURIComponent(toneFlag)
  const res = await httpFetch(api, {
    method: 'GET', timeout: 5000,
    headers: {
      channel: '014000D',
      token: MIGU_APP_TOKEN,
      aversionid: MIGU_AVERSIONID,
      'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36',
    },
  })
  const d = res.body
  const list = (d && d.data) || []
  const url = (Array.isArray(list) ? list[0] : list) && (Array.isArray(list) ? list[0].url : list.url)
  const play = normalizeUrl(url || '')
  if (play && !isMiguInvalidUrl(play)) return play
  throw new Error('咪咕官方v2.4: ' + ((d && d.info) || '无可用直链'))
}

// 咪咕官方 listen-url v2.2：轻头（channel+uid），返回 data.url
const miguAppV22 = async (copyrightId, toneFlag) => {
  const api = MIGU_APP_V22 + '?netType=01&resourceType=E&songId=' + encodeURIComponent(copyrightId) + '&toneFlag=' + encodeURIComponent(toneFlag)
  const res = await httpFetch(api, {
    method: 'GET', timeout: 5000,
    headers: { channel: '0146951', uid: '0', 'User-Agent': 'Mozilla/5.0 (Linux; Android 12)' },
  })
  const d = res.body
  let play = normalizeUrl((d && d.data && (d.data.url || d.data.playUrl)) || '')
  if (play.startsWith('//')) play = 'https:' + play
  if (play && !isMiguInvalidUrl(play)) return play
  throw new Error('咪咕官方v2.2: ' + ((d && d.info) || '无可用直链'))
}

const MG_BACKENDS = [
  {
    name: '咪咕官方v2.2',
    fetch: async (songmid, quality, musicInfo = {}) => {
      const ids = getMiguContentIds(musicInfo, songmid)
      const copyrightId = ids.copyrightId || songmid
      if (!copyrightId) throw new Error('咪咕官方v2.2: 缺少 copyrightId')
      return miguAppV22(copyrightId, MG_TONE_FLAG_MAP[quality] || 'PQ')
    },
  },
  {
    name: 'Migu直接源',
    fetch: async (songmid, quality, musicInfo = {}) => {
      const level = MG_TONE_FLAG_MAP[quality] || 'PQ'
      const ids = getMiguContentIds(musicInfo, songmid)
      const copyrightId = ids.copyrightId || songmid
      const res = await httpFetch('https://music.migu.cn/v3/api/music/audioPlayer/getPlayInfo?copyrightId=' + encodeURIComponent(copyrightId) + '&type=1&level=' + level, {
        method: 'GET', timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://music.migu.cn/' },
      })
      const d = res.body
      const play = extractMiguUrl(d)
      if (play && !isMiguInvalidUrl(play)) return play
      throw new Error('Migu直接源: 无数据')
    },
  },
  {
    name: 'Migu API',
    fetch: async (songmid, quality, musicInfo = {}) => {
      const qualityParam = MG_TONE_FLAG_MAP[quality] || 'PQ'
      const ids = getMiguContentIds(musicInfo, songmid)
      const copyrightId = ids.copyrightId || songmid
      const res = await httpFetch('https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2?copyrightId=' + encodeURIComponent(copyrightId) + '&quality=' + qualityParam, {
        method: 'GET', timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'https://app.c.nf.migu.cn/' },
      })
      const d = res.body
      const play = extractMiguUrl(d)
      if (play && !isMiguInvalidUrl(play)) return play
      throw new Error('Migu API: ' + ((d && (d.info || d.msg)) || '无数据'))
    },
  },
  {
    name: '自建咪咕H5v2.4',
    fetch: async (songmid, quality, musicInfo = {}) => {
      if (!MIGU_H5V24_BASE || !MIGU_H5V24_TOKEN) throw new Error('自建咪咕H5v2.4: 未配置接口')
      const toneFlag = MG_TONE_FLAG_MAP[quality] || 'PQ'
      // 优先用 musicInfo 自带的真实 contentId；失败则走搜索解析兜底
      const guess = getMiguContentIds(musicInfo, songmid)
      const hasRealContentId = !!(musicInfo.contentId || musicInfo.content_id || musicInfo.contentid)
      if (hasRealContentId && guess.contentId && guess.copyrightId) {
        try { return await miguFetchH5v24(guess, toneFlag) } catch (e) { /* 落入搜索解析兜底 */ }
      }
      const ids = await resolveMiguIds(musicInfo, songmid)
      return miguFetchH5v24(ids, toneFlag)
    },
  },
  {
    name: '咪咕官方v2.4',
    fetch: async (songmid, quality, musicInfo = {}) => {
      const ids = getMiguContentIds(musicInfo, songmid)
      const copyrightId = ids.copyrightId || songmid
      if (!copyrightId) throw new Error('咪咕官方v2.4: 缺少 copyrightId')
      return miguAppV24(copyrightId, MG_TONE_FLAG_MAP[quality] || 'PQ')
    },
  },
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => getHywUrl('mg', songmid, quality),
  },
]

// ==================== 歌曲 ID 提取与音质候选 ====================
const getSongIdBySource = (source, musicInfo = {}) => {
  if (source === 'kw') return getKwRid(musicInfo)
  if (source === 'kg') return musicInfo.hash || musicInfo.songmid || musicInfo.id || musicInfo.albumAudioId || ''
  if (source === 'mg') return musicInfo.copyrightId || musicInfo.copyright_id || musicInfo.contentId || musicInfo.songmid || musicInfo.id || musicInfo.hash || ''
  if (source === 'tx') return musicInfo.songmid || musicInfo.mediaMid || musicInfo.strMediaMid || musicInfo.id || musicInfo.hash || ''
  if (source === 'wy') return musicInfo.hash || musicInfo.songmid || musicInfo.id || '' // LX 网易源 hash 即数字 id
  return musicInfo.hash || musicInfo.songmid || musicInfo.id || ''
}

const uniq = (arr) => {
  const list = []
  for (const item of arr) {
    if (item && !list.includes(item)) list.push(item)
  }
  return list
}

// 春·雨水：降级链简化为「请求音质 → 128k」两轮，避免逐音质全量重试拖垮取链窗口；
// 网易云按请求音质直取（免费歌曲无 Cookie 也可返回 320k/flac），试听/无权限由
// 官方后端抛错后降级到 128k 重试。
const getQualityCandidates = (source, requestedQuality) => {
  const supported = MUSIC_QUALITY[source] || [LOWEST_QUALITY]
  const requested = supported.includes(requestedQuality) ? requestedQuality : LOWEST_QUALITY
  const candidates = uniq([requested, LOWEST_QUALITY]).filter(q => supported.includes(q))
  return candidates.length ? candidates : [supported[0] || LOWEST_QUALITY]
}

// ==================== 核心请求（日志 + 冷却 + 时间预算 + 顺序兜底） ====================
// 春·雨水重写要点：
// 1) 不再并发竞速：竞速会把最慢后端的超时叠加进每次取链，且失败信息杂乱；改为严格按
//    后端池顺序依次尝试（实测可用在前，需 API/Token 的在后）；
// 2) 失败冷却：失败过的后端 10 分钟内自动跳过（全部冷却时忽略冷却照常尝试）；
// 3) 时间预算：单次取链总预算 9.5 秒，剩余不足 1.2 秒时停止尝试并返回已收集的错误摘要。
const REQUEST_BUDGET_MS = 9500
const MIN_ATTEMPT_BUDGET_MS = 1200

const handleGetMusicUrl = async (source, musicInfo = {}, quality = LOWEST_QUALITY) => {
  const t0 = Date.now()
  let songId = getSongIdBySource(source, musicInfo)
  if (!songId && source === 'mg') {
    // 咪咕兜底：musicInfo 缺少 ID 时允许纯搜索解析（按歌名+歌手）
    const name = musicInfo.name || musicInfo.songName || musicInfo.title || ''
    const singer = musicInfo.singer || musicInfo.artist || musicInfo.author || ''
    if ((name + singer).trim()) songId = 'search:' + name + ' ' + singer
  }
  if (!songId) {
    Logger.error(source, '无法获取歌曲ID（musicInfo 缺少 id/hash/rid/copyrightId 等字段）')
    throw new Error('无法获取歌曲ID')
  }

  const backends = { wy: WY_BACKENDS, kw: KW_BACKENDS, tx: TX_BACKENDS, kg: KG_BACKENDS, mg: MG_BACKENDS }[source]
  if (!backends || !backends.length) {
    Logger.error(source, '未知音源或没有可用后端: ' + source)
    throw new Error('未知音源或没有可用后端: ' + source)
  }

  const qualityCandidates = getQualityCandidates(source, quality)
  const deadline = t0 + REQUEST_BUDGET_MS

  // 失败冷却：跳过近期失败过的后端；若该平台全部后端都在冷却中则照常尝试
  const cooling = backends.filter(b => inBackendCooldown(source, b.name))
  const hot = backends.filter(b => !inBackendCooldown(source, b.name))
  const tryList = hot.length ? hot : backends
  if (cooling.length && hot.length) {
    Logger.info(source, '冷却跳过 ' + cooling.length + ' 个后端: ' + cooling.map(b => b.name).join(', '))
  }
  Logger.info(source, '取链开始 songId=' + songId + ' 请求音质=' + quality
    + ' 候选音质=' + qualityCandidates.join('/')
    + ' 后端=' + tryList.length + '/' + backends.length
    + (hot.length ? '' : '（全部冷却中，忽略冷却照常尝试）'))

  const errors = []
  let budgetExhausted = false

  outer:
  for (const targetQuality of qualityCandidates) {
    const cacheKey = buildCacheKey(source, songId, targetQuality)
    const cached = getCachedUrl(cacheKey)
    if (cached) {
      Logger.info(source, '缓存命中 ' + songId + ' ' + targetQuality + '（总耗时 ' + (Date.now() - t0) + 'ms）')
      return cached
    }

    for (const backend of tryList) {
      const remaining = deadline - Date.now()
      if (remaining < MIN_ATTEMPT_BUDGET_MS) {
        budgetExhausted = true
        Logger.warn(source, '时间预算用尽（' + REQUEST_BUDGET_MS + 'ms），停止后续尝试')
        break outer
      }
      const at = Date.now()
      try {
        const url = await backend.fetch(songId, targetQuality, musicInfo)
        const ms = Date.now() - at
        if (isPlayableUrl(url, source)) {
          const clean = normalizeUrl(url)
          setCachedUrl(cacheKey, clean)
          clearBackendCooldown(source, backend.name)
          Logger.info(source, backend.name + ' 成功 ' + targetQuality + ' ' + ms + 'ms -> ' + clean.slice(0, 80))
          Logger.info(source, '取链完成 总耗时 ' + (Date.now() - t0) + 'ms（后端 ' + backend.name + '，音质 ' + targetQuality + '）')
          return clean
        }
        markBackendFail(source, backend.name, '返回无效URL')
        Logger.warn(source, backend.name + ' 返回无效URL ' + ms + 'ms（冷却 ' + Math.round(BACKEND_COOLDOWN_MS / 60000) + ' 分钟）')
        errors.push(targetQuality + ' ' + backend.name + ': 返回无效URL')
      } catch (e) {
        const ms = Date.now() - at
        const reason = (e && e.message) || String(e)
        markBackendFail(source, backend.name, reason)
        Logger.warn(source, backend.name + ' 失败 ' + ms + 'ms ' + reason)
        errors.push(targetQuality + ' ' + backend.name + ': ' + reason)
      }
    }
  }

  const head = budgetExhausted
    ? '时间预算用尽，部分后端未及尝试（耗时 ' + (Date.now() - t0) + 'ms，已尝试音质：' + qualityCandidates.join(', ') + '）'
    : '所有后端均失败（耗时 ' + (Date.now() - t0) + 'ms，已尝试音质：' + qualityCandidates.join(', ') + '）'
  const summary = head + '\n' + errors.join('\n')
  Logger.error(source, '取链失败 ' + songId + ' —— ' + summary.replace(/\n/g, ' | '))
  throw new Error(summary)
}

// ==================== 事件注册 ====================
on(EVENT_NAMES.request, ({ action, source, info }) => {
  switch (action) {
    case 'musicUrl':
      return handleGetMusicUrl(source, info.musicInfo, info.type)
        .then(url => Promise.resolve(url))
        .catch(err => Promise.reject(err))
    default:
      return Promise.reject(new Error('action not support: ' + action))
  }
})

// ==================== 初始化 ====================
const musicSources = {}
const SOURCE_NAME_MAP = { wy: '网易云音乐', kw: '酷我音乐', tx: 'QQ音乐', kg: '酷狗音乐', mg: '咪咕音乐' }
MUSIC_SOURCE.forEach((item) => {
  musicSources[item] = {
    name: SOURCE_NAME_MAP[item] || item,
    type: 'music',
    actions: ['musicUrl'],
    qualitys: MUSIC_QUALITY[item],
  }
})

send(EVENT_NAMES.inited, { openDevTools: false, sources: musicSources })

// 启动日志（同时写入环形缓冲，可用 __coconutLog.dump() 导出）
Logger.info('INIT', '椰子音源 春·雨水 已加载完成 (' + (env || 'unknown') + (version ? '，LX ' + version : '') + ')')
Logger.info('INIT', '平台顺序: ' + MUSIC_SOURCE.join(' -> '))
Logger.info('INIT', '后端数 - 网易: ' + WY_BACKENDS.length + ' | 酷我: ' + KW_BACKENDS.length + ' | QQ: ' + TX_BACKENDS.length + ' | 酷狗: ' + KG_BACKENDS.length + ' | 咪咕: ' + MG_BACKENDS.length)
Logger.info('INIT', '兜底策略: 顺序尝试（可用在前，需 API/Token 在后）+ 失败冷却 ' + Math.round(BACKEND_COOLDOWN_MS / 60000) + ' 分钟 + 单次预算 ' + REQUEST_BUDGET_MS + 'ms')
Logger.info('INIT', '可选配置: @tx_cookie ' + (HAS_TX_COOKIE ? '已填写' : '未填')
  + ' | @wy_cookie ' + (HAS_WY_COOKIE ? '已填写' : '未填')
  + ' | @hyw_key ' + (HYW_CARD_KEY ? '已填写' : '未填')
  + ' | @canxiang_token ' + (config.canxiang_token ? '已填写' : '使用内置')
  + ' | @wanfeng_key/@yunmge_token/@apizero_key ' + ((config.wanfeng_key || config.yunmge_token || config.apizero_key) ? '部分已填' : '未填（用内置默认值）'))
