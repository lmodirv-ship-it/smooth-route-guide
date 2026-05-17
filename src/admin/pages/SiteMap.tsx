/**
 * Admin Site Map — clickable index of every page in the platform.
 * Route: /admin/sitemap
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  SITE_MAP,
  SITE_MAP_CATEGORIES,
  ACCESS_LABELS,
  ACCESS_COLORS,
  type AccessLevel,
} from "@/admin/data/siteMapRegistry";
import { Copy, ExternalLink, Map, Download, Search } from "lucide-react";
import { toast } from "sonner";

const AdminSiteMap = () => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeAccess, setActiveAccess] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SITE_MAP.filter((e) => {
      if (activeCategory !== "all" && e.category !== activeCategory) return false;
      if (activeAccess !== "all" && e.access !== activeAccess) return false;
      if (!q) return true;
      return (
        e.path.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory, activeAccess]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    for (const e of filtered) {
      if (!map[e.category]) map[e.category] = [];
      map[e.category].push(e);
    }
    return Object.entries(map);
  }, [filtered]);

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast.success("تم نسخ المسار", { description: path });
  };

  const exportCSV = () => {
    const rows = [
      ["path", "title", "category", "access", "dynamic", "note"],
      ...SITE_MAP.map((e) => [
        e.path,
        e.title,
        e.category,
        e.access,
        e.dynamic ? "yes" : "no",
        e.note || "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hn-driver-sitemap-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const accessOptions: { value: string; label: string }[] = [
    { value: "all", label: "كل الأذونات" },
    ...(Object.keys(ACCESS_LABELS) as AccessLevel[]).map((k) => ({
      value: k,
      label: ACCESS_LABELS[k],
    })),
  ];

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Map className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">خريطة الموقع</h1>
            <p className="text-sm text-muted-foreground">
              فهرس كامل لكل صفحات المنصة — {SITE_MAP.length} صفحة
            </p>
          </div>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          تصدير CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن صفحة أو مسار..."
            className="pr-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeCategory === "all" ? "default" : "outline"}
            onClick={() => setActiveCategory("all")}
          >
            الكل ({SITE_MAP.length})
          </Button>
          {SITE_MAP_CATEGORIES.map((cat) => {
            const count = SITE_MAP.filter((e) => e.category === cat).length;
            return (
              <Button
                key={cat}
                size="sm"
                variant={activeCategory === cat ? "default" : "outline"}
                onClick={() => setActiveCategory(cat)}
              >
                {cat} ({count})
              </Button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {accessOptions.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={activeAccess === opt.value ? "secondary" : "ghost"}
              onClick={() => setActiveAccess(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Results */}
      {grouped.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          لا توجد صفحات مطابقة
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, entries]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>{category}</span>
                <Badge variant="secondary" className="text-xs">
                  {entries.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {entries.map((e) => (
                  <Card
                    key={e.path + e.title}
                    className="p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{e.title}</div>
                        <code className="text-xs text-muted-foreground break-all" dir="ltr">
                          {e.note || e.path}
                        </code>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] ${ACCESS_COLORS[e.access]}`}
                      >
                        {ACCESS_LABELS[e.access]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={e.path} className="flex-1">
                        <Button size="sm" variant="default" className="w-full gap-1.5 h-8">
                          <ExternalLink className="w-3.5 h-3.5" />
                          فتح
                        </Button>
                      </Link>
                      <a href={e.path} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-8 px-2" title="فتح في تبويب جديد">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => copyPath(e.path)}
                        title="نسخ المسار"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {e.dynamic && (
                      <div className="mt-2 text-[10px] text-amber-400/80">
                        ⓘ مسار ديناميكي (نموذج توضيحي)
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSiteMap;
