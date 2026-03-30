/**
 * HN Driver — OTA (Over-The-Air) Update Configuration
 * Version: 30.03.2026
 * 
 * This module provides OTA update checking for all native apps.
 * The apps check for updates on startup and download only changed assets.
 * 
 * How it works:
 * 1. Each app has a local version manifest (version + file hashes)
 * 2. On startup, the app fetches the remote manifest from the server
 * 3. If versions differ, it downloads only changed files
 * 4. The app reloads with the new assets
 * 
 * Server Setup:
 * - Host the manifest.json and dist files on your server
 * - The update endpoint is: https://your-server.com/ota/{module}/manifest.json
 */

export interface OTAManifest {
  version: string;
  timestamp: string;
  module: string;
  files: Record<string, { hash: string; size: number }>;
  totalSize: number;
  minAppVersion?: string;
}

export interface OTAConfig {
  updateUrl: string;
  module: 'admin' | 'driver-ride' | 'driver-delivery' | 'supervisor' | 'callcenter' | 'client';
  checkInterval: number; // minutes
  autoApply: boolean;
  showNotification: boolean;
}

// Default OTA configs per module
export const OTA_CONFIGS: Record<string, OTAConfig> = {
  admin: {
    updateUrl: 'https://hndriver.com/ota/admin',
    module: 'admin',
    checkInterval: 30,
    autoApply: false,
    showNotification: true,
  },
  'driver-ride': {
    updateUrl: 'https://hndriver.com/ota/driver-ride',
    module: 'driver-ride',
    checkInterval: 15,
    autoApply: true,
    showNotification: true,
  },
  'driver-delivery': {
    updateUrl: 'https://hndriver.com/ota/driver-delivery',
    module: 'driver-delivery',
    checkInterval: 15,
    autoApply: true,
    showNotification: true,
  },
  supervisor: {
    updateUrl: 'https://hndriver.com/ota/supervisor',
    module: 'supervisor',
    checkInterval: 30,
    autoApply: false,
    showNotification: true,
  },
  callcenter: {
    updateUrl: 'https://hndriver.com/ota/callcenter',
    module: 'callcenter',
    checkInterval: 30,
    autoApply: false,
    showNotification: true,
  },
  client: {
    updateUrl: 'https://hndriver.com/ota/client',
    module: 'client',
    checkInterval: 60,
    autoApply: true,
    showNotification: true,
  },
};
