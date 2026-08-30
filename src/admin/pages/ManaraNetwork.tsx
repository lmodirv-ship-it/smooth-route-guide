import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Megaphone, RefreshCw, Trash2 } from "lucide-react";
import { getManaraSiteId } from "@/hooks/useManaraNetwork";

interface ExportRow {
  id: string;
  source_site: string;
  signal_type: string;
  signal_key: string;
  old_value: string | null;
  new_value: string | null;
  target_sites: string[];
  status: string;
  created_at: string;
}

interface ImportRow {
  id: string;
  sender_site: string;
  recipient_site: string | null;
  signal_type: string;
  signal_key: string;
  signal_value: string | null;
  process_status: string;
  created_at: string;
}

const statusVariant = (s: string) =>
  s === "delivered" || s === "applied" ? "default" : s === "failed" || s === "rejected" ? "destructive" : "secondary";

const ManaraNetwork = () => {
  const { toast } = useToast();
  const [exports, setExports] = useState<ExportRow[]>([]);
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [domainForm, setDomainForm] = useState({ key: getManaraSiteId(), newValue: "", oldValue: "" });

  const load = async () => {
    const [exp, imp] = await Promise.all([
      supabase.from("manara_exports").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("manara_imports").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (exp.data) setExports(exp.data as ExportRow[]);
    if (imp.data) setImports(imp.data as ImportRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-manara-network")
      .on("postgres_changes", { event: "*", schema: "public", table: "manara_exports" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "manara_imports" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const publishDomainChange = async () => {
    if (!domainForm.newValue.trim()) {
      toast({ title: "أدخل النطاق الجديد أولًا", variant: "destructive" });
      return;
    }
    setPublishing(true);
    const { error } = await supabase.functions.invoke("manara-sync?action=publish", {
      body: {
        source_site: getManaraSiteId(),
        signal_type: "domain_change",
        signal_key: domainForm.key.trim(),
        old_value: domainForm.oldValue.trim() || null,
        new_value: domainForm.newValue.trim(),
        target_sites: [],
      },
    });
    setPublishing(false);
    if (error) {
      toast({ title: "فشل الإعلان", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الإعلان", description: "أُرسلت شيفرة تغيير النطاق لكل مواقع المجموعة." });
      setDomainForm((f) => ({ ...f, oldValue: f.newValue, newValue: "" }));
    }
  };

  const removeExport = async (id: string) => {
    await supabase.from("manara_exports").delete().eq("id", id);
    load();
  };
  const removeImport = async (id: string) => {
    await supabase.from("manara_imports").delete().eq("id", id);
    load();
  };

  const q = search.trim().toLowerCase();
  const filteredExports = exports.filter((r) =>
    [r.source_site, r.signal_type, r.signal_key, r.new_value ?? ""].join(" ").toLowerCase().includes(q),
  );
  const filteredImports = imports.filter((r) =>
    [r.sender_site, r.signal_type, r.signal_key, r.signal_value ?? ""].join(" ").toLowerCase().includes(q),
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">🛰️ شبكة منارة — تبادل المعرفة بين مواقع HN</h1>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الشيفرات…"
            className="w-56"
          />
          <Button variant="outline" size="icon" onClick={load} aria-label="refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-primary" /> إعلان تغيير نطاق
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">الموقع / المفتاح</label>
            <Input
              value={domainForm.key}
              onChange={(e) => setDomainForm((f) => ({ ...f, key: e.target.value }))}
              className="w-40"
              placeholder="main / driver / client…"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">النطاق القديم</label>
            <Input
              value={domainForm.oldValue}
              onChange={(e) => setDomainForm((f) => ({ ...f, oldValue: e.target.value }))}
              className="w-56"
              placeholder="https://old.example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">النطاق الجديد</label>
            <Input
              value={domainForm.newValue}
              onChange={(e) => setDomainForm((f) => ({ ...f, newValue: e.target.value }))}
              className="w-56"
              placeholder="https://new.example.com"
            />
          </div>
          <Button onClick={publishDomainChange} disabled={publishing}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            إرسال للمجموعة
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="exports">
        <TabsList>
          <TabsTrigger value="exports">التصدير ({filteredExports.length})</TabsTrigger>
          <TabsTrigger value="imports">الاستيراد ({filteredImports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="exports">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المصدر</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المفتاح</TableHead>
                    <TableHead>القديم ← الجديد</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الوقت</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.source_site}</TableCell>
                      <TableCell>{r.signal_type}</TableCell>
                      <TableCell>{r.signal_key}</TableCell>
                      <TableCell className="max-w-52 truncate" dir="ltr">
                        {r.old_value ?? "—"} ← {r.new_value ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleString("ar")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeExport(r.id)} aria-label="delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredExports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        لا شيفرات مُصدَّرة بعد
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imports">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المُرسِل</TableHead>
                    <TableHead>المستلم</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المفتاح</TableHead>
                    <TableHead>القيمة</TableHead>
                    <TableHead>المعالجة</TableHead>
                    <TableHead>الوقت</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredImports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.sender_site}</TableCell>
                      <TableCell>{r.recipient_site ?? "الكل"}</TableCell>
                      <TableCell>{r.signal_type}</TableCell>
                      <TableCell>{r.signal_key}</TableCell>
                      <TableCell className="max-w-52 truncate" dir="ltr">
                        {r.signal_value ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.process_status)}>{r.process_status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleString("ar")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeImport(r.id)} aria-label="delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredImports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        لا شيفرات واردة بعد
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManaraNetwork;
