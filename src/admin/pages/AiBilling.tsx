import AiUsageView from "@/admin/components/AiUsageView";

export default function AiBilling() {
  return (
    <AiUsageView
      title="فواتير الذكاء الاصطناعي"
      subtitle="التكلفة والاستهلاك لكل نموذج."
      groupBy="model"
    />
  );
}
