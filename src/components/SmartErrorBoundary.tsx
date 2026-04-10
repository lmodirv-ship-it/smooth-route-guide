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

    // Silent recovery: never show error UI to users.
    // For auth errors, redirect immediately to login.
    // For all other errors, silently retry or reload without any visible error screen.
    const { errorCategory, retryCount, recovering } = this.state;
    const isMaxRetries = retryCount >= MAX_RETRIES;

    // Auth errors: silent redirect to login
    if (errorCategory === "auth") {
      window.location.href = "/login";
      return null;
    }

    // Chunk load errors: silent reload
    if (errorCategory === "chunk_load") {
      window.location.reload();
      return null;
    }

    // Still recovering (retrying silently): show nothing, just the children will re-render
    if (recovering && !isMaxRetries) {
      return null;
    }

    // Max retries exhausted: silently go home instead of showing error screen
    if (isMaxRetries) {
      window.location.href = "/";
      return null;
    }

    // Fallback: return null (invisible) — auto-recovery will handle it
    return null;
  }
}

export default SmartErrorBoundary;
