import AdminCrudTable from "@/admin/components/AdminCrudTable";

export default function PlatformPackages() {
  return (
    <AdminCrudTable
      table="platform_packages"
      title="الباقات"
      subtitle="باقات الاشتراك للعملاء والسائقين والمتاجر."
      orderBy={{ column: "sort_order", ascending: true }}
      toggleKey="is_active"
      columns={[
        { key: "name", label: "الباقة" },
        { key: "audience", label: "الفئة" },
        { key: "price", label: "السعر", render: (r) => `${r.price} ${r.currency}` },
        { key: "duration_days", label: "المدة (يوم)" },
        { key: "sort_order", label: "الترتيب" },
      ]}
      fields={[
        { key: "name", label: "الاسم", placeholder: "اسم الباقة" },
        { key: "audience", label: "الفئة", placeholder: "client / driver / store" },
        { key: "price", label: "السعر", type: "number" },
        { key: "currency", label: "العملة", placeholder: "MAD", editOnly: true },
        { key: "duration_days", label: "المدة بالأيام", type: "number" },
        { key: "sort_order", label: "الترتيب", type: "number", editOnly: true },
        { key: "is_active", label: "مُفعّلة", type: "boolean", editOnly: true },
      ]}
    />
  );
}
