import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Upload, Trash2, Download, Eye, RefreshCw, FileText, Loader2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";
import { toast } from "sonner";

const BUCKET = "user-documents";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

type Doc = {
  name: string;
  path: string;
  size: number;
  updatedAt: string;
  mimetype: string;
};

const formatSize = (bytes: number) => {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const ClientDocuments = () => {
  const navigate = useNavigate();
  const { dir } = useI18n();
  const isAr = dir === "rtl";

  const [userId, setUserId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string; isImage: boolean } | null>(null);

  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);

  const L = {
    title: isAr ? "مستنداتي" : "Mes documents",
    empty: isAr ? "لا توجد مستندات بعد" : "Aucun document pour le moment",
    emptyHint: isAr ? "ارفع بطاقتك أو رخصتك أو أي وثيقة (PDF أو صورة)" : "Importez une pièce d'identité ou tout document (PDF ou image)",
    upload: isAr ? "رفع ملف" : "Importer",
    uploading: isAr ? "جاري الرفع..." : "Import en cours...",
    replace: isAr ? "استبدال" : "Remplacer",
    remove: isAr ? "حذف" : "Supprimer",
    download: isAr ? "تنزيل" : "Télécharger",
    view: isAr ? "معاينة" : "Aperçu",
    confirmDelete: isAr ? "هل تريد حذف هذا الملف؟" : "Supprimer ce fichier ?",
    tooBig: isAr ? "حجم الملف يتجاوز 10 ميغابايت" : "Fichier supérieur à 10 Mo",
    badType: isAr ? "الصيغة غير مدعومة (PDF, PNG, JPG, WEBP فقط)" : "Format non supporté (PDF, PNG, JPG, WEBP)",
    uploaded: isAr ? "تم رفع الملف بنجاح" : "Fichier importé",
    replaced: isAr ? "تم استبدال الملف" : "Fichier remplacé",
    deleted: isAr ? "تم حذف الملف" : "Fichier supprimé",
    error: isAr ? "حدث خطأ، حاول مرة أخرى" : "Une erreur est survenue",
    needLogin: isAr ? "يجب تسجيل الدخول" : "Connexion requise",
    total: isAr ? "ملف" : "fichier(s)",
  };

  const loadDocs = useCallback(async (uid: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).list(uid, {
      limit: 100,
      sortBy: { column: "updated_at", order: "desc" },
    });
    if (error) {
      toast.error(L.error);
      setDocs([]);
    } else {
      setDocs(
        (data || [])
          .filter((f) => f.id !== null)
          .map((f) => ({
            name: f.name,
            path: `${uid}/${f.name}`,
            size: (f.metadata as any)?.size ?? 0,
            updatedAt: f.updated_at || f.created_at || "",
            mimetype: (f.metadata as any)?.mimetype ?? "",
          })),
      );
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(L.needLogin);
        navigate("/auth");
        return;
      }
      setUserId(user.id);
      await loadDocs(user.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (file: File) => {
    if (file.size > MAX_SIZE) { toast.error(L.tooBig); return false; }
    if (!ALLOWED.includes(file.type)) { toast.error(L.badType); return false; }
    return true;
  };

  const safeName = (name: string) =>
    name.replace(/[^\w.\-]+/g, "_").slice(-80);

  const handleUpload = async (file: File) => {
    if (!userId || !validate(file)) return;
    setBusy("upload");
    const path = `${userId}/${Date.now()}_${safeName(file.name)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
    });
    setBusy(null);
    if (error) return toast.error(L.error);
    toast.success(L.uploaded);
    loadDocs(userId);
  };

  const handleReplace = async (file: File) => {
    const path = replaceTarget.current;
    if (!userId || !path || !validate(file)) return;
    setBusy(path);
    const { error } = await supabase.storage.from(BUCKET).update(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });
    setBusy(null);
    replaceTarget.current = null;
    if (error) return toast.error(L.error);
    toast.success(L.replaced);
    loadDocs(userId);
  };

  const handleDelete = async (path: string) => {
    if (!userId || !window.confirm(L.confirmDelete)) return;
    setBusy(path);
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    setBusy(null);
    if (error) return toast.error(L.error);
    toast.success(L.deleted);
    loadDocs(userId);
  };

  const signedUrl = async (path: string, download = false) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 300, download ? { download: true } : undefined);
    if (error || !data) { toast.error(L.error); return null; }
    return data.signedUrl;
  };

  const handleDownload = async (doc: Doc) => {
    setBusy(doc.path);
    const url = await signedUrl(doc.path, true);
    setBusy(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePreview = async (doc: Doc) => {
    setBusy(doc.path);
    const url = await signedUrl(doc.path);
    setBusy(null);
    if (url) setPreview({ url, name: doc.name, isImage: doc.mimetype.startsWith("image/") });
  };

  return (
    <div className="min-h-screen gradient-dark pb-24" dir={dir}>
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/customer/profile")} aria-label="back">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="font-bold text-foreground">{L.title}</h1>
        <div className="w-5" />
      </div>

      <div className="px-4 pt-5 space-y-4">
        <input
          ref={uploadRef}
          type="file"
          className="hidden"
          accept=".pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleUpload(f); }}
        />
        <input
          ref={replaceRef}
          type="file"
          className="hidden"
          accept=".pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleReplace(f); }}
        />

        <Button
          className="w-full h-12 gap-2"
          disabled={busy === "upload"}
          onClick={() => uploadRef.current?.click()}
        >
          {busy === "upload"
            ? <><Loader2 className="w-4 h-4 animate-spin" />{L.uploading}</>
            : <><Upload className="w-4 h-4" />{L.upload}</>}
        </Button>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : docs.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center space-y-2">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="font-semibold text-foreground">{L.empty}</p>
            <p className="text-sm text-muted-foreground">{L.emptyHint}</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{docs.length} {L.total}</p>
            <div className="space-y-3">
              {docs.map((doc, i) => (
                <motion.div
                  key={doc.path}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {doc.name.replace(/^\d+_/, "")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(doc.size)}
                        {doc.updatedAt ? ` · ${new Date(doc.updatedAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    {busy === doc.path && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <Button size="sm" variant="secondary" className="gap-1 text-xs" onClick={() => handlePreview(doc)}>
                      <Eye className="w-3.5 h-3.5" />{L.view}
                    </Button>
                    <Button size="sm" variant="secondary" className="gap-1 text-xs" onClick={() => handleDownload(doc)}>
                      <Download className="w-3.5 h-3.5" />{L.download}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1 text-xs"
                      onClick={() => { replaceTarget.current = doc.path; replaceRef.current?.click(); }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />{L.replace}
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => handleDelete(doc.path)}>
                      <Trash2 className="w-3.5 h-3.5" />{L.remove}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[2000] bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 glass-strong">
            <span className="text-sm font-semibold text-foreground truncate">
              {preview.name.replace(/^\d+_/, "")}
            </span>
            <button onClick={() => setPreview(null)} aria-label="close">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-3">
            {preview.isImage ? (
              <img src={preview.url} alt={preview.name} className="max-w-full max-h-full rounded-xl" />
            ) : (
              <iframe src={preview.url} title={preview.name} className="w-full h-full rounded-xl bg-white" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDocuments;
