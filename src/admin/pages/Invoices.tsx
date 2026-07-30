import AdminCrudTable from "@/admin/components/AdminCrudTable";
import { Badge } from "@/components/ui/badge";

export default function Invoices() {
  return (
    <AdminCrudTable
      table="invoices"
      title="الفواتير"
      subtitle="فواتير العملاء والشركاء."
      columns={[
        { key: "invoice_number", label: "رقم الفاتورة", className: "font-mono text-[11px]" },
        { key: "customer_name", label: "العميل" },
        { key: "customer_email", label: "البريد" },
        { key: "amount", label: "المبلغ", render: (r) => `${r.amount} ${r.currency}` },
        { key: "status", label: "الحالة", render: (r) => (
          <Badge variant={r.status === "paid" ? "default" : r.status === "overdue" ? "destructive" : "secondary"}>{r.status}</Badge>
        ) },
        { key: "issued_at", label: "التاريخ", render: (r) => new Date(r.issued_at).toLocaleDateString() },
      ]}
      fields={[
        { key: "invoice_number", label: "رقم الفاتورة", placeholder: "INV-000001" },
        { key: "customer_name", label: "اسم العميل" },
        { key: "customer_email", label: "البريد الإلكتروني" },
        { key: "amount", label: "المبلغ", type: "number" },
        { key: "currency", label: "العملة", placeholder: "MAD", editOnly: true },
        { key: "status", label: "الحالة", placeholder: "draft / sent / paid", editOnly: true },
        { key: "notes", label: "ملاحظات", editOnly: true },
      ]}
    />
  );
}
