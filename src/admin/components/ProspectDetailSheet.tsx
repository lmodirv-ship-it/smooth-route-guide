import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Phone, Mail, Globe, MapPin, Star, MessageSquare, ExternalLink,
  Save, Loader2, UserCheck, Store as StoreIcon, Copy, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DBProspect = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  area: string;
  city: string;
  country: string;
  category: string;
  rating: number;
  website: string;
  google_place_id: string;
  mailbluster_synced: boolean;
  source: string;
  status: string;
  notes: string;
  call_status: string;
  call_priority: string;
  call_notes: string;
  created_at: string;
  prospect_code: string;
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: "جديد", color: "bg-blue-100 text-blue-800" },
  contacted: { label: "تم التواصل", color: "bg-yellow-100 text-yellow-800" },
  interested: { label: "مهتم", color: "bg-green-100 text-green-800" },
  not_interested: { label: "غير مهتم", color: "bg-red-100 text-red-800" },
  converted: { label: "شريك ✓", color: "bg-emerald-100 text-emerald-800" },
};

const CALL_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "في الانتظار", color: "bg-gray-100 text-gray-700" },
  no_phone: { label: "بدون هاتف", color: "bg-red-50 text-red-600" },
  called: { label: "تم الاتصال", color: "bg-green-100 text-green-700" },
  no_answer: { label: "لم يرد", color: "bg-yellow-100 text-yellow-700" },
  callback: { label: "إعادة اتصال", color: "bg-purple-100 text-purple-700" },
};

interface Props {
  prospect: DBProspect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updated: DBProspect) => void;
}

const ProspectDetailSheet = ({ prospect, open, onOpenChange, onUpdate }: Props) => {
  const [notes, setNotes] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [status, setStatus] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Sync local state when prospect changes
  if (prospect && (!initialized || notes === "" && callNotes === "" && status === "")) {
    setNotes(prospect.notes || "");
    setCallNotes(prospect.call_notes || "");
    setStatus(prospect.status || "new");
    setCallStatus(prospect.call_status || "pending");
    setInitialized(true);
  }

  // Reset when closing
  const handleOpenChange = (v: boolean) => {
    if (!v) setInitialized(false);
    onOpenChange(v);
  };

  const handleSave = async () => {
    if (!prospect) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("prospects")
        .update({
          notes,
          call_notes: callNotes,
          status,
          call_status: callStatus,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", prospect.id);
      if (error) throw error;
      onUpdate({ ...prospect, notes, call_notes: callNotes, status, call_status: callStatus });
      toast.success("تم حفظ التعديلات");
    } catch (e: any) {
      toast.error("فشل الحفظ: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!prospect) return;
    setConverting(true);
    try {
      // Create store record
      const { error: storeErr } = await supabase.from("stores").insert({
        name: prospect.name,
        phone: prospect.phone || "",
        email: prospect.email || "",
        address: prospect.address || "",
        city: prospect.city || "",
        country: prospect.country || "Morocco",
        category: prospect.category || "restaurant",
        is_active: true,
        prospect_id: prospect.id,
      } as any);
      if (storeErr) throw storeErr;

      // Update prospect status
      const { error: updateErr } = await supabase
        .from("prospects")
        .update({ status: "converted", updated_at: new Date().toISOString() } as any)
        .eq("id", prospect.id);
      if (updateErr) throw updateErr;

      setStatus("converted");
      onUpdate({ ...prospect, status: "converted" });
      toast.success(`تم تحويل "${prospect.name}" إلى شريك رسمي وإنشاء سجل متجر`);
    } catch (e: any) {
      toast.error("فشل التحويل: " + e.message);
    } finally {
      setConverting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  if (!prospect) return null;

  const statusInfo = STATUS_MAP[status] || STATUS_MAP.new;
  const callInfo = CALL_STATUS_MAP[callStatus] || CALL_STATUS_MAP.pending;
  const whatsappLink = prospect.phone ? `https://wa.me/${prospect.phone.replace(/[^0-9+]/g, "")}` : null;
  const googleMapsLink = prospect.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prospect.name + " " + prospect.address)}` : null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
        <SheetHeader className="text-right">
          <div className="flex items-center gap-2">
            <Badge className="font-mono text-xs">{prospect.prospect_code || "—"}</Badge>
            <Badge className={`${statusInfo.color} text-xs`}>{statusInfo.label}</Badge>
          </div>
          <SheetTitle className="text-xl">{prospect.name}</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <MapPin className="w-3 h-3" /> {prospect.city} — {prospect.area || prospect.address}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Quick Contact Links */}
          <div className="flex flex-wrap gap-2">
            {prospect.phone && (
              <>
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <a href={`tel:${prospect.phone}`}><Phone className="w-3.5 h-3.5" /> اتصال</a>
                </Button>
                {whatsappLink && (
                  <Button variant="outline" size="sm" asChild className="gap-1.5 text-green-700 border-green-300">
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="w-3.5 h-3.5" /> واتساب
                    </a>
                  </Button>
                )}
              </>
            )}
            {prospect.email && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a href={`mailto:${prospect.email}`}><Mail className="w-3.5 h-3.5" /> إيميل</a>
              </Button>
            )}
            {prospect.website && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a href={prospect.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-3.5 h-3.5" /> الموقع
                </a>
              </Button>
            )}
            {googleMapsLink && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a href={googleMapsLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" /> خريطة
                </a>
              </Button>
            )}
          </div>

          <Separator />

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">الهاتف:</span>
              <div className="flex items-center gap-1 mt-0.5">
                {prospect.phone || "—"}
                {prospect.phone && (
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(prospect.phone)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">الإيميل:</span>
              <p className="mt-0.5 truncate">{prospect.email || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">التقييم:</span>
              <p className="flex items-center gap-1 mt-0.5">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> {prospect.rating || 0}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">الفئة:</span>
              <p className="mt-0.5">{prospect.category}</p>
            </div>
            <div>
              <span className="text-muted-foreground">المصدر:</span>
              <p className="mt-0.5">{prospect.source === "google_auto" ? "تلقائي" : "يدوي"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">تاريخ الإضافة:</span>
              <p className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {new Date(prospect.created_at).toLocaleDateString("ar-MA")}
              </p>
            </div>
          </div>

          <Separator />

          {/* Status & Call Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">الحالة</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">حالة الاتصال</label>
              <Select value={callStatus} onValueChange={setCallStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CALL_STATUS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ملاحظات عامة</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات حول هذا الشريك المحتمل..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">ملاحظات الاتصال</label>
            <Textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="ملاحظات حول المكالمة الأخيرة..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ التعديلات
            </Button>
            {status !== "converted" && (
              <Button onClick={handleConvert} disabled={converting} variant="secondary" className="gap-2">
                {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                تحويل لشريك
              </Button>
            )}
          </div>

          {status === "converted" && (
            <Badge className="bg-emerald-100 text-emerald-800 w-full justify-center py-2 text-sm">
              <StoreIcon className="w-4 h-4 ml-1" /> تم تحويل هذا الشريك المحتمل إلى شريك رسمي
            </Badge>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProspectDetailSheet;
