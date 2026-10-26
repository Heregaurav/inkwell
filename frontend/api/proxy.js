const responseHeadersToSkip = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
  // fetch decompresses responses; Node calculates the outgoing length.
  'content-encoding', 'content-length', 'set-cookie'
])

export default async function proxy(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  let origin
  try {
    const value = process.env.BACKEND_ORIGIN?.trim().replace(/\/+$/, '')
    origin = new URL(value)
    if (origin.protocol !== 'https:' || origin.origin !== value) throw new Error()
  } catch {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'BACKEND_ORIGIN must be configured as an HTTPS origin' }))
    return
  }

  // __path is supplied by the API rewrite, separate from normal query parameters.
  const path = req.query?.__path
  if (typeof path !== 'string' || !path.startsWith('v1/') ||
      path.split('/').some(part => ['.', '..'].includes(part))) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Invalid API path' }))
    return
  }

  const target = new URL(`/api/${path}`, origin)
  if (!target.pathname.startsWith('/api/v1/')) {
    res.statusCode = 400
    res.end()
    return
  }
  for (const [key, value] of Object.entries(req.query)) {
    if (key === '__path') continue
    for (const item of Array.isArray(value) ? value : [value]) {
      target.searchParams.append(key, item)
    }
  }

  const headers = new Headers()
  for (const key of ['accept', 'content-type', 'cookie', 'origin', 'referer', 'authorization']) {
    if (req.headers[key]) headers.set(key, req.headers[key])
  }

  try {
    let body
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (req.body !== undefined) {
        body = typeof req.body === 'string' || Buffer.isBuffer(req.body)
          ? req.body
          : JSON.stringify(req.body)
      } else {
        const chunks = []
        for await (const chunk of req) chunks.push(Buffer.from(chunk))
        body = Buffer.concat(chunks)
      }
    }

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(55_000)
    })
    const data = Buffer.from(await upstream.arrayBuffer())
    res.statusCode = upstream.status
    upstream.headers.forEach((value, key) => {
      if (!responseHeadersToSkip.has(key)) res.setHeader(key, value)
    })
    const cookies = upstream.headers.getSetCookie()
    if (cookies.length) res.setHeader('Set-Cookie', cookies)
    // Keep redirects to the backend on the frontend origin as well.
    const location = upstream.headers.get('location')
    if (location) {
      const redirect = new URL(location, target)
      if (redirect.origin === origin.origin) {
        res.setHeader('Location', `${redirect.pathname}${redirect.search}${redirect.hash}`)
      }
    }
    res.setHeader('Cache-Control', 'no-store')
    res.end(data)
  } catch {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Unable to reach the backend' }))
  }
}
