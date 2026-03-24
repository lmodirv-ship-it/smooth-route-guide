import { useState } from "react";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Brain, Lightbulb, Bug, Megaphone, Activity,
  Plus, RefreshCw, BookOpen, TrendingUp, AlertCircle
} from "lucide-react";

type KnowledgeEntry = {
  id: string; category: string; title: string; content: string;
  source_type: string; source_url: string | null; tags: string[];
  priority: string; status: string; created_at: string;
};
type Recommendation = {
  id: string; area: string; title: string; description: string;
  impact: string; status: string; admin_response: string | null; created_at: string;
};
type IssuePattern = {
  id: string; pattern_type: string; title: string; description: string;
  affected_area: string; occurrence_count: number; severity: string;
  status: string; resolution_notes: string | null; last_seen_at: string;
};
type CampaignIdea = {
  id: string; title: string; description: string; campaign_type: string;
  target_audience: string; estimated_impact: string; status: string;
  admin_approved: boolean; created_at: string;
};
type ActivityLog = {
  id: string; action_type: string; title: string; details: string;
  created_at: string;
};

const priorityColor: Record<string, string> = {
  high: "bg-destructive/20 text-destructive",
  medium: "bg-warning/20 text-warning",
  low: "bg-muted text-muted-foreground",
};
const severityColor = priorityColor;
const impactColor: Record<string, string> = {
  high: "bg-success/20 text-success",
  medium: "bg-info/20 text-info",
  low: "bg-muted text-muted-foreground",
};

const AssistantKnowledge = () => {
  const [activeTab, setActiveTab] = useState("knowledge");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: knowledge, refresh: refreshKnowledge } = useSupabaseQuery<KnowledgeEntry>({
    table: "assistant_knowledge_entries", orderByField: "created_at", realtime: true,
  });
  const { data: recommendations, refresh: refreshRecs } = useSupabaseQuery<Recommendation>({
    table: "assistant_recommendations", orderByField: "created_at", realtime: true,
  });
  const { data: issues, refresh: refreshIssues } = useSupabaseQuery<IssuePattern>({
    table: "assistant_issue_patterns", orderByField: "last_seen_at", realtime: true,
  });
  const { data: campaigns, refresh: refreshCampaigns } = useSupabaseQuery<CampaignIdea>({
    table: "assistant_campaign_ideas", orderByField: "created_at", realtime: true,
  });
  const { data: activityLog } = useSupabaseQuery<ActivityLog>({
    table: "assistant_activity_log", orderByField: "created_at", limitCount: 50, realtime: true,
  });

  const refreshAll = () => {
    refreshKnowledge(); refreshRecs(); refreshIssues(); refreshCampaigns();
  };

  const stats = [
    { label: "المعرفة المخزنة", value: knowledge.length, icon: BookOpen, color: "text-info" },
    { label: "التوصيات", value: recommendations.length, icon: Lightbulb, color: "text-warning" },
    { label: "أنماط المشاكل", value: issues.length, icon: Bug, color: "text-destructive" },
    { label: "أفكار الحملات", value: campaigns.length, icon: Megaphone, color: "text-success" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">قاعدة المعرفة</h1>
            <p className="text-xs text-muted-foreground">المساعد الإداري الذكي — المعرفة والتحليل والتطوير</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refreshAll}>
            <RefreshCw className="w-4 h-4 ml-1" /> تحديث
          </Button>
          <AddEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={refreshAll} activeTab={activeTab} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="knowledge"><BookOpen className="w-4 h-4 ml-1" />المعرفة</TabsTrigger>
          <TabsTrigger value="recommendations"><Lightbulb className="w-4 h-4 ml-1" />التوصيات</TabsTrigger>
          <TabsTrigger value="issues"><Bug className="w-4 h-4 ml-1" />المشاكل</TabsTrigger>
          <TabsTrigger value="campaigns"><Megaphone className="w-4 h-4 ml-1" />الحملات</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="w-4 h-4 ml-1" />السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="space-y-3 mt-4">
          {knowledge.length === 0 ? <EmptyState label="لا توجد إدخالات معرفية بعد" /> : knowledge.map((e) => (
            <Card key={e.id} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{e.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.content}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="outline">{e.category}</Badge>
                      <Badge variant="outline">{e.source_type}</Badge>
                      <Badge className={priorityColor[e.priority] || ""}>{e.priority}</Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleDateString("ar")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-3 mt-4">
          {recommendations.length === 0 ? <EmptyState label="لا توجد توصيات بعد" /> : recommendations.map((r) => (
            <Card key={r.id} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-warning" />
                      <h3 className="font-semibold text-foreground">{r.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{r.area}</Badge>
                      <Badge className={impactColor[r.impact] || ""}>تأثير: {r.impact}</Badge>
                      <Badge variant="secondary">{r.status}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="issues" className="space-y-3 mt-4">
          {issues.length === 0 ? <EmptyState label="لا توجد أنماط مشاكل مسجلة" /> : issues.map((i) => (
            <Card key={i.id} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <h3 className="font-semibold text-foreground">{i.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{i.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className={severityColor[i.severity] || ""}>خطورة: {i.severity}</Badge>
                      <Badge variant="outline">{i.affected_area}</Badge>
                      <Badge variant="secondary">تكرار: {i.occurrence_count}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-3 mt-4">
          {campaigns.length === 0 ? <EmptyState label="لا توجد أفكار حملات بعد" /> : campaigns.map((c) => (
            <Card key={c.id} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{c.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{c.campaign_type}</Badge>
                      <Badge variant="secondary">{c.target_audience}</Badge>
                      {c.admin_approved && <Badge className="bg-success/20 text-success">معتمدة</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="activity" className="space-y-2 mt-4">
          {activityLog.length === 0 ? <EmptyState label="لا توجد نشاطات مسجلة" /> : activityLog.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-card/30 border border-border">
              <Activity className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground truncate">{a.details}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(a.created_at).toLocaleDateString("ar")}
              </span>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const EmptyState = ({ label }: { label: string }) => (
  <div className="text-center py-12 text-muted-foreground">
    <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
    <p>{label}</p>
  </div>
);

const AddEntryDialog = ({ open, onOpenChange, onSuccess, activeTab }: {
  open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void; activeTab: string;
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);

  const tableMap: Record<string, string> = {
    knowledge: "assistant_knowledge_entries",
    recommendations: "assistant_recommendations",
    issues: "assistant_issue_patterns",
    campaigns: "assistant_campaign_ideas",
  };

  const handleAdd = async () => {
    if (!title.trim()) return toast.error("العنوان مطلوب");
    setLoading(true);
    const table = tableMap[activeTab] || "assistant_knowledge_entries";
    const { data: { user } } = await supabase.auth.getUser();

    let row: any;
    switch (activeTab) {
      case "recommendations":
        row = { title, description: content, area: category, created_by: user?.id };
        break;
      case "issues":
        row = { title, description: content, affected_area: category, created_by: undefined };
        break;
      case "campaigns":
        row = { title, description: content, campaign_type: category, created_by: user?.id };
        break;
      default:
        row = { title, content, category, source_type: "manual", created_by: user?.id };
    }

    const { error } = await supabase.from(table as any).insert(row);
    setLoading(false);
    if (error) {
      toast.error("فشل الإضافة: " + error.message);
    } else {
      toast.success("تمت الإضافة بنجاح");
      setTitle(""); setContent(""); setCategory("general");
      onOpenChange(false);
      onSuccess();
    }
  };

  if (activeTab === "activity") return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>إضافة إدخال جديد</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="المحتوى / الوصف" value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">عام</SelectItem>
              <SelectItem value="performance">الأداء</SelectItem>
              <SelectItem value="ux">تجربة المستخدم</SelectItem>
              <SelectItem value="operations">العمليات</SelectItem>
              <SelectItem value="marketing">التسويق</SelectItem>
              <SelectItem value="technical">تقني</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={loading} className="w-full">
            {loading ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssistantKnowledge;
