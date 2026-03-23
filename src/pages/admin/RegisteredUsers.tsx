import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Search, Filter, Loader2, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

const RegisteredUsers = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch profiles with their roles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email, phone, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast({ title: "خطأ في جلب المستخدمين", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch all roles
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

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
              <TableHead className="text-center">ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-right">{u.name}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{u.email}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{u.phone}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{ROLE_LABELS[u.role] || u.role}</Badge>
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-xs">
                  {new Date(u.createdAt).toLocaleDateString("ar-MA")}
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleCopyId(u.id)}>
                    {copiedId === u.id ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default RegisteredUsers;
