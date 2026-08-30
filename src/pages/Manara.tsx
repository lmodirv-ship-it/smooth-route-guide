import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowLeft, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Manara3DSphere from "@/components/manara/Manara3DSphere";
import ManaraBackground3D from "@/components/manara/ManaraBackground3D";
import { useManaraContent } from "@/hooks/useManaraContent";

const getIcon = (name: string) => {
  const Icon = (Icons as any)[name];
  return typeof Icon === "function" || typeof Icon === "object" ? Icon : Icons.Sparkles;
};

const Manara = () => {
  const { content, loading } = useManaraContent();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="relative min-h-screen bg-background text-foreground">
      <ManaraBackground3D />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">{content.brand}</span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للرئيسية
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero + 3D sphere */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

        {content.showSphere && (
          <div className="relative">
            <Manara3DSphere
              heightPercent={content.sphereHeightPercent}
              speed={content.sphereSpeed}
              labels={content.pillars.map((p) => p.title)}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7 }}
                className="text-center"
              >
                <h1 className="text-4xl font-extrabold leading-tight drop-shadow-sm md:text-6xl">
                  {content.heroTitle}
                  <span className="block text-primary">{content.heroHighlight}</span>
                </h1>
              </motion.div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {!content.showSphere && (
              <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
                {content.heroTitle}
                <span className="block text-primary">{content.heroHighlight}</span>
              </h1>
            )}
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{content.heroDescription}</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link to={content.primaryCtaLink}>
                  <Sparkles className="ml-2 h-5 w-5" />
                  {content.primaryCtaLabel}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to={content.secondaryCtaLink}>{content.secondaryCtaLabel}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="mb-10 text-center text-2xl font-bold md:text-3xl">{content.pillarsTitle}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {content.pillars.map((pillar, index) => {
            const Icon = getIcon(pillar.icon);
            return (
              <motion.div
                key={pillar.title + index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="h-full border-border/60 transition-shadow hover:shadow-lg">
                  <CardContent className="flex h-full flex-col items-start gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">{pillar.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">{content.ctaTitle}</h2>
          <p className="mt-4 text-muted-foreground">{content.ctaDescription}</p>
          <Button asChild size="lg" className="mt-8">
            <Link to={content.ctaButtonLink}>{content.ctaButtonLabel}</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        {content.footerText}
      </footer>
    </div>
  );
};

export default Manara;
