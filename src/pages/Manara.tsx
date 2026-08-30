import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Lightbulb, MapPin, ShieldCheck, Sparkles, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const pillars = [
  {
    icon: MapPin,
    title: "تغطية محلية دقيقة",
    description: "منارة تضيء كل حي في طنجة — توصيل ورحلات مبنية على معرفة حقيقية بالمنطقة.",
  },
  {
    icon: ShieldCheck,
    title: "ثقة وأمان",
    description: "سائقون موثّقون، تتبّع مباشر، وحماية كاملة لبياناتك في كل طلب.",
  },
  {
    icon: Truck,
    title: "سرعة التنفيذ",
    description: "إسناد تلقائي ذكي لأقرب سائق خلال ثوانٍ، مع متابعة لحظية حتى الباب.",
  },
  {
    icon: Users,
    title: "مجتمع واحد",
    description: "زبائن، سائقون، وأصحاب محلات — منصة واحدة تجمع الجميع تحت ضوء واحد.",
  },
];

const Manara = () => {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">منارة</span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للرئيسية
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
              <Lightbulb className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
              منارة
              <span className="block text-primary">ضوء يقود طريقك</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              صفحة منارة هي بوابتك لاكتشاف رؤية منصة HN Driver: إضاءة الطريق بين
              الزبون والسائق وصاحب المحل، بتقنية حديثة وخدمة محلية موثوقة.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/services">
                  <Sparkles className="ml-2 h-5 w-5" />
                  اكتشف خدماتنا
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/join/driver">انضم كسائق</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="mb-10 text-center text-2xl font-bold md:text-3xl">
          أعمدة المنارة
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="h-full border-border/60 transition-shadow hover:shadow-lg">
                <CardContent className="flex h-full flex-col items-start gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <pillar.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{pillar.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {pillar.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            جاهز تسلك الطريق المضيء؟
          </h2>
          <p className="mt-4 text-muted-foreground">
            أنشئ حسابك الآن وابدأ أول رحلة أو طلب توصيل خلال دقائق.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/auth/client?mode=signup">ابدأ الآن مجاناً</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        جميع الحقوق محفوظة el hassani moulay ismail. groupe hn
      </footer>
    </div>
  );
};

export default Manara;
