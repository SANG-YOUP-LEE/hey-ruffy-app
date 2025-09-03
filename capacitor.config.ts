import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.heyruffy.app.HeyRuffy',
  appName: 'HeyRuffy',
  webDir: 'dist',
  server: {
    // 개발 중 iPhone에서 즉시 반영 보고 싶으면 아래 두 줄 켜기
    // url: 'http://<맥IP>:5173',
    // cleartext: true
  }
};

export default config;
