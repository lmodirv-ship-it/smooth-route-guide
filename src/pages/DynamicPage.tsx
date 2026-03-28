import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";

type Block = {
  type: string;
  [key: string]: any;
};

type PageData = {
  id: string;
  slug: string;
  title: string;
  page_type: string;
  content: Block[];
  meta_description: string;
  css_overrides: string;
  is_published: boolean;
};

const BlockRenderer = ({ block }: { block: Block }) => {
  switch (block.type) {
    case "hero":
      return (
        <section
          className="relative py-20 px-6 flex flex-col items-center justify-center text-center"
          style={{
            backgroundColor: block.background_color || "hsl(var(--primary))",
            color: block.text_color || "white",
            backgroundImage: block.background_image ? `url(${block.background_image})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            minHeight: "400px",
          }}
        >
          {block.background_image && <div className="absolute inset-0 bg-black/50" />}
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">{block.title}</h1>
            {block.subtitle && <p className="text-lg md:text-xl opacity-90 mb-8">{block.subtitle}</p>}
            {block.cta_text && (
              <a href={block.cta_link || "#"} className="inline-block px-8 py-3 rounded-xl bg-white text-black font-bold hover:opacity-90 transition">
                {block.cta_text}
              </a>
            )}
          </div>
        </section>
      );

    case "text":
      return (
        <section className="py-12 px-6 max-w-4xl mx-auto" style={{ textAlign: block.alignment || "right" }}>
          <div className="prose prose-lg prose-invert max-w-none">
            <ReactMarkdown>{block.content || ""}</ReactMarkdown>
          </div>
        </section>
      );

    case "image":
      return (
        <section className="py-8 px-6 flex flex-col items-center">
          <img
            src={block.url}
            alt={block.alt || ""}
            style={{ maxWidth: block.width || "100%", width: "100%" }}
            className="rounded-xl shadow-lg"
          />
          {block.caption && <p className="text-muted-foreground text-sm mt-3">{block.caption}</p>}
        </section>
      );

    case "cards":
      return (
        <section className="py-12 px-6">
          <div className={`grid gap-6 max-w-6xl mx-auto`} style={{ gridTemplateColumns: `repeat(${block.columns || 3}, minmax(0, 1fr))` }}>
            {(block.items || []).map((item: any, i: number) => (
              <div key={i} className="glass-card rounded-xl p-6 hover:border-primary/40 transition">
                {item.image && <img src={item.image} alt={item.title} className="w-full h-40 object-cover rounded-lg mb-4" />}
                {item.icon && <span className="text-3xl mb-3 block">{item.icon}</span>}
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                {item.description && <p className="text-muted-foreground text-sm">{item.description}</p>}
                {item.link && <a href={item.link} className="text-primary text-sm mt-3 inline-block hover:underline">المزيد ←</a>}
              </div>
            ))}
          </div>
        </section>
      );

    case "stats":
      return (
        <section className="py-12 px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {(block.items || []).map((item: any, i: number) => (
              <div key={i} className="text-center p-6 glass-card rounded-xl">
                {item.icon && <span className="text-3xl mb-2 block">{item.icon}</span>}
                <div className="text-3xl font-bold" style={{ color: item.color || "hsl(var(--primary))" }}>{item.value}</div>
                <div className="text-muted-foreground text-sm mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </section>
      );

    case "cta":
      return (
        <section className="py-16 px-6 text-center" style={{ backgroundColor: block.background_color || "hsl(var(--primary) / 0.1)" }}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-4">{block.title}</h2>
            {block.subtitle && <p className="text-muted-foreground mb-8">{block.subtitle}</p>}
            {block.button_text && (
              <a href={block.button_link || "#"} className="inline-block px-8 py-3 rounded-xl gradient-primary text-primary-foreground font-bold hover:opacity-90 transition">
                {block.button_text}
              </a>
            )}
          </div>
        </section>
      );

    case "faq":
      return (
        <section className="py-12 px-6 max-w-3xl mx-auto">
          <div className="space-y-4">
            {(block.items || []).map((item: any, i: number) => (
              <details key={i} className="glass-card rounded-xl p-4 group">
                <summary className="font-bold text-foreground cursor-pointer list-none flex justify-between items-center">
                  {item.question}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-muted-foreground mt-3 text-sm">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      );

    case "gallery":
      return (
        <section className="py-12 px-6">
          <div className={`grid gap-4 max-w-6xl mx-auto`} style={{ gridTemplateColumns: `repeat(${block.columns || 3}, minmax(0, 1fr))` }}>
            {(block.images || []).map((img: any, i: number) => (
              <div key={i} className="overflow-hidden rounded-xl">
                <img src={img.url} alt={img.alt || ""} className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300" />
                {img.caption && <p className="text-muted-foreground text-xs mt-2 text-center">{img.caption}</p>}
              </div>
            ))}
          </div>
        </section>
      );

    case "divider":
      if (block.style === "space") return <div className="py-8" />;
      if (block.style === "dots") return <div className="py-8 text-center text-muted-foreground tracking-[1em]">• • •</div>;
      return <hr className="my-8 border-border max-w-4xl mx-auto" />;

    case "html":
      return <section className="py-8 px-6 max-w-5xl mx-auto" dangerouslySetInnerHTML={{ __html: block.code || "" }} />;

    case "table":
      return (
        <section className="py-8 px-6 max-w-5xl mx-auto overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>{(block.headers || []).map((h: string, i: number) => <th key={i} className="border border-border p-3 bg-secondary/60 text-foreground font-bold text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {(block.rows || []).map((row: string[], ri: number) => (
                <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="border border-border p-3 text-foreground text-right">{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </section>
      );

    case "video":
      return (
        <section className="py-8 px-6 max-w-4xl mx-auto">
          {block.title && <h3 className="text-xl font-bold text-foreground mb-4 text-center">{block.title}</h3>}
          <div className="aspect-video rounded-xl overflow-hidden">
            <iframe src={block.url} className="w-full h-full" allowFullScreen title={block.title || "video"} />
          </div>
        </section>
      );

    case "pricing":
      return (
        <section className="py-12 px-6">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {(block.plans || []).map((plan: any, i: number) => (
              <div key={i} className={`gradient-card rounded-xl p-6 border ${plan.highlighted ? "border-primary shadow-lg shadow-primary/20" : "border-border"}`}>
                <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-primary mb-1">{plan.price}</div>
                {plan.period && <div className="text-muted-foreground text-sm mb-4">{plan.period}</div>}
                <ul className="space-y-2 mb-6">
                  {(plan.features || []).map((f: string, fi: number) => <li key={fi} className="text-foreground text-sm flex items-center gap-2">✓ {f}</li>)}
                </ul>
                {plan.cta_text && <button className="w-full py-2 rounded-lg gradient-primary text-primary-foreground font-bold">{plan.cta_text}</button>}
              </div>
            ))}
          </div>
        </section>
      );

    case "testimonials":
      return (
        <section className="py-12 px-6">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {(block.items || []).map((item: any, i: number) => (
              <div key={i} className="glass-card rounded-xl p-6">
                <p className="text-foreground text-sm mb-4 italic">"{item.text}"</p>
                <div className="flex items-center gap-3">
                  {item.avatar && <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover" />}
                  <div>
                    <div className="text-foreground font-bold text-sm">{item.name}</div>
                    {item.role && <div className="text-muted-foreground text-xs">{item.role}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case "timeline":
      return (
        <section className="py-12 px-6 max-w-3xl mx-auto">
          <div className="space-y-8 relative before:absolute before:right-4 before:top-0 before:bottom-0 before:w-0.5 before:bg-border">
            {(block.items || []).map((item: any, i: number) => (
              <div key={i} className="relative pr-12">
                <div className="absolute right-2.5 w-3 h-3 rounded-full bg-primary" />
                {item.date && <div className="text-primary text-sm font-bold mb-1">{item.date}</div>}
                <h4 className="text-foreground font-bold">{item.title}</h4>
                {item.description && <p className="text-muted-foreground text-sm mt-1">{item.description}</p>}
              </div>
            ))}
          </div>
        </section>
      );

    case "features":
      return (
        <section className="py-12 px-6">
          <div className={`grid gap-6 max-w-6xl mx-auto`} style={{ gridTemplateColumns: `repeat(${block.columns || 3}, minmax(0, 1fr))` }}>
            {(block.items || []).map((item: any, i: number) => (
              <div key={i} className="text-center p-6">
                {item.icon && <span className="text-4xl mb-4 block">{item.icon}</span>}
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                {item.description && <p className="text-muted-foreground text-sm">{item.description}</p>}
              </div>
            ))}
          </div>
        </section>
      );

    default:
      return null;
  }
};

const DynamicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchPage = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("dynamic_pages" as any)
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (err) {
        setError("حدث خطأ في تحميل الصفحة");
      } else if (!data) {
        setError("الصفحة غير موجودة");
      } else {
        setPage(data as any);
        document.title = (data as any).title || "HN Driver";
      }
      setLoading(false);
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
          <p className="text-muted-foreground">{error || "الصفحة غير موجودة"}</p>
          <a href="/" className="text-primary mt-4 inline-block hover:underline">العودة للرئيسية</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark" dir="rtl">
      {page.css_overrides && <style>{page.css_overrides}</style>}
      {(page.content || []).map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}
    </div>
  );
};

export default DynamicPage;
