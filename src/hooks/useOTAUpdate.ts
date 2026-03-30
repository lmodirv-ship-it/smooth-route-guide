/**
 * HN Driver — OTA Update Hook
 * Checks for updates and notifies the user when a new version is available.
 * Works with PWA service worker for seamless web updates.
 */
import { useEffect, useCallback, useState } from 'react';

interface UpdateInfo {
  available: boolean;
  version?: string;
  timestamp?: string;
}

const CURRENT_VERSION = '30.03.2026';
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function useOTAUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ available: false });
  const [checking, setChecking] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      setChecking(true);

      // Check if service worker has an update waiting
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          setUpdateInfo({
            available: true,
            version: 'new',
            timestamp: new Date().toISOString(),
          });
          return;
        }
        // Trigger update check
        await reg?.update();
      }
    } catch {
      // Silent fail — OTA check is non-critical
    } finally {
      setChecking(false);
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        } else {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    // Initial check after 10 seconds
    const initialTimer = setTimeout(checkForUpdate, 10_000);

    // Periodic checks
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS);

    // Listen for SW controller change (new version activated)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New SW activated — page will reload if auto-apply is on
      });
    }

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [checkForUpdate]);

  return {
    updateAvailable: updateInfo.available,
    updateVersion: updateInfo.version,
    checking,
    checkForUpdate,
    applyUpdate,
    currentVersion: CURRENT_VERSION,
  };
}
