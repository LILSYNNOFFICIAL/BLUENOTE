/**
 * Capacitor & Native Android Configuration for BlueNote
 * Package ID: io.github.lilsynnofficial.bluenote
 * Ready for both F-Droid (FOSS reproducible APK) and Google Play Store (API 35 .aab)
 */
const config = {
  appId: 'io.github.lilsynnofficial.bluenote',
  appName: 'BlueNote',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#0f172a',
  },
};

export default config;
