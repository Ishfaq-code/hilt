import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  if (mode === 'mobile' || mode === 'mobile-local') {
    const env = loadEnv(mode, process.cwd())
    const webOrigin = URL.parse(env.VITE_HILT_WEB_ORIGIN)
    const apiOrigin = URL.parse(env.VITE_HILT_API_ORIGIN)
    if (
      webOrigin?.protocol !== 'https:' ||
      !apiOrigin ||
      (apiOrigin.protocol !== 'https:' &&
        !(mode === 'mobile-local' && apiOrigin.protocol === 'http:'))
    ) {
      throw new Error(
        'Set HTTPS origins in .env.mobile.local using .env.mobile.example.',
      )
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': process.env.HILT_DEV_API || 'http://backend:3000',
      },
    },
  }
})
