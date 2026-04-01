/**
 * Smart Error Boundary with Auto-Recovery
 * Catches React render errors and attempts automatic recovery:
 * - Auto-retry for transient errors (max 3 attempts)
 * - Smart reload for chunk loading failures
 * - Graceful fallback UI with manual recovery option
 */
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { categorizeError, getRecoveryAction, type ErrorCategory } from "@/lib/errorRecovery";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCategory: ErrorCategory;
  retryCount: number;
  recovering: boolean;
  countdownSeconds: number;
}

const MAX_RETRIES = 3;

class SmartErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCategory: "unknown",
      retryCount: 0,
      recovering: false,
      countdownSeconds: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorCategory: categorizeError(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[SmartErrorBoundary] Caught error:", error.message, "\nCategory:", categorizeError(error), "\nStack:", info.componentStack);
    this.attemptAutoRecovery();
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  attemptAutoRecovery = () => {
    const { retryCount, errorCategory } = this.state;

    if (retryCount >= MAX_RETRIES) {
      this.setState({ recovering: false });
      return;
    }

    const recovery = getRecoveryAction(errorCategory);
    const delaySeconds = Math.ceil(recovery.delay / 1000);

    this.setState({ recovering: true, countdownSeconds: delaySeconds });

    // Countdown
    this.countdownTimer = setInterval(() => {
      this.setState(prev => {
        if (prev.countdownSeconds <= 1) {
          if (this.countdownTimer) clearInterval(this.countdownTimer);
          return { countdownSeconds: 0 };
        }
        return { countdownSeconds: prev.countdownSeconds - 1 };
      });
    }, 1000);

    this.retryTimer = setTimeout(() => {
      if (recovery.action === "reload") {
        window.location.reload();
        return;
      }
      if (recovery.action === "redirect" && recovery.target) {
        window.location.href = recovery.target;
        return;
      }
      // retry or wait → re-render
      this.setState(prev => ({
        hasError: false,
        error: null,
        recovering: false,
        retryCount: prev.retryCount + 1,
        countdownSeconds: 0,
      }));
    }, recovery.delay);
  };

  handleManualRetry = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.setState({
      hasError: false,
      error: null,
      recovering: false,
      retryCount: 0,
      countdownSeconds: 0,
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error, errorCategory, retryCount, recovering, countdownSeconds } = this.state;
    const isMaxRetries = retryCount >= MAX_RETRIES;

    const categoryLabels: Record<ErrorCategory, { icon: string; title: string; desc: string }> = {
      network: { icon: "🌐", title: "مشكلة في الاتصال", desc: "تعذر الاتصال بالخادم. جاري إعادة المحاولة..." },
      chunk_load: { icon: "📦", title: "تحديث متاح", desc: "يتم تحميل الإصدار الجديد تلقائياً..." },
      render: { icon: "🔧", title: "خطأ في العرض", desc: "حدث خطأ أثناء عرض الصفحة. جاري الإصلاح التلقائي..." },
      auth: { icon: "🔐", title: "انتهت الجلسة", desc: "يتم إعادة توجيهك لتسجيل الدخول..." },
      unknown: { icon: "⚡", title: "خطأ غير متوقع", desc: "جاري محاولة الإصلاح التلقائي..." },
    };

    const label = categoryLabels[errorCategory];

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-sm" dir="rtl">
        <div className="w-full max-w-md mx-4 rounded-2xl border border-border/50 bg-card p-8 shadow-2xl text-center">
          {/* Icon */}
          <div className="text-5xl mb-4">{label.icon}</div>

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground mb-2">{label.title}</h2>
          <p className="text-sm text-muted-foreground mb-4">{label.desc}</p>

          {/* Recovery status */}
          {recovering && !isMaxRetries && (
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2 text-sm text-primary mb-2">
                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>جاري الإصلاح التلقائي... {countdownSeconds > 0 && `(${countdownSeconds}ث)`}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(((retryCount + 1) / MAX_RETRIES) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">محاولة {retryCount + 1} من {MAX_RETRIES}</p>
            </div>
          )}

          {/* Max retries reached */}
          {isMaxRetries && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">تعذر الإصلاح التلقائي</p>
              <p className="text-xs text-muted-foreground mt-1">يرجى المحاولة يدوياً أو العودة للصفحة الرئيسية</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleManualRetry}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-6 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm hover:bg-secondary/80 transition-colors"
            >
              الرئيسية
            </button>
          </div>

          {/* Debug info (dev only) */}
          {import.meta.env.DEV && error && (
            <details className="mt-4 text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer">تفاصيل الخطأ</summary>
              <pre className="mt-2 p-2 rounded-lg bg-secondary text-xs text-muted-foreground overflow-auto max-h-32 whitespace-pre-wrap">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default SmartErrorBoundary;
