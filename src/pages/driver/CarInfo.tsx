import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, ArrowRight, Edit2, Palette, Hash, Calendar, Fuel, Settings, Shield, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CarInfo = () => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<any>(null);
  const [editForm, setEditForm] = useState({ brand: "", model: "", plate_no: "", color: "" });
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: driver } = await supabase.from("drivers").select("id, car_id").eq("user_id", user.id).maybeSingle();
      if (!driver) { setLoading(false); return; }

      if (driver.car_id) {
        const { data: v } = await supabase.from("vehicles").select("*").eq("id", driver.car_id).maybeSingle();
        if (v) {
          setVehicle(v);
          setEditForm({ brand: v.brand, model: v.model, plate_no: v.plate_no, color: v.color || "" });
        }
      }

      // Docs
      const { data: d } = await supabase.from("documents").select("*").eq("driver_id", driver.id);
      setDocs(d || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    if (!vehicle) return;
    await supabase.from("vehicles").update(editForm).eq("id", vehicle.id);
    setVehicle({ ...vehicle, ...editForm });
    setEditing(false);
    toast({ title: "تم تحديث بيانات السيارة" });
  };

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const specs = vehicle ? [
    { icon: Car, label: "الماركة", value: `${vehicle.brand} ${vehicle.model}`, key: null },
    { icon: Palette, label: "اللون", value: vehicle.color || "—", key: "color" },
    { icon: Hash, label: "لوحة الترقيم", value: vehicle.plate_no, key: "plate_no" },
  ] : [];

  return (
    <div className="min-h-screen gradient-dark pb-6" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">معلومات السيارة</span>
        {vehicle && <button onClick={() => setEditing(!editing)}><Edit2 className="w-5 h-5 text-primary" /></button>}
      </div>

      <div className="px-4 mt-4">
        {!vehicle ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Car className="w-16 h-16 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-bold">لم يتم تسجيل سيارة بعد</p>
            <p className="text-sm text-muted-foreground mt-1">تواصل مع الإدارة لربط سيارتك</p>
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3 glow-primary">
                  <Car className="w-10 h-10 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{vehicle.brand} {vehicle.model}</h2>
                <p className="text-primary text-sm font-medium">{vehicle.plate_no}</p>
              </div>
            </motion.div>

            <h3 className="text-foreground font-bold mt-6 mb-3">المواصفات</h3>
            <div className="glass-card rounded-xl divide-y divide-border">
              {specs.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  {editing && s.key ? (
                    <Input value={editForm[s.key as keyof typeof editForm]}
                      onChange={e => setEditForm(f => ({ ...f, [s.key!]: e.target.value }))}
                      className="w-40 h-8 bg-secondary border-border text-sm" />
                  ) : (
                    <span className="text-sm text-muted-foreground">{s.value}</span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{s.label}</span>
                    <s.icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
              ))}
            </div>

            {editing && (
              <Button className="w-full gradient-primary text-primary-foreground rounded-xl h-11 mt-4" onClick={handleSave}>
                حفظ التغييرات
              </Button>
            )}
          </>
        )}

        <h3 className="text-foreground font-bold mt-6 mb-3">الوثائق ({docs.length})</h3>
        {docs.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد وثائق مرفوعة</p> : (
          <div className="space-y-3">
            {docs.map(d => (
              <div key={d.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${d.status === "approved" ? "text-success" : d.status === "rejected" ? "text-destructive" : "text-warning"}`} />
                  <span className={`text-xs ${d.status === "approved" ? "text-success" : d.status === "rejected" ? "text-destructive" : "text-warning"}`}>
                    {d.status === "approved" ? "موافق" : d.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{d.type}</span>
                  <Shield className="w-4 h-4 text-info" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarInfo;
