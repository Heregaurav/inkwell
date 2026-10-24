import { deploymentEnv, type VercelConfig } from '@vercel/config/v1'

export const config: VercelConfig = {
  // Deployment environment references use Vercel's routes format (src/dest/env).
  routes: [
    {
      src: '/api/(.*)',
      dest: `${deploymentEnv('BACKEND_ORIGIN')}/api/$1`,
      env: ['BACKEND_ORIGIN']
    },
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/index.html' }
  ]
}
