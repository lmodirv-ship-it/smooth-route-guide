import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft } from "lucide-react";

const StockLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
          <Package className="w-9 h-9 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">HN Stock</h1>
        <p className="text-muted-foreground">نظام التخزين والتوزيع - إدارة المخزون والشحنات والتجار</p>
        <Button size="lg" onClick={() => navigate("/login")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          تسجيل الدخول
        </Button>
      </div>
    </div>
  );
};

export default StockLanding;
