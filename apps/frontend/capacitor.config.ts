import type { CapacitorConfig } from '@capacitor/cli'

const local = process.env.HILT_MOBILE_LOCAL === '1'

const config: CapacitorConfig = {
  appId: 'dev.paolini.hilt',
  appName: 'Hilt',
  webDir: 'dist',
  ...(local && {
    server: { cleartext: true },
    android: { allowMixedContent: true },
  }),
}

export default config
