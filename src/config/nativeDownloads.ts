export type NativeDownload = {
  id: string;
  title: string;
  desc: string;
  badge: string;
  href: string;
  fileName: string;
  buildCommand: string;
  platform: "mobile" | "desktop";
  version?: string;
};

export const nativeDownloadPageUrl = "/welcome#mobile-download";

export const nativeDownloads: NativeDownload[] = [
  {
    id: "android",
    title: "Android APK",
    desc: "نسخة Android حقيقية بدون شريط متصفح، جاهزة للتحميل فور وضع ملف APK النهائي داخل مجلد التنزيلات.",
    badge: "APK",
    href: "/downloads/hn-driver-android.apk",
    fileName: "HN-DRIVER.apk",
    buildCommand: "npm run native:android:apk",
    platform: "mobile",
    version: "v1.0.0",
  },
  {
    id: "ios",
    title: "iPhone / iOS",
    desc: "نسخة iPhone Native جاهزة للربط بملف IPA أو TestFlight عند تجهيز النسخة النهائية.",
    badge: "IPA",
    href: "/downloads/hn-driver-ios.ipa",
    fileName: "hn-driver-ios.ipa",
    buildCommand: "npm run native:ios",
    platform: "mobile",
  },
  {
    id: "windows",
    title: "Windows EXE",
    desc: "نسخة Windows Desktop Native عبر Electron، وزر التحميل يتفعّل تلقائياً عند وجود ملف التثبيت.",
    badge: "EXE",
    href: "/downloads/hn-driver-windows-setup.exe",
    fileName: "hn-driver-windows-setup.exe",
    buildCommand: "npm run desktop:win",
    platform: "desktop",
  },
  {
    id: "macos",
    title: "macOS DMG",
    desc: "نسخة macOS فعلية للتثبيت على أجهزة Apple عند إخراج ملف DMG النهائي.",
    badge: "DMG",
    href: "/downloads/hn-driver-macos.dmg",
    fileName: "hn-driver-macos.dmg",
    buildCommand: "npm run desktop:mac",
    platform: "desktop",
  },
  {
    id: "linux",
    title: "Linux AppImage",
    desc: "نسخة Linux Desktop قابلة للتشغيل المباشر عند إضافة ملف AppImage النهائي.",
    badge: "APP",
    href: "/downloads/hn-driver-linux.AppImage",
    fileName: "hn-driver-linux.AppImage",
    buildCommand: "npm run desktop:linux",
    platform: "desktop",
  },
];

export const mobileDownloads = nativeDownloads.filter((item) => item.platform === "mobile");
export const desktopDownloads = nativeDownloads.filter((item) => item.platform === "desktop");
