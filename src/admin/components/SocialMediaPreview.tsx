import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Facebook, Instagram, Twitter, Linkedin, Copy, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

type SocialPost = {
  id: string;
  platform: string;
  post_type: string;
  title: string;
  content: string;
  image_url: string | null;
  hashtags: string[];
  target_audience: string;
  status: string;
  admin_approved: boolean;
  scheduled_at: string | null;
  created_at: string;
};

const platformIcons: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  tiktok: () => <span className="text-lg font-bold">TT</span>,
  all: () => <span className="text-lg">🌐</span>,
};

const platformColors: Record<string, string> = {
  facebook: "bg-blue-600",
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  twitter: "bg-sky-500",
  linkedin: "bg-blue-700",
  tiktok: "bg-black",
  all: "bg-primary",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-muted text-muted-foreground" },
  approved: { label: "معتمد", color: "bg-success/20 text-success" },
  rejected: { label: "مرفوض", color: "bg-destructive/20 text-destructive" },
  published: { label: "منشور", color: "bg-primary/20 text-primary" },
};

export const SocialMediaPreview = () => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("social_media_posts" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setPosts((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    const ch = supabase
      .channel("social-posts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_media_posts" }, fetchPosts)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const copyContent = (post: SocialPost) => {
    const text = `${post.content}\n\n${(post.hashtags || []).map(h => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ المحتوى");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">جاري التحميل...</div>;
  }

  if (!posts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm gap-2">
        <span className="text-3xl">📱</span>
        <p>لا توجد منشورات بعد</p>
        <p className="text-xs">اطلب من المساعد الذكي إنشاء منشور</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {posts.map(post => {
          const Icon = platformIcons[post.platform] || platformIcons.all;
          const status = statusLabels[post.status] || statusLabels.draft;

          return (
            <div key={post.id} className="gradient-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${platformColors[post.platform] || "bg-primary"} flex items-center justify-center text-white`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground capitalize">{post.platform}</span>
                    <span className="text-xs text-muted-foreground mx-1">•</span>
                    <span className="text-xs text-muted-foreground">{post.post_type}</span>
                  </div>
                </div>
                <Badge className={`text-[10px] ${status.color}`}>{status.label}</Badge>
              </div>

              {post.title && <h4 className="text-sm font-bold text-foreground">{post.title}</h4>}
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.content}</p>

              {post.image_url && (
                <img src={post.image_url} alt="" className="w-full h-40 object-cover rounded-lg" />
              )}

              {post.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.hashtags.map((tag, i) => (
                    <span key={i} className="text-xs text-primary">#{tag}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString("ar-SA")}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyContent(post)}
                    title="نسخ المحتوى"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
