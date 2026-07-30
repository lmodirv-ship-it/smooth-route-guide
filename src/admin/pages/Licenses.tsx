import AdminCrudTable from "@/admin/components/AdminCrudTable";
import { Badge } from "@/components/ui/badge";

export default function Licenses() {
  return (
    <AdminCrudTable
      table="licenses"
      title="التراخيص"
      subtitle="تراخيص استعمال المنصة والتطبيقات المكتبية."
      columns={[
        { key: "license_key", label: "المفتاح", className: "font-mono text-[11px]" },
        { key: "holder_name", label: "المالك" },
        { key: "holder_email", label: "البريد" },
        { key: "product", label: "المنتج" },
        { key: "plan", label: "الخطة" },
        { key: "seats", label: "المقاعد" },
        { key: "status", label: "الحالة", render: (r) => (
          <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
        ) },
        { key: "expires_at", label: "الانتهاء", render: (r) => r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—" },
      ]}
      fields={[
        { key: "license_key", label: "مفتاح الترخيص", placeholder: "HN-XXXX-XXXX" },
        { key: "holder_name", label: "اسم المالك" },
        { key: "holder_email", label: "البريد الإلكتروني" },
        { key: "product", label: "المنتج", placeholder: "hn-driver" },
        { key: "plan", label: "الخطة" },
        { key: "seats", label: "المقاعد", type: "number" },
        { key: "status", label: "الحالة", editOnly: true },
        { key: "notes", label: "ملاحظات", editOnly: true },
      ]}
    />
  );
}
