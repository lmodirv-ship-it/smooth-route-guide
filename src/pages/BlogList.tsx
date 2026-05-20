/**
 * Public Blog index — /blog
 * Lists all published posts. SEO friendly, no auth required.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar, ArrowLeft } from "lucide-react";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  category: string | null;
  language: string | null;
  published_at: string | null;
};

const BlogList = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    document.title = "المدونة — HN Driver";
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id,slug,title,excerpt,image_url,category,language,published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      setPosts((data as Post[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = posts.filter(
    (p) =>
      !q ||
      p.title.toLowerCase().includes(q.toLowerCase()) ||
      (p.excerpt || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">المدونة</h1>
            <p className="text-muted-foreground">
              آخر الأخبار والمقالات حول HN Driver
            </p>
          </div>
          <Link to="/" className="text-sm text-primary hover:underline flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> العودة للرئيسية
          </Link>
        </div>

        <div className="relative mb-8 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في المقالات..."
            className="pr-9"
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">لا توجد مقالات منشورة</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <Link key={p.id} to={`/blog/${p.slug || p.id}`}>
                <Card className="overflow-hidden h-full hover:border-primary/50 transition-colors group">
                  {p.image_url ? (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img
                        src={p.image_url}
                        alt={p.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5" />
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.category && (
                        <Badge variant="secondary" className="text-xs">
                          {p.category}
                        </Badge>
                      )}
                      {p.language && (
                        <Badge variant="outline" className="text-xs uppercase">
                          {p.language}
                        </Badge>
                      )}
                    </div>
                    <h2 className="font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {p.title}
                    </h2>
                    {p.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
                    )}
                    {p.published_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.published_at).toLocaleDateString("ar")}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogList;
