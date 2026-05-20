/**
 * Public Blog Article — /blog/:idOrSlug
 * Resolves by slug first, falls back to UUID.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar } from "lucide-react";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category: string | null;
  language: string | null;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BlogArticle = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!idOrSlug) return;
    (async () => {
      setLoading(true);
      const isUuid = UUID_RE.test(idOrSlug);
      const query = supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .limit(1);
      const { data } = isUuid
        ? await query.eq("id", idOrSlug)
        : await query.eq("slug", idOrSlug);
      const found = (data?.[0] as Post) || null;
      setPost(found);
      setNotFound(!found);
      setLoading(false);
      if (found) {
        document.title = found.meta_title || found.title;
        if (found.meta_description) {
          let meta = document.querySelector('meta[name="description"]');
          if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("name", "description");
            document.head.appendChild(meta);
          }
          meta.setAttribute("content", found.meta_description);
        }
      }
    })();
  }, [idOrSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        جارٍ التحميل...
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6" dir="rtl">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">المقال غير موجود</h1>
          <p className="text-muted-foreground mb-4">قد يكون قد تم إزالته أو لم يُنشر بعد.</p>
          <Link to="/blog" className="text-primary hover:underline">
            ← العودة للمدونة
          </Link>
        </Card>
      </div>
    );
  }

  const isRTL = (post.language || "ar") === "ar";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isRTL ? "rtl" : "ltr"}>
      <article className="max-w-3xl mx-auto px-4 py-10">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> المدونة
        </Link>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          {post.category && <Badge variant="secondary">{post.category}</Badge>}
          {post.language && (
            <Badge variant="outline" className="uppercase">
              {post.language}
            </Badge>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{post.title}</h1>

        {post.published_at && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
            <Calendar className="w-4 h-4" />
            {new Date(post.published_at).toLocaleDateString(isRTL ? "ar" : "en")}
          </div>
        )}

        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full rounded-lg mb-6 aspect-video object-cover"
          />
        )}

        {post.excerpt && (
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">{post.excerpt}</p>
        )}

        <div
          className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-primary whitespace-pre-wrap leading-relaxed"
        >
          {post.content}
        </div>

        <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground" dir="ltr">
          ID: {post.id}
        </div>
      </article>
    </div>
  );
};

export default BlogArticle;
