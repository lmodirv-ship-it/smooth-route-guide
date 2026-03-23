import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Search, Filter, Loader2, Copy, Check, UserCog } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "مسؤول", agent: "مركز اتصال", user: "عميل", driver: "سائق", moderator: "مشرف",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/15 text-destructive border-destructive/30",
  agent: "bg-info/15 text-info border-info/30",
  driver: "bg-primary/15 text-primary border-primary/30",
  user: "bg-secondary text-secondary-foreground border-border",
  moderator: "bg-warning/15 text-warning border-warning/30",
};

const RegisteredUsers = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email, phone, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast({ title: "خطأ في جلب المستخدمين", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string>();
    roles?.forEach(r => roleMap.set(r.user_id, r.role));

    const mapped: UserRecord[] = (profiles || []).map(p => ({
      id: p.id,
      name: p.name || "—",
      phone: p.phone || "—",
      email: p.email || "—",
      role: roleMap.get(p.id) || "user",
      createdAt: p.created_at,
    }));

    setUsers(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search || u.name.includes(search) || u.email.includes(search) || u.phone.includes(search);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openRoleDialog = (user: UserRecord) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleChangeRole = async (newRole: string) => {
    if (!selectedUser || changingRole) return;
    setChangingRole(true);
    try {
      // Delete existing role
      const { error: delError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.id);
      if (delError) throw delError;

      // Insert new role
      const { error: insError } = await supabase
        .from("user_roles")
        .insert({ user_id: selectedUser.id, role: newRole as AppRole });
      if (insError) throw insError;

      // If driver, ensure driver record exists
      if (newRole === "driver") {
        const { data: existing } = await supabase
          .from("drivers")
          .select("id")
          .eq("user_id", selectedUser.id)
          .maybeSingle();
        if (!existing) {
          await supabase.from("drivers").insert({ user_id: selectedUser.id, status: "inactive" });
        }
      }

      toast({ title: `✅ تم تغيير دور "${selectedUser.name}" إلى ${ROLE_LABELS[newRole] || newRole}` });
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
      setRoleDialogOpen(false);
    } catch (e: any) {
      toast({ title: "خطأ في تغيير الدور", description: e.message, variant: "destructive" });
    } finally {
      setChangingRole(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{users.length} مستخدم</Badge>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          المستخدمون المسجلون
        </h2>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو البريد أو الهاتف" className="pr-10" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 ml-2" />
            <SelectValue placeholder="كل الأدوار" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأدوار</SelectItem>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">البريد</TableHead>
              <TableHead className="text-right">الهاتف</TableHead>
              <TableHead className="text-center">الدور</TableHead>
              <TableHead className="text-center">التسجيل</TableHead>
              <TableHead className="text-center">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  لا يوجد مستخدمون
                </TableCell>
              </TableRow>
            ) : filtered.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-right">{u.name}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{u.email}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{u.phone}</TableCell>
                <TableCell className="text-center">
                  <Badge className={ROLE_COLORS[u.role] || ROLE_COLORS.user}>
                    {ROLE_LABELS[u.role] || u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-xs">
                  {new Date(u.createdAt).toLocaleDateString("ar-MA")}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => openRoleDialog(u)} className="gap-1.5 text-xs">
                      <UserCog className="w-3.5 h-3.5" />
                      تغيير الدور
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleCopyId(u.id)} title="نسخ ID">
                      {copiedId === u.id ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              تغيير دور المستخدم
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="font-semibold text-foreground">{selectedUser.name}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  الدور الحالي: <Badge className={ROLE_COLORS[selectedUser.role] || ROLE_COLORS.user}>{ROLE_LABELS[selectedUser.role] || selectedUser.role}</Badge>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">اختر الدور الجديد:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={selectedUser.role === key ? "default" : "outline"}
                    disabled={selectedUser.role === key || changingRole}
                    onClick={() => handleChangeRole(key)}
                    className="gap-2"
                  >
                    {changingRole ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default RegisteredUsers;
