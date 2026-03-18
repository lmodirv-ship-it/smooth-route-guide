import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, User, Phone, Car, FileText, Shield, Bell,
  Globe, Moon, LogOut, ChevronLeft, HelpCircle, Star
} from "lucide-react";
import { useFirebaseLogout } from "@/hooks/useFirebaseAuth";

const DriverSettings = () => {
  const navigate = useNavigate();
  const logout = useFirebaseLogout();

  const sections = [
    {
      title: "الحساب",
      items: [
        { icon: User, label: "بيانات الحساب", color: "text-primary" },
        { icon: Phone, label: "رقم الهاتف", color: "text-info" },
        { icon: Car, label: "بيانات المركبة", color: "text-success" },
        { icon: FileText, label: "الوثائق", color: "text-warning", path: "/driver/documents" },
      ],
    },
    {
      title: "التفضيلات",
      items: [
        { icon: Bell, label: "الإشعارات", color: "text-info" },
        { icon: Globe, label: "اللغة", color: "text-primary", value: "العربية" },
        { icon: Moon, label: "الوضع الداكن", color: "text-muted-foreground", toggle: true },
      ],
    },
    {
      title: "الدعم",
      items: [
        { icon: HelpCircle, label: "المساعدة", color: "text-info" },
        { icon: Shield, label: "الخصوصية والأمان", color: "text-success" },
        { icon: Star, label: "قيّم التطبيق", color: "text-warning" },
      ],
    },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-8">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div />
        <h1 className="font-bold text-foreground text-lg">الإعدادات</h1>
        <button onClick={() => navigate(-1)}>
          <ArrowRight className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      {/* Profile Card */}
      <div className="mx-4 mt-4">
        <div className="gradient-card rounded-2xl p-5 border border-border flex items-center gap-4">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1 text-right">
            <h2 className="font-bold text-foreground text-lg">أحمد محمد</h2>
            <p className="text-sm text-muted-foreground">+966 50 XXX XXXX</p>
            <div className="flex items-center gap-1 justify-end mt-1">
              <span className="text-xs text-warning">٤.٨</span>
              <Star className="w-3 h-3 text-warning fill-warning" />
            </div>
          </div>
          <div className="icon-circle-orange w-16 h-16">
            <User className="w-7 h-7 text-primary" />
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      {sections.map((section, si) => (
        <motion.div
          key={si}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.1 }}
          className="px-4 mt-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-2 text-right">{section.title}</h3>
          <div className="gradient-card rounded-xl border border-border overflow-hidden">
            {section.items.map((item, i) => (
              <button
                key={i}
                onClick={() => item.path && navigate(item.path)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                  {item.toggle && (
                    <div className="w-10 h-5 rounded-full bg-primary relative">
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                  {!item.value && !item.toggle && <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-foreground text-sm">{item.label}</span>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Logout */}
      <div className="px-4 mt-6">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
        >
          <span>تسجيل الخروج</span>
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default DriverSettings;
