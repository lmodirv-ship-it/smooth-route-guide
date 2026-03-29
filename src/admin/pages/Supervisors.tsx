import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Eye, Search, Loader2, UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface SupervisorRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  userCode: string;
  createdAt: string;
  lastSeenAt: string | null;
  isSuspended: boolean;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  userCode: string;
}

const Supervisors = () => {
  const [supervisors, setSupervisors] = useState<SupervisorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSupervisors = async () => {
    setLoading(true);
    // Get all users with moderator role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "moderator");

    if (!roles || roles.length === 0) {
      setSupervisors([]);
      setLoading(false);
      return;
    }

    const userIds = roles.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, phone, created_at, user_code, last_seen_at, is_suspended")
      .in("id", userIds);

    const mapped: SupervisorRecord[] = (profiles || []).map(p => ({
      id: p.id,
      userId: p.id,
      name: p.name || "—",
      email: p.email || "—",
      phone: p.phone || "—",
      userCode: p.user_code || "—",
      createdAt: p.created_at,
      lastSeenAt: (p as any).last_seen_at || null,
      isSuspended: (p as any).is_suspended ?? false,
    }));

    setSupervisors(mapped);
    setLoading(false);
  };

  const fetchAvailableUsers = async () => {
    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, user_code")
      .order("name");

    const { data: existingRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "moderator");

    const existingIds = new Set((existingRoles || []).map(r => r.user_id));

    setAvailableUsers(
      (profiles || [])
        .filter(p => !existingIds.has(p.id))
        .map(p => ({ id: p.id, name: p.name || "—", email: p.email || "—", userCode: p.user_code || "—" }))
    );
  };

  useEffect(() => { fetchSupervisors(); }, []);

  const filtered = useMemo(() => {
    if (!search) return supervisors;
    return supervisors.filter(s =>
      s.name.includes(search) || s.email.includes(search) || s.phone.includes(search) || s.userCode.includes(search)
    );
  }, [supervisors, search]);

  const handleAddSupervisor = async () => {
    if (!selectedUserId || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: selectedUserId, role: "moderator" as AppRole });
      if (error) throw error;

      toast({ title: "✅ تم إضافة المشرف بنجاح" });
      setAddDialogOpen(false);
      setSelectedUserId("");
      fetchSupervisors();
    } catch (e: any) {
      toast({ title: "خطأ في إضافة المشرف", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSupervisor = async (userId: string, name: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "moderator");
      if (error) throw error;

      toast({ title: `✅ تم إزالة "${name}" من المشرفين` });
      setSupervisors(prev => prev.filter(s => s.userId !== userId));
    } catch (e: any) {
      toast({ title: "خطأ في إزالة المشرف", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <Button
          onClick={() => { setAddDialogOpen(true); fetchAvailableUsers(); }}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          إضافة مشرف
        </Button>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          المشرفون
          <Badge variant="secondary">{supervisors.length}</Badge>
        </h2>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو البريد أو الهاتف"
          className="pr-10"
        />
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">الرمز</TableHead>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">البريد</TableHead>
              <TableHead className="text-right">الهاتف</TableHead>
              <TableHead className="text-center">تاريخ الإضافة</TableHead>
              <TableHead className="text-center">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  لا يوجد مشرفون
                </TableCell>
              </TableRow>
            ) : filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`font-mono text-xs font-bold ${
                    s.isSuspended
                      ? "bg-black text-white border-black"
                      : s.lastSeenAt && (Date.now() - new Date(s.lastSeenAt).getTime()) < 5 * 60 * 1000
                        ? "bg-green-500/15 text-green-600 border-green-500/50"
                        : "bg-red-500/15 text-red-600 border-red-500/50"
                  }`}>{s.userCode}</Badge>
                </TableCell>
                <TableCell className="font-medium text-right">{s.name}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{s.email}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{s.phone}</TableCell>
                <TableCell className="text-center text-muted-foreground text-xs">
                  {new Date(s.createdAt).toLocaleDateString("ar-MA")}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveSupervisor(s.userId, s.name)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    إزالة
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Supervisor Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              إضافة مشرف جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">اختر مستخدماً لتعيينه كمشرف:</p>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر مستخدم..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    <span className="font-mono font-bold">{u.userCode}</span> — {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddSupervisor}
              disabled={saving || !selectedUserId}
              className="w-full gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              تعيين كمشرف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Supervisors;
