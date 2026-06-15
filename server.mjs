// Zero-dependency static file server for the production build (dist/).
// Binds 0.0.0.0 so it can be reached remotely / behind a tunnel or proxy.
//
//   npm run build && node server.mjs
//   PORT=3001 HOST=0.0.0.0 node server.mjs
//
// Serves hashed assets with long-lived immutable caching, HTML/sw.js with
// no-cache, and falls back to index.html for unknown non-asset routes (SPA).

import { createServer } from 'node:http'
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const PORT = Number(process.env.PORT) || 3001
const HOST = process.env.HOST || '0.0.0.0'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
}

function resolvePath(urlPath) {
  let decoded
  try {
    decoded = decodeURIComponent((urlPath || '/').split('?')[0])
  } catch {
    decoded = '/'
  }
  if (decoded === '/' || decoded === '') decoded = '/index.html'
  // Resolve then verify the result stays inside ROOT (canonical traversal guard).
  const full = resolve(ROOT, '.' + (decoded.startsWith('/') ? decoded : '/' + decoded))
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return join(ROOT, 'index.html')
  return full
}

const DB_DIR = join(fileURLToPath(new URL('.', import.meta.url)), 'server-data')
const DB_FILE = join(DB_DIR, 'db.json')
const SECRET_FILE = join(DB_DIR, 'secret')

let dbCache = null

async function loadDb() {
  if (dbCache) return dbCache
  try {
    await mkdir(DB_DIR, { recursive: true })
    const data = await readFile(DB_FILE, 'utf8')
    dbCache = JSON.parse(data)
  } catch {
    dbCache = { sessions: [], profiles: [], users: [] }
  }
  if (!Array.isArray(dbCache.users)) dbCache.users = []
  return dbCache
}

async function saveDb() {
  if (!dbCache) return
  await mkdir(DB_DIR, { recursive: true })
  await writeFile(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf8')
}

// --- Auth: zero-dependency, Node built-in crypto only --------------------- //

// A stable server secret (persisted) signs stateless HMAC tokens.
const AUTH_SECRET = (() => {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET
  try {
    return readFileSync(SECRET_FILE, 'utf8').trim()
  } catch {
    const s = randomBytes(32).toString('hex')
    try {
      mkdirSync(DB_DIR, { recursive: true })
      writeFileSync(SECRET_FILE, s, 'utf8')
    } catch {}
    return s
  }
})()

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 60 // 60 days
const b64u = (s) => Buffer.from(s).toString('base64url')
const unb64u = (s) => Buffer.from(s, 'base64url').toString('utf8')

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}
function verifyPassword(password, salt, hash) {
  const candidate = scryptSync(password, salt, 64).toString('hex')
  const a = Buffer.from(candidate, 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

function signToken(userId) {
  const exp = Date.now() + TOKEN_TTL_MS
  const payload = `${b64u(userId)}.${exp}`
  const sig = createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [uid, exp, sig] = parts
  const expected = createHmac('sha256', AUTH_SECRET).update(`${uid}.${exp}`).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  if (Number(exp) < Date.now()) return null
  return unb64u(uid)
}

function authedUser(db, req) {
  const h = req.headers['authorization'] || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  const uid = verifyToken(token)
  if (!uid) return null
  return db.users.find((u) => u.id === uid) || null
}

function publicUser(u) {
  return { id: u.id, username: u.username, createdAt: u.createdAt }
}

const EMPTY_DATA = () => ({ profiles: [], sessions: [], arcadeBest: {}, streak: null })

/** Sanitize a client-supplied data blob into the slice we persist. */
function cleanData(d) {
  const o = d && typeof d === 'object' ? d : {}
  return {
    profiles: Array.isArray(o.profiles) ? o.profiles : [],
    sessions: Array.isArray(o.sessions) ? o.sessions.slice(-5000) : [],
    arcadeBest: o.arcadeBest && typeof o.arcadeBest === 'object' ? o.arcadeBest : {},
    streak: o.streak && typeof o.streak === 'object' ? o.streak : null,
  }
}

function readBody(req) {
  return new Promise((resolveBody) => {
    let s = ''
    req.on('data', (c) => {
      s += c
      if (s.length > 8e6) req.destroy() // ~8MB guard
    })
    req.on('end', () => resolveBody(s))
    req.on('error', () => resolveBody(''))
  })
}
const sendJson = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj))
}
const USERNAME_RE = /^[a-zA-Z0-9가-힣_.-]{2,24}$/

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const path = url.pathname

  try {
    // --- Auth: register ---------------------------------------------------- //
    if (req.method === 'POST' && path === '/api/auth/register') {
      const body = JSON.parse((await readBody(req)) || '{}')
      const username = String(body.username || '').trim()
      const password = String(body.password || '')
      if (!USERNAME_RE.test(username)) {
        return sendJson(res, 400, { error: '아이디는 2~24자, 한/영/숫자/._- 만 가능합니다.' })
      }
      if (password.length < 4) {
        return sendJson(res, 400, { error: '비밀번호는 4자 이상이어야 합니다.' })
      }
      const db = await loadDb()
      if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        return sendJson(res, 409, { error: '이미 사용 중인 아이디입니다.' })
      }
      const { salt, hash } = hashPassword(password)
      const user = {
        id: 'u_' + randomBytes(8).toString('hex'),
        username,
        salt,
        hash,
        createdAt: Date.now(),
        data: cleanData(body.data), // seed from local guest data if provided
      }
      db.users.push(user)
      await saveDb()
      return sendJson(res, 200, { token: signToken(user.id), user: publicUser(user), data: user.data })
    }

    // --- Auth: login ------------------------------------------------------- //
    if (req.method === 'POST' && path === '/api/auth/login') {
      const body = JSON.parse((await readBody(req)) || '{}')
      const username = String(body.username || '').trim()
      const password = String(body.password || '')
      const db = await loadDb()
      const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase())
      if (!user || !verifyPassword(password, user.salt, user.hash)) {
        return sendJson(res, 401, { error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
      }
      return sendJson(res, 200, { token: signToken(user.id), user: publicUser(user), data: user.data || EMPTY_DATA() })
    }

    // --- Auth: who am I + my data ------------------------------------------ //
    if (req.method === 'GET' && path === '/api/me') {
      const db = await loadDb()
      const user = authedUser(db, req)
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' })
      return sendJson(res, 200, { user: publicUser(user), data: user.data || EMPTY_DATA() })
    }

    // --- Sync the account's full record up ---------------------------------- //
    if (req.method === 'POST' && path === '/api/sync') {
      const db = await loadDb()
      const user = authedUser(db, req)
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' })
      const body = JSON.parse((await readBody(req)) || '{}')
      user.data = cleanData(body.data)
      await saveDb()
      return sendJson(res, 200, { ok: true, data: user.data })
    }

    // --- Legacy single-session upload (also account-aware) ------------------ //
    if (req.method === 'POST' && path === '/api/sessions') {
      const payload = JSON.parse((await readBody(req)) || '{}')
      if (!payload.session || !payload.profile) {
        return sendJson(res, 400, { error: 'Missing session or profile payload' })
      }
      const db = await loadDb()
      const user = authedUser(db, req)
      const target = user ? (user.data ||= EMPTY_DATA()) : db
      target.sessions.push(payload.session)
      if (target.sessions.length > 5000) target.sessions = target.sessions.slice(-5000)
      const idx = target.profiles.findIndex((p) => p.id === payload.profile.id)
      if (idx >= 0) target.profiles[idx] = payload.profile
      else target.profiles.push(payload.profile)
      await saveDb()
      return sendJson(res, 200, { success: true })
    }

    // --- Cross-account leaderboard ----------------------------------------- //
    if (req.method === 'GET' && path === '/api/rankings') {
      const mode = url.searchParams.get('mode') || 'ko'
      const db = await loadDb()
      const sessionScore = (s) => (s.mode === 'ko' ? s.cpm : s.wpm)
      const groups = [{ account: null, profiles: db.profiles, sessions: db.sessions }]
      for (const u of db.users) {
        const d = u.data || EMPTY_DATA()
        groups.push({ account: u.username, profiles: d.profiles, sessions: d.sessions })
      }
      const rows = []
      for (const g of groups) {
        for (const profile of g.profiles) {
          const mine = g.sessions.filter((s) => s.profileId === profile.id && s.mode === mode && !s.isDrill)
          if (mine.length === 0) continue
          rows.push({
            profile,
            account: g.account,
            best: Math.max(...mine.map(sessionScore)),
            bestAccuracy: Math.max(...mine.map((s) => s.accuracy)),
            sessions: mine.length,
            lastPlayed: Math.max(...mine.map((s) => s.timestamp)),
          })
        }
      }
      rows.sort((a, b) => b.best - a.best)
      return sendJson(res, 200, rows)
    }

    return sendJson(res, 404, { error: 'API Not Found' })
  } catch (err) {
    return sendJson(res, 500, { error: err.message })
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      return handleApi(req, res)
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      return res.end('Method Not Allowed')
    }
    let filePath = resolvePath(req.url)
    let info = await stat(filePath).catch(() => null)
    if (info?.isDirectory()) {
      filePath = join(filePath, 'index.html')
      info = await stat(filePath).catch(() => null)
    }
    if (!info) {
      // Unknown route: SPA fallback unless it looks like a real asset request.
      if (extname(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        return res.end('Not Found')
      }
      filePath = join(ROOT, 'index.html')
      info = await stat(filePath).catch(() => null)
      if (!info) {
        res.writeHead(404)
        return res.end('Not Found — run `npm run build` first.')
      }
    }

    const ext = extname(filePath).toLowerCase()
    const type = MIME[ext] || 'application/octet-stream'
    const body = await readFile(filePath)
    const headers = {
      'Content-Type': type,
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer-when-downgrade',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; " +
        "worker-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    }
    if (filePath.includes(`${'assets'}/`)) headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    else if (ext === '.html' || filePath.endsWith('sw.js')) headers['Cache-Control'] = 'no-cache'
    else headers['Cache-Control'] = 'public, max-age=3600'

    res.writeHead(200, headers)
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Internal Server Error')
  }
})

server.listen(PORT, HOST, () => {
  console.log(`TypeGenius ▸ serving dist/ at http://${HOST}:${PORT}`)
})
