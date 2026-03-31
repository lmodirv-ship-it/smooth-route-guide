import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield, Plus, Save, Trash2, Users, Search, Loader2, Check, X,
  History, AlertTriangle, Eye, Edit, Copy, Power, RotateCcw, Calendar, User
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
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  last_modified_by?: string | null;
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
  const [roleSearch, setRoleSearch] = useState("");

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
  const [copyRoleOpen, setCopyRoleOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState("");
  const [copyNewName, setCopyNewName] = useState("");
  const [copyNewDisplay, setCopyNewDisplay] = useState("");
  const [disableConfirm, setDisableConfirm] = useState<string | null>(null);

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
      supabase.from("permission_audit_log").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    setRoles((rolesRes.data as PermRole[]) || []);
    setPermissions((permsRes.data as RolePerm[]) || []);

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

  // ─── Helpers ───
  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const isSuperAdmin = selectedRole?.name === "super_admin";
  const roleUserCount = (roleId: string) => assignments.filter(a => a.permission_role_id === roleId).length;

  const filteredRoles = useMemo(() => {
    if (!roleSearch) return roles;
    const q = roleSearch.toLowerCase();
    return roles.filter(r => r.display_name.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [roles, roleSearch]);

  // ─── Permission Matrix Logic ───
  const getPermValue = (module: string, operation: string): boolean => {
    if (isSuperAdmin) return true;
    const key = `${selectedRoleId}:${module}:${operation}`;
    if (pendingChanges.has(key)) return pendingChanges.get(key)!;
    const existing = permissions.find(p => p.role_id === selectedRoleId && p.module === module && p.operation === operation);
    return existing?.allowed ?? false;
  };

  const togglePerm = (module: string, operation: string) => {
    if (isSuperAdmin || !selectedRoleId) return;
    const key = `${selectedRoleId}:${module}:${operation}`;
    const current = getPermValue(module, operation);
    setPendingChanges(prev => new Map(prev).set(key, !current));
  };

  const toggleModuleAll = (module: string) => {
    if (isSuperAdmin || !selectedRoleId) return;
    const allOn = OPERATIONS.every(op => getPermValue(module, op.key));
    OPERATIONS.forEach(op => {
      const key = `${selectedRoleId}:${module}:${op.key}`;
      setPendingChanges(prev => new Map(prev).set(key, !allOn));
    });
  };

  const selectAll = () => {
    if (isSuperAdmin || !selectedRoleId) return;
    MODULES.forEach(mod => OPERATIONS.forEach(op => {
      const key = `${selectedRoleId}:${mod.key}:${op.key}`;
      setPendingChanges(prev => new Map(prev).set(key, true));
    }));
  };

  const deselectAll = () => {
    if (isSuperAdmin || !selectedRoleId) return;
    MODULES.forEach(mod => OPERATIONS.forEach(op => {
      const key = `${selectedRoleId}:${mod.key}:${op.key}`;
      setPendingChanges(prev => new Map(prev).set(key, false));
    }));
  };

  const copyPermsFromRole = async () => {
    if (!selectedRoleId || !copySourceId || copySourceId === selectedRoleId) return;
    const sourcePerms = permissions.filter(p => p.role_id === copySourceId && p.allowed);
    deselectAll();
    sourcePerms.forEach(sp => {
      const key = `${selectedRoleId}:${sp.module}:${sp.operation}`;
      setPendingChanges(prev => new Map(prev).set(key, true));
    });
    toast({ title: "✅ تم نسخ الصلاحيات — اضغط حفظ لتأكيدها" });
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
      const { data: existing } = await supabase.from("role_permissions").select("id").eq("role_id", u.role_id).eq("module", u.module).eq("operation", u.operation).maybeSingle();
      if (existing) {
        await supabase.from("role_permissions").update({ allowed: u.allowed }).eq("id", existing.id);
      } else {
        await supabase.from("role_permissions").insert(u);
      }
    }

    await supabase.from("permission_roles").update({ updated_at: new Date().toISOString(), last_modified_by: currentUserId }).eq("id", selectedRoleId);
    await supabase.from("permission_audit_log").insert({
      user_id: currentUserId!, action: "update_permissions", target_type: "role", target_id: selectedRoleId,
      details: { changes_count: upserts.length, role_name: selectedRole?.display_name },
    });

    setPendingChanges(new Map());
    toast({ title: "✅ تم حفظ الصلاحيات بنجاح" });
    await fetchAll();
    setSaving(false);
  };

  const resetPermissions = () => {
    setPendingChanges(new Map());
    toast({ title: "تم إلغاء التغييرات" });
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
      user_id: currentUserId!, action: "create_role", target_type: "role",
      details: { name: newRoleName, display_name: newRoleDisplay },
    });
    toast({ title: "✅ تم إنشاء الدور بنجاح" });
    setNewRoleOpen(false); setNewRoleName(""); setNewRoleDisplay(""); setNewRoleDesc("");
    fetchAll();
  };

  // ─── Copy Role ───
  const duplicateRole = async () => {
    if (!copySourceId || !copyNewName.trim() || !copyNewDisplay.trim()) return;
    const { data: newRole, error } = await supabase.from("permission_roles").insert({
      name: copyNewName.trim().toLowerCase().replace(/\s+/g, "_"),
      display_name: copyNewDisplay.trim(),
      description: `نسخة من ${roles.find(r => r.id === copySourceId)?.display_name || ""}`,
    }).select().single();
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    
    const sourcePerms = permissions.filter(p => p.role_id === copySourceId && p.allowed);
    if (sourcePerms.length > 0) {
      await supabase.from("role_permissions").insert(sourcePerms.map(sp => ({
        role_id: newRole.id, module: sp.module, operation: sp.operation, allowed: true,
      })));
    }
    await supabase.from("permission_audit_log").insert({
      user_id: currentUserId!, action: "duplicate_role", target_type: "role", target_id: newRole.id,
      details: { source_role: copySourceId, new_role: copyNewDisplay.trim() },
    });
    toast({ title: "✅ تم نسخ الدور بنجاح" });
    setCopyRoleOpen(false); setCopyNewName(""); setCopyNewDisplay(""); setCopySourceId("");
    fetchAll();
  };

  // ─── Delete Role ───
  const deleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    if (role.is_system) { toast({ title: "لا يمكن حذف دور نظامي", variant: "destructive" }); return; }
    await supabase.from("permission_roles").delete().eq("id", roleId);
    await supabase.from("permission_audit_log").insert({
      user_id: currentUserId!, action: "delete_role", target_type: "role", target_id: roleId,
      details: { role_name: role.display_name },
    });
    toast({ title: "تم حذف الدور" });
    if (selectedRoleId === roleId) setSelectedRoleId(null);
    setDeleteConfirm(null);
    fetchAll();
  };

  // ─── Disable/Enable Role ───
  const toggleRoleActive = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    if (role.name === "super_admin") {
      const superAdminCount = assignments.filter(a => a.permission_role_id === roleId).length;
      if (superAdminCount > 0) { toast({ title: "لا يمكن تعطيل Super Admin وهو مُعيّن لمستخدمين", variant: "destructive" }); return; }
    }
    const newActive = !(role.is_active ?? true);
    await supabase.from("permission_roles").update({ is_active: newActive, updated_at: new Date().toISOString() }).eq("id", roleId);
    await supabase.from("permission_audit_log").insert({
      user_id: currentUserId!, action: newActive ? "enable_role" : "disable_role", target_type: "role", target_id: roleId,
      details: { role_name: role.display_name },
    });
    toast({ title: newActive ? "✅ تم تفعيل الدور" : "تم تعطيل الدور" });
    setDisableConfirm(null);
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
    if (userId === currentUserId) {
      const hasSA = assignments.some(a => a.user_id === currentUserId && roles.find(r => r.id === a.permission_role_id)?.name === "super_admin");
      if (!hasSA) { toast({ title: "لا يمكنك تعديل صلاحياتك الخاصة", variant: "destructive" }); return; }
    }
    const { error } = await supabase.from("user_permission_roles").insert({ user_id: userId, permission_role_id: assignRoleId, assigned_by: currentUserId });
    if (error) {
      toast({ title: error.code === "23505" ? "هذا المستخدم لديه هذا الدور بالفعل" : "خطأ", description: error.code !== "23505" ? error.message : undefined, variant: "destructive" });
      return;
    }
    await supabase.from("permission_audit_log").insert({ user_id: currentUserId!, action: "assign_role", target_type: "user_role", target_id: userId, details: { permission_role_id: assignRoleId } });
    toast({ title: "✅ تم تعيين الدور بنجاح" });
    fetchAll();
  };

  const removeAssignment = async (assignment: UserAssignment) => {
    const role = roles.find(r => r.id === assignment.permission_role_id);
    if (role?.name === "super_admin") {
      const cnt = assignments.filter(a => a.permission_role_id === assignment.permission_role_id).length;
      if (cnt <= 1) { toast({ title: "لا يمكن إزالة آخر Super Admin", variant: "destructive" }); return; }
    }
    await supabase.from("user_permission_roles").delete().eq("id", assignment.id);
    await supabase.from("permission_audit_log").insert({ user_id: currentUserId!, action: "remove_role", target_type: "user_role", target_id: assignment.user_id, details: { permission_role_id: assignment.permission_role_id, role_name: assignment.role_name } });
    toast({ title: "تم إزالة الدور" });
    fetchAll();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const roleIsActive = (r: PermRole) => r.is_active ?? true;

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setNewRoleOpen(true)} className="gap-1.5"><Plus className="w-4 h-4" /> دور جديد</Button>
          <Button size="sm" variant="outline" onClick={() => { setCopyRoleOpen(true); setCopySourceId(selectedRoleId || ""); }} className="gap-1.5"><Copy className="w-4 h-4" /> نسخ دور</Button>
          <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} className="gap-1.5"><Users className="w-4 h-4" /> تعيين مستخدم</Button>
        </div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> إدارة الصلاحيات
        </h2>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles">الأدوار</TabsTrigger>
          <TabsTrigger value="permissions">الصلاحيات</TabsTrigger>
          <TabsTrigger value="users">المستخدمون والأدوار</TabsTrigger>
          <TabsTrigger value="audit">سجل الصلاحيات</TabsTrigger>
        </TabsList>

        {/* ═══════ Tab 1: Roles — 3 Column Layout ═══════ */}
        <TabsContent value="roles" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* ── Left: Roles List ── */}
            <div className="lg:col-span-3 space-y-3">
              <div className="rounded-xl border border-border p-3 glass-strong">
                <h3 className="font-bold text-foreground mb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> الأدوار</h3>
                <div className="relative mb-2">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={roleSearch} onChange={e => setRoleSearch(e.target.value)} placeholder="بحث..." className="pr-9 h-8 text-sm" />
                </div>
                <Button size="sm" variant="outline" className="w-full mb-2 gap-1.5" onClick={() => setNewRoleOpen(true)}><Plus className="w-3 h-3" /> إضافة دور</Button>
                <div className="space-y-1 max-h-[500px] overflow-auto">
                  {filteredRoles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`w-full text-right p-2.5 rounded-lg transition-all text-sm border ${
                        selectedRoleId === role.id
                          ? "bg-primary/10 border-primary/30 text-foreground"
                          : "border-transparent hover:bg-secondary/50 text-muted-foreground"
                      } ${!roleIsActive(role) ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">{roleUserCount(role.id)}</Badge>
                        <span className="font-medium text-foreground">{role.display_name}</span>
                      </div>
                      <p className="text-xs mt-0.5 text-muted-foreground truncate">{role.description || role.name}</p>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        {role.is_system && <Badge variant="secondary" className="text-[9px] px-1">نظامي</Badge>}
                        {!roleIsActive(role) && <Badge variant="destructive" className="text-[9px] px-1">معطّل</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Center: Permissions Matrix ── */}
            <div className="lg:col-span-6">
              <div className="rounded-xl border border-border p-3 glass-strong">
                {selectedRoleId ? (
                  <>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {!isSuperAdmin && (
                          <>
                            <Button size="sm" variant="outline" onClick={selectAll} className="h-7 text-xs">تحديد الكل</Button>
                            <Button size="sm" variant="outline" onClick={deselectAll} className="h-7 text-xs">إلغاء الكل</Button>
                            <Select value="" onValueChange={(v) => { setCopySourceId(v); }}>
                              <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="نسخ من دور..." /></SelectTrigger>
                              <SelectContent>
                                {roles.filter(r => r.id !== selectedRoleId).map(r => (
                                  <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {copySourceId && copySourceId !== selectedRoleId && (
                              <Button size="sm" onClick={copyPermsFromRole} className="h-7 text-xs gap-1"><Copy className="w-3 h-3" /> نسخ</Button>
                            )}
                          </>
                        )}
                      </div>
                      <h3 className="font-bold text-foreground text-sm">مصفوفة صلاحيات: {selectedRole?.display_name}</h3>
                    </div>
                    {isSuperAdmin && (
                      <div className="mb-3 p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
                        <span className="text-xs text-primary font-medium">⭐ Super Admin — صلاحيات كاملة تلقائياً</span>
                      </div>
                    )}
                    <div className="overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right sticky right-0 bg-background z-10 min-w-[130px] text-xs">الوحدة</TableHead>
                            {OPERATIONS.map(op => (
                              <TableHead key={op.key} className="text-center min-w-[55px] text-xs">{op.label}</TableHead>
                            ))}
                            <TableHead className="text-center min-w-[50px] text-xs">الكل</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {MODULES.map(mod => {
                            const allOn = OPERATIONS.every(op => getPermValue(mod.key, op.key));
                            return (
                              <TableRow key={mod.key}>
                                <TableCell className="font-medium sticky right-0 bg-background z-10 text-xs">{mod.label}</TableCell>
                                {OPERATIONS.map(op => (
                                  <TableCell key={op.key} className="text-center">
                                    <Checkbox checked={getPermValue(mod.key, op.key)} onCheckedChange={() => togglePerm(mod.key, op.key)} disabled={isSuperAdmin} />
                                  </TableCell>
                                ))}
                                <TableCell className="text-center">
                                  <Checkbox checked={allOn} onCheckedChange={() => toggleModuleAll(mod.key)} disabled={isSuperAdmin} />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {pendingChanges.size > 0 && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <Button onClick={savePermissions} disabled={saving} className="gap-1.5">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          حفظ ({pendingChanges.size})
                        </Button>
                        <Button variant="outline" onClick={resetPermissions}><RotateCcw className="w-4 h-4 ml-1" /> إلغاء</Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>اختر دورًا من القائمة لعرض مصفوفة الصلاحيات</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Role Details ── */}
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-border p-3 glass-strong">
                {selectedRole ? (
                  <div className="space-y-3">
                    <h3 className="font-bold text-foreground flex items-center gap-2"><Edit className="w-4 h-4 text-primary" /> تفاصيل الدور</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">الاسم:</span><span className="font-medium">{selectedRole.display_name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">التقني:</span><span className="font-mono text-xs">{selectedRole.name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">الوصف:</span><span className="text-xs">{selectedRole.description || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">النوع:</span>{selectedRole.is_system ? <Badge variant="secondary" className="text-xs">نظامي</Badge> : <Badge variant="outline" className="text-xs">مخصص</Badge>}</div>
                      <div className="flex justify-between"><span className="text-muted-foreground">الحالة:</span>{roleIsActive(selectedRole) ? <Badge className="bg-success/15 text-success border-success/30 text-xs">مفعّل</Badge> : <Badge variant="destructive" className="text-xs">معطّل</Badge>}</div>
                      <div className="flex justify-between"><span className="text-muted-foreground">المستخدمون:</span><Badge variant="outline">{roleUserCount(selectedRole.id)}</Badge></div>
                      <div className="flex justify-between items-center"><span className="text-muted-foreground">الإنشاء:</span><span className="text-xs">{new Date(selectedRole.created_at).toLocaleDateString("ar-MA")}</span></div>
                      <div className="flex justify-between items-center"><span className="text-muted-foreground">آخر تعديل:</span><span className="text-xs">{new Date(selectedRole.updated_at).toLocaleDateString("ar-MA")}</span></div>
                    </div>
                    <div className="pt-3 border-t border-border space-y-2">
                      {pendingChanges.size > 0 && (
                        <Button className="w-full gap-1.5" onClick={savePermissions} disabled={saving}>
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ الصلاحيات
                        </Button>
                      )}
                      <Button variant="outline" className="w-full gap-1.5" onClick={() => { setCopyRoleOpen(true); setCopySourceId(selectedRole.id); }}>
                        <Copy className="w-4 h-4" /> نسخ الدور
                      </Button>
                      {!selectedRole.is_system && (
                        <>
                          <Button variant="outline" className="w-full gap-1.5" onClick={() => setDisableConfirm(selectedRole.id)}>
                            <Power className="w-4 h-4" /> {roleIsActive(selectedRole) ? "تعطيل" : "تفعيل"}
                          </Button>
                          <Button variant="outline" className="w-full gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(selectedRole.id)}>
                            <Trash2 className="w-4 h-4" /> حذف الدور
                          </Button>
                        </>
                      )}
                      {pendingChanges.size > 0 && (
                        <Button variant="outline" className="w-full gap-1.5" onClick={resetPermissions}>
                          <RotateCcw className="w-4 h-4" /> إعادة ضبط
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>اختر دورًا لعرض التفاصيل</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════ Tab 2: Permissions (full matrix standalone) ═══════ */}
        <TabsContent value="permissions" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedRoleId || ""} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="اختر دورًا" /></SelectTrigger>
              <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedRoleId && !isSuperAdmin && (
              <>
                <Button size="sm" variant="outline" onClick={selectAll}>تحديد الكل</Button>
                <Button size="sm" variant="outline" onClick={deselectAll}>إلغاء الكل</Button>
              </>
            )}
            {pendingChanges.size > 0 && (
              <Button onClick={savePermissions} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ ({pendingChanges.size})
              </Button>
            )}
          </div>
          {selectedRoleId ? (
            <div className="rounded-xl border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right sticky right-0 bg-background z-10 min-w-[150px]">الوحدة</TableHead>
                    {OPERATIONS.map(op => <TableHead key={op.key} className="text-center min-w-[70px]">{op.label}</TableHead>)}
                    <TableHead className="text-center min-w-[70px]">الكل</TableHead>
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
                            <Checkbox checked={getPermValue(mod.key, op.key)} onCheckedChange={() => togglePerm(mod.key, op.key)} disabled={isSuperAdmin} />
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <Checkbox checked={allOn} onCheckedChange={() => toggleModuleAll(mod.key)} disabled={isSuperAdmin} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground"><Shield className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>اختر دورًا</p></div>
          )}
        </TabsContent>

        {/* ═══════ Tab 3: Users & Roles ═══════ */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Button size="sm" onClick={() => setAssignOpen(true)} className="gap-1.5"><Plus className="w-4 h-4" /> تعيين مستخدم</Button>
            <Badge variant="secondary">{assignments.length} تعيين</Badge>
          </div>
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
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">لا توجد تعيينات</TableCell></TableRow>
                ) : assignments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-center"><Badge variant="outline" className="font-mono text-xs">{a.user_code}</Badge></TableCell>
                    <TableCell className="font-medium">{a.user_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.user_email}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-primary/15 text-primary border-primary/30">{a.role_name}</Badge></TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("ar-MA")}</TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeAssignment(a)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ═══════ Tab 4: Audit Log ═══════ */}
        <TabsContent value="audit" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{auditLog.length} عملية</Badge>
            <h3 className="font-bold text-foreground flex items-center gap-2"><History className="w-4 h-4 text-primary" /> سجل الصلاحيات</h3>
          </div>
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
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">لا توجد عمليات</TableCell></TableRow>
                ) : auditLog.map(e => (
                  <TableRow key={e.id}>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{e.action}</Badge></TableCell>
                    <TableCell className="text-sm">{e.target_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{JSON.stringify(e.details)}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("ar-MA")}</TableCell>
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
          <DialogHeader><DialogTitle>إنشاء دور جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="الاسم المعروض" value={newRoleDisplay} onChange={e => setNewRoleDisplay(e.target.value)} />
            <Input placeholder="الاسم التقني (مثال: sales_manager)" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} dir="ltr" />
            <Textarea placeholder="وصف الدور..." value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoleOpen(false)}>إلغاء</Button>
            <Button onClick={createRole} disabled={!newRoleName.trim() || !newRoleDisplay.trim()}><Plus className="w-4 h-4 ml-1" /> إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Copy Role ═══ */}
      <Dialog open={copyRoleOpen} onOpenChange={setCopyRoleOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>نسخ دور</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={copySourceId} onValueChange={setCopySourceId}>
              <SelectTrigger><SelectValue placeholder="الدور المصدر" /></SelectTrigger>
              <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="الاسم المعروض للدور الجديد" value={copyNewDisplay} onChange={e => setCopyNewDisplay(e.target.value)} />
            <Input placeholder="الاسم التقني" value={copyNewName} onChange={e => setCopyNewName(e.target.value)} dir="ltr" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyRoleOpen(false)}>إلغاء</Button>
            <Button onClick={duplicateRole} disabled={!copySourceId || !copyNewName.trim() || !copyNewDisplay.trim()}><Copy className="w-4 h-4 ml-1" /> نسخ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Assign User ═══ */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>تعيين مستخدم لدور</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={assignRoleId} onValueChange={setAssignRoleId}>
              <SelectTrigger><SelectValue placeholder="اختر الدور" /></SelectTrigger>
              <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}</SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ابحث بالاسم أو البريد أو الرمز..." value={assignSearch} onChange={e => searchUsers(e.target.value)} className="pr-10" />
            </div>
            {assignResults.length > 0 && (
              <div className="border border-border rounded-lg max-h-48 overflow-auto">
                {assignResults.map(u => (
                  <button key={u.id} onClick={() => assignUser(u.id)} className="w-full flex items-center justify-between p-2.5 hover:bg-secondary/50 transition-colors text-right border-b border-border last:border-0">
                    <Badge variant="outline" className="font-mono text-xs">{(u as any).user_code || "—"}</Badge>
                    <div><p className="text-sm font-medium">{u.name || "—"}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
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
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> تأكيد حذف الدور</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">سيتم حذف هذا الدور وجميع الصلاحيات المرتبطة به نهائياً. هل أنت متأكد؟</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteRole(deleteConfirm)}><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Disable Confirm ═══ */}
      <Dialog open={!!disableConfirm} onOpenChange={() => setDisableConfirm(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Power className="w-5 h-5 text-primary" /> تأكيد تعطيل/تفعيل الدور</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">هل تريد تغيير حالة هذا الدور؟</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableConfirm(null)}>إلغاء</Button>
            <Button onClick={() => disableConfirm && toggleRoleActive(disableConfirm)}>تأكيد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default PermissionsManagement;
