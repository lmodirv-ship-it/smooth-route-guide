/**
 * adminTools — سجلّ أدوات المساعد الإداري (قراءة + كتابة).
 * القراءة تُنفَّذ فوراً، الكتابة لا تُنفَّذ إلا بعد موافقة يدوية عبر ai-admin-execute.
 * لا يوجد SQL حر — كل أداة تستعمل قوائم بيضاء للجداول والأعمدة.
 */
// deno-lint-ignore-file no-explicit-any

export type ToolKind = "read" | "write";

export type ToolSpec = {
  name: string;
  kind: ToolKind;
  label: string;
  description: string;
  risk: "low" | "medium" | "high";
  parameters: Record<string, unknown>;
};

const obj = (props: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties: props,
  required,
  additionalProperties: false,
});
const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });

export const TOOL_SPECS: ToolSpec[] = [
  // ───────────── قراءة ─────────────
  {
    name: "platform_overview",
    kind: "read",
    label: "نظرة عامة على المنصة",
    risk: "low",
    description: "إحصائيات اليوم: الطلبات، الرحلات، السائقون المتصلون، المداخيل، نسبة الإلغاء.",
    parameters: obj({}),
  },
  {
    name: "search_orders",
    kind: "read",
    label: "بحث طلبات التوصيل",
    risk: "low",
    description: "بحث في طلبات التوصيل بالرقم المرجعي أو الحالة أو المدينة.",
    parameters: obj({
      query: str("رقم الطلب أو اسم المحل أو اسم العميل"),
      status: str("حالة الطلب مثل pending أو delivered"),
      city: str("المدينة"),
      limit: num("عدد النتائج (افتراضي 10، أقصى 50)"),
    }),
  },
  {
    name: "search_rides",
    kind: "read",
    label: "بحث طلبات النقل",
    risk: "low",
    description: "بحث في طلبات الركوب/الرحلات بالحالة أو المدينة أو نقطة الانطلاق.",
    parameters: obj({
      query: str("نقطة الانطلاق أو الوجهة"),
      status: str("الحالة"),
      city: str("المدينة"),
      limit: num("عدد النتائج"),
    }),
  },
  {
    name: "driver_status",
    kind: "read",
    label: "حالة سائق",
    risk: "low",
    description: "معلومات سائق: الحالة، النوع، التقييم، آخر تحديث موقع، عدد الرحلات.",
    parameters: obj({ query: str("رمز السائق أو اسمه أو هاتفه") }, ["query"]),
  },
  {
    name: "store_lookup",
    kind: "read",
    label: "بحث المحلات والمطاعم",
    risk: "low",
    description: "قائمة المحلات/المطاعم مع الحالة والعمولة ورسوم التوصيل (بدون بيانات تواصل خاصة).",
    parameters: obj({
      query: str("اسم المحل أو رمزه"),
      city: str("المدينة"),
      only_closed: { type: "boolean", description: "المغلقة فقط" },
      limit: num("عدد النتائج"),
    }),
  },
  {
    name: "call_center_queue",
    kind: "read",
    label: "طابور مركز الاتصال",
    risk: "low",
    description: "الطلبات العالقة أكثر من 5 دقائق، الشكاوى المفتوحة، المكالمات الجارية، والعملاء المحتملون في قائمة الاتصال.",
    parameters: obj({}),
  },
  {
    name: "health_report",
    kind: "read",
    label: "تقرير صحة المنصة",
    risk: "low",
    description: "آخر أخطاء العملاء، الطلبات الملغاة، والسائقون غير النشطين — لتتبّع حسن سير الموقع.",
    parameters: obj({}),
  },

  // ───────────── كتابة (تتطلب تأكيداً) ─────────────
  {
    name: "set_order_status",
    kind: "write",
    label: "تغيير حالة طلب",
    risk: "medium",
    description: "تغيير حالة طلب توصيل (مهمة مركز الاتصال).",
    parameters: obj({
      order_code: str("رمز الطلب"),
      status: str("الحالة الجديدة: pending, ready_for_driver, accepted, picked_up, delivered, cancelled"),
      note: str("ملاحظة اختيارية"),
    }, ["order_code", "status"]),
  },
  {
    name: "assign_driver",
    kind: "write",
    label: "إسناد سائق لطلب",
    risk: "medium",
    description: "إسناد طلب توصيل عالق إلى سائق محدّد.",
    parameters: obj({ order_code: str("رمز الطلب"), driver_code: str("رمز السائق") }, ["order_code", "driver_code"]),
  },
  {
    name: "activate_driver",
    kind: "write",
    label: "تفعيل/تعطيل سائق",
    risk: "high",
    description: "تغيير حالة سائق: active أو inactive أو suspended.",
    parameters: obj({ driver_code: str("رمز السائق"), status: str("active | inactive | suspended") }, ["driver_code", "status"]),
  },
  {
    name: "set_driver_type",
    kind: "write",
    label: "تغيير دور السائق",
    risk: "high",
    description: "تغيير نوع السائق: ride (ركاب) أو delivery (توصيل) أو both.",
    parameters: obj({ driver_code: str("رمز السائق"), driver_type: str("ride | delivery | both") }, ["driver_code", "driver_type"]),
  },
  {
    name: "create_store",
    kind: "write",
    label: "إضافة مطعم/محل",
    risk: "medium",
    description: "إنشاء محل أو مطعم جديد في المنصة.",
    parameters: obj({
      name: str("اسم المحل"),
      city: str("المدينة"),
      category: str("التصنيف مثل restaurant"),
      address: str("العنوان"),
      phone: str("الهاتف"),
      delivery_fee: num("رسوم التوصيل"),
      min_order: num("الحد الأدنى للطلب"),
      commission_rate: num("نسبة العمولة (مثلاً 0.07)"),
    }, ["name", "city"]),
  },
  {
    name: "create_menu_item",
    kind: "write",
    label: "إضافة صنف لقائمة مطعم",
    risk: "low",
    description: "إضافة صنف وسعره إلى قائمة مطعم موجود.",
    parameters: obj({
      store_code: str("رمز المحل"),
      name_ar: str("اسم الصنف بالعربية"),
      price: num("الثمن"),
      description_ar: str("وصف مختصر"),
      category_name: str("اسم القسم داخل القائمة"),
    }, ["store_code", "name_ar", "price"]),
  },
  {
    name: "update_pricing",
    kind: "write",
    label: "تعديل إعداد تسعير",
    risk: "high",
    description: "تعديل قيمة معامل تسعير في إعدادات المنصة.",
    parameters: obj({ key: str("مفتاح الإعداد"), value: str("القيمة الجديدة") }, ["key", "value"]),
  },
  {
    name: "update_prospect_call",
    kind: "write",
    label: "تحديث نتيجة مكالمة عميل محتمل",
    risk: "low",
    description: "تسجيل نتيجة مكالمة مركز الاتصال مع عميل محتمل.",
    parameters: obj({
      prospect_code: str("رمز العميل المحتمل"),
      call_status: str("مثل called, interested, refused, callback"),
      call_notes: str("ملاحظات المكالمة"),
    }, ["prospect_code", "call_status"]),
  },
  {
    name: "create_notification",
    kind: "write",
    label: "إرسال إشعار لمستخدم",
    risk: "medium",
    description: "إرسال إشعار داخل التطبيق لمستخدم عبر رمزه.",
    parameters: obj({ user_code: str("رمز المستخدم"), message: str("نص الإشعار"), type: str("نوع الإشعار") }, ["user_code", "message"]),
  },

  // ───────────── تقارير (قراءة) ─────────────
  {
    name: "revenue_report",
    kind: "read",
    label: "تقرير المداخيل",
    risk: "low",
    description: "تقرير مداخيل التوصيل والرحلات والعمولات خلال عدد من الأيام، مقسّم حسب اليوم.",
    parameters: obj({ days: num("عدد الأيام (افتراضي 7، أقصى 90)") }),
  },
  {
    name: "orders_report",
    kind: "read",
    label: "تقرير الطلبات",
    risk: "low",
    description: "توزيع الطلبات حسب الحالة والمدينة ومتوسط قيمة الطلب خلال مدة محددة.",
    parameters: obj({ days: num("عدد الأيام"), city: str("المدينة (اختياري)") }),
  },
  {
    name: "driver_performance",
    kind: "read",
    label: "أداء السائقين",
    risk: "low",
    description: "ترتيب السائقين حسب عدد الرحلات والطلبات المنجزة والتقييم خلال مدة.",
    parameters: obj({ days: num("عدد الأيام"), limit: num("عدد السائقين") }),
  },
  {
    name: "growth_report",
    kind: "read",
    label: "تقرير النمو",
    risk: "low",
    description: "نمو المستخدمين والسائقين والمحلات والطلبات مقارنة بالمدة السابقة.",
    parameters: obj({ days: num("عدد الأيام") }),
  },

  // ───────────── مراقبة (قراءة) ─────────────
  {
    name: "system_alerts",
    kind: "read",
    label: "تنبيهات النظام",
    risk: "low",
    description: "آخر تنبيهات النظام وسجلات فحص الصحة غير السليمة.",
    parameters: obj({ limit: num("عدد النتائج") }),
  },
  {
    name: "client_errors",
    kind: "read",
    label: "أخطاء العملاء",
    risk: "low",
    description: "أخطاء واجهة المستخدم المسجّلة خلال مدة، مجمّعة حسب النوع.",
    parameters: obj({ hours: num("عدد الساعات (افتراضي 24)"), limit: num("عدد النتائج") }),
  },
  {
    name: "pending_actions",
    kind: "read",
    label: "الأفعال المعلّقة",
    risk: "low",
    description: "كل ما ينتظر تدخّل الإدارة: طلبات شحن المحفظة، الشكاوى، ترشيحات السائقين، المحلات غير المؤكدة.",
    parameters: obj({}),
  },

  // ───────────── محتوى (كتابة) ─────────────
  {
    name: "create_blog_post",
    kind: "write",
    label: "إنشاء مقال مدونة",
    risk: "medium",
    description: "إنشاء مقال جديد في المدونة (يبقى مسودة غير منشورة إلا إذا طُلب نشره).",
    parameters: obj({
      title: str("عنوان المقال"),
      slug: str("الرابط اللطيف (اختياري، يُولَّد تلقائياً)"),
      content: str("محتوى المقال (Markdown أو HTML)"),
      excerpt: str("مقتطف مختصر"),
      category: str("التصنيف"),
      language: str("اللغة: ar | fr | en | es"),
      meta_description: str("وصف SEO"),
      publish: { type: "boolean", description: "نشر مباشرة" },
    }, ["title", "content"]),
  },
  {
    name: "update_blog_post",
    kind: "write",
    label: "تعديل مقال مدونة",
    risk: "medium",
    description: "تعديل عنوان أو محتوى أو بيانات SEO لمقال موجود عبر الرابط اللطيف.",
    parameters: obj({
      slug: str("الرابط اللطيف للمقال"),
      title: str("العنوان الجديد"),
      content: str("المحتوى الجديد"),
      excerpt: str("المقتطف"),
      category: str("التصنيف"),
      meta_description: str("وصف SEO"),
    }, ["slug"]),
  },
  {
    name: "set_blog_post_published",
    kind: "write",
    label: "نشر/إخفاء مقال",
    risk: "medium",
    description: "نشر مقال مدونة أو إعادته إلى مسودة.",
    parameters: obj({ slug: str("الرابط اللطيف"), published: { type: "boolean", description: "منشور أم لا" } }, ["slug", "published"]),
  },
  {
    name: "create_page",
    kind: "write",
    label: "إنشاء صفحة ديناميكية",
    risk: "medium",
    description: "إنشاء صفحة جديدة في الموقع (تبقى غير منشورة إلا إذا طُلب نشرها).",
    parameters: obj({
      title: str("عنوان الصفحة"),
      slug: str("الرابط اللطيف"),
      body: str("نص الصفحة"),
      page_type: str("نوع الصفحة مثل static"),
      meta_description: str("وصف SEO"),
      publish: { type: "boolean", description: "نشر مباشرة" },
    }, ["title", "slug", "body"]),
  },
  {
    name: "update_page",
    kind: "write",
    label: "تعديل صفحة ديناميكية",
    risk: "medium",
    description: "تعديل عنوان أو نص أو وصف صفحة موجودة.",
    parameters: obj({
      slug: str("الرابط اللطيف"),
      title: str("العنوان الجديد"),
      body: str("النص الجديد"),
      meta_description: str("وصف SEO"),
    }, ["slug"]),
  },
  {
    name: "set_page_published",
    kind: "write",
    label: "نشر/إخفاء صفحة",
    risk: "medium",
    description: "نشر صفحة ديناميكية أو إخفاؤها.",
    parameters: obj({ slug: str("الرابط اللطيف"), published: { type: "boolean", description: "منشورة أم لا" } }, ["slug", "published"]),
  },
];


export const getSpec = (name: string) => TOOL_SPECS.find((t) => t.name === name) ?? null;

export const toOpenAITools = (names: string[]) =>
  TOOL_SPECS.filter((t) => names.includes(t.name)).map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.kind === "write"
        ? `${t.description} (عملية كتابة — لن تُنفَّذ إلا بعد موافقة المسؤول يدوياً)`
        : t.description,
      parameters: t.parameters,
    },
  }));

const clamp = (n: any, def: number, max: number) => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.min(Math.floor(v), max) : def;
};
const todayISO = () => new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

/** تنفيذ أدوات القراءة — آمنة ولا تغيّر أي بيانات. */
export async function runReadTool(db: any, name: string, args: any): Promise<any> {
  const limit = clamp(args?.limit, 10, 50);

  switch (name) {
    case "platform_overview": {
      const since = todayISO();
      const [orders, rides, trips, drivers, online] = await Promise.all([
        db.from("delivery_orders").select("status, total_price, created_at").gte("created_at", since),
        db.from("ride_requests").select("status, price, created_at").gte("created_at", since),
        db.from("trips").select("status, fare, created_at").gte("created_at", since),
        db.from("drivers").select("id, status, driver_type"),
        db.from("drivers").select("id").eq("status", "active"),
      ]);
      const o = orders.data ?? [], r = rides.data ?? [], t = trips.data ?? [];
      const sum = (rows: any[], k: string) => rows.reduce((a, x) => a + Number(x[k] ?? 0), 0);
      const cancelled = [...o, ...r].filter((x) => x.status === "cancelled").length;
      return {
        اليوم: new Date().toISOString().slice(0, 10),
        طلبات_التوصيل: o.length,
        طلبات_النقل: r.length,
        رحلات_منفذة: t.filter((x) => x.status === "completed").length,
        مداخيل_التوصيل: sum(o, "total_price"),
        مداخيل_الرحلات: sum(t, "fare"),
        سائقون_متصلون: (online.data ?? []).length,
        إجمالي_السائقين: (drivers.data ?? []).length,
        عمليات_ملغاة: cancelled,
        نسبة_الإلغاء: o.length + r.length ? `${Math.round((cancelled / (o.length + r.length)) * 100)}%` : "0%",
      };
    }

    case "search_orders": {
      let q = db.from("delivery_orders")
        .select("order_code, status, store_name, customer_name, city, total_price, driver_id, created_at")
        .order("created_at", { ascending: false }).limit(limit);
      if (args?.status) q = q.eq("status", String(args.status));
      if (args?.city) q = q.ilike("city", `%${args.city}%`);
      if (args?.query) q = q.or(`order_code.ilike.%${args.query}%,store_name.ilike.%${args.query}%,customer_name.ilike.%${args.query}%`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { count: data?.length ?? 0, orders: data ?? [] };
    }

    case "search_rides": {
      let q = db.from("ride_requests")
        .select("id, status, pickup, destination, city, price, driver_id, created_at")
        .order("created_at", { ascending: false }).limit(limit);
      if (args?.status) q = q.eq("status", String(args.status));
      if (args?.city) q = q.ilike("city", `%${args.city}%`);
      if (args?.query) q = q.or(`pickup.ilike.%${args.query}%,destination.ilike.%${args.query}%`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { count: data?.length ?? 0, rides: data ?? [] };
    }

    case "driver_status": {
      const term = String(args?.query ?? "").trim();
      let { data: drivers } = await db.from("drivers")
        .select("id, user_id, driver_code, status, driver_type, rating, location_updated_at, online_since")
        .ilike("driver_code", `%${term}%`).limit(5);
      if (!drivers?.length) {
        const { data: profs } = await db.from("profiles").select("id").or(`name.ilike.%${term}%,phone.ilike.%${term}%,user_code.ilike.%${term}%`).limit(5);
        const ids = (profs ?? []).map((p: any) => p.id);
        if (ids.length) {
          const res = await db.from("drivers")
            .select("id, user_id, driver_code, status, driver_type, rating, location_updated_at, online_since")
            .in("user_id", ids);
          drivers = res.data ?? [];
        }
      }
      if (!drivers?.length) return { found: false, message: "لم يُعثر على سائق مطابق" };
      const out = [];
      for (const d of drivers) {
        const [{ data: prof }, { count: tripsCount }] = await Promise.all([
          db.from("profiles").select("name, phone, user_code, is_suspended").eq("id", d.user_id).maybeSingle(),
          db.from("trips").select("id", { count: "exact", head: true }).eq("driver_id", d.id),
        ]);
        out.push({ ...d, الاسم: prof?.name ?? "—", رمز_المستخدم: prof?.user_code ?? "—", موقوف: prof?.is_suspended ?? false, عدد_الرحلات: tripsCount ?? 0 });
      }
      return { found: true, drivers: out };
    }

    case "store_lookup": {
      let q = db.from("stores")
        .select("store_code, name, category, city, area, is_open, is_confirmed, commission_rate, delivery_fee, min_order, rating")
        .order("created_at", { ascending: false }).limit(limit);
      if (args?.query) q = q.or(`name.ilike.%${args.query}%,store_code.ilike.%${args.query}%`);
      if (args?.city) q = q.ilike("city", `%${args.city}%`);
      if (args?.only_closed) q = q.eq("is_open", false);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { count: data?.length ?? 0, stores: data ?? [] };
    }

    case "call_center_queue": {
      const fiveMin = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const [stuck, complaints, calls, prospects] = await Promise.all([
        db.from("delivery_orders").select("order_code, status, city, store_name, created_at")
          .is("driver_id", null).in("status", ["pending", "pending_call_center", "ready_for_driver"])
          .lt("created_at", fiveMin).order("created_at").limit(20),
        db.from("complaints").select("complaint_code, category, status, priority, created_at")
          .neq("status", "resolved").order("created_at", { ascending: false }).limit(15),
        db.from("call_sessions").select("call_reference, status, party_type, started_at")
          .in("status", ["ringing", "active"]).limit(15),
        db.from("prospects").select("prospect_code, name, city, call_status, call_priority")
          .eq("call_center_queued", true).is("called_at", null).limit(20),
      ]);
      return {
        طلبات_عالقة: stuck.data ?? [],
        شكاوى_مفتوحة: complaints.data ?? [],
        مكالمات_جارية: calls.data ?? [],
        عملاء_محتملون_للاتصال: prospects.data ?? [],
      };
    }

    case "health_report": {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [errors, cancels, idle] = await Promise.all([
        db.from("analytics_events").select("event_name, properties, created_at")
          .eq("event_type", "error").gte("created_at", since).order("created_at", { ascending: false }).limit(15),
        db.from("delivery_orders").select("order_code, cancel_reason, created_at")
          .eq("status", "cancelled").gte("created_at", since).limit(15),
        db.from("drivers").select("driver_code, status, location_updated_at").eq("status", "active")
          .lt("location_updated_at", new Date(Date.now() - 3600 * 1000).toISOString()).limit(15),
      ]);
      return {
        أخطاء_24_ساعة: errors.data ?? [],
        طلبات_ملغاة_24_ساعة: cancels.data ?? [],
        سائقون_متصلون_بلا_تحديث_موقع: idle.data ?? [],
      };
    }

    default:
      throw new Error(`أداة قراءة غير معروفة: ${name}`);
  }
}

/** وصف مقروء للعملية قبل التأكيد. */
export function describeWrite(name: string, args: any): string {
  const spec = getSpec(name);
  const pairs = Object.entries(args ?? {}).map(([k, v]) => `${k}: ${v}`).join("، ");
  return `${spec?.label ?? name} — ${pairs || "بدون معطيات"}`;
}

/** تنفيذ عملية كتابة — لا تُستدعى إلا من ai-admin-execute بعد الموافقة. */
export async function executeWriteTool(db: any, name: string, args: any): Promise<{ before: any; after: any; summary: string }> {
  const need = (k: string) => {
    const v = args?.[k];
    if (v === undefined || v === null || v === "") throw new Error(`المعطى «${k}» مطلوب`);
    return v;
  };
  const one = async (table: string, col: string, val: any, cols = "*") => {
    const { data, error } = await db.from(table).select(cols).eq(col, val).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`لم يُعثر على السجل (${table}: ${val})`);
    return data as any;
  };

  switch (name) {
    case "set_order_status": {
      const allowed = ["pending", "pending_call_center", "ready_for_driver", "accepted", "picked_up", "delivered", "cancelled"];
      const status = String(need("status"));
      if (!allowed.includes(status)) throw new Error("حالة غير مسموح بها");
      const before = await one("delivery_orders", "order_code", need("order_code"), "id, order_code, status, notes");
      const patch: any = { status };
      if (args?.note) patch.notes = `${before.notes ?? ""}\n[AI] ${args.note}`.trim();
      if (status === "cancelled") patch.cancel_reason = args?.note ?? "إلغاء عبر المساعد الإداري";
      const { data, error } = await db.from("delivery_orders").update(patch).eq("id", before.id).select("order_code, status").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `الطلب ${before.order_code}: ${before.status} → ${status}` };
    }

    case "assign_driver": {
      const order = await one("delivery_orders", "order_code", need("order_code"), "id, order_code, status, driver_id");
      const driver = await one("drivers", "driver_code", need("driver_code"), "id, driver_code, status");
      if (driver.status !== "active") throw new Error("السائق غير نشط");
      const { data, error } = await db.from("delivery_orders")
        .update({ driver_id: driver.id, status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", order.id).select("order_code, status, driver_id").single();
      if (error) throw new Error(error.message);
      return { before: order, after: data, summary: `إسناد الطلب ${order.order_code} إلى السائق ${driver.driver_code}` };
    }

    case "activate_driver": {
      const allowed = ["active", "inactive", "suspended"];
      const status = String(need("status"));
      if (!allowed.includes(status)) throw new Error("حالة غير مسموح بها");
      const before = await one("drivers", "driver_code", need("driver_code"), "id, driver_code, status");
      const { data, error } = await db.from("drivers").update({ status }).eq("id", before.id).select("driver_code, status").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `السائق ${before.driver_code}: ${before.status} → ${status}` };
    }

    case "set_driver_type": {
      const allowed = ["ride", "delivery", "both"];
      const dt = String(need("driver_type"));
      if (!allowed.includes(dt)) throw new Error("نوع غير مسموح به");
      const before = await one("drivers", "driver_code", need("driver_code"), "id, driver_code, driver_type");
      const { data, error } = await db.from("drivers").update({ driver_type: dt }).eq("id", before.id).select("driver_code, driver_type").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `السائق ${before.driver_code}: ${before.driver_type} → ${dt}` };
    }

    case "create_store": {
      const payload: any = {
        name: String(need("name")),
        city: String(need("city")),
        category: args?.category ? String(args.category) : "restaurant",
        address: args?.address ? String(args.address) : null,
        phone: args?.phone ? String(args.phone) : null,
        delivery_fee: Number(args?.delivery_fee ?? 0),
        min_order: Number(args?.min_order ?? 0),
        commission_rate: Number(args?.commission_rate ?? 0.07),
        is_open: false,
        is_confirmed: false,
      };
      const { data, error } = await db.from("stores").insert(payload).select("store_code, name, city, category").single();
      if (error) throw new Error(error.message);
      return { before: null, after: data, summary: `إنشاء المحل ${data.name} (${data.store_code}) — يبقى مغلقاً حتى تأكيده` };
    }

    case "create_menu_item": {
      const store = await one("stores", "store_code", need("store_code"), "id, name, store_code");
      let categoryId: string | null = null;
      if (args?.category_name) {
        const { data: cat } = await db.from("menu_categories").select("id").eq("store_id", store.id).eq("name_ar", args.category_name).maybeSingle();
        if (cat) categoryId = cat.id;
        else {
          const { data: created, error: e2 } = await db.from("menu_categories")
            .insert({ store_id: store.id, name_ar: String(args.category_name), is_active: true }).select("id").single();
          if (e2) throw new Error(e2.message);
          categoryId = created.id;
        }
      }
      const { data, error } = await db.from("menu_items").insert({
        store_id: store.id,
        category_id: categoryId,
        name_ar: String(need("name_ar")),
        description_ar: args?.description_ar ? String(args.description_ar) : null,
        price: Number(need("price")),
        is_available: true,
      }).select("name_ar, price").single();
      if (error) throw new Error(error.message);
      return { before: null, after: data, summary: `إضافة «${data.name_ar}» بسعر ${data.price} إلى ${store.name}` };
    }

    case "update_pricing": {
      const key = String(need("key"));
      const value = String(need("value"));
      const { data: before } = await db.from("app_settings").select("key, value").eq("key", key).maybeSingle();
      const { data, error } = await db.from("app_settings").upsert({ key, value }, { onConflict: "key" }).select("key, value").single();
      if (error) throw new Error(error.message);
      return { before: before ?? null, after: data, summary: `الإعداد ${key}: ${before?.value ?? "—"} → ${value}` };
    }

    case "update_prospect_call": {
      const before = await one("prospects", "prospect_code", need("prospect_code"), "id, prospect_code, name, call_status");
      const patch: any = { call_status: String(need("call_status")), called_at: new Date().toISOString() };
      if (args?.call_notes) patch.call_notes = String(args.call_notes);
      const { data, error } = await db.from("prospects").update(patch).eq("id", before.id).select("prospect_code, call_status").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `العميل المحتمل ${before.name}: ${before.call_status ?? "—"} → ${patch.call_status}` };
    }

    case "create_notification": {
      const prof = await one("profiles", "user_code", need("user_code"), "id, name, user_code");
      const { data, error } = await db.from("notifications").insert({
        user_id: prof.id,
        message: String(need("message")),
        type: args?.type ? String(args.type) : "admin",
      }).select("id, message").single();
      if (error) throw new Error(error.message);
      return { before: null, after: data, summary: `إشعار إلى ${prof.name} (${prof.user_code})` };
    }

    default:
      throw new Error(`أداة كتابة غير معروفة: ${name}`);
  }
}
