import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Users, Search, Save, Filter, ArrowUpDown, Loader2, CheckCircle, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

interface UserRecord {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
  city: string;
  status: string;
  createdAt: any; // Timestamp or string
}

const ROLES = ["admin", "call_center", "client", "driver", "delivery"] as const;
const STATUSES = ["active", "blocked"] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: "مسؤول", call_center: "مركز اتصال", client: "عميل", driver: "سائق", delivery: "توصيل",
};
const STATUS_LABELS: Record<string, string> = {
  active: "نشط", blocked: "محظور",
};
const ROLE_COLLECTION_MAP: Record<string, string> = {
  driver: "drivers", client: "clients", delivery: "delivery_agents", call_center: "call_center_agents", admin: "admins",
};

type SortKey = "createdAt" | "fullName" | "role";

const formatDate = (val: any): string => {
  if (!val) return "—";
  let date: Date;
  if (val instanceof Timestamp) {
    date = val.toDate();
  } else if (typeof val === "string") {
    date = new Date(val);
  } else if (val?.seconds) {
    date = new Date(val.seconds * 1000);
  } else {
    return "—";
  }
  if (isNaN(date.getTime())) return "—";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
};

const sortableDate = (val: any): number => {
  if (!val) return 0;
  if (val instanceof Timestamp) return val.toMillis();
  if (val?.seconds) return val.seconds * 1000;
  if (typeof val === "string") return new Date(val).getTime() || 0;
  return 0;
};

const RegisteredUsers = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [editedUsers, setEditedUsers] = useState<Record<string, { role?: string; status?: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list: UserRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          fullName: data.fullName || data.name || "—",
          phone: data.phone || "—",
          email: data.email || "—",
          role: data.role || "client",
          city: data.city || "—",
          status: data.status || "active",
          createdAt: data.createdAt || data.created_at || null,
        };
      });
      setUsers(list);
    } catch (e) {
      console.error("Error fetching users:", e);
      toast({ title: "خطأ", description: "فشل تحميل المستخدمين", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const copyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedId(uid);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleEdit = (userId: string, field: "role" | "status", value: string) => {
    setEditedUsers((prev) => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }));
  };

  const handleSave = async (user: UserRecord) => {
    const edits = editedUsers[user.id];
    if (!edits) return;
    setSavingId(user.id);
    try {
      const newRole = edits.role || user.role;
      const newStatus = edits.status || user.status;
      const oldRole = user.role;

      // 1. Update users collection
      await updateDoc(doc(db, "users", user.id), {
        role: newRole,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // 2. If role changed
      if (edits.role && edits.role !== oldRole) {
        // Delete old role document
        const oldCol = ROLE_COLLECTION_MAP[oldRole];
        if (oldCol) {
          const oldSnap = await getDoc(doc(db, oldCol, user.id));
          if (oldSnap.exists()) {
            await deleteDoc(doc(db, oldCol, user.id));
          }
        }

        // Create new role document
        const newCol = ROLE_COLLECTION_MAP[newRole];
        if (newCol) {
          const baseData: Record<string, any> = {
            uid: user.id,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
            isActive: true,
            status: "active",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (newRole === "driver") {
            Object.assign(baseData, { vehicleType: "", vehiclePlate: "", licenseNumber: "", city: user.city, isOnline: false, isAvailable: false, rating: 0, totalTrips: 0 });
          } else if (newRole === "client") {
            Object.assign(baseData, { city: user.city, defaultAddress: "", homeAddress: "", workAddress: "" });
          } else if (newRole === "delivery") {
            Object.assign(baseData, { vehicleType: "", city: user.city, isOnline: false, isAvailable: false });
          } else if (newRole === "call_center") {
            Object.assign(baseData, { employeeId: "", permissions: [] });
          }
          await setDoc(doc(db, newCol, user.id), baseData);
        }
      }

      // Update local state instantly
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole, status: newStatus } : u)));
      setEditedUsers((prev) => { const c = { ...prev }; delete c[user.id]; return c; });

      toast({ title: "✅ تم التحديث بنجاح", description: `تم تحديث بيانات ${user.fullName}` });
    } catch (e: any) {
      console.error("Save error:", e);
      toast({ title: "❌ حدث خطأ", description: e.message || "فشل الحفظ", variant: "destructive" });
    }
    setSavingId(null);
  };

  const filtered = useMemo(() => {
    let list = [...users];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((u) => u.fullName.toLowerCase().includes(s) || u.phone.includes(s) || u.email.toLowerCase().includes(s));
    }
    if (filterRole !== "all") list = list.filter((u) => (editedUsers[u.id]?.role || u.role) === filterRole);
    if (filterStatus !== "all") list = list.filter((u) => (editedUsers[u.id]?.status || u.status) === filterStatus);
    list.sort((a, b) => {
      if (sortBy === "createdAt") return sortableDate(b.createdAt) - sortableDate(a.createdAt);
      if (sortBy === "fullName") return a.fullName.localeCompare(b.fullName);
      if (sortBy === "role") return a.role.localeCompare(b.role);
      return 0;
    });
    return list;
  }, [users, search, filterRole, filterStatus, sortBy, editedUsers]);

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-destructive/15 text-destructive border-destructive/30";
      case "call_center": return "bg-info/15 text-info border-info/30";
      case "driver": return "bg-primary/15 text-primary border-primary/30";
      case "delivery": return "bg-warning/15 text-warning border-warning/30";
      default: return "bg-success/15 text-success border-success/30";
    }
  };

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success/15 text-success border-success/30";
      case "blocked": return "bg-destructive/15 text-destructive border-destructive/30";
      default: return "bg-secondary text-secondary-foreground border-border";
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          المستخدمون المسجلون
          <span className="text-sm font-normal text-muted-foreground">Registered Users</span>
        </h1>
        <Badge variant="outline" className="text-primary border-primary/30 text-sm">{users.length} مستخدم</Badge>
      </div>

      {/* Filters */}
      <div className="gradient-card rounded-xl border border-border p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الهاتف أو البريد..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[140px] h-9 bg-secondary/60 border-border text-sm">
                <Filter className="w-3 h-3 ml-1 text-muted-foreground" /><SelectValue placeholder="الدور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأدوار</SelectItem>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-9 bg-secondary/60 border-border text-sm">
                <Filter className="w-3 h-3 ml-1 text-muted-foreground" /><SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-[140px] h-9 bg-secondary/60 border-border text-sm">
                <ArrowUpDown className="w-3 h-3 ml-1 text-muted-foreground" /><SelectValue placeholder="ترتيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">الأحدث</SelectItem>
                <SelectItem value="fullName">الاسم</SelectItem>
                <SelectItem value="role">الدور</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-muted-foreground text-sm">جاري التحميل...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">لا يوجد مستخدمون</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-right text-muted-foreground">إجراءات</TableHead>
                  <TableHead className="text-right text-muted-foreground">الحالة</TableHead>
                  <TableHead className="text-right text-muted-foreground">الدور</TableHead>
                  <TableHead className="text-right text-muted-foreground">المدينة</TableHead>
                  <TableHead className="text-right text-muted-foreground">تاريخ التسجيل</TableHead>
                  <TableHead className="text-right text-muted-foreground">الهاتف</TableHead>
                  <TableHead className="text-right text-muted-foreground">البريد</TableHead>
                  <TableHead className="text-right text-muted-foreground">الاسم</TableHead>
                  <TableHead className="text-right text-muted-foreground">UID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const edits = editedUsers[user.id];
                  const hasChanges = !!edits;
                  const currentRole = edits?.role || user.role;
                  const currentStatus = edits?.status || user.status;

                  return (
                    <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${hasChanges ? "bg-primary/5" : ""}`}>

                      {/* Save */}
                      <TableCell>
                        <Button size="sm" variant={hasChanges ? "default" : "ghost"} disabled={!hasChanges || savingId === user.id}
                          onClick={() => handleSave(user)}
                          className={`h-8 text-xs ${hasChanges ? "gradient-primary text-primary-foreground" : ""}`}>
                          {savingId === user.id ? <Loader2 className="w-3 h-3 animate-spin" />
                            : hasChanges ? <><Save className="w-3 h-3 ml-1" />حفظ</>
                            : <CheckCircle className="w-3 h-3 text-muted-foreground" />}
                        </Button>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Select value={currentStatus} onValueChange={(v) => handleEdit(user.id, "status", v)}>
                          <SelectTrigger className={`w-[100px] h-7 text-xs border ${statusBadgeColor(currentStatus)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <Select value={currentRole} onValueChange={(v) => handleEdit(user.id, "role", v)}>
                          <SelectTrigger className={`w-[120px] h-7 text-xs border ${roleBadgeColor(currentRole)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="text-foreground text-sm">{user.city}</TableCell>

                      {/* Date formatted YYYY-MM-DD HH:mm */}
                      <TableCell className="text-muted-foreground text-xs font-mono whitespace-nowrap">
                        {formatDate(user.createdAt)}
                      </TableCell>

                      <TableCell className="text-muted-foreground text-sm font-mono">{user.phone}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                      <TableCell className="text-foreground font-medium text-sm">{user.fullName}</TableCell>

                      {/* UID with copy */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button onClick={() => copyUid(user.id)}
                            className="p-1 rounded hover:bg-secondary transition-colors" title="نسخ UID">
                            {copiedId === user.id
                              ? <Check className="w-3.5 h-3.5 text-success" />
                              : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                          </button>
                          <span className="text-[10px] text-muted-foreground font-mono max-w-[80px] truncate">{user.id}</span>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisteredUsers;
