// Set BACKEND_ORIGIN in Vercel's environment variables, without a VITE_ prefix.
const backendOrigin = process.env.BACKEND_ORIGIN?.trim().replace(/\/+$/, '')

if (!backendOrigin) {
  throw new Error('Set BACKEND_ORIGIN in Vercel before deploying')
}

const backendUrl = new URL(backendOrigin)
if (backendUrl.protocol !== 'https:' || backendUrl.origin !== backendOrigin) {
  throw new Error('BACKEND_ORIGIN must be an HTTPS origin without a path, query, or credentials')
}

export const config = {
  rewrites: [
    { source: '/api/:path*', destination: `${backendOrigin}/api/:path*` },
    { source: '/(.*)', destination: '/index.html' }
  ]
}
