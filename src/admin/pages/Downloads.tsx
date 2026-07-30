import AdminCrudTable from "@/admin/components/AdminCrudTable";

export default function Downloads() {
  return (
    <AdminCrudTable
      table="download_items"
      title="التنزيلات"
      subtitle="ملفات التطبيقات (APK / AAB / Desktop) المتاحة للتحميل."
      orderBy={{ column: "sort_order", ascending: true }}
      toggleKey="is_active"
      columns={[
        { key: "title", label: "الملف" },
        { key: "platform", label: "المنصة" },
        { key: "version", label: "الإصدار" },
        { key: "size_mb", label: "الحجم (MB)" },
        { key: "download_count", label: "عدد التنزيلات" },
        { key: "file_url", label: "الرابط", render: (r) => r.file_url
          ? <a className="text-primary underline text-xs" href={r.file_url} target="_blank" rel="noopener noreferrer">فتح ↗</a>
          : "—" },
      ]}
      fields={[
        { key: "title", label: "العنوان", placeholder: "تطبيق السائق" },
        { key: "platform", label: "المنصة", placeholder: "android / windows / ios" },
        { key: "file_url", label: "الرابط", placeholder: "/downloads/apps/hn-driver.apk" },
        { key: "version", label: "الإصدار", placeholder: "1.0.0" },
        { key: "size_mb", label: "الحجم بالميغابايت", type: "number" },
        { key: "sort_order", label: "الترتيب", type: "number", editOnly: true },
        { key: "is_active", label: "مُفعّل", type: "boolean", editOnly: true },
      ]}
    />
  );
}
