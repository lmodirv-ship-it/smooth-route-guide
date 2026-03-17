import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Users, Search, Save, Filter, ArrowUpDown, Loader2, CheckCircle } from "lucide-react";
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
  createdAt: string;
}

const ROLES = ["admin", "call_center", "client", "driver", "delivery"] as const;
const STATUSES = ["active", "pending", "blocked"] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: "مسؤول",
  call_center: "مركز اتصال",
  client: "عميل",
  driver: "سائق",
  delivery: "توصيل",
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  pending: "معلّق",
  blocked: "محظور",
};

const ROLE_COLLECTION_MAP: Record<string, string> = {
  driver: "drivers",
  client: "clients",
  delivery: "delivery_agents",
  call_center: "call_center_agents",
  admin: "admins",
};

type SortKey = "createdAt" | "fullName" | "role";

const RegisteredUsers = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [editedUsers, setEditedUsers] = useState<Record<string, { role?: string; status?: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

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
          createdAt: data.createdAt || data.created_at || "",
        };
      });
      setUsers(list);
    } catch (e) {
      console.error("Error fetching users:", e);
      toast({ title: "خطأ", description: "فشل تحميل المستخدمين", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (userId: string, field: "role" | "status", value: string) => {
    setEditedUsers((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
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
        updatedAt: new Date().toISOString(),
      });

      // 2. If role changed, create/update new role collection & mark old as inactive
      if (edits.role && edits.role !== oldRole) {
        // Mark old role doc as inactive (if exists)
        const oldCol = ROLE_COLLECTION_MAP[oldRole];
        if (oldCol) {
          const oldSnap = await getDoc(doc(db, oldCol, user.id));
          if (oldSnap.exists()) {
            await updateDoc(doc(db, oldCol, user.id), { isActive: false, status: "inactive", updatedAt: new Date().toISOString() });
          }
        }

        // Create/update new role doc
        const newCol = ROLE_COLLECTION_MAP[newRole];
        if (newCol) {
          const baseData: Record<string, any> = {
            uid: user.id,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
            isActive: true,
            status: "active",
            createdAt: user.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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

          await setDoc(doc(db, newCol, user.id), baseData, { merge: true });
        }
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole, status: newStatus } : u))
      );
      setEditedUsers((prev) => {
        const copy = { ...prev };
        delete copy[user.id];
        return copy;
      });

      toast({ title: "✅ تم الحفظ", description: `تم تحديث بيانات ${user.fullName}` });
    } catch (e: any) {
      console.error("Save error:", e);
      toast({ title: "خطأ", description: e.message || "فشل الحفظ", variant: "destructive" });
    }
    setSavingId(null);
  };

  const filtered = useMemo(() => {
    let list = [...users];

    // Search
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(s) ||
          u.phone.includes(s) ||
          u.email.toLowerCase().includes(s)
      );
    }

    // Filter role
    if (filterRole !== "all") {
      list = list.filter((u) => {
        const effectiveRole = editedUsers[u.id]?.role || u.role;
        return effectiveRole === filterRole;
      });
    }

    // Filter status
    if (filterStatus !== "all") {
      list = list.filter((u) => {
        const effectiveStatus = editedUsers[u.id]?.status || u.status;
        return effectiveStatus === filterStatus;
      });
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "createdAt") return (b.createdAt || "").localeCompare(a.createdAt || "");
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
      case "delivery": return "bg-accent/15 text-accent-foreground border-accent/30";
      default: return "bg-secondary text-secondary-foreground border-border";
    }
  };

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success/15 text-success border-success/30";
      case "pending": return "bg-warning/15 text-warning border-warning/30";
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
        <Badge variant="outline" className="text-primary border-primary/30 text-sm">
          {users.length} مستخدم
        </Badge>
      </div>

      {/* Filters */}
      <div className="gradient-card rounded-xl border border-border p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الهاتف أو البريد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[140px] h-9 bg-secondary/60 border-border text-sm">
                <Filter className="w-3 h-3 ml-1 text-muted-foreground" />
                <SelectValue placeholder="الدور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأدوار</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-9 bg-secondary/60 border-border text-sm">
                <Filter className="w-3 h-3 ml-1 text-muted-foreground" />
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-[140px] h-9 bg-secondary/60 border-border text-sm">
                <ArrowUpDown className="w-3 h-3 ml-1 text-muted-foreground" />
                <SelectValue placeholder="ترتيب" />
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
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">لا يوجد مستخدمون</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border text-right">
                  <TableHead className="text-right text-muted-foreground">إجراءات</TableHead>
                  <TableHead className="text-right text-muted-foreground">الحالة</TableHead>
                  <TableHead className="text-right text-muted-foreground">الدور</TableHead>
                  <TableHead className="text-right text-muted-foreground">المدينة</TableHead>
                  <TableHead className="text-right text-muted-foreground">تاريخ التسجيل</TableHead>
                  <TableHead className="text-right text-muted-foreground">الهاتف</TableHead>
                  <TableHead className="text-right text-muted-foreground">البريد</TableHead>
                  <TableHead className="text-right text-muted-foreground">الاسم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const edits = editedUsers[user.id];
                  const hasChanges = !!edits;
                  const currentRole = edits?.role || user.role;
                  const currentStatus = edits?.status || user.status;

                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${hasChanges ? "bg-primary/5" : ""}`}
                    >
                      <TableCell>
                        <Button
                          size="sm"
                          variant={hasChanges ? "default" : "ghost"}
                          disabled={!hasChanges || savingId === user.id}
                          onClick={() => handleSave(user)}
                          className={`h-8 text-xs ${hasChanges ? "gradient-primary text-primary-foreground" : ""}`}
                        >
                          {savingId === user.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : hasChanges ? (
                            <>
                              <Save className="w-3 h-3 ml-1" />
                              حفظ
                            </>
                          ) : (
                            <CheckCircle className="w-3 h-3 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>

                      <TableCell>
                        <Select
                          value={currentStatus}
                          onValueChange={(v) => handleEdit(user.id, "status", v)}
                        >
                          <SelectTrigger className={`w-[110px] h-7 text-xs border ${statusBadgeColor(currentStatus)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Select
                          value={currentRole}
                          onValueChange={(v) => handleEdit(user.id, "role", v)}
                        >
                          <SelectTrigger className={`w-[120px] h-7 text-xs border ${roleBadgeColor(currentRole)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="text-foreground text-sm">{user.city}</TableCell>

                      <TableCell className="text-muted-foreground text-xs">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "—"}
                      </TableCell>

                      <TableCell className="text-muted-foreground text-sm font-mono">{user.phone}</TableCell>

                      <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>

                      <TableCell className="text-foreground font-medium text-sm">{user.fullName}</TableCell>
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
