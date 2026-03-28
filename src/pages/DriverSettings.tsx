import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, User, Phone, Car, FileText, Shield, Bell,
  Globe, Moon, LogOut, ChevronLeft, HelpCircle, Star
} from "lucide-react";
import { useLogout } from "@/hooks/useLogout";
import { useI18n } from "@/i18n/context";

const DriverSettings = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const { t, dir } = useI18n();

  const sections = [
    {
      title: t.driver.accountSection,
      items: [
        { icon: User, label: t.driver.accountData, color: "text-primary" },
        { icon: Phone, label: t.driver.phoneNumber, color: "text-info" },
        { icon: Car, label: t.driver.vehicleData, color: "text-success" },
        { icon: FileText, label: t.driver.documents, color: "text-warning", path: "/driver/documents" },
      ],
    },
    {
      title: t.driver.preferencesSection,
      items: [
        { icon: Bell, label: t.driver.notifications, color: "text-info" },
        { icon: Globe, label: t.common.language, color: "text-primary" },
        { icon: Moon, label: t.driver.darkMode, color: "text-muted-foreground", toggle: true },
      ],
    },
    {
      title: t.driver.supportSection,
      items: [
        { icon: HelpCircle, label: t.driver.helpLabel, color: "text-info" },
        { icon: Shield, label: t.driver.privacySecurity, color: "text-success" },
        { icon: Star, label: t.driver.rateApp, color: "text-warning" },
      ],
    },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-8" dir={dir}>
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div />
        <h1 className="font-bold text-foreground text-lg">{t.driver.settingsTitle}</h1>
        <button onClick={() => navigate(-1)}>
          <ArrowRight className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      <div className="mx-4 mt-4">
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <h2 className="font-bold text-foreground text-lg">{t.common.name}</h2>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-warning">4.8</span>
              <Star className="w-3 h-3 text-warning fill-warning" />
            </div>
          </div>
          <div className="icon-circle-orange w-16 h-16">
            <User className="w-7 h-7 text-primary" />
          </div>
        </div>
      </div>

      {sections.map((section, si) => (
        <motion.div
          key={si}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.1 }}
          className="px-4 mt-5"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{section.title}</h3>
          <div className="glass-card rounded-xl overflow-hidden">
            {section.items.map((item, i) => (
              <button
                key={i}
                onClick={() => item.path && navigate(item.path)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  {item.toggle && (
                    <div className="w-10 h-5 rounded-full bg-primary relative">
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                  {!item.toggle && <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
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

      <div className="px-4 mt-6">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
        >
          <span>{t.driver.logoutLabel}</span>
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default DriverSettings;
