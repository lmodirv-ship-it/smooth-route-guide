import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Phone, MessageSquare, UserCog, KeyRound, Save, Loader2, Eye, EyeOff, Copy, Check, Mail, Calendar, Shield, Wallet, Car, MapPin } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  roles: string[];
  createdAt: string;
  userCode: string;
  isConfirmed: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "مسؤول", agent: "مركز اتصال", user: "عميل", driver: "سائق", moderator: "مشرف", delivery: "سائق توصيل", store_owner: "صاحب محل", smart_admin_assistant: "مساعد ذكي",
};
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/15 text-destructive border-destructive/30",
  agent: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  driver: "bg-primary/15 text-primary border-primary/30",
  user: "bg-secondary text-secondary-foreground border-border",
  moderator: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  delivery: "bg-success/15 text-success border-success/30",
  store_owner: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  smart_admin_assistant: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
};

interface Props {
  user: UserRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string | null;
  onUserUpdated: (user: UserRecord) => void;
  onStartCall?: (userId: string) => void;
  onStartChat?: (userId: string) => void;
}

export default function UserDetailSheet({ user, open, onOpenChange, currentUserId, onUserUpdated, onStartCall, onStartChat }: Props) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [tripCount, setTripCount] = useState(0);
  const [driverInfo, setDriverInfo] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    setSelectedRoles([...user.roles]);
    setPasswordMode(false);
    setNewPassword("");
    loadExtraInfo(user.id);
  }, [user]);

  const loadExtraInfo = async (userId: string) => {
    const [walletRes, tripsRes, driverRes] = await Promise.all([
      supabase.from("wallet").select("balance").eq("user_id", userId).maybeSingle(),
      supabase.from("trips").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("drivers").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    setWalletBalance(walletRes.data?.balance ?? null);
    setTripCount(tripsRes.count ?? 0);
    setDriverInfo(driverRes.data);
  };

  if (!user) return null;
  const isSelf = user.id === currentUserId;

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        if (role === "admin" && isSelf) { toast({ title: "⚠️ لا يمكنك إزالة دور المسؤول عن نفسك", variant: "destructive" }); return prev; }
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== role);
      }
      return [...prev, role];
    });
  };

  const handleSaveRoles = async () => {
    if (saving) return;
    if (isSelf && !selectedRoles.includes("admin")) { toast({ title: "⚠️ لا يمكنك إزالة دور المسؤول عن نفسك", variant: "destructive" }); return; }
    const sortedOld = [...user.roles].sort().join(",");
    const sortedNew = [...selectedRoles].sort().join(",");
    if (sortedOld === sortedNew) return;

    setSaving(true);
    try {
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      await supabase.from("user_roles").insert(selectedRoles.map(role => ({ user_id: user.id, role: role as AppRole })));

      if (selectedRoles.includes("driver") && !user.roles.includes("driver")) {
        const { data: ex } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
        if (!ex) await supabase.from("drivers").insert({ user_id: user.id, status: "inactive", driver_type: "ride" });
      }
      if (selectedRoles.includes("delivery") && !user.roles.includes("delivery")) {
        const { data: ex } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
        if (!ex) await supabase.from("drivers").insert({ user_id: user.id, status: "inactive", driver_type: "delivery" });
      }

      toast({ title: "✅ تم تحديث الأدوار" });
      onUserUpdated({ ...user, roles: [...selectedRoles] });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (savingPassword || newPassword.length < 6) return;
    setSavingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ user_id: user.id, new_password: newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "خطأ");
      toast({ title: "✅ تم تغيير كلمة المرور" });
      setPasswordMode(false);
      setNewPassword("");
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally { setSavingPassword(false); }
  };

  const handleToggleConfirm = async () => {
    const newVal = !user.isConfirmed;
    const { error } = await supabase.from("profiles").update({ is_confirmed: newVal } as any).eq("id", user.id);
    if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
    onUserUpdated({ ...user, isConfirmed: newVal });
    toast({ title: newVal ? "✅ تم التأكيد" : "❌ تم إلغاء التأكيد" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            ملف المستخدم
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-primary">
              {user.userCode?.slice(0, 2) || "U"}
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-foreground">{user.name}</p>
              <Badge variant="outline" className="font-mono text-sm font-bold mt-1">{user.userCode}</Badge>
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <Mail className="w-3 h-3" /> {user.email}
              </div>
              {user.phone !== "—" && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="w-3 h-3" /> {user.phone}
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Calendar className="w-3 h-3" /> مسجل: {new Date(user.createdAt).toLocaleDateString("ar-MA")}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2" onClick={() => onStartCall?.(user.id)}>
              <Phone className="w-4 h-4" /> اتصال
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => onStartChat?.(user.id)}>
              <MessageSquare className="w-4 h-4" /> محادثة
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => { navigator.clipboard.writeText(user.id); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }}>
              {copiedId ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />} نسخ ID
            </Button>
            <Button variant={user.isConfirmed ? "default" : "outline"} className="gap-2" onClick={handleToggleConfirm}>
              {user.isConfirmed ? <Check className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              {user.isConfirmed ? "مؤكد" : "تأكيد"}
            </Button>
          </div>

          <Separator />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground">الرحلات</p>
              <p className="text-xl font-bold text-foreground">{tripCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground">الرصيد</p>
              <p className="text-xl font-bold text-primary">{walletBalance ?? 0} د.م</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground">الأدوار</p>
              <p className="text-xl font-bold text-foreground">{user.roles.length}</p>
            </div>
          </div>

          {/* Driver Info */}
          {driverInfo && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Car className="w-4 h-4" /> معلومات السائق</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded bg-secondary/50"><span className="text-muted-foreground">الرمز:</span> <span className="font-mono font-bold">{driverInfo.driver_code || "—"}</span></div>
                  <div className="p-2 rounded bg-secondary/50"><span className="text-muted-foreground">النوع:</span> {driverInfo.driver_type === "ride" ? "ركاب" : "توصيل"}</div>
                  <div className="p-2 rounded bg-secondary/50"><span className="text-muted-foreground">الحالة:</span> <Badge variant={driverInfo.status === "active" ? "default" : "secondary"}>{driverInfo.status}</Badge></div>
                  <div className="p-2 rounded bg-secondary/50"><span className="text-muted-foreground">التقييم:</span> ⭐ {driverInfo.rating || 0}</div>
                </div>
                {driverInfo.current_lat && (
                  <div className="p-2 rounded bg-secondary/50 text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {driverInfo.current_lat?.toFixed(4)}, {driverInfo.current_lng?.toFixed(4)}
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Roles Management */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><UserCog className="w-4 h-4" /> إدارة الأدوار</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <label key={key} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${selectedRoles.includes(key) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                  <Checkbox checked={selectedRoles.includes(key)} onCheckedChange={() => toggleRole(key)} />
                  <Badge className={`text-xs ${ROLE_COLORS[key] || ROLE_COLORS.user}`}>{label}</Badge>
                </label>
              ))}
            </div>
            <Button onClick={handleSaveRoles} disabled={saving || selectedRoles.length === 0} className="w-full gap-2" size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ الأدوار
            </Button>
          </div>

          <Separator />

          {/* Password */}
          <div className="space-y-3">
            <Button variant="outline" className="w-full gap-2" onClick={() => setPasswordMode(!passwordMode)}>
              <KeyRound className="w-4 h-4" /> تغيير كلمة المرور
            </Button>
            {passwordMode && (
              <div className="space-y-2">
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="كلمة المرور الجديدة (6 أحرف+)" className="pl-10" />
                  <Button type="button" variant="ghost" size="sm" className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button onClick={handleChangePassword} disabled={savingPassword || newPassword.length < 6} className="w-full gap-2" size="sm">
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} تأكيد
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
