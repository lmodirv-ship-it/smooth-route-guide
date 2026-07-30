/**
 * المحادثات — أرشيف محادثات المسؤول مع الذكاء الاصطناعي.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Trash2, MessageSquare } from "lucide-react";

export default function AiChats() {
  const db = supabase as any;
  const [chats, setChats] = useState<Record<string, any>[]>([]);
  const [messages, setMessages] = useState<Record<string, any>[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await db.from("ai_admin_chats").select("*").order("updated_at", { ascending: false }).limit(200);
    setChats(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const open = async (id: string) => {
    setActive(id);
    const { data } = await db.from("ai_admin_chat_messages").select("*").eq("chat_id", id).order("created_at");
    setMessages(data ?? []);
  };

  const remove = async (id: string) => {
    const { error } = await db.from("ai_admin_chats").delete().eq("id", id);
    if (error) return toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
    if (active === id) { setActive(null); setMessages([]); }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">المحادثات</h1>
          <p className="text-xs text-muted-foreground mt-1">أرشيف محادثات المسؤول مع النماذج والوكلاء.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 me-1" /> تحديث</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-2 lg:col-span-1 max-h-[65vh] overflow-y-auto">
          {loading && <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}
          {!loading && chats.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">لا توجد محادثات محفوظة</p>
          )}
          {chats.map((c) => (
            <div key={c.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/40 ${active === c.id ? "bg-muted/60" : ""}`}
              onClick={() => open(c.id)}>
              <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{c.title}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(c.updated_at).toLocaleString()}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(c.id); }} aria-label="حذف">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </Card>

        <Card className="p-4 lg:col-span-2 max-h-[65vh] overflow-y-auto space-y-3">
          {!active && <p className="text-center text-sm text-muted-foreground py-10">اختر محادثة لعرض تفاصيلها</p>}
          {active && messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">لا توجد رسائل في هذه المحادثة</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <Badge variant="outline" className="mb-1 text-[10px]">{m.role}</Badge>
                <div>{m.content}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
