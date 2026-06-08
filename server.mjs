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
import { join, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

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

let dbCache = null

async function loadDb() {
  if (dbCache) return dbCache
  try {
    await mkdir(DB_DIR, { recursive: true })
    const data = await readFile(DB_FILE, 'utf8')
    dbCache = JSON.parse(data)
  } catch {
    dbCache = { sessions: [], profiles: [] }
  }
  return dbCache
}

async function saveDb() {
  if (!dbCache) return
  await mkdir(DB_DIR, { recursive: true })
  await writeFile(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf8')
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  
  if (req.method === 'POST' && url.pathname === '/api/sessions') {
    let bodyStr = ''
    req.on('data', chunk => { bodyStr += chunk })
    req.on('end', async () => {
      try {
        const payload = JSON.parse(bodyStr)
        if (!payload.session || !payload.profile) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ error: 'Missing session or profile payload' }))
        }
        
        const db = await loadDb()
        
        // Add session
        db.sessions.push(payload.session)
        // Keep last 5000 sessions total on the server to prevent massive bloat
        if (db.sessions.length > 5000) {
          db.sessions = db.sessions.slice(-5000)
        }
        
        // Add/Update profile
        const profIdx = db.profiles.findIndex(p => p.id === payload.profile.id)
        if (profIdx >= 0) {
          db.profiles[profIdx] = payload.profile
        } else {
          db.profiles.push(payload.profile)
        }
        
        await saveDb()
        
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }
  
  if (req.method === 'GET' && url.pathname === '/api/rankings') {
    try {
      const mode = url.searchParams.get('mode') || 'ko'
      const db = await loadDb()
      
      // Compute leaderboard on the server
      const rows = []
      for (const profile of db.profiles) {
        const mine = db.sessions.filter((s) => s.profileId === profile.id && s.mode === mode && !s.isDrill)
        if (mine.length === 0) continue
        
        const sessionScore = (s) => (s.mode === 'ko' ? s.cpm : s.wpm)
        const best = Math.max(...mine.map(sessionScore))
        const bestAccuracy = Math.max(...mine.map((s) => s.accuracy))
        const lastPlayed = Math.max(...mine.map((s) => s.timestamp))
        
        rows.push({
          profile,
          best,
          bestAccuracy,
          sessions: mine.length,
          lastPlayed
        })
      }
      
      // Sort descending by best score
      rows.sort((a, b) => b.best - a.best)
      
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(rows))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
    return
  }
  
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'API Not Found' }))
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
