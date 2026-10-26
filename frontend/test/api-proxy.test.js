import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { before, after, test } from 'node:test'
import proxy from '../api/proxy.js'

const originalFetch = globalThis.fetch
const originalOrigin = process.env.BACKEND_ORIGIN
const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)))
const frontendOrigin = 'https://frontend.example'
const requests = []
let backend
let frontend
let frontendUrl

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${server.address().port}`
}

before(async () => {
  backend = createServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks).toString()
    requests.push({ method: req.method, url: req.url, headers: req.headers, body })
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/api/v1/auth/login') {
      res.setHeader('Set-Cookie', [
        'inkwell_session=test-session; Path=/api/v1; HttpOnly; Secure; SameSite=Lax',
        'another_cookie=test; Path=/api/v1; Secure'
      ])
      res.end(JSON.stringify({ user: { username: 'tester' } }))
    } else if (req.url === '/api/v1/auth/me') {
      res.statusCode = req.headers.cookie?.includes('inkwell_session=test-session') ? 200 : 401
      res.end(JSON.stringify({ authenticated: res.statusCode === 200 }))
    } else if (req.method === 'DELETE') {
      res.statusCode = 204
      res.end()
    } else {
      res.end(JSON.stringify({ status: 'ok', url: req.url }))
    }
  })
  const backendUrl = await listen(backend)
  process.env.BACKEND_ORIGIN = 'https://backend.example'
  globalThis.fetch = (input, options) => {
    const url = new URL(input)
    if (!['https://backend.example', 'https://inkwell-vse.onrender.com'].includes(url.origin)) {
      return originalFetch(input, options)
    }
    if (url.pathname.endsWith('/failure')) throw new Error('upstream unavailable')
    return originalFetch(`${backendUrl}${url.pathname}${url.search}`, options)
  }
  frontend = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    req.query = {}
    for (const key of new Set(url.searchParams.keys())) {
      const values = url.searchParams.getAll(key)
      req.query[key] = values.length > 1 ? values : values[0]
    }
    // Emulate the first rewrite and Vercel's JSON body helper.
    const rewrite = config.rewrites[0]
    assert.equal(rewrite.source, '/api/:path*')
    assert.equal(rewrite.destination, '/api/proxy?__path=:path*')
    req.query.__path = url.pathname.slice('/api/'.length)
    if (req.headers['content-type'] === 'application/json') {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      req.body = JSON.parse(Buffer.concat(chunks).toString())
    }
    await proxy(req, res)
  })
  frontendUrl = await listen(frontend)
})

after(async () => {
  globalThis.fetch = originalFetch
  if (originalOrigin === undefined) delete process.env.BACKEND_ORIGIN
  else process.env.BACKEND_ORIGIN = originalOrigin
  for (const server of [frontend, backend]) {
    if (!server) continue
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})

test('login POST preserves JSON, origin, status, and both session cookies', async () => {
  const body = JSON.stringify({ email: 'tester@example.com', password: 'test-only' })
  const login = await fetch(`${frontendUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: frontendOrigin },
    body
  })
  assert.equal(login.status, 200)
  assert.equal((await login.json()).user.username, 'tester')
  const cookies = login.headers.getSetCookie()
  assert.equal(cookies.length, 2)
  assert.match(cookies[0], /HttpOnly; Secure; SameSite=Lax/)
  assert.equal(requests.at(-1).body, body)
  assert.equal(requests.at(-1).headers.origin, frontendOrigin)
  const session = await fetch(`${frontendUrl}/api/v1/auth/me`, {
    headers: { Cookie: cookies.map(cookie => cookie.split(';')[0]).join('; ') }
  })
  assert.equal(session.status, 200)
  assert.deepEqual(await session.json(), { authenticated: true })
  assert.equal(session.headers.get('cache-control'), 'no-store')
})

test('missing session remains a JSON 401 rather than HTML or 405', async () => {
  const response = await fetch(`${frontendUrl}/api/v1/auth/me`)
  assert.equal(response.status, 401)
  assert.match(response.headers.get('content-type'), /application\/json/)
})

test('health and repeated feed query parameters reach the backend', async () => {
  const health = await fetch(`${frontendUrl}/api/v1/health`)
  assert.equal((await health.json()).status, 'ok')
  const feed = await fetch(`${frontendUrl}/api/v1/feed?limit=20&tag=a&tag=b`)
  assert.equal((await feed.json()).url, '/api/v1/feed?limit=20&tag=a&tag=b')
})

test('PUT raw bodies and DELETE 204 responses pass through', async () => {
  const update = await fetch(`${frontendUrl}/api/v1/auth/profile`, {
    method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: 'raw-body'
  })
  assert.equal(update.status, 200)
  assert.equal(requests.at(-1).body, 'raw-body')
  const deletion = await fetch(`${frontendUrl}/api/v1/posts/test`, { method: 'DELETE' })
  assert.equal(deletion.status, 204)
  assert.equal(await deletion.text(), '')
})

test('missing configuration uses the Render origin and unreachable upstream returns JSON error', async () => {
  delete process.env.BACKEND_ORIGIN
  const health = await fetch(`${frontendUrl}/api/v1/health`)
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { status: 'ok', url: '/api/v1/health' })
  process.env.BACKEND_ORIGIN = 'https://backend.example'
  const failure = await fetch(`${frontendUrl}/api/v1/failure`)
  assert.equal(failure.status, 502)
  assert.deepEqual(await failure.json(), { error: 'Unable to reach the backend' })
})
