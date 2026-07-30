import AdminCrudTable from "@/admin/components/AdminCrudTable";
import { Badge } from "@/components/ui/badge";

export default function SignupRequests() {
  return (
    <AdminCrudTable
      table="signup_requests"
      title="طلبات التسجيل"
      subtitle="طلبات الانضمام في انتظار المراجعة."
      columns={[
        { key: "full_name", label: "الاسم" },
        { key: "phone", label: "الهاتف" },
        { key: "email", label: "البريد" },
        { key: "requested_role", label: "الدور المطلوب", render: (r) => <Badge variant="outline">{r.requested_role}</Badge> },
        { key: "city", label: "المدينة" },
        { key: "status", label: "الحالة", render: (r) => (
          <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>
        ) },
        { key: "created_at", label: "التاريخ", render: (r) => new Date(r.created_at).toLocaleString() },
      ]}
      fields={[
        { key: "full_name", label: "الاسم الكامل" },
        { key: "phone", label: "الهاتف" },
        { key: "email", label: "البريد الإلكتروني" },
        { key: "requested_role", label: "الدور المطلوب", placeholder: "driver / delivery / store_owner" },
        { key: "city", label: "المدينة" },
        { key: "status", label: "الحالة", placeholder: "pending / approved / rejected", editOnly: true },
        { key: "notes", label: "ملاحظات", editOnly: true },
      ]}
    />
  );
}
