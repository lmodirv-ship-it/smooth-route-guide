import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Package } from "lucide-react";

const StockProducts = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["hn-stock-products", search],
    queryFn: async () => {
      let q = supabase.from("hn_stock_products").select("*").order("created_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      const { data } = await q.limit(100);
      return data || [];
    },
  });

  const addProduct = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("hn_stock_products").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hn-stock-products"] });
      toast({ title: "تمت إضافة المنتج ✅" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addProduct.mutate({
      name: fd.get("name"),
      sku: fd.get("sku"),
      price: Number(fd.get("price")) || 0,
      cost_price: Number(fd.get("cost_price")) || 0,
      quantity: Number(fd.get("quantity")) || 0,
      category: fd.get("category") || "general",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">المنتجات</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 ml-2" />إضافة منتج</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>منتج جديد</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <Input name="name" placeholder="اسم المنتج" required />
              <Input name="sku" placeholder="SKU" required />
              <div className="grid grid-cols-2 gap-2">
                <Input name="price" type="number" step="0.01" placeholder="سعر البيع" required />
                <Input name="cost_price" type="number" step="0.01" placeholder="سعر التكلفة" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input name="quantity" type="number" placeholder="الكمية" />
                <Input name="category" placeholder="الفئة" />
              </div>
              <Button type="submit" className="w-full" disabled={addProduct.isPending}>حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !products?.length ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">لا توجد منتجات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-right py-3 px-4">المنتج</th>
                  <th className="text-right py-3 px-4">SKU</th>
                  <th className="text-right py-3 px-4">السعر</th>
                  <th className="text-right py-3 px-4">المخزون</th>
                  <th className="text-right py-3 px-4">الفئة</th>
                </tr></thead>
                <tbody>
                  {products.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-xs">{p.sku}</td>
                      <td className="py-3 px-4">{Number(p.price).toFixed(2)} MAD</td>
                      <td className="py-3 px-4">
                        <span className={p.quantity <= 5 ? "text-red-500 font-bold" : ""}>{p.quantity}</span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{p.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockProducts;
