import AdminCrudTable from "@/admin/components/AdminCrudTable";
import { Badge } from "@/components/ui/badge";

export default function Monitoring() {
  return (
    <AdminCrudTable
      table="monitoring_checks"
      title="المراقبة"
      subtitle="نقاط الفحص الدورية للنطاقات والخدمات."
      toggleKey="is_enabled"
      columns={[
        { key: "name", label: "الفحص" },
        { key: "target", label: "الهدف", className: "font-mono text-[11px]" },
        { key: "kind", label: "النوع" },
        { key: "status", label: "الحالة", render: (r) => (
          <Badge variant={r.status === "up" ? "default" : r.status === "down" ? "destructive" : "secondary"}>{r.status}</Badge>
        ) },
        { key: "latency_ms", label: "الاستجابة (ms)" },
        { key: "last_check_at", label: "آخر فحص", render: (r) => r.last_check_at ? new Date(r.last_check_at).toLocaleString() : "—" },
      ]}
      fields={[
        { key: "name", label: "الاسم", placeholder: "الموقع الرئيسي" },
        { key: "target", label: "الهدف", placeholder: "https://www.hn-driver.com" },
        { key: "kind", label: "النوع", placeholder: "http / db / function" },
        { key: "status", label: "الحالة", editOnly: true },
        { key: "is_enabled", label: "مُفعّل", type: "boolean", editOnly: true },
      ]}
    />
  );
}
