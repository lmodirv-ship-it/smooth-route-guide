import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Upload, FileText, CheckCircle, Clock, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Doc {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected" | "empty";
  file?: string;
}

const DocumentUpload = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Doc[]>([
    { id: "license", name: "رخصة القيادة", status: "approved" },
    { id: "id", name: "الهوية الوطنية", status: "approved" },
    { id: "registration", name: "استمارة المركبة", status: "pending" },
    { id: "insurance", name: "التأمين", status: "empty" },
    { id: "photo", name: "صورة شخصية", status: "empty" },
    { id: "criminal", name: "شهادة حسن سيرة", status: "empty" },
  ]);

  const statusConfig = {
    approved: { icon: CheckCircle, label: "معتمد", class: "text-success bg-success/10" },
    pending: { icon: Clock, label: "قيد المراجعة", class: "text-warning bg-warning/10" },
    rejected: { icon: X, label: "مرفوض", class: "text-destructive bg-destructive/10" },
    empty: { icon: Upload, label: "مطلوب", class: "text-muted-foreground bg-secondary" },
  };

  const completedCount = docs.filter(d => d.status === "approved").length;

  return (
    <div className="min-h-screen gradient-dark pb-8">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div />
        <h1 className="font-bold text-foreground text-lg">الوثائق المطلوبة</h1>
        <button onClick={() => navigate(-1)}>
          <ArrowRight className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 mt-4">
        <div className="gradient-card rounded-2xl p-5 border border-border">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-muted-foreground">{completedCount}/{docs.length}</span>
            <span className="text-sm text-foreground font-medium">نسبة الإكمال</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / docs.length) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full gradient-primary rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="px-4 mt-4 space-y-3">
        {docs.map((doc, i) => {
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${config.class}`}>
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                  </span>
                  {doc.status === "empty" && (
                    <Button size="sm" className="h-8 rounded-lg gradient-primary text-primary-foreground text-xs gap-1">
                      <Camera className="w-3 h-3" />
                      رفع
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground">{doc.name}</span>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    doc.status === "approved" ? "bg-success/10" : "bg-secondary"
                  }`}>
                    <FileText className={`w-4 h-4 ${
                      doc.status === "approved" ? "text-success" : "text-muted-foreground"
                    }`} />
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
