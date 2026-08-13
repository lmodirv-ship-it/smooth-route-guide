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

  // ───────────── قراءة موسّعة ─────────────
  {
    name: "user_lookup",
    kind: "read",
    label: "بحث مستخدم",
    risk: "low",
    description: "بحث عن مستخدم بالاسم أو الهاتف أو رمز المستخدم، مع أدواره وحالته ورصيد محفظته ونجومه.",
    parameters: obj({ query: str("الاسم أو الهاتف أو رمز المستخدم"), limit: num("عدد النتائج") }, ["query"]),
  },
  {
    name: "wallet_report",
    kind: "read",
    label: "تقرير المحفظة",
    risk: "low",
    description: "طلبات الشحن المعلّقة، آخر حركات المحفظة، وإجمالي الأرصدة.",
    parameters: obj({ limit: num("عدد النتائج") }),
  },
  {
    name: "finance_report",
    kind: "read",
    label: "تقرير مالي شامل",
    risk: "low",
    description: "الاشتراكات النشطة (سائقين وعملاء)، المدفوعات، عمولات المنصة، والنجوم الممنوحة.",
    parameters: obj({ days: num("عدد الأيام (افتراضي 30)") }),
  },
  {
    name: "support_queue",
    kind: "read",
    label: "طابور الدعم",
    risk: "low",
    description: "الشكاوى والتذاكر المفتوحة مرتبة من الأقدم إلى الأحدث.",
    parameters: obj({ limit: num("عدد النتائج") }),
  },
  {
    name: "marketing_report",
    kind: "read",
    label: "تقرير التسويق",
    risk: "low",
    description: "الكوبونات النشطة واستعمالها، الإعلانات الظاهرة، وأداء الإحالات.",
    parameters: obj({ limit: num("عدد النتائج") }),
  },
  {
    name: "content_audit",
    kind: "read",
    label: "جرد المحتوى",
    risk: "low",
    description: "الصفحات الديناميكية والمقالات وحالة النشر، وعدد الترجمات لكل لغة.",
    parameters: obj({ limit: num("عدد النتائج") }),
  },

  // ───────────── كتابة موسّعة ─────────────
  {
    name: "set_user_suspended",
    kind: "write",
    label: "إيقاف/تفعيل حساب مستخدم",
    risk: "high",
    description: "تعليق حساب مستخدم أو رفع التعليق عنه.",
    parameters: obj({
      user_code: str("رمز المستخدم"),
      suspended: { type: "boolean", description: "true للإيقاف، false للتفعيل" },
    }, ["user_code", "suspended"]),
  },
  {
    name: "set_user_role",
    kind: "write",
    label: "تغيير دور مستخدم",
    risk: "high",
    description: "إسناد دور واحد لمستخدم (يُستبدل دوره الحالي لغير المسؤولين). الأدوار: moderator, agent, driver, delivery, store_owner, user.",
    parameters: obj({
      user_code: str("رمز المستخدم"),
      role: str("الدور الجديد: moderator, agent, driver, delivery, store_owner, user"),
    }, ["user_code", "role"]),
  },
  {
    name: "credit_wallet_tool",
    kind: "write",
    label: "شحن محفظة مستخدم",
    risk: "high",
    description: "إضافة رصيد إلى محفظة مستخدم مع تسجيل الحركة.",
    parameters: obj({
      user_code: str("رمز المستخدم"),
      amount: num("المبلغ بالدرهم (> 0)"),
      description: str("سبب الشحن"),
    }, ["user_code", "amount"]),
  },
  {
    name: "approve_wallet_recharge_tool",
    kind: "write",
    label: "اعتماد طلب شحن",
    risk: "high",
    description: "اعتماد أو رفض طلب شحن محفظة معلّق؛ عند الاعتماد يُضاف المبلغ للرصيد.",
    parameters: obj({
      request_id: str("معرّف طلب الشحن"),
      approve: { type: "boolean", description: "true للاعتماد، false للرفض" },
      note: str("ملاحظة اختيارية"),
    }, ["request_id", "approve"]),
  },
  {
    name: "grant_reward_stars",
    kind: "write",
    label: "منح نجوم مكافأة",
    risk: "medium",
    description: "منح أو خصم نجوم مكافأة لمستخدم مع تسجيل السبب في السجلّ.",
    parameters: obj({
      user_code: str("رمز المستخدم"),
      stars: num("عدد النجوم (سالب للخصم)"),
      reason: str("سبب المنح"),
    }, ["user_code", "stars"]),
  },
  {
    name: "create_coupon",
    kind: "write",
    label: "إنشاء كوبون",
    risk: "medium",
    description: "إنشاء كوبون تخفيض جديد (نسبة أو مبلغ ثابت) مع صلاحية وحدود استعمال.",
    parameters: obj({
      code: str("رمز الكوبون"),
      discount_type: str("percent أو fixed"),
      discount_value: num("قيمة التخفيض"),
      max_discount: num("سقف التخفيض بالدرهم"),
      min_order_amount: num("الحد الأدنى للطلب"),
      max_uses: num("أقصى عدد استعمالات إجمالي"),
      max_uses_per_user: num("أقصى عدد استعمالات لكل مستخدم"),
      days_valid: num("عدد أيام الصلاحية (افتراضي 30)"),
      applies_to: str("all أو delivery أو ride"),
      description: str("وصف الكوبون"),
    }, ["code", "discount_type", "discount_value"]),
  },
  {
    name: "set_coupon_active",
    kind: "write",
    label: "تفعيل/تعطيل كوبون",
    risk: "medium",
    description: "تفعيل كوبون أو تعطيله.",
    parameters: obj({ code: str("رمز الكوبون"), active: { type: "boolean", description: "مفعّل أم لا" } }, ["code", "active"]),
  },
  {
    name: "create_ad",
    kind: "write",
    label: "إنشاء إعلان",
    risk: "medium",
    description: "إضافة صندوق إعلاني جديد في الصفحة الرئيسية (نص أو صورة).",
    parameters: obj({
      title: str("عنوان الإعلان"),
      content_type: str("text أو image"),
      content_text: str("نص الإعلان"),
      image_url: str("رابط الصورة"),
      link_url: str("رابط عند الضغط"),
      slot_number: num("رقم الخانة (1-6)"),
      days_valid: num("عدد أيام العرض"),
      active: { type: "boolean", description: "يبدأ مفعّلاً أم لا (افتراضي لا)" },
    }, ["title"]),
  },
  {
    name: "set_ad_active",
    kind: "write",
    label: "تفعيل/إيقاف إعلان",
    risk: "medium",
    description: "تفعيل إعلان أو إيقافه بالعنوان.",
    parameters: obj({ title: str("عنوان الإعلان"), active: { type: "boolean", description: "مفعّل أم لا" } }, ["title", "active"]),
  },
  {
    name: "update_app_setting",
    kind: "write",
    label: "تعديل إعداد المنصة",
    risk: "high",
    description: "تعديل قيمة إعداد من إعدادات المنصة المسموح بها (تسعير، عمولة، نصف قطر الإرسال، فترة مجانية…).",
    parameters: obj({ key: str("مفتاح الإعداد"), value: str("القيمة الجديدة (رقم أو نص أو JSON)") }, ["key", "value"]),
  },
  {
    name: "upsert_translation",
    kind: "write",
    label: "إضافة/تعديل ترجمة",
    risk: "low",
    description: "إضافة مفتاح ترجمة أو تعديل قيمته للغة معيّنة.",
    parameters: obj({
      locale: str("اللغة: ar, fr, en, es"),
      key: str("مفتاح الترجمة"),
      value: str("النص المترجم"),
      namespace: str("المجال (افتراضي common)"),
    }, ["locale", "key", "value"]),
  },
  {
    name: "set_complaint_status",
    kind: "write",
    label: "تحديث شكوى",
    risk: "medium",
    description: "تغيير حالة شكوى وإضافة ملاحظة الوكيل.",
    parameters: obj({
      complaint_code: str("رمز الشكوى"),
      status: str("open, in_progress, resolved, closed"),
      note: str("ملاحظة"),
    }, ["complaint_code", "status"]),
  },
  {
    name: "set_ticket_status",
    kind: "write",
    label: "تحديث تذكرة دعم",
    risk: "medium",
    description: "تغيير حالة أو أولوية تذكرة دعم.",
    parameters: obj({
      ticket_code: str("رمز التذكرة"),
      status: str("open, in_progress, resolved, closed"),
      priority: str("low, normal, high, urgent"),
    }, ["ticket_code"]),
  },
  {
    name: "extend_subscription",
    kind: "write",
    label: "تمديد اشتراك",
    risk: "medium",
    description: "تمديد اشتراك سائق أو عميل بعدد أيام محدّد وتفعيله.",
    parameters: obj({
      target: str("driver أو customer"),
      code: str("رمز السائق أو رمز المستخدم"),
      days: num("عدد أيام التمديد"),
    }, ["target", "code", "days"]),
  },
  {
    name: "broadcast_notification",
    kind: "write",
    label: "إشعار جماعي",
    risk: "medium",
    description: "إرسال إشعار لشريحة من المستخدمين (حسب الدور و/أو المدينة) بحدّ أقصى 500 مستلم.",
    parameters: obj({
      message: str("نص الإشعار"),
      role: str("الدور المستهدف: user, driver, delivery, store_owner, agent (اتركه فارغاً للجميع)"),
      city: str("المدينة (اختياري)"),
      limit: num("أقصى عدد مستلمين (حتى 500)"),
    }, ["message"]),
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

    // ───────────── تقارير ─────────────
    case "revenue_report": {
      const days = clamp(args?.days, 7, 90);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [orders, trips, revenue] = await Promise.all([
        db.from("delivery_orders").select("total_price, delivery_fee, status, created_at").gte("created_at", since),
        db.from("trips").select("fare, status, created_at").gte("created_at", since),
        db.from("platform_revenue").select("amount, source, created_at").gte("created_at", since),
      ]);
      const o = orders.data ?? [], t = trips.data ?? [], rev = revenue.data ?? [];
      const byDay: Record<string, any> = {};
      const bucket = (d: string) => (byDay[d] ??= { اليوم: d, توصيل: 0, رحلات: 0, عمولات: 0, عدد_الطلبات: 0 });
      for (const x of o) { const b = bucket(String(x.created_at).slice(0, 10)); b.توصيل += Number(x.total_price ?? 0); b.عدد_الطلبات += 1; }
      for (const x of t) { const b = bucket(String(x.created_at).slice(0, 10)); b.رحلات += Number(x.fare ?? 0); }
      for (const x of rev) { const b = bucket(String(x.created_at).slice(0, 10)); b.عمولات += Number(x.amount ?? 0); }
      const rows = Object.values(byDay).sort((a: any, b: any) => a.اليوم.localeCompare(b.اليوم));
      const sum = (k: string) => rows.reduce((a: number, x: any) => a + Number(x[k] ?? 0), 0);
      return {
        المدة_بالأيام: days,
        إجمالي_التوصيل: sum("توصيل"),
        إجمالي_الرحلات: sum("رحلات"),
        إجمالي_العمولات: sum("عمولات"),
        عدد_الطلبات: o.length,
        التفصيل_اليومي: rows,
      };
    }

    case "orders_report": {
      const days = clamp(args?.days, 7, 90);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      let q = db.from("delivery_orders").select("status, city, total_price, created_at").gte("created_at", since);
      if (args?.city) q = q.ilike("city", `%${args.city}%`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      const byStatus: Record<string, number> = {}, byCity: Record<string, number> = {};
      let total = 0;
      for (const x of rows) {
        byStatus[x.status ?? "—"] = (byStatus[x.status ?? "—"] ?? 0) + 1;
        byCity[x.city ?? "—"] = (byCity[x.city ?? "—"] ?? 0) + 1;
        total += Number(x.total_price ?? 0);
      }
      return {
        المدة_بالأيام: days,
        عدد_الطلبات: rows.length,
        متوسط_قيمة_الطلب: rows.length ? Math.round((total / rows.length) * 100) / 100 : 0,
        حسب_الحالة: byStatus,
        حسب_المدينة: byCity,
      };
    }

    case "driver_performance": {
      const days = clamp(args?.days, 30, 180);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [{ data: drivers }, { data: trips }, { data: orders }] = await Promise.all([
        db.from("drivers").select("id, driver_code, status, driver_type, rating, user_id").limit(500),
        db.from("trips").select("driver_id, status, fare, created_at").gte("created_at", since),
        db.from("delivery_orders").select("driver_id, status, total_price, created_at").gte("created_at", since),
      ]);
      const stats = (drivers ?? []).map((d: any) => {
        const dt = (trips ?? []).filter((x: any) => x.driver_id === d.id);
        const dOrders = (orders ?? []).filter((x: any) => x.driver_id === d.id);
        return {
          رمز_السائق: d.driver_code,
          الحالة: d.status,
          النوع: d.driver_type,
          التقييم: d.rating,
          رحلات_منجزة: dt.filter((x: any) => x.status === "completed").length,
          طلبات_منجزة: dOrders.filter((x: any) => x.status === "delivered").length,
          مداخيل: dt.reduce((a: number, x: any) => a + Number(x.fare ?? 0), 0) + dOrders.reduce((a: number, x: any) => a + Number(x.total_price ?? 0), 0),
        };
      }).sort((a: any, b: any) => (b.رحلات_منجزة + b.طلبات_منجزة) - (a.رحلات_منجزة + a.طلبات_منجزة));
      return { المدة_بالأيام: days, السائقون: stats.slice(0, clamp(args?.limit, 15, 50)) };
    }

    case "growth_report": {
      const days = clamp(args?.days, 30, 180);
      const now = Date.now();
      const start = new Date(now - days * 86400000).toISOString();
      const prevStart = new Date(now - 2 * days * 86400000).toISOString();
      const countIn = async (table: string, from: string, to?: string) => {
        let q = db.from(table).select("id", { count: "exact", head: true }).gte("created_at", from);
        if (to) q = q.lt("created_at", to);
        const { count } = await q;
        return count ?? 0;
      };
      const tables = ["profiles", "drivers", "stores", "delivery_orders", "ride_requests"];
      const out: Record<string, any> = {};
      for (const tb of tables) {
        const cur = await countIn(tb, start);
        const prev = await countIn(tb, prevStart, start);
        out[tb] = { الحالية: cur, السابقة: prev, النمو: prev ? `${Math.round(((cur - prev) / prev) * 100)}%` : (cur ? "جديد" : "0%") };
      }
      return { المدة_بالأيام: days, المقارنة: out };
    }

    // ───────────── مراقبة ─────────────
    case "system_alerts": {
      const [alerts, health] = await Promise.all([
        db.from("alerts").select("type, message, status, created_at").order("created_at", { ascending: false }).limit(limit),
        db.from("system_health_logs").select("check_name, category, status, message, created_at")
          .neq("status", "ok").order("created_at", { ascending: false }).limit(limit),
      ]);
      return { تنبيهات: alerts.data ?? [], فحوص_غير_سليمة: health.data ?? [] };
    }

    case "client_errors": {
      const hours = clamp(args?.hours, 24, 720);
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      const { data, error } = await db.from("analytics_events")
        .select("event_name, page_path, properties, created_at")
        .eq("event_type", "error").gte("created_at", since)
        .order("created_at", { ascending: false }).limit(clamp(args?.limit, 20, 100));
      if (error) throw new Error(error.message);
      const grouped: Record<string, number> = {};
      for (const x of data ?? []) grouped[x.event_name ?? "—"] = (grouped[x.event_name ?? "—"] ?? 0) + 1;
      return { المدة_بالساعات: hours, حسب_النوع: grouped, أخطاء: data ?? [] };
    }

    case "pending_actions": {
      const [recharges, complaints, candidates, stores] = await Promise.all([
        db.from("wallet_recharge_requests").select("id, amount, status, created_at").eq("status", "pending").limit(20),
        db.from("complaints").select("complaint_code, category, priority, created_at").neq("status", "resolved").limit(20),
        db.from("driver_candidates").select("id, status, created_at").eq("status", "pending").limit(20),
        db.from("stores").select("store_code, name, city").eq("is_confirmed", false).limit(20),
      ]);
      return {
        شحن_محفظة_معلّق: recharges.data ?? [],
        شكاوى_مفتوحة: complaints.data ?? [],
        ترشيحات_سائقين: candidates.data ?? [],
        محلات_غير_مؤكدة: stores.data ?? [],
      };
    }

    case "user_lookup": {
      const term = String(args?.query ?? "").trim();
      const { data: profs } = await db.from("profiles")
        .select("id, name, phone, user_code, city, country, is_suspended, is_confirmed, avg_rating, created_at")
        .or(`name.ilike.%${term}%,phone.ilike.%${term}%,user_code.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(Math.min(limit, 10));
      if (!profs?.length) return { found: false, message: "لم يُعثر على مستخدم مطابق" };
      const out = [];
      for (const p of profs) {
        const [{ data: roles }, { data: w }, { data: stars }] = await Promise.all([
          db.from("user_roles").select("role").eq("user_id", p.id),
          db.from("wallet").select("balance").eq("user_id", p.id).maybeSingle(),
          db.from("reward_stars").select("stars, level").eq("user_id", p.id).maybeSingle(),
        ]);
        out.push({
          ...p,
          الأدوار: (roles ?? []).map((r: any) => r.role),
          رصيد_المحفظة: Number(w?.balance ?? 0),
          النجوم: stars?.stars ?? 0,
          المستوى: stars?.level ?? "—",
        });
      }
      return { found: true, count: out.length, users: out };
    }

    case "wallet_report": {
      const [pending, txs, wallets] = await Promise.all([
        db.from("wallet_recharge_requests").select("id, user_id, amount, status, notes, created_at")
          .eq("status", "pending").order("created_at", { ascending: true }).limit(limit),
        db.from("wallet_transactions").select("user_id, amount, transaction_type, description, balance_after, created_at")
          .order("created_at", { ascending: false }).limit(limit),
        db.from("wallet").select("balance"),
      ]);
      const total = (wallets.data ?? []).reduce((a: number, x: any) => a + Number(x.balance ?? 0), 0);
      return {
        طلبات_شحن_معلّقة: pending.data ?? [],
        عدد_المحافظ: (wallets.data ?? []).length,
        إجمالي_الأرصدة: total,
        آخر_الحركات: txs.data ?? [],
      };
    }

    case "finance_report": {
      const days = clamp(args?.days, 30, 365);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [dsub, csub, pays, rev, stars] = await Promise.all([
        db.from("driver_subscriptions").select("status, amount_paid, expires_at").eq("status", "active"),
        db.from("customer_subscriptions").select("status, amount_paid, credits_remaining, expires_at").eq("status", "active"),
        db.from("payments").select("amount, method, status, created_at").gte("created_at", since),
        db.from("platform_revenue").select("amount, source, created_at").gte("created_at", since),
        db.from("star_history").select("stars_change, created_at").gte("created_at", since),
      ]);
      const sum = (rows: any[], k: string) => rows.reduce((a, x) => a + Number(x[k] ?? 0), 0);
      return {
        المدة_بالأيام: days,
        اشتراكات_سائقين_نشطة: (dsub.data ?? []).length,
        اشتراكات_عملاء_نشطة: (csub.data ?? []).length,
        مداخيل_الاشتراكات: sum(dsub.data ?? [], "amount_paid") + sum(csub.data ?? [], "amount_paid"),
        عدد_المدفوعات: (pays.data ?? []).length,
        مجموع_المدفوعات: sum(pays.data ?? [], "amount"),
        عمولات_المنصة: sum(rev.data ?? [], "amount"),
        نجوم_ممنوحة: sum(stars.data ?? [], "stars_change"),
      };
    }

    case "support_queue": {
      const [complaints, tickets] = await Promise.all([
        db.from("complaints").select("complaint_code, category, description, status, priority, created_at")
          .not("status", "in", "(resolved,closed)").order("created_at", { ascending: true }).limit(limit),
        db.from("tickets").select("ticket_code, title, category, status, priority, created_at")
          .not("status", "in", "(resolved,closed)").order("created_at", { ascending: true }).limit(limit),
      ]);
      return {
        شكاوى_مفتوحة: complaints.data ?? [],
        تذاكر_مفتوحة: tickets.data ?? [],
      };
    }

    case "marketing_report": {
      const [coupons, ads, refs] = await Promise.all([
        db.from("coupons").select("code, discount_type, discount_value, is_active, current_uses, max_uses, expires_at")
          .order("created_at", { ascending: false }).limit(limit),
        db.from("ads").select("title, slot_number, content_type, is_active, start_date, end_date")
          .order("slot_number").limit(limit),
        db.from("referrals").select("status, reward_given, reward_amount, created_at").limit(500),
      ]);
      const r = refs.data ?? [];
      return {
        الكوبونات: coupons.data ?? [],
        الإعلانات: ads.data ?? [],
        الإحالات: {
          الإجمالي: r.length,
          مكتملة: r.filter((x: any) => x.status === "completed").length,
          مكافآت_مدفوعة: r.filter((x: any) => x.reward_given).length,
        },
      };
    }

    case "content_audit": {
      const [pages, posts, trans] = await Promise.all([
        db.from("dynamic_pages").select("slug, title, is_published, updated_at").order("updated_at", { ascending: false }).limit(limit),
        db.from("blog_posts").select("slug, title, published, language, created_at").order("created_at", { ascending: false }).limit(limit),
        db.from("platform_translations").select("locale"),
      ]);
      const byLocale: Record<string, number> = {};
      for (const t of trans.data ?? []) byLocale[t.locale] = (byLocale[t.locale] ?? 0) + 1;
      return {
        الصفحات: pages.data ?? [],
        المقالات: posts.data ?? [],
        الترجمات_حسب_اللغة: byLocale,
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
/** مفاتيح الإعدادات المسموح للمساعد بتعديلها فقط. */
export const ALLOWED_SETTING_KEYS = [
  "pricing", "delivery_pricing", "order_commission_percentage", "geo_settings",
  "free_period", "notifications", "general", "ui_visibility", "supported_languages",
  "default_language", "enable_language_switcher", "branding_settings", "active_theme",
];

/** شحن محفظة مباشرةً بصلاحية الخدمة (دوال قاعدة البيانات تتطلب جلسة مستخدم). */
async function creditWallet(db: any, userId: string, amount: number, description: string, type = "topup", referenceId?: string) {
  let { data: w } = await db.from("wallet").select("id, balance").eq("user_id", userId).maybeSingle();
  if (!w) {
    const { data: created, error } = await db.from("wallet").insert({ user_id: userId, balance: 0 }).select("id, balance").single();
    if (error) throw new Error(error.message);
    w = created;
  }
  const newBalance = Number(w.balance ?? 0) + amount;
  const { error: uErr } = await db.from("wallet").update({ balance: newBalance, updated_at: new Date().toISOString() }).eq("id", w.id);
  if (uErr) throw new Error(uErr.message);
  const { error: tErr } = await db.from("wallet_transactions").insert({
    wallet_id: w.id, user_id: userId, amount, balance_after: newBalance,
    transaction_type: type, description, reference_id: referenceId ?? null,
  });
  if (tErr) throw new Error(tErr.message);
  return newBalance;
}

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

    // ───────────── محتوى ─────────────
    case "create_blog_post": {
      const title = String(need("title"));
      const slug = String(args?.slug || title).trim().toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `post-${Date.now()}`;
      const publish = args?.publish === true;
      const payload: any = {
        slug,
        title,
        content: String(need("content")),
        excerpt: args?.excerpt ? String(args.excerpt) : null,
        category: args?.category ? String(args.category) : "general",
        language: args?.language ? String(args.language) : "ar",
        meta_title: title.slice(0, 60),
        meta_description: args?.meta_description ? String(args.meta_description).slice(0, 160) : null,
        published: publish,
        published_at: publish ? new Date().toISOString() : null,
      };
      const { data, error } = await db.from("blog_posts").insert(payload).select("slug, title, published").single();
      if (error) throw new Error(error.message);
      return { before: null, after: data, summary: `مقال «${data.title}» (${data.slug}) — ${data.published ? "منشور" : "مسودة"}` };
    }

    case "update_blog_post": {
      const before = await one("blog_posts", "slug", need("slug"), "id, slug, title, published");
      const patch: any = {};
      for (const k of ["title", "content", "excerpt", "category", "meta_description"]) {
        if (args?.[k] !== undefined && args[k] !== null && args[k] !== "") patch[k] = String(args[k]);
      }
      if (!Object.keys(patch).length) throw new Error("لا يوجد أي حقل للتعديل");
      const { data, error } = await db.from("blog_posts").update(patch).eq("id", before.id).select("slug, title, published").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `تعديل المقال ${before.slug} (${Object.keys(patch).join("، ")})` };
    }

    case "set_blog_post_published": {
      const published = args?.published === true || args?.published === "true";
      const before = await one("blog_posts", "slug", need("slug"), "id, slug, title, published");
      const { data, error } = await db.from("blog_posts")
        .update({ published, published_at: published ? new Date().toISOString() : null })
        .eq("id", before.id).select("slug, title, published").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `المقال ${before.slug}: ${published ? "نُشر" : "أُعيد إلى مسودة"}` };
    }

    case "create_page": {
      const slug = String(need("slug")).trim().toLowerCase().replace(/^\/+/, "");
      const publish = args?.publish === true;
      const { data, error } = await db.from("dynamic_pages").insert({
        slug,
        title: String(need("title")),
        page_type: args?.page_type ? String(args.page_type) : "static",
        content: { body: String(need("body")) },
        meta_description: args?.meta_description ? String(args.meta_description).slice(0, 160) : null,
        is_published: publish,
      }).select("slug, title, is_published").single();
      if (error) throw new Error(error.message);
      return { before: null, after: data, summary: `صفحة «${data.title}» (/${data.slug}) — ${data.is_published ? "منشورة" : "غير منشورة"}` };
    }

    case "update_page": {
      const before = await one("dynamic_pages", "slug", need("slug"), "id, slug, title, content, is_published");
      const patch: any = {};
      if (args?.title) patch.title = String(args.title);
      if (args?.meta_description) patch.meta_description = String(args.meta_description).slice(0, 160);
      if (args?.body) patch.content = { ...(before.content ?? {}), body: String(args.body) };
      if (!Object.keys(patch).length) throw new Error("لا يوجد أي حقل للتعديل");
      const { data, error } = await db.from("dynamic_pages").update(patch).eq("id", before.id).select("slug, title, is_published").single();
      if (error) throw new Error(error.message);
      return { before: { slug: before.slug, title: before.title }, after: data, summary: `تعديل الصفحة /${before.slug}` };
    }

    case "set_page_published": {
      const published = args?.published === true || args?.published === "true";
      const before = await one("dynamic_pages", "slug", need("slug"), "id, slug, title, is_published");
      const { data, error } = await db.from("dynamic_pages").update({ is_published: published })
        .eq("id", before.id).select("slug, title, is_published").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `الصفحة /${before.slug}: ${published ? "نُشرت" : "أُخفيت"}` };
    }

    // ───────────── مستخدمون ومحفظة ─────────────
    case "set_user_suspended": {
      const suspended = args?.suspended === true || args?.suspended === "true";
      const before = await one("profiles", "user_code", need("user_code"), "id, name, user_code, is_suspended");
      const { data, error } = await db.from("profiles").update({ is_suspended: suspended })
        .eq("id", before.id).select("user_code, name, is_suspended").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `${before.name} (${before.user_code}): ${suspended ? "تم إيقاف الحساب" : "تم تفعيل الحساب"}` };
    }

    case "set_user_role": {
      const allowed = ["moderator", "agent", "driver", "delivery", "store_owner", "user"];
      const role = String(need("role"));
      if (!allowed.includes(role)) throw new Error("دور غير مسموح به عبر المساعد (دور admin يُدار يدوياً فقط)");
      const prof = await one("profiles", "user_code", need("user_code"), "id, name, user_code");
      const { data: current } = await db.from("user_roles").select("id, role").eq("user_id", prof.id);
      const roles = (current ?? []).map((r: any) => r.role);
      if (roles.includes("admin")) throw new Error("لا يمكن تعديل أدوار حساب مسؤول عبر المساعد");
      if (roles.includes(role)) throw new Error(`المستخدم يحمل الدور ${role} أصلاً`);
      const { error: delErr } = await db.from("user_roles").delete().eq("user_id", prof.id);
      if (delErr) throw new Error(delErr.message);
      const { data, error } = await db.from("user_roles").insert({ user_id: prof.id, role }).select("role").single();
      if (error) throw new Error(error.message);
      return { before: { user_code: prof.user_code, roles }, after: data, summary: `${prof.name} (${prof.user_code}): ${roles.join("، ") || "—"} → ${role}` };
    }

    case "credit_wallet_tool": {
      const amount = Number(need("amount"));
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");
      const prof = await one("profiles", "user_code", need("user_code"), "id, name, user_code");
      const newBalance = await creditWallet(db, prof.id, amount, args?.description ? String(args.description) : "شحن عبر المساعد الإداري", "topup");
      return {
        before: { user_code: prof.user_code, balance: newBalance - amount },
        after: { user_code: prof.user_code, balance: newBalance },
        summary: `شحن ${amount} درهم لمحفظة ${prof.name} (${prof.user_code}) — الرصيد الجديد ${newBalance}`,
      };
    }

    case "approve_wallet_recharge_tool": {
      const approve = args?.approve === true || args?.approve === "true";
      const req = await one("wallet_recharge_requests", "id", need("request_id"), "id, user_id, amount, status, notes");
      if (req.status !== "pending") throw new Error("طلب الشحن ليس معلّقاً");
      const patch: any = { status: approve ? "approved" : "rejected", handler_role: "admin", updated_at: new Date().toISOString() };
      if (args?.note) patch.notes = `${req.notes ?? ""}\n[AI] ${args.note}`.trim();
      const { data, error } = await db.from("wallet_recharge_requests").update(patch).eq("id", req.id)
        .select("id, amount, status").single();
      if (error) throw new Error(error.message);
      let balance: number | null = null;
      if (approve) balance = await creditWallet(db, req.user_id, Number(req.amount), "اعتماد طلب شحن المحفظة", "topup", req.id);
      return { before: req, after: { ...data, balance }, summary: approve ? `اعتماد شحن ${req.amount} درهم — الرصيد الجديد ${balance}` : `رفض طلب شحن ${req.amount} درهم` };
    }

    case "grant_reward_stars": {
      const delta = Math.trunc(Number(need("stars")));
      if (!Number.isFinite(delta) || delta === 0) throw new Error("عدد النجوم يجب أن يكون رقماً غير صفري");
      const prof = await one("profiles", "user_code", need("user_code"), "id, name, user_code");
      const { data: row } = await db.from("reward_stars").select("id, stars, total_earned, level").eq("user_id", prof.id).maybeSingle();
      const currentStars = Number(row?.stars ?? 0);
      const nextStars = Math.max(0, currentStars + delta);
      const totalEarned = Number(row?.total_earned ?? 0) + Math.max(0, delta);
      const level = nextStars >= 500 ? "platinum" : nextStars >= 200 ? "gold" : nextStars >= 50 ? "silver" : "bronze";
      let after: any;
      if (row) {
        const { data, error } = await db.from("reward_stars")
          .update({ stars: nextStars, total_earned: totalEarned, level, updated_at: new Date().toISOString() })
          .eq("id", row.id).select("stars, total_earned, level").single();
        if (error) throw new Error(error.message);
        after = data;
      } else {
        const { data, error } = await db.from("reward_stars")
          .insert({ user_id: prof.id, stars: nextStars, total_earned: totalEarned, level })
          .select("stars, total_earned, level").single();
        if (error) throw new Error(error.message);
        after = data;
      }
      await db.from("star_history").insert({
        user_id: prof.id, stars_change: delta,
        reason: args?.reason ? String(args.reason) : "منح عبر المساعد الإداري",
      });
      return { before: row ?? { stars: 0 }, after, summary: `${prof.name} (${prof.user_code}): ${currentStars} → ${nextStars} نجمة` };
    }

    // ───────────── تسويق ─────────────
    case "create_coupon": {
      const type = String(need("discount_type"));
      if (!["percent", "fixed"].includes(type)) throw new Error("نوع التخفيض يجب أن يكون percent أو fixed");
      const value = Number(need("discount_value"));
      if (!Number.isFinite(value) || value <= 0) throw new Error("قيمة التخفيض غير صالحة");
      if (type === "percent" && value > 100) throw new Error("نسبة التخفيض لا تتجاوز 100");
      const days = Number(args?.days_valid ?? 30);
      const payload: any = {
        code: String(need("code")).trim().toUpperCase(),
        discount_type: type,
        discount_value: value,
        max_discount: args?.max_discount != null ? Number(args.max_discount) : null,
        min_order_amount: Number(args?.min_order_amount ?? 0),
        max_uses: args?.max_uses != null ? Math.trunc(Number(args.max_uses)) : null,
        max_uses_per_user: args?.max_uses_per_user != null ? Math.trunc(Number(args.max_uses_per_user)) : null,
        applies_to: args?.applies_to ? String(args.applies_to) : "all",
        description: args?.description ? String(args.description) : null,
        expires_at: new Date(Date.now() + (Number.isFinite(days) && days > 0 ? days : 30) * 86400000).toISOString(),
        is_active: true,
      };
      const { data, error } = await db.from("coupons").insert(payload).select("code, discount_type, discount_value, expires_at, is_active").single();
      if (error) throw new Error(error.message);
      return { before: null, after: data, summary: `كوبون ${data.code}: ${value}${type === "percent" ? "%" : " درهم"} حتى ${String(data.expires_at).slice(0, 10)}` };
    }

    case "set_coupon_active": {
      const active = args?.active === true || args?.active === "true";
      const before = await one("coupons", "code", String(need("code")).trim().toUpperCase(), "id, code, is_active");
      const { data, error } = await db.from("coupons").update({ is_active: active }).eq("id", before.id)
        .select("code, is_active").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `الكوبون ${before.code}: ${active ? "مفعّل" : "معطّل"}` };
    }

    case "create_ad": {
      const days = Number(args?.days_valid ?? 0);
      const payload: any = {
        title: String(need("title")),
        content_type: args?.content_type ? String(args.content_type) : (args?.image_url ? "image" : "text"),
        content_text: args?.content_text ? String(args.content_text) : null,
        image_url: args?.image_url ? String(args.image_url) : null,
        link_url: args?.link_url ? String(args.link_url) : null,
        slot_number: args?.slot_number != null ? Math.trunc(Number(args.slot_number)) : 1,
        is_active: args?.active === true || args?.active === "true",
        start_date: new Date().toISOString(),
        end_date: Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null,
      };
      const { data, error } = await db.from("ads").insert(payload).select("title, slot_number, content_type, is_active").single();
      if (error) throw new Error(error.message);
      return { before: null, after: data, summary: `إعلان «${data.title}» في الخانة ${data.slot_number} — ${data.is_active ? "مفعّل" : "غير مفعّل"}` };
    }

    case "set_ad_active": {
      const active = args?.active === true || args?.active === "true";
      const before = await one("ads", "title", need("title"), "id, title, is_active");
      const { data, error } = await db.from("ads").update({ is_active: active }).eq("id", before.id)
        .select("title, is_active").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `الإعلان «${before.title}»: ${active ? "مفعّل" : "موقوف"}` };
    }

    // ───────────── إعدادات ومحتوى ─────────────
    case "update_app_setting": {
      const key = String(need("key"));
      if (!ALLOWED_SETTING_KEYS.includes(key)) {
        throw new Error(`المفتاح «${key}» غير مسموح به. المفاتيح المسموحة: ${ALLOWED_SETTING_KEYS.join("، ")}`);
      }
      const raw = String(need("value"));
      let value: any;
      try { value = JSON.parse(raw); } catch { value = raw; }
      const { data: before } = await db.from("app_settings").select("key, value").eq("key", key).maybeSingle();
      const { data, error } = await db.from("app_settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
        .select("key, value").single();
      if (error) throw new Error(error.message);
      return { before: before ?? null, after: data, summary: `الإعداد ${key}: ${JSON.stringify(before?.value ?? null)} → ${JSON.stringify(value)}` };
    }

    case "upsert_translation": {
      const locale = String(need("locale"));
      if (!["ar", "fr", "en", "es"].includes(locale)) throw new Error("لغة غير مدعومة");
      const key = String(need("key"));
      const namespace = args?.namespace ? String(args.namespace) : "common";
      const { data: before } = await db.from("platform_translations")
        .select("id, value").eq("locale", locale).eq("namespace", namespace).eq("key", key).maybeSingle();
      const value = String(need("value"));
      let after: any;
      if (before) {
        const { data, error } = await db.from("platform_translations")
          .update({ value, updated_at: new Date().toISOString() }).eq("id", before.id).select("locale, namespace, key, value").single();
        if (error) throw new Error(error.message);
        after = data;
      } else {
        const { data, error } = await db.from("platform_translations")
          .insert({ locale, namespace, key, value }).select("locale, namespace, key, value").single();
        if (error) throw new Error(error.message);
        after = data;
      }
      return { before: before ?? null, after, summary: `ترجمة ${locale}/${namespace}/${key} = «${value}»` };
    }

    // ───────────── دعم واشتراكات ─────────────
    case "set_complaint_status": {
      const allowed = ["open", "in_progress", "resolved", "closed"];
      const status = String(need("status"));
      if (!allowed.includes(status)) throw new Error("حالة غير مسموح بها");
      const before = await one("complaints", "complaint_code", need("complaint_code"), "id, complaint_code, status, agent_notes");
      const patch: any = { status, updated_at: new Date().toISOString() };
      if (args?.note) patch.agent_notes = `${before.agent_notes ?? ""}\n[AI] ${args.note}`.trim();
      const { data, error } = await db.from("complaints").update(patch).eq("id", before.id).select("complaint_code, status").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `الشكوى ${before.complaint_code}: ${before.status} → ${status}` };
    }

    case "set_ticket_status": {
      const before = await one("tickets", "ticket_code", need("ticket_code"), "id, ticket_code, status, priority");
      const patch: any = { updated_at: new Date().toISOString() };
      if (args?.status) {
        const allowed = ["open", "in_progress", "resolved", "closed"];
        if (!allowed.includes(String(args.status))) throw new Error("حالة غير مسموح بها");
        patch.status = String(args.status);
      }
      if (args?.priority) {
        const allowed = ["low", "normal", "high", "urgent"];
        if (!allowed.includes(String(args.priority))) throw new Error("أولوية غير مسموح بها");
        patch.priority = String(args.priority);
      }
      if (Object.keys(patch).length === 1) throw new Error("حدّد الحالة أو الأولوية على الأقل");
      const { data, error } = await db.from("tickets").update(patch).eq("id", before.id).select("ticket_code, status, priority").single();
      if (error) throw new Error(error.message);
      return { before, after: data, summary: `التذكرة ${before.ticket_code} حُدِّثت` };
    }

    case "extend_subscription": {
      const target = String(need("target"));
      if (!["driver", "customer"].includes(target)) throw new Error("الهدف يجب أن يكون driver أو customer");
      const days = Math.trunc(Number(need("days")));
      if (!Number.isFinite(days) || days <= 0 || days > 365) throw new Error("عدد الأيام يجب أن يكون بين 1 و365");
      const code = String(need("code"));
      let userId: string;
      let subTable: string;
      let filterCol: string;
      let filterVal: string;
      if (target === "driver") {
        const driver = await one("drivers", "driver_code", code, "id, driver_code, user_id");
        userId = driver.user_id;
        subTable = "driver_subscriptions";
        filterCol = "driver_id";
        filterVal = driver.id;
      } else {
        const prof = await one("profiles", "user_code", code, "id, user_code");
        userId = prof.id;
        subTable = "customer_subscriptions";
        filterCol = "user_id";
        filterVal = prof.id;
      }
      const { data: sub } = await db.from(subTable).select("id, status, expires_at")
        .eq(filterCol, filterVal).order("expires_at", { ascending: false }).limit(1).maybeSingle();
      const base = sub?.expires_at && new Date(sub.expires_at) > new Date() ? new Date(sub.expires_at) : new Date();
      const expires = new Date(base.getTime() + days * 86400000).toISOString();
      let after: any;
      if (sub) {
        const { data, error } = await db.from(subTable).update({ expires_at: expires, status: "active", updated_at: new Date().toISOString() })
          .eq("id", sub.id).select("id, status, expires_at").single();
        if (error) throw new Error(error.message);
        after = data;
      } else {
        const payload: any = { user_id: userId, status: "active", starts_at: new Date().toISOString(), expires_at: expires };
        if (target === "driver") payload.driver_id = filterVal;
        const { data, error } = await db.from(subTable).insert(payload).select("id, status, expires_at").single();
        if (error) throw new Error(error.message);
        after = data;
      }
      return { before: sub ?? null, after, summary: `تمديد اشتراك ${code} بـ ${days} يوماً — ينتهي ${expires.slice(0, 10)}` };
    }

    case "broadcast_notification": {
      const message = String(need("message"));
      const cap = Math.min(Math.max(Math.trunc(Number(args?.limit ?? 200)) || 200, 1), 500);
      let userIds: string[] = [];
      if (args?.role) {
        const allowed = ["user", "driver", "delivery", "store_owner", "agent", "moderator"];
        const role = String(args.role);
        if (!allowed.includes(role)) throw new Error("دور غير مسموح به");
        const { data: rows, error } = await db.from("user_roles").select("user_id").eq("role", role).limit(2000);
        if (error) throw new Error(error.message);
        userIds = (rows ?? []).map((r: any) => r.user_id);
        if (!userIds.length) throw new Error("لا يوجد مستخدمون بهذا الدور");
      }
      let q = db.from("profiles").select("id").eq("is_suspended", false).limit(cap);
      if (userIds.length) q = q.in("id", userIds.slice(0, 1000));
      if (args?.city) q = q.ilike("city", `%${args.city}%`);
      const { data: profs, error: pErr } = await q;
      if (pErr) throw new Error(pErr.message);
      const targets = (profs ?? []).map((p: any) => p.id);
      if (!targets.length) throw new Error("لا يوجد مستلمون مطابقون");
      const { error } = await db.from("notifications").insert(
        targets.map((id: string) => ({ user_id: id, message, type: "admin" })),
      );
      if (error) throw new Error(error.message);
      return {
        before: null,
        after: { recipients: targets.length, role: args?.role ?? "الجميع", city: args?.city ?? "الكل" },
        summary: `إرسال إشعار إلى ${targets.length} مستخدم`,
      };
    }


    default:
      throw new Error(`أداة كتابة غير معروفة: ${name}`);
  }
}
