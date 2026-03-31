import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Phone, Mail, Calendar, Shield, Wallet, Car, MapPin,
  KeyRound, Save, Loader2, Eye, EyeOff, Copy, Check,
  Star, Ban, CheckCircle, History, ShieldAlert
} from "lucide-react";

interface ClientDetailProps {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientUpdated?: () => void;
}

export default function ClientDetailSheet({ clientId, open, onOpenChange, onClientUpdated }: ClientDetailProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [trips, setTrips] = useState<any[]>([]);
  const [tripCount, setTripCount] = useState(0);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [driverInfo, setDriverInfo] = useState<any>(null);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSuspended, setIsSuspended] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Password
  const [passwordMode, setPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!clientId || !open) return;
    loadClientData(clientId);
  }, [clientId, open]);

  const loadClientData = async (id: string) => {
    setLoading(true);
    setPasswordMode(false);
    setNewPassword("");

    const [profileRes, walletRes, tripsRes, deliveryRes, complaintsRes, rolesRes, driverRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.from("wallet").select("balance").eq("user_id", id).maybeSingle(),
      supabase.from("trips").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
      supabase.from("delivery_orders").select("id", { count: "exact", head: true }).eq("user_id", id),
      supabase.from("complaints").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(5),
      supabase.from("user_roles").select("role").eq("user_id", id),
      supabase.from("drivers").select("*").eq("user_id", id).maybeSingle(),
    ]);

    const p = profileRes.data;
    if (p) {
      setProfile(p);
      setEditName(p.name || "");
      setEditPhone(p.phone || "");
      setEditEmail(p.email || "");
      setIsSuspended(p.is_suspended || false);
      setIsConfirmed(p.is_confirmed || false);
    }

    setWalletBalance(walletRes.data?.balance ?? 0);
    setTrips(tripsRes.data || []);
    setTripCount(tripsRes.data?.length || 0);
    setDeliveryCount(deliveryRes.count ?? 0);
    setComplaints(complaintsRes.data || []);
    setRoles((rolesRes.data || []).map((r: any) => r.role));
    setDriverInfo(driverRes.data);
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!clientId || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        is_suspended: isSuspended,
        is_confirmed: isConfirmed,
      }).eq("id", clientId);

      if (error) throw error;
      toast({ title: "✅ تم حفظ التغييرات بنجاح" });
      onClientUpdated?.();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (savingPassword || newPassword.length < 6 || !clientId) return;
    setSavingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ user_id: clientId, new_password: newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "خطأ");
      toast({ title: "✅ تم تغيير كلمة المرور" });
      setPasswordMode(false);
      setNewPassword("");
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "completed": return { text: "مكتملة", cls: "text-success" };
      case "in_progress": return { text: "جارية", cls: "text-info" };
      case "cancelled": return { text: "ملغاة", cls: "text-destructive" };
      default: return { text: s, cls: "text-muted-foreground" };
    }
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0" dir="rtl">
        <div className="p-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <User className="w-5 h-5 text-primary" />
              ملف العميل التفصيلي
            </SheetTitle>
          </SheetHeader>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <div className="space-y-5 px-6 pb-8">
            {/* Header Card */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
                {profile.user_code?.slice(0, 2) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-foreground">{profile.name || "—"}</p>
                <Badge variant="outline" className="font-mono text-sm font-bold mt-1">{profile.user_code || "—"}</Badge>
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" /> مسجل: {new Date(profile.created_at).toLocaleDateString("ar-MA")}
                </div>
                {profile.last_seen_at && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <History className="w-3 h-3" /> آخر ظهور: {new Date(profile.last_seen_at).toLocaleDateString("ar-MA")}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {roles.map(r => (
                    <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(profile.id); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }}>
                {copiedId ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-secondary/40 text-center">
                <Car className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">الرحلات</p>
                <p className="text-xl font-bold text-foreground">{tripCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/40 text-center">
                <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">الرصيد</p>
                <p className="text-xl font-bold text-primary">{walletBalance} DH</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/40 text-center">
                <History className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">طلبات التوصيل</p>
                <p className="text-xl font-bold text-foreground">{deliveryCount}</p>
              </div>
            </div>

            <Separator />

            {/* Editable Profile Info */}
            <div className="space-y-4">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> تعديل معلومات العميل
              </p>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">الاسم</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-secondary/40 border-border" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="bg-secondary/40 border-border pr-9" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">الهاتف</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="bg-secondary/40 border-border pr-9" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-sm text-foreground">حساب مؤكد</span>
                  </div>
                  <Switch checked={isConfirmed} onCheckedChange={setIsConfirmed} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
                  <div className="flex items-center gap-2">
                    <Ban className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-foreground">حساب معلّق</span>
                  </div>
                  <Switch checked={isSuspended} onCheckedChange={setIsSuspended} />
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ التغييرات
              </Button>
            </div>

            <Separator />

            {/* Password Change */}
            <div className="space-y-3">
              <Button variant="outline" className="w-full gap-2" onClick={() => setPasswordMode(!passwordMode)}>
                <KeyRound className="w-4 h-4" /> تغيير كلمة المرور
              </Button>
              {passwordMode && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="كلمة المرور الجديدة (6 أحرف+)"
                      className="pl-10 bg-secondary/40"
                    />
                    <Button type="button" variant="ghost" size="sm" className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button onClick={handleChangePassword} disabled={savingPassword || newPassword.length < 6} className="w-full gap-2" size="sm">
                    {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} تأكيد تغيير كلمة المرور
                  </Button>
                </div>
              )}
            </div>

            {/* Driver Info */}
            {driverInfo && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Car className="w-4 h-4 text-primary" /> معلومات السائق
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded-lg bg-secondary/40">
                      <span className="text-xs text-muted-foreground">الرمز:</span>
                      <span className="font-mono font-bold mr-1">{driverInfo.driver_code || "—"}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/40">
                      <span className="text-xs text-muted-foreground">النوع:</span>
                      <span className="mr-1">{driverInfo.driver_type === "ride" ? "ركاب" : "توصيل"}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/40">
                      <span className="text-xs text-muted-foreground">الحالة:</span>
                      <Badge variant={driverInfo.status === "active" ? "default" : "secondary"} className="mr-1 text-xs">{driverInfo.status}</Badge>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/40">
                      <span className="text-xs text-muted-foreground">التقييم:</span>
                      <span className="mr-1">⭐ {driverInfo.rating || 0}</span>
                    </div>
                  </div>
                  {driverInfo.current_lat && (
                    <div className="p-2 rounded-lg bg-secondary/40 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" /> {driverInfo.current_lat?.toFixed(4)}, {driverInfo.current_lng?.toFixed(4)}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Trips */}
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" /> آخر الرحلات
              </p>
              {trips.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">لا توجد رحلات</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {trips.map((t: any) => {
                    const s = statusLabel(t.status);
                    return (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 text-xs">
                        <Badge variant="outline" className={`text-xs ${s.cls}`}>{s.text}</Badge>
                        <span className="text-primary font-bold">{t.fare || 0} DH</span>
                        <span className="text-foreground truncate max-w-[140px]">{t.start_location || "—"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Complaints */}
            {complaints.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-warning" /> الشكاوى ({complaints.length})
                  </p>
                  <div className="space-y-2 max-h-36 overflow-auto">
                    {complaints.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 text-xs">
                        <Badge variant="outline" className={`text-xs ${c.status === "closed" ? "text-success" : "text-warning"}`}>
                          {c.status === "closed" ? "محلول" : "مفتوح"}
                        </Badge>
                        <span className="text-foreground truncate max-w-[200px]">{c.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">لم يتم العثور على العميل</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
