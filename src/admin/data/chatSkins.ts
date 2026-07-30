/** أشكال (ثيمات) واجهة الدردشة — تغيّر مظهر منطقة المحادثة فقط. */
export type ChatSkin = {
  id: string;
  label: string;
  /** حاوية المحادثة */
  shell: string;
  /** منطقة التمرير */
  surface: string;
  /** فقاعة المستخدم */
  user: string;
  /** فقاعة المساعد */
  assistant: string;
  /** شريط الإدخال */
  composer: string;
  /** ألوان معاينة مصغّرة */
  preview: [string, string];
};

export const CHAT_SKINS: ChatSkin[] = [
  {
    id: "classic",
    label: "كلاسيكي",
    shell: "border border-border bg-card",
    surface: "",
    user: "bg-primary text-primary-foreground rounded-2xl rounded-br-sm",
    assistant: "bg-muted text-foreground rounded-2xl rounded-bl-sm",
    composer: "border-t border-border bg-card",
    preview: ["hsl(var(--primary))", "hsl(var(--muted))"],
  },
  {
    id: "glass",
    label: "زجاجي",
    shell: "border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent backdrop-blur-xl",
    surface: "",
    user: "bg-primary/90 text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 backdrop-blur",
    assistant: "bg-background/60 text-foreground border border-border/60 rounded-2xl backdrop-blur",
    composer: "border-t border-primary/20 bg-background/40 backdrop-blur",
    preview: ["hsl(var(--primary) / 0.8)", "hsl(var(--background))"],
  },
  {
    id: "minimal",
    label: "بسيط",
    shell: "border-0 bg-transparent shadow-none",
    surface: "",
    user: "bg-transparent text-foreground border-e-2 border-primary rounded-none ps-0 pe-3 font-medium",
    assistant: "bg-transparent text-muted-foreground rounded-none px-0",
    composer: "border-t border-dashed border-border bg-transparent",
    preview: ["hsl(var(--foreground))", "hsl(var(--muted-foreground))"],
  },
  {
    id: "terminal",
    label: "طرفية",
    shell: "border border-emerald-500/30 bg-[#0b0f0c]",
    surface: "font-mono text-[13px]",
    user: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 rounded-md",
    assistant: "bg-white/5 text-emerald-50/90 border border-white/10 rounded-md",
    composer: "border-t border-emerald-500/30 bg-[#0b0f0c]",
    preview: ["#10b981", "#0b0f0c"],
  },
  {
    id: "bubbles",
    label: "فقاعات",
    shell: "border border-border bg-gradient-to-br from-secondary/40 to-background",
    surface: "",
    user: "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground rounded-[1.4rem] rounded-br-md shadow-md",
    assistant: "bg-card text-foreground border border-border rounded-[1.4rem] rounded-bl-md shadow-sm",
    composer: "border-t border-border bg-card/70",
    preview: ["hsl(var(--primary))", "hsl(var(--secondary))"],
  },
  {
    id: "paper",
    label: "ورقي",
    shell: "border border-amber-500/20 bg-amber-50/70 dark:bg-amber-950/20",
    surface: "",
    user: "bg-amber-500/20 text-foreground border border-amber-500/30 rounded-lg",
    assistant: "bg-background/80 text-foreground border border-amber-500/15 rounded-lg",
    composer: "border-t border-amber-500/20 bg-amber-50/60 dark:bg-amber-950/20",
    preview: ["#f59e0b", "#fef3c7"],
  },
];

export const getSkin = (id: string) => CHAT_SKINS.find((s) => s.id === id) ?? CHAT_SKINS[0];
