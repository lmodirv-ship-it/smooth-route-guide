/**
 * Register — unified registration entry page styled like HN Driver.
 * Maps /register/:type → AuthPage role and renders a branded hero + CTA.
 */
import { useParams, Navigate, Link } from "react-router-dom";
import { Car, User as UserIcon, Bike, Store, ArrowLeft, ShieldCheck } from "lucide-react";
import PageMeta from "@/components/PageMeta";

type RegType = "driver" | "customer" | "delivery" | "store";

const config: Record<RegType, {
  role: string; title: string; subtitle: string; Icon: any; accent: string; iconColor: string;
}> = {
  driver: {
    role: "driver",
    title: "تسجيل سائق",
    subtitle: "انضم كسائق وكن جزءاً من شبكة HN Driver",
    Icon: Car,
    accent: "glass-card-blue",
    iconColor: "text-info",
  },
  customer: {
    role: "client",
    title: "تسجيل زبون",
    subtitle: "اطلب رحلاتك وطلباتك بسهولة وأمان",
    Icon: UserIcon,
    accent: "glass-card-green",
    iconColor: "text-success",
  },
  delivery: {
    role: "delivery",
    title: "تسجيل عامل توصيل",
    subtitle: "ابدأ التوصيل وحقق دخلًا إضافياً في وقتك",
    Icon: Bike,
    accent: "glass-card-purple",
    iconColor: "text-accent-foreground",
  },
  store: {
    role: "store_owner",
    title: "تسجيل مطعم أو متجر",
    subtitle: "وسّع عملك واستقبل الطلبات من آلاف العملاء",
    Icon: Store,
    accent: "glass-card-gold",
    iconColor: "text-primary",
  },
};

const Register = () => {
  const { type } = useParams<{ type: string }>();
  const cfg = type && (type in config) ? config[type as RegType] : null;
  if (!cfg) return <Navigate to="/" replace />;

  const { role, title, subtitle, Icon, accent, iconColor } = cfg;

  return (
    <div className="min-h-screen gradient-dark flex flex-col" dir="rtl">
      <PageMeta title={`${title} — HN Driver`} description={subtitle} />

      <header className="px-4 md:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition text-sm">
          <ArrowLeft className="h-4 w-4" />
          الصفحة الرئيسية
        </Link>
        <Link to="/login" className="text-sm text-foreground hover:text-primary transition">
          لدي حساب
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className={`${accent} rounded-3xl p-8 md:p-12 max-w-lg w-full text-center`}>
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-2xl bg-background/40 grid place-items-center">
              <Icon className={`h-12 w-12 ${iconColor}`} strokeWidth={1.5} />
            </div>
          </div>
          <h1 className={`text-3xl md:text-4xl font-bold ${iconColor} mb-3`}>{title}</h1>
          <p className="text-muted-foreground mb-8">{subtitle}</p>

          <div className="space-y-3">
            <Link
              to={`/auth/${role}?mode=signup`}
              className="block w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-xl text-base"
            >
              متابعة التسجيل
            </Link>
            <Link
              to="/login"
              className="block w-full border border-border text-foreground py-3.5 rounded-xl hover:bg-secondary transition text-base"
            >
              تسجيل الدخول بحساب موجود
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            بياناتك آمنة ومحمية بالكامل
          </div>
        </div>
      </main>

      <footer className="px-4 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HN Driver
      </footer>
    </div>
  );
};

export default Register;
