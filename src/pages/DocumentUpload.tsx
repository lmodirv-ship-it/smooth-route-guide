import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Upload, FileText, CheckCircle, Clock, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type DocStatus = "pending" | "approved" | "rejected" | "empty";

type RequiredDoc = {
  id: string;
  name: string;
};

const requiredDocs: RequiredDoc[] = [
  { id: "license", name: "رخصة القيادة" },
  { id: "id", name: "الهوية الوطنية" },
  { id: "registration", name: "استمارة المركبة" },
  { id: "insurance", name: "التأمين" },
  { id: "photo", name: "صورة شخصية" },
  { id: "criminal", name: "شهادة حسن سيرة" },
];

const DocumentUpload = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
    if (!driver?.id) {
      setDriverId(null);
      setDocuments([]);
      setLoading(false);
      return;
    }

    setDriverId(driver.id);
    const { data } = await supabase.from("documents").select("*").eq("driver_id", driver.id);
    setDocuments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchDocuments();
    const channel = supabase
      .channel("driver-documents-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => {
        void fetchDocuments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDocuments]);

  const docs = useMemo(() => {
    return requiredDocs.map((requiredDoc) => {
      const existing = documents.find((item) => item.type === requiredDoc.id);
      return {
        id: requiredDoc.id,
        name: requiredDoc.name,
        recordId: existing?.id || null,
        file: existing?.file_url || "",
        status: (existing?.status || "empty") as DocStatus,
      };
    });
  }, [documents]);

  const statusConfig = {
    approved: { icon: CheckCircle, label: "معتمد", class: "text-success bg-success/10" },
    pending: { icon: Clock, label: "قيد المراجعة", class: "text-warning bg-warning/10" },
    rejected: { icon: X, label: "مرفوض", class: "text-destructive bg-destructive/10" },
    empty: { icon: Upload, label: "مطلوب", class: "text-muted-foreground bg-secondary" },
  } as const;

  const completedCount = docs.filter((doc) => doc.status === "approved").length;

  const handleUpload = async (docType: string, file?: File | null) => {
    if (!file || !driverId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploadingId(docType);
    try {
      const path = `${user.id}/${docType}-${Date.now()}-${file.name}`;
      const uploadRes = await supabase.storage.from("driver-documents").upload(path, file);
      if (uploadRes.error) throw new Error(uploadRes.error.message);

      const fileUrl = uploadRes.data?.publicUrl || supabase.storage.from("driver-documents").getPublicUrl(path).data.publicUrl;
      const existing = docs.find((doc) => doc.id === docType);

      if (existing?.recordId) {
        await supabase.from("documents").update({ file_url: fileUrl, status: "pending" }).eq("id", existing.recordId);
      } else {
        await supabase.from("documents").insert({
          driver_id: driverId,
          type: docType,
          file_url: fileUrl,
          status: "pending",
        });
      }

      toast({ title: "تم رفع الوثيقة بنجاح" });
      await fetchDocuments();
    } catch (error: any) {
      toast({ title: "فشل رفع الوثيقة", description: error.message || "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="min-h-screen gradient-dark pb-8">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div />
        <h1 className="font-bold text-foreground text-lg">الوثائق المطلوبة</h1>
        <button onClick={() => navigate(-1)}>
          <ArrowRight className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 mt-4">
        <div className="gradient-card rounded-2xl p-5 border border-border">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-muted-foreground">{completedCount}/{docs.length}</span>
            <span className="text-sm text-foreground font-medium">نسبة الإكمال</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${docs.length ? (completedCount / docs.length) * 100 : 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full gradient-primary rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">جاري تحميل الوثائق...</div>
        ) : docs.map((doc, i) => {
          const config = statusConfig[doc.status];
          const StatusIcon = config.icon;

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="gradient-card rounded-xl p-4 border border-border hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${config.class}`}>
                    <StatusIcon className="w-3 h-3" />
                    {uploadingId === doc.id ? "جاري الرفع..." : config.label}
                  </span>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(event) => void handleUpload(doc.id, event.target.files?.[0])}
                    />
                    <Button size="sm" type="button" className="h-8 rounded-lg gradient-primary text-primary-foreground text-xs gap-1" disabled={uploadingId === doc.id || !driverId}>
                      <Camera className="w-3 h-3" />
                      {doc.file ? "استبدال" : "رفع"}
                    </Button>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm text-foreground block">{doc.name}</span>
                    {doc.file && <a href={doc.file} target="_blank" rel="noreferrer" className="text-xs text-primary">عرض الملف</a>}
                  </div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${doc.status === "approved" ? "bg-success/10" : "bg-secondary"}`}>
                    <FileText className={`w-4 h-4 ${doc.status === "approved" ? "text-success" : "text-muted-foreground"}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentUpload;
