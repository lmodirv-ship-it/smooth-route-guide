import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hndriver.app",
  appName: "HN Driver",
  webDir: "dist",
  server: {
    url: "https://smooth-route-guide.lovable.app",
    cleartext: true,
  },
  android: {
    backgroundColor: "#111827",
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#111827",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: "#111827",
      style: "DARK",
    },
  },
};

export default config;

