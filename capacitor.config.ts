import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.871f375973ef45798f089a7c52b1611d",
  appName: "smooth-route-guide",
  webDir: "dist",
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

