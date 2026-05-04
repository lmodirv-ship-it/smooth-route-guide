# إتاحة قائمة المطعم للجميع (زبون / أدمن / مركز اتصال)

## الوضع الحالي
- **الصفحة موجودة فقط للزبون**: `RestaurantMenu` تعرض على المسار `/delivery/restaurant/:id` ضمن `MainRoutes`.
- **قاعدة البيانات جاهزة بالفعل**: تحققت من سياسات RLS — الأدمن، Agent (مركز الاتصال)، Moderator، و Smart Assistant لديهم بالفعل صلاحية SELECT على `stores`, `menu_categories`, `menu_items`. **لا حاجة لأي تعديل على قاعدة البيانات**.
- **زر السلة موجود في الهيدر**: غير مناسب للأدمن/الوكيل لأنهم لن يطلبوا.

## الخطة

### 1. استخراج مكوّن قابل للمشاركة
استخراج عرض القائمة من `src/pages/delivery/RestaurantMenu.tsx` إلى مكون قابل لإعادة الاستخدام:

**ملف جديد**: `src/components/menu/RestaurantMenuView.tsx`
- يستقبل `props`: `storeId`, `mode: "customer" | "readonly"`
- في وضع `readonly` (للأدمن/مركز الاتصال):
  - إخفاء أزرار "أضف / +/-"
  - إخفاء شريط السلة السفلي
  - إخفاء أيقونة السلة في الهيدر
  - إظهار بدلاً منها شارة "عرض فقط" + معلومات إضافية للإدارة (عدد الفئات، عدد الأطباق، آخر تحديث)
- في وضع `customer`: السلوك الحالي بالكامل دون تغيير

`RestaurantMenu.tsx` يصبح غلافاً بسيطاً يستدعي `<RestaurantMenuView mode="customer" />`.

### 2. إضافة المسار للأدمن
**ملف جديد**: `src/admin/pages/AdminRestaurantMenu.tsx`
- يحضر `storeId` من URL params
- يلف العرض بـ `AdminLayout` ويستخدم `<RestaurantMenuView mode="readonly" />`

**تعديل `src/admin/AdminRoutes.tsx`**:
- إضافة Route مع Lazy: `/admin/restaurants/:id/menu` → `AdminRestaurantMenu`

**تعديل صفحة قائمة المطاعم في الأدمن** (إذا موجودة):
- إضافة زر "عرض القائمة" بجانب كل مطعم → ينقل إلى `/admin/restaurants/:id/menu`

### 3. إضافة المسار لمركز الاتصال
**ملف جديد**: `src/admin/pages/callcenter/CCRestaurantMenu.tsx`
- نفس الفكرة، يلف العرض بـ `CallCenterLayout` + `<RestaurantMenuView mode="readonly" />`

**تعديل `src/admin/AdminRoutes.tsx`** (نفس الملف يحوي مسارات CC):
- إضافة Route: `/cc/restaurants/:id/menu`

**تعديل لوحة مركز الاتصال** (`CCDashboard` أو شاشة الطلبات):
- عند عرض طلب توصيل، إضافة زر صغير "عرض قائمة المطعم" بجانب اسم المطعم → نافذة منبثقة `Dialog` أو روابط لـ `/cc/restaurants/:id/menu`.
- هذا يساعد الوكيل على تأكيد الطلبات ومراجعة الأسعار مع الزبون عبر الهاتف.

### 4. ترجمة العناصر الجديدة
إضافة المفاتيح في `platform_translations` (وفق سياسة i18n الصارمة):
- `menu.viewOnly` — "عرض فقط"
- `menu.openInAdmin` — "عرض القائمة"
- `menu.totalCategories`, `menu.totalItems`, `menu.lastUpdated`

## ما لن يتغير
- التصميم البصري للقائمة كما يراها الزبون **يبقى كما هو 100%** (وفق UI Lockdown).
- لا تعديل على قاعدة البيانات (RLS كافية).
- لا تعديل على `CartContext` — ببساطة لن يُستدعى في وضع readonly.

## الملفات المتأثرة

```text
+ src/components/menu/RestaurantMenuView.tsx        (جديد - استخراج المنطق)
~ src/pages/delivery/RestaurantMenu.tsx              (يصبح غلاف صغير)
+ src/admin/pages/AdminRestaurantMenu.tsx            (جديد)
+ src/admin/pages/callcenter/CCRestaurantMenu.tsx    (جديد)
~ src/admin/AdminRoutes.tsx                          (إضافة مسارين Lazy)
~ صفحة قائمة المطاعم في الأدمن                       (زر "عرض القائمة")
~ CCDashboard أو شاشة الطلبات                        (زر "عرض قائمة المطعم")
~ src/i18n/locales/ar.ts, fr.ts, en.ts, es.ts        (مفاتيح جديدة)
```

## النتيجة
- **الزبون**: نفس التجربة الحالية (سلة، إضافة، إلخ).
- **الأدمن**: يفتح أي مطعم ويرى قائمته كاملة في وضع قراءة فقط للمراجعة والإشراف.
- **مركز الاتصال**: يفتح القائمة من شاشة الطلب لمساعدة الزبون عبر الهاتف.
