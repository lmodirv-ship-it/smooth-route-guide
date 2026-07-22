# فهرس Edge Functions

| الاسم | الغرض | JWT |
|---|---|---|
| `admin-ai-agent` | مساعد الأدمن الذكي (LLM) | مطلوب (admin) |
| `admin-delete-user` | حذف مستخدم من طرف الأدمن | مطلوب (admin) |
| `admin-reset-password` | إعادة تعيين كلمة المرور | مطلوب (admin) |
| `auth-email-hook` | معالجة رسائل المصادقة | webhook |
| `auto-dispatch` | إسناد الطلبات تلقائياً للسائقين | داخلي |
| `auto-prospect` | التنقيب التلقائي عن مطاعم | admin |
| `db-manager` | عمليات DB إدارية | admin |
| `distance-matrix` | حساب المسافات (Google) | مصادق |
| `enrich-prospects` | إثراء بيانات المرشحين | admin |
| `face-auth-lookup` | (تتبع الحضور فقط — لا دخول) | agents |
| `generate-menu` | توليد قائمة طعام (AI) | مصادق |
| `google-places-search` | بحث أماكن | عام |
| `google-translate` | ترجمة نصوص | مصادق |
| `handle-email-suppression` | معالجة SES suppression | webhook |
| `handle-email-unsubscribe` | إلغاء اشتراك | عام برمز |
| `hn-assistant` | مساعد HN المستخدم النهائي | مصادق |
| `hn-chatbot` | Chatbot عام | عام |
| `hn-stock-api` | API إدارة المخزون | admin/merchant |
| `mailbluster-sync` | مزامنة MailBluster | cron/admin |
| `paypal-live`, `paypal-payment` | مدفوعات PayPal | مصادق |
| `preview-transactional-email` | معاينة القوالب | admin |
| `process-email-queue` | معالجة طابور البريد | cron |
| `scrape-restaurant` | استخراج بيانات مطعم | admin |
| `search-neighborhoods` | بحث الأحياء | مصادق |
| `send-transactional-email` | إرسال بريد | مصادق |
| `server-db-status` | حالة الخادم/DB | admin |
| `stripe-checkout`, `stripe-webhook` | مدفوعات Stripe | مصادق/webhook |
| `twilio-call`, `twilio-sms`, `twilio-turn` | اتصالات Twilio | مصادق (admin/agent) |
| `validate-chat-message` | تعديل رسائل الدردشة | مصادق |

## قواعد أمنية
- كل الدوال المالية (Stripe/PayPal/Twilio) تتحقق من الدور في الكود.
- `stripe-webhook` يستلزم `STRIPE_WEBHOOK_SECRET`.
- `admin-ai-agent` لا يعيد أبداً `api_keys` أو `custom_api_keys`.
