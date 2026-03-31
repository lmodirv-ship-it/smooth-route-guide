import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield, Plus, Save, Trash2, Users, Search, Loader2, Check, X,
  History, AlertTriangle, Eye, Edit, ChevronDown, ChevronUp
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───
interface PermRole {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_system: boolean;
  created_at: string;
}

interface RolePerm {
  role_id: string;
  module: string;
  operation: string;
  allowed: boolean;
}

interface UserAssignment {
  id: string;
  user_id: string;
  permission_role_id: string;
  assigned_by: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
  user_code?: string;
  role_name?: string;
}

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  created_at: string;
}

// ─── Constants ───
const MODULES = [
  { key: "dashboard", label: "لوحة التحكم" },
  { key: "pages", label: "إدارة الصفحات" },
  { key: "database", label: "إدارة قاعدة البيانات" },
  { key: "drivers", label: "السائقون" },
  { key: "clients", label: "العملاء" },
  { key: "orders", label: "الطلبات" },
  { key: "delivery", label: "التوصيل" },
  { key: "zones", label: "المناطق" },
  { key: "pricing", label: "التسعير" },
  { key: "reports", label: "التقارير" },
  { key: "settings", label: "الإعدادات" },
  { key: "notifications", label: "الإشعارات" },
  { key: "permissions", label: "إدارة الصلاحيات" },
];

const OPERATIONS = [
  { key: "view", label: "عرض" },
  { key: "create", label: "إنشاء" },
  { key: "edit", label: "تعديل" },
  { key: "delete", label: "حذف" },
  { key: "approve", label: "موافقة" },
  { key: "export", label: "تصدير" },
  { key: "manage", label: "إدارة" },
];

const PermissionsManagement = () => {
  const [roles, setRoles] = useState<PermRole[]>([]);
  const [permissions, setPermissions] = useState<RolePerm[]>([]);
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Dialogs
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDisplay, setNewRoleDisplay] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignResults, setAssignResults] = useState<any[]>([]);
  const [assignRoleId, setAssignRoleId] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Tab
  const [tab, setTab] = useState("roles");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [rolesRes, permsRes, assignRes, auditRes] = await Promise.all([
      supabase.from("permission_roles").select("*").order("created_at"),
      supabase.from("role_permissions").select("*"),
      supabase.from("user_permission_roles").select("*").order("created_at", { ascending: false }),
      supabase.from("permission_audit_log").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    setRoles((rolesRes.data as PermRole[]) || []);
    setPermissions((permsRes.data as RolePerm[]) || []);

    // Enrich assignments with user info
    const rawAssigns = (assignRes.data || []) as UserAssignment[];
    if (rawAssigns.length > 0) {
      const userIds = [...new Set(rawAssigns.map(a => a.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name, email, user_code").in("id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const roleMap = new Map((rolesRes.data || []).map((r: any) => [r.id, r.display_name]));
      rawAssigns.forEach(a => {
        const p = profileMap.get(a.user_id);
        a.user_name = p?.name || "—";
        a.user_email = p?.email || "—";
        a.user_code = (p as any)?.user_code || "—";
        a.role_name = roleMap.get(a.permission_role_id) || "—";
      });
    }
    setAssignments(rawAssigns);
    setAuditLog((auditRes.data as AuditEntry[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Permission Matrix Logic ───
  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const isSuperAdmin = selectedRole?.name === "super_admin";

  const getPermValue = (module: string, operation: string): boolean => {
    if (isSuperAdmin) return true;
    const key = `${selectedRoleId}:${module}:${operation}`;
    if (pendingChanges.has(key)) return pendingChanges.get(key)!;
    const existing = permissions.find(p => p.role_id === selectedRoleId && p.module === module && p.operation === operation);
    return existing?.allowed ?? false;
  };

  const togglePerm = (module: string, operation: string) => {
    if (isSuperAdmin) return;
    const key = `${selectedRoleId}:${module}:${operation}`;
    const current = getPermValue(module, operation);
    setPendingChanges(prev => new Map(prev).set(key, !current));
  };

  const toggleModuleAll = (module: string) => {
    if (isSuperAdmin) return;
    const allOn = OPERATIONS.every(op => getPermValue(module, op.key));
    OPERATIONS.forEach(op => {
      const key = `${selectedRoleId}:${module}:${op.key}`;
      setPendingChanges(prev => new Map(prev).set(key, !allOn));
    });
  };

  const savePermissions = async () => {
    if (!selectedRoleId || pendingChanges.size === 0) return;
    setSaving(true);
    const upserts: any[] = [];
    pendingChanges.forEach((allowed, key) => {
      const [role_id, module, operation] = key.split(":");
      upserts.push({ role_id, module, operation, allowed });
    });

    for (const u of upserts) {
      const { data: existing } = await supabase
        .from("role_permissions")
        .select("id")
        .eq("role_id", u.role_id)
        .eq("module", u.module)
        .eq("operation", u.operation)
        .maybeSingle();

      if (existing) {
        await supabase.from("role_permissions").update({ allowed: u.allowed }).eq("id", existing.id);
      } else {
        await supabase.from("role_permissions").insert(u);
      }
    }

    // Audit
    await supabase.from("permission_audit_log").insert({
      user_id: currentUserId!,
      action: "update_permissions",
      target_type: "role",
      target_id: selectedRoleId,
      details: { changes_count: upserts.length, role_name: selectedRole?.display_name },
    });

    setPendingChanges(new Map());
    toast({ title: "✅ تم حفظ الصلاحيات بنجاح" });
    await fetchAll();
    setSaving(false);
  };

  // ─── Create Role ───
  const createRole = async () => {
    if (!newRoleName.trim() || !newRoleDisplay.trim()) return;
    const { error } = await supabase.from("permission_roles").insert({
      name: newRoleName.trim().toLowerCase().replace(/\s+/g, "_"),
      display_name: newRoleDisplay.trim(),
      description: newRoleDesc.trim(),
    });
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }

    await supabase.from("permission_audit_log").insert({
      user_id: currentUserId!,
      action: "create_role",
      target_type: "role",
      details: { name: newRoleName, display_name: newRoleDisplay },
    });

    toast({ title: "✅ تم إنشاء الدور بنجاح" });
    setNewRoleOpen(false);
    setNewRoleName("");
    setNewRoleDisplay("");
    setNewRoleDesc("");
    fetchAll();
  };

  // ─── Delete Role ───
  const deleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    if (role.is_system) { toast({ title: "لا يمكن حذف دور نظامي", variant: "destructive" }); return; }

    // Prevent deleting last super_admin assignment
    if (role.name === "super_admin") {
      const count = assignments.filter(a => a.permission_role_id === roleId).length;
      if (count <= 1) {
        toast({ title: "لا يمكن حذف آخر Super Admin", variant: "destructive" });
        return;
      }
    }

    await supabase.from("permission_roles").delete().eq("id", roleId);
    await supabase.from("permission_audit_log").insert({
      user_id: currentUserId!,
      action: "delete_role",
      target_type: "role",
      target_id: roleId,
      details: { role_name: role.display_name },
    });
    toast({ title: "تم حذف الدور" });
    if (selectedRoleId === roleId) setSelectedRoleId(null);
    setDeleteConfirm(null);
    fetchAll();
  };

  // ─── Assign User ───
  const searchUsers = async (q: string) => {
    setAssignSearch(q);
    if (q.length < 2) { setAssignResults([]); return; }
    const { data } = await supabase.from("profiles").select("id, name, email, user_code").or(`name.ilike.%${q}%,email.ilike.%${q}%,user_code.ilike.%${q}%`).limit(10);
    setAssignResults(data || []);
  };

  const assignUser = async (userId: string) => {
    if (!assignRoleId) { toast({ title: "اختر دورًا أولاً", variant: "destructive" }); return; }

    // Prevent self-modification if not super admin
    if (userId === currentUserId) {
      const currentPerms = assignments.filter(a => a.user_id === currentUserId);
      const hasSuperAdmin = currentPerms.some(a => {
        const role = roles.find(r => r.id === a.permission_role_id);
        return role?.name === "super_admin";
      });
      if (!hasSuperAdmin) {
        toast({ title: "لا يمكنك تعديل صلاحياتك الخاصة", variant: "destructive" });
        return;
      }
    }

    const { error } = await supabase.from("user_permission_roles").insert({
      user_id: userId,
      permission_role_id: assignRoleId,
      assigned_by: currentUserId,
    });
    if (error) {
      if (error.code === "23505") toast({ title: "هذا المستخدم لديه هذا الدور بالفعل", variant: "destructive" });
      else toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("permission_audit_log").insert({
      user_id: currentUserId!,
      action: "assign_role",
      target_type: "user_role",
      target_id: userId,
      details: { permission_role_id: assignRoleId },
    });

    toast({ title: "✅ تم تعيين الدور بنجاح" });
    fetchAll();
  };

  const removeAssignment = async (assignment: UserAssignment) => {
    // Prevent removing last super_admin
    const role = roles.find(r => r.id === assignment.permission_role_id);
    if (role?.name === "super_admin") {
      const superAdminCount = assignments.filter(a => a.permission_role_id === assignment.permission_role_id).length;
      if (superAdminCount <= 1) {
        toast({ title: "لا يمكن إزالة آخر Super Admin", variant: "destructive" });
        return;
      }
    }

    await supabase.from("user_permission_roles").delete().eq("id", assignment.id);
    await supabase.from("permission_audit_log").insert({
      user_id: currentUserId!,
      action: "remove_role",
      target_type: "user_role",
      target_id: assignment.user_id,
      details: { permission_role_id: assignment.permission_role_id, role_name: assignment.role_name },
    });
    toast({ title: "تم إزالة الدور" });
    fetchAll();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setNewRoleOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> دور جديد
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} className="gap-1.5">
            <Users className="w-4 h-4" /> تعيين مستخدم
          </Button>
        </div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          إدارة الصلاحيات
        </h2>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles">الأدوار</TabsTrigger>
          <TabsTrigger value="matrix">مصفوفة الصلاحيات</TabsTrigger>
          <TabsTrigger value="users">المستخدمون</TabsTrigger>
          <TabsTrigger value="audit">سجل العمليات</TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: Roles List ═══ */}
        <TabsContent value="roles" className="space-y-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الدور</TableHead>
                  <TableHead className="text-right">الاسم التقني</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-center">نظامي</TableHead>
                  <TableHead className="text-center">المستخدمون</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(role => {
                  const userCount = assignments.filter(a => a.permission_role_id === role.id).length;
                  return (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.display_name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{role.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{role.description}</TableCell>
                      <TableCell className="text-center">
                        {role.is_system ? <Badge variant="secondary">نظامي</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{userCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedRoleId(role.id); setTab("matrix"); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!role.is_system && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(role.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ═══ Tab 2: Permissions Matrix ═══ */}
        <TabsContent value="matrix" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedRoleId || ""} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="اختر دورًا" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pendingChanges.size > 0 && (
              <Button onClick={savePermissions} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ التغييرات ({pendingChanges.size})
              </Button>
            )}
            {isSuperAdmin && (
              <Badge className="bg-primary/15 text-primary border-primary/30">
                Super Admin — صلاحيات كاملة تلقائياً
              </Badge>
            )}
          </div>

          {selectedRoleId ? (
            <div className="rounded-xl border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right sticky right-0 bg-background z-10 min-w-[160px]">الوحدة</TableHead>
                    {OPERATIONS.map(op => (
                      <TableHead key={op.key} className="text-center min-w-[80px]">{op.label}</TableHead>
                    ))}
                    <TableHead className="text-center min-w-[80px]">الكل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULES.map(mod => {
                    const allOn = OPERATIONS.every(op => getPermValue(mod.key, op.key));
                    return (
                      <TableRow key={mod.key}>
                        <TableCell className="font-medium sticky right-0 bg-background z-10">{mod.label}</TableCell>
                        {OPERATIONS.map(op => (
                          <TableCell key={op.key} className="text-center">
                            <Checkbox
                              checked={getPermValue(mod.key, op.key)}
                              onCheckedChange={() => togglePerm(mod.key, op.key)}
                              disabled={isSuperAdmin}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <Checkbox
                            checked={allOn}
                            onCheckedChange={() => toggleModuleAll(mod.key)}
                            disabled={isSuperAdmin}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>اختر دورًا لعرض مصفوفة الصلاحيات</p>
            </div>
          )}
        </TabsContent>

        {/* ═══ Tab 3: User Assignments ═══ */}
        <TabsContent value="users" className="space-y-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">الرمز</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">البريد</TableHead>
                  <TableHead className="text-center">الدور</TableHead>
                  <TableHead className="text-center">التاريخ</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">لا توجد تعيينات بعد</TableCell>
                  </TableRow>
                ) : assignments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-xs">{a.user_code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{a.user_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.user_email}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-primary/15 text-primary border-primary/30">{a.role_name}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("ar-MA")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeAssignment(a)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ═══ Tab 4: Audit Log ═══ */}
        <TabsContent value="audit" className="space-y-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">العملية</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                  <TableHead className="text-center">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">لا توجد عمليات مسجلة</TableCell>
                  </TableRow>
                ) : auditLog.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{entry.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{entry.target_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                      {JSON.stringify(entry.details)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString("ar-MA")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ Dialog: New Role ═══ */}
      <Dialog open={newRoleOpen} onOpenChange={setNewRoleOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء دور جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="الاسم المعروض (مثال: مدير المبيعات)" value={newRoleDisplay} onChange={e => setNewRoleDisplay(e.target.value)} />
            <Input placeholder="الاسم التقني (مثال: sales_manager)" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} dir="ltr" />
            <Textarea placeholder="وصف الدور..." value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoleOpen(false)}>إلغاء</Button>
            <Button onClick={createRole} disabled={!newRoleName.trim() || !newRoleDisplay.trim()}>
              <Plus className="w-4 h-4 ml-1" /> إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Assign User ═══ */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تعيين مستخدم لدور</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={assignRoleId} onValueChange={setAssignRoleId}>
              <SelectTrigger><SelectValue placeholder="اختر الدور" /></SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن مستخدم بالاسم أو البريد أو الرمز..."
                value={assignSearch}
                onChange={e => searchUsers(e.target.value)}
                className="pr-10"
              />
            </div>
            {assignResults.length > 0 && (
              <div className="border border-border rounded-lg max-h-48 overflow-auto">
                {assignResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => assignUser(u.id)}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-secondary/50 transition-colors text-right border-b border-border last:border-0"
                  >
                    <Badge variant="outline" className="font-mono text-xs">{(u as any).user_code || "—"}</Badge>
                    <div>
                      <p className="text-sm font-medium">{u.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Delete Confirm ═══ */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> تأكيد حذف الدور
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">سيتم حذف هذا الدور وجميع الصلاحيات المرتبطة به. هل أنت متأكد؟</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteRole(deleteConfirm)}>
              <Trash2 className="w-4 h-4 ml-1" /> حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default PermissionsManagement;
