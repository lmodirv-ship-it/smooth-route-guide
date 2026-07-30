import AiUsageView from "@/admin/components/AiUsageView";

export default function UsageMetrics() {
  return (
    <AiUsageView
      title="قياس الاستهلاك"
      subtitle="الاستهلاك اليومي عبر كل النماذج والأدوات."
      groupBy="day"
    />
  );
}
