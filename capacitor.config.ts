// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.heyruffy.app.HeyRuffy',
  appName: 'HeyRuffy',
  webDir: 'dist', // 네이티브 플러그인용 백업 산출물이라 그대로 둬도 됨
  server: {
    url: 'https://hey-ruffy-app.vercel.app',
    cleartext: false
  }
}

export default config