type LanguageSwitchAttempt = {
  at: string;
  locale: string | null;
  source: string | null;
  success: boolean;
  status: number;
  detail: string;
};

type LanguageSwitchMonitorStore = {
  total: number;
  successful: number;
  failed: number;
  recent: LanguageSwitchAttempt[];
};

const MAX_RECENT_ATTEMPTS = 50;

const globalForLanguageSwitchMonitor = globalThis as typeof globalThis & {
  __n8nLanguageSwitchMonitor?: LanguageSwitchMonitorStore;
};

const defaultStore: LanguageSwitchMonitorStore = {
  total: 0,
  successful: 0,
  failed: 0,
  recent: [],
};

const monitorStore =
  globalForLanguageSwitchMonitor.__n8nLanguageSwitchMonitor ?? defaultStore;

globalForLanguageSwitchMonitor.__n8nLanguageSwitchMonitor = monitorStore;

export function recordLanguageSwitchAttempt(
  attempt: Omit<LanguageSwitchAttempt, "at">,
) {
  monitorStore.total += 1;

  if (attempt.success) {
    monitorStore.successful += 1;
  } else {
    monitorStore.failed += 1;
  }

  monitorStore.recent.unshift({
    ...attempt,
    at: new Date().toISOString(),
  });

  if (monitorStore.recent.length > MAX_RECENT_ATTEMPTS) {
    monitorStore.recent = monitorStore.recent.slice(0, MAX_RECENT_ATTEMPTS);
  }
}

function sanitizeWebhookUrl(url?: string) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return "invalid-url";
  }
}

export function getLanguageSwitchMonitorSnapshot() {
  return {
    configured: Boolean(process.env.N8N_LANGUAGE_SWITCH_WEBHOOK_URL),
    webhook: sanitizeWebhookUrl(process.env.N8N_LANGUAGE_SWITCH_WEBHOOK_URL),
    totals: {
      total: monitorStore.total,
      successful: monitorStore.successful,
      failed: monitorStore.failed,
    },
    recent: monitorStore.recent,
  };
}
