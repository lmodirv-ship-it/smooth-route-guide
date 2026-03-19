import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export const isNativeApp = Capacitor.isNativePlatform();

export const initializeNativeApp = async () => {
  if (!isNativeApp) return;

  try {
    await SplashScreen.hide();
  } catch {
    // ignore native splash failures
  }

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#111827" });
  } catch {
    // ignore status bar failures
  }

  try {
    await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack) {
        void CapacitorApp.minimizeApp();
      } else {
        window.history.back();
      }
    });
  } catch {
    // ignore back button failures
  }
};
