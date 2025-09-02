import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.heyruf.fy',
  appName: 'HeyRuffy',
  webDir: 'dist',
  server: {
    url: 'http://192.168.45.251:5173',
    cleartext: true
  }
};

export default config;
