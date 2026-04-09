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
  playStoreUrl?: string;
};

export const nativeDownloadPageUrl = "/welcome#mobile-download";

export const nativeDownloads: NativeDownload[] = [
  {
    id: "android-client",
    title: "تطبيق العميل - Android",
    desc: "تطبيق العميل لطلب الرحلات والتوصيل.",
    badge: "APK",
    href: "https://www.hn-driver.com/downloads/hn-client.apk",
    fileName: "hn-client.apk",
    buildCommand: "Client App",
    platform: "mobile",
    version: "v1.0.0",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.hndriver.client",
  },
  {
    id: "android-ride",
    title: "تطبيق سائق الركاب - Android",
    desc: "تطبيق خاص بسائقي الركاب لاستقبال وإدارة الرحلات.",
    badge: "APK",
    href: "https://www.hn-driver.com/downloads/hn-ride.apk",
    fileName: "hn-ride.apk",
    buildCommand: "Driver Ride App",
    platform: "mobile",
    version: "v1.0.0",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.hndriver.app",
  },
  {
    id: "android-delivery",
    title: "تطبيق سائق التوصيل - Android",
    desc: "تطبيق خاص بسائقي التوصيل لإدارة طلبات الطعام والطرود.",
    badge: "APK",
    href: "https://www.hn-driver.com/downloads/hn-delivery.apk",
    fileName: "hn-delivery.apk",
    buildCommand: "Driver Delivery App",
    platform: "mobile",
    version: "v1.0.0",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.hndriver.delivery",
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
