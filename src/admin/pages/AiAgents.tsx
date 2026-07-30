/**
 * وكلاء الذكاء الاصطناعي — واجهة برمجة تطبيقات وكلاء.
 */
import AdminCrudTable from "@/admin/components/AdminCrudTable";
import { Badge } from "@/components/ui/badge";

export default function AiAgents() {
  return (
    <AdminCrudTable
      table="ai_agents"
      title="واجهة برمجة تطبيقات وكلاء (Agents API)"
      subtitle="عرّف الوكلاء ومهامهم وأدواتهم المسموح بها، ثم فعّلهم لاستعمالهم في صفحة المحادثات."
      orderBy={{ column: "priority", ascending: true }}
      toggleKey="is_enabled"
      columns={[
        { key: "name", label: "الوكيل", render: (r) => (
          <div>
            <div className="font-medium">{r.name}</div>
            <div className="text-[11px] text-muted-foreground">{r.description || "—"}</div>
          </div>
        ) },
        { key: "role", label: "الدور", render: (r) => <Badge variant="outline">{r.role}</Badge> },
        { key: "allowed_tools", label: "الأدوات", render: (r) => (
          <span className="text-[11px] font-mono">{(r.allowed_tools ?? []).join(", ") || "—"}</span>
        ) },
        { key: "priority", label: "الأولوية" },
      ]}
      fields={[
        { key: "name", label: "الاسم", placeholder: "اسم الوكيل" },
        { key: "role", label: "الدور", placeholder: "assistant / analyst / support" },
        { key: "description", label: "الوصف", placeholder: "المهمة" },
        { key: "system_prompt", label: "تعليمات النظام", editOnly: true },
        { key: "api_key", label: "مفتاح الوكيل", editOnly: true },
        { key: "priority", label: "الأولوية", type: "number", editOnly: true },
        { key: "is_enabled", label: "مُفعّل", type: "boolean", editOnly: true },
      ]}
    />
  );
}
