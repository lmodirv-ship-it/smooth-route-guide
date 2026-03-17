import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Phone, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/hn-driver-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "driver";
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "driver") {
      navigate("/driver");
    } else {
      navigate("/client");
    }
  };

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 gradient-dark">
      {/* Back button */}
      <button onClick={() => navigate("/welcome")} className="self-start mb-6">
        <ArrowLeft className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors" />
      </button>

      {/* Header */}
      <div className="flex flex-col items-center mb-10 animate-fade-in">
        <img src={logo} alt="HN Driver" className="w-16 h-16 mb-3" />
        <h1 className="text-2xl font-bold text-foreground">
          {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
        </h1>
        <span className="text-sm text-primary mt-1 font-medium">
          {role === "driver" ? "حساب سائق" : "حساب عميل"}
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto animate-slide-up">
        {!isLogin && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">الاسم الكامل</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسمك"
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl text-right"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">رقم الهاتف</label>
          <div className="relative">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              type="tel"
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 text-right"
            />
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">كلمة المرور</label>
          <div className="relative">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 text-right"
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Eye className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {isLogin && (
          <button type="button" className="text-primary text-sm self-start hover:underline">
            نسيت كلمة المرور؟
          </button>
        )}

        <Button
          type="submit"
          className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-lg mt-2 hover:opacity-90 transition-opacity"
        >
          {isLogin ? "دخول" : "إنشاء حساب"}
        </Button>

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">أو</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-12 rounded-xl border-border text-foreground hover:bg-secondary"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "إنشاء حساب جديد" : "لدي حساب بالفعل"}
        </Button>
      </form>
    </div>
  );
};

export default Login;
