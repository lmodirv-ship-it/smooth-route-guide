import { useNavigate } from "react-router-dom";
import { Car, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/hn-driver-logo.png";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-12 gradient-dark">
      {/* Header */}
      <div className="flex flex-col items-center pt-8 animate-fade-in">
        <img src={logo} alt="HN Driver" className="w-24 h-24 mb-4" />
        <h1 className="text-3xl font-bold font-display text-primary glow-text">HN Driver</h1>
        <p className="text-muted-foreground mt-1 text-sm">اختر نوع حسابك</p>
      </div>

      {/* Role Selection */}
      <div className="flex flex-col gap-4 w-full max-w-sm animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <button
          onClick={() => navigate("/login?role=driver")}
          className="group relative overflow-hidden rounded-2xl p-6 gradient-card border border-border hover:border-primary/50 transition-all duration-300"
        >
          <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <Car className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-right flex-1">
              <h3 className="text-lg font-bold text-foreground">سائق</h3>
              <p className="text-sm text-muted-foreground">سجل كسائق وابدأ بالربح</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate("/login?role=client")}
          className="group relative overflow-hidden rounded-2xl p-6 gradient-card border border-border hover:border-primary/50 transition-all duration-300"
        >
          <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shadow-lg">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div className="text-right flex-1">
              <h3 className="text-lg font-bold text-foreground">عميل</h3>
              <p className="text-sm text-muted-foreground">اطلب رحلة بسهولة</p>
            </div>
          </div>
        </button>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: "0.6s" }}>
        بالمتابعة أنت توافق على الشروط والأحكام
      </p>
    </div>
  );
};

export default Welcome;
