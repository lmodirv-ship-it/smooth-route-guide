import { createElement, type ComponentType, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, ExternalLink, Laptop, Smartphone } from "lucide-react";
import QRCodeImport from "react-qr-code";
import {
  desktopDownloads,
  mobileDownloads,
  nativeDownloadPageUrl,
  type NativeDownload,
} from "@/config/nativeDownloads";

type QRCodeProps = {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
};

type DownloadMeta = {
  ready: boolean;
  sizeLabel?: string;
  lastUpdatedLabel?: string;
};

const resolveQrCodeComponent = (moduleValue: unknown): ComponentType<QRCodeProps> | null => {
  if (typeof moduleValue === "function") {
    return moduleValue as ComponentType<QRCodeProps>;
  }

  if (moduleValue && typeof moduleValue === "object") {
    const candidate =
      (moduleValue as { default?: unknown; QRCode?: unknown }).default ??
      (moduleValue as { default?: unknown; QRCode?: unknown }).QRCode;

    return resolveQrCodeComponent(candidate);
  }

  return null;
};

const QRCodeComponent = resolveQrCodeComponent(QRCodeImport);

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatLastUpdated = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const NativeDownloadCard = ({ item, meta }: { item: NativeDownload; meta?: DownloadMeta }) => {
  const ready = Boolean(meta?.ready);

  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{item.title}</p>
        <div className="flex items-center gap-2">
          {item.version ? (
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-primary">
              {item.version}
            </span>
          ) : null}
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {item.badge}
          </span>
        </div>
      </div>

      <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.desc}</p>
      <p className="mt-2 text-[11px] font-medium text-muted-foreground">{item.fileName}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{item.buildCommand}</p>

      {item.id === "android" && ready ? (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card/70 p-3">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">الحجم</p>
            <p className="mt-1 text-xs font-medium text-foreground">{meta?.sizeLabel ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">آخر تحديث</p>
            <p className="mt-1 text-xs font-medium text-foreground">{meta?.lastUpdatedLabel ?? "—"}</p>
          </div>
        </div>
      ) : null}

      {item.playStoreUrl && (
        <a
          href={item.playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-success px-3 py-2.5 text-xs font-semibold text-success-foreground transition-opacity hover:opacity-90"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          تحميل من Google Play
        </a>
      )}

      {ready ? (
        <a
          href={item.href}
          download
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Download className="h-3.5 w-3.5" />
          تحميل APK مباشر
        </a>
      ) : !item.playStoreUrl ? (
        <button
          type="button"
          disabled
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground opacity-80"
        >
          بانتظار ملف التثبيت
        </button>
      ) : null}
    </div>
  );
};

const NativeDownloadSection = () => {
  const [downloadMeta, setDownloadMeta] = useState<Record<string, DownloadMeta>>({});

  const allDownloads = useMemo(() => [...mobileDownloads, ...desktopDownloads], []);

  useEffect(() => {
    let mounted = true;

    const checkAvailability = async () => {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      const entries = await Promise.all(
        allDownloads.map(async (item) => {
          try {
            const response = await fetch(new URL(item.href, baseUrl), { method: "HEAD" });
            const contentLength = response.headers.get("content-length");
            const lastModified = response.headers.get("last-modified");

            return [
              item.id,
              {
                ready: response.ok,
                sizeLabel: response.ok && contentLength ? formatFileSize(Number(contentLength)) : undefined,
                lastUpdatedLabel: response.ok && lastModified ? formatLastUpdated(lastModified) : undefined,
              },
            ] as const;
          } catch {
            return [item.id, { ready: false }] as const;
          }
        }),
      );

      if (mounted) {
        setDownloadMeta(Object.fromEntries(entries));
      }
    };

    void checkAvailability();

    return () => {
      mounted = false;
    };
  }, [allDownloads]);

  return (
    <motion.section
      id="mobile-download"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-card/75 p-5 shadow-2xl shadow-primary/10 backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">نسخ Native حقيقية</h2>
          <p className="text-xs text-muted-foreground">Android و iPhone ونسخ الكمبيوتر مرتبطة الآن بمسارات تنزيل فعلية.</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
          <Smartphone className="h-3.5 w-3.5 text-primary" />
          الهاتف
        </div>
        <div className="grid gap-3">
          {mobileDownloads.map((item) => (
            <NativeDownloadCard key={item.id} item={item} meta={downloadMeta[item.id]} />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
          <Laptop className="h-3.5 w-3.5 text-primary" />
          الكمبيوتر
        </div>
        <div className="grid gap-3">
          {desktopDownloads.map((item) => (
            <NativeDownloadCard key={item.id} item={item} meta={downloadMeta[item.id]} />
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
        <p className="text-xs leading-6 text-muted-foreground">
          ضع ملفات التثبيت النهائية داخل <span className="font-semibold text-foreground">public/downloads</span> بالأسماء الظاهرة أعلاه، وسيتفعّل زر التحميل الحقيقي تلقائياً.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-background/70 p-4 text-center">
        <p className="text-sm font-semibold text-foreground">امسح الكود بالجوال</p>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          افتح صفحة التحميل مباشرة على هاتفك من خلال QR code.
        </p>
        <div className="mx-auto mt-4 flex w-fit rounded-2xl bg-background p-3 shadow-lg shadow-primary/10">
          {QRCodeComponent ? (
            createElement(QRCodeComponent, {
              value: nativeDownloadPageUrl,
              size: 132,
              bgColor: "hsl(var(--background))",
              fgColor: "hsl(var(--foreground))",
            })
          ) : (
            <p className="text-xs text-muted-foreground">تعذر تحميل رمز QR حالياً.</p>
          )}
        </div>
        <a
          href={nativeDownloadPageUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-xs text-primary underline-offset-4 hover:underline"
        >
          فتح رابط التحميل
        </a>
      </div>
    </motion.section>
  );
};

export default NativeDownloadSection;
