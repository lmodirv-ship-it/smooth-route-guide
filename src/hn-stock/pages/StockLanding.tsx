import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft } from "lucide-react";

const StockLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Package className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">HN Stock</h1>
        <p className="text-muted-foreground">منصة متكاملة لإدارة المخزون والطلبات والشحنات</p>
        <Button size="lg" className="rounded-xl px-8" onClick={() => navigate("/login")}>
          تسجيل الدخول
          <ArrowLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>
    </div>
  );
};

export default StockLanding;
