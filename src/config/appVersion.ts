// Central version identifier for the HN Driver platform.
// Update this constant whenever a new archived release is minted.
export const APP_VERSION = {
  code: "v2026.07.22",
  name: "HN Driver — Stable Snapshot",
  releasedAt: "2026-07-22",
} as const;

export const getAppVersionLabel = () =>
  `${APP_VERSION.code} · ${APP_VERSION.releasedAt}`;
