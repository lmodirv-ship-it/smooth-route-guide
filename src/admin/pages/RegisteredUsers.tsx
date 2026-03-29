import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Search, Filter, Loader2, Copy, Check, UserCog, Save, KeyRound, Eye, EyeOff, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import UserDetailSheet from "@/admin/components/UserDetailSheet";

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
  admin: "مسؤول", agent: "مركز اتصال", user: "عميل", driver: "سائق", moderator: "مشرف", delivery: "سائق توصيل",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/15 text-destructive border-destructive/30",
  agent: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  driver: "bg-primary/15 text-primary border-primary/30",
  user: "bg-secondary text-secondary-foreground border-border",
  moderator: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  delivery: "bg-success/15 text-success border-success/30",
};

const RegisteredUsers = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [detailUser, setDetailUser] = useState<UserRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone, created_at, user_code, is_confirmed")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "خطأ في جلب المستخدمين", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string[]>();
    roles?.forEach(r => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    setUsers((profiles || []).map(p => ({
      id: p.id,
      name: p.name || "—",
      phone: p.phone || "—",
      email: p.email || "—",
      roles: roleMap.get(p.id) || ["user"],
      createdAt: p.created_at,
      userCode: (p as any).user_code || "—",
      isConfirmed: (p as any).is_confirmed ?? false,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search || u.name.includes(search) || u.email.includes(search) || u.phone.includes(search) || u.userCode.includes(search);
      const matchRole = roleFilter === "all" || u.roles.includes(roleFilter);
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const openDetail = (user: UserRecord) => {
    setDetailUser(user);
    setDetailOpen(true);
  };

  const handleQuickRole = async (user: UserRecord, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: role as AppRole });
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    if (role === "driver" || role === "delivery") {
      const { data: ex } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
      if (!ex) await supabase.from("drivers").insert({ user_id: user.id, status: "inactive", driver_type: role === "delivery" ? "delivery" : "ride" });
    }
    toast({ title: `✅ تم تعيين "${user.userCode}" كـ ${ROLE_LABELS[role] || role}` });
    setUsers(prev => prev.map(x => x.id === user.id ? { ...x, roles: [...x.roles, role] } : x));
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
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم، البريد، الهاتف أو الرمز" className="pr-10" />
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
              <TableHead className="text-center">الرمز</TableHead>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">البريد</TableHead>
              <TableHead className="text-center">الأدوار</TableHead>
              <TableHead className="text-center">التأكيد</TableHead>
              <TableHead className="text-center">التسجيل</TableHead>
              <TableHead className="text-center">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">لا يوجد مستخدمون</TableCell>
              </TableRow>
            ) : filtered.map(u => (
              <TableRow key={u.id}>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => openDetail(u)}
                  >
                    {u.userCode}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-right">{u.name}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{u.email}</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-wrap justify-center gap-1">
                    {u.roles.map(role => (
                      <Badge key={role} className={`text-xs ${ROLE_COLORS[role] || ROLE_COLORS.user}`}>
                        {ROLE_LABELS[role] || role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {u.isConfirmed ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-xs">
                  {new Date(u.createdAt).toLocaleDateString("ar-MA")}
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDetail(u)}>
                        <Eye className="w-4 h-4 ml-2" /> عرض الملف الكامل
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {!u.roles.includes("moderator") && !u.roles.includes("admin") && (
                        <DropdownMenuItem onClick={() => handleQuickRole(u, "moderator")}>
                          🛡️ تعيين كمشرف
                        </DropdownMenuItem>
                      )}
                      {!u.roles.includes("agent") && (
                        <DropdownMenuItem onClick={() => handleQuickRole(u, "agent")}>
                          📞 تعيين كمركز اتصال
                        </DropdownMenuItem>
                      )}
                      {!u.roles.includes("delivery") && (
                        <DropdownMenuItem onClick={() => handleQuickRole(u, "delivery")}>
                          🚚 تعيين كسائق توصيل
                        </DropdownMenuItem>
                      )}
                      {!u.roles.includes("driver") && (
                        <DropdownMenuItem onClick={() => handleQuickRole(u, "driver")}>
                          🚗 تعيين كسائق ركاب
                        </DropdownMenuItem>
                      )}
                      {!u.roles.includes("store_owner") && (
                        <DropdownMenuItem onClick={() => handleQuickRole(u, "store_owner")}>
                          🏪 تعيين كصاحب محل
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* User Detail Sheet */}
      <UserDetailSheet
        user={detailUser}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        currentUserId={currentUserId}
        onUserUpdated={(updated) => {
          setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
          setDetailUser(updated);
        }}
      />
    </motion.div>
  );
};

export default RegisteredUsers;
