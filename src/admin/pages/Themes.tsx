import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles } from "lucide-react";
import { useTheme, THEMES, type ThemeId, type ThemeDefinition } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ThemePreview = ({ theme, isActive, onActivate }: { theme: ThemeDefinition; isActive: boolean; onActivate: () => void }) => {
  const bg = theme.colors["--background"];
  const fg = theme.colors["--foreground"];
  const primary = theme.colors["--primary"];
  const card = theme.colors["--card"];
  const sidebar = theme.colors["--sidebar-background"];
  const border = theme.colors["--border"];
  const muted = theme.colors["--muted"];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
        isActive
          ? "border-primary shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
          : "border-border hover:border-primary/40"
      }`}
    >
      {/* Mini preview */}
      <div className="aspect-[16/10] relative overflow-hidden" style={{ background: `hsl(${bg})` }}>
        {/* Sidebar mock */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[25%]"
          style={{ background: `hsl(${sidebar})`, borderRight: `1px solid hsl(${border})` }}
        >
          <div className="p-2 space-y-1.5 mt-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="h-2 rounded-full"
                style={{
                  background: i === 1 ? `hsl(${primary})` : `hsl(${muted})`,
                  width: i === 1 ? "80%" : `${50 + i * 8}%`,
                  opacity: i === 1 ? 1 : 0.5,
                }}
              />
            ))}
          </div>
        </div>
        {/* Content area mock */}
        <div className="absolute left-[27%] top-3 right-3 bottom-3 space-y-2">
          <div className="h-2.5 rounded-full w-1/3" style={{ background: `hsl(${fg})`, opacity: 0.7 }} />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="flex-1 rounded-lg h-12"
                style={{ background: `hsl(${card})`, border: `1px solid hsl(${border})` }}
              />
            ))}
          </div>
          <div className="rounded-lg h-6 flex items-center justify-center" style={{ background: `hsl(${primary})` }}>
            <div className="h-1.5 w-8 rounded-full" style={{ background: `hsl(${theme.colors["--primary-foreground"]})` }} />
          </div>
          <div className="rounded-lg flex-1 h-8" style={{ background: `hsl(${card})`, border: `1px solid hsl(${border})` }} />
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3" style={{ background: `hsl(${card})` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-lg text-foreground">{theme.name}</h3>
            {theme.official && (
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] gap-1">
                <Crown className="w-3 h-3" /> Official
              </Badge>
            )}
          </div>
          {isActive && (
            <Badge className="bg-success/20 text-success border-success/30 gap-1">
              <Check className="w-3 h-3" /> Active
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{theme.label}</p>
        <p className="text-xs text-muted-foreground/70">{theme.description}</p>

        {/* Color swatches */}
        <div className="flex gap-1.5">
          {["--background", "--primary", "--accent", "--card", "--secondary"].map(key => (
            <div
              key={key}
              className="w-6 h-6 rounded-full border border-border"
              style={{ background: `hsl(${theme.colors[key]})` }}
              title={key}
            />
          ))}
        </div>

        <Button
          onClick={onActivate}
          disabled={isActive}
          className={`w-full gap-2 ${
            isActive
              ? "bg-success/20 text-success border-success/30 cursor-default"
              : "gradient-primary text-primary-foreground hover:opacity-90"
          }`}
          variant={isActive ? "outline" : "default"}
        >
          {isActive ? (
            <><Check className="w-4 h-4" /> مُفعّل حالياً</>
          ) : (
            <><Sparkles className="w-4 h-4" /> تفعيل</>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

const ThemesPage = () => {
  const { activeTheme, setTheme, loading } = useTheme();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">🎨 Themes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            اختر الثيم المناسب لمنصتك — يتم التطبيق فوراً على جميع الصفحات
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5 border-primary/30 text-primary">
          <Crown className="w-3.5 h-3.5" />
          Active: {THEMES.find(t => t.id === activeTheme)?.name || "EDGE"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {THEMES.map((theme, i) => (
          <motion.div
            key={theme.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <ThemePreview
              theme={theme}
              isActive={activeTheme === theme.id}
              onActivate={() => setTheme(theme.id)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ThemesPage;
