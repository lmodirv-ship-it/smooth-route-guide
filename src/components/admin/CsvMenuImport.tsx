import { useState, useRef } from "react";
import { supabase } from "@/lib/firestoreClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Loader2, Download } from "lucide-react";

interface CsvMenuImportProps {
  storeId: string;
  storeName: string;
  categories: { id: string; name_ar: string }[];
  onImportComplete: () => void;
}

const CsvMenuImport = ({ storeId, storeName, categories, onImportComplete }: CsvMenuImportProps) => {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const header = "name_ar,name_fr,description_ar,price,category_name_ar,is_available";
    const example = `بيتزا مارغريتا,Pizza Margherita,بيتزا بالطماطم والموزاريلا,45,بيتزا,true
باستا كاربونارا,Pâtes Carbonara,باستا مع صلصة كريمة ولحم مقدد,55,باستا,true`;
    const blob = new Blob([`\uFEFF${header}\n${example}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `menu_template_${storeName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = values[i] || ""));
      return obj;
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      setPreview(rows);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    if (!preview.length) return;
    setImporting(true);
    try {
      const catMap = new Map(categories.map((c) => [c.name_ar, c.id]));
      const items = preview
        .filter((row) => row.name_ar && row.price)
        .map((row, i) => ({
          store_id: storeId,
          name_ar: row.name_ar,
          name_fr: row.name_fr || "",
          description_ar: row.description_ar || "",
          price: parseFloat(row.price) || 0,
          category_id: catMap.get(row.category_name_ar) || categories[0]?.id,
          is_available: row.is_available !== "false",
          sort_order: i,
        }));

      if (!items.length) {
        toast({ title: "لا توجد بيانات صالحة للاستيراد", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("menu_items").insert(items);
      if (error) throw error;

      toast({ title: `تم استيراد ${items.length} منتج بنجاح ✅` });
      setPreview([]);
      if (fileRef.current) fileRef.current.value = "";
      onImportComplete();
    } catch (err: any) {
      toast({ title: "خطأ في الاستيراد", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          استيراد منتجات من CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-1">
            <Download className="w-3 h-3" /> تحميل القالب
          </Button>
          <div className="relative">
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
            <Button size="sm" variant="outline" className="gap-1">
              <Upload className="w-3 h-3" /> اختيار ملف CSV
            </Button>
          </div>
        </div>

        {preview.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">معاينة: {preview.length} منتج</p>
            <div className="max-h-48 overflow-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-right">الاسم</th>
                    <th className="p-2 text-right">السعر</th>
                    <th className="p-2 text-right">الفئة</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{row.name_ar}</td>
                      <td className="p-2">{row.price} DH</td>
                      <td className="p-2">{row.category_name_ar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={handleImport} disabled={importing} className="w-full gap-1">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? "جاري الاستيراد..." : `استيراد ${preview.length} منتج`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CsvMenuImport;
