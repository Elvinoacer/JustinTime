export const NOTIFICATION_SYNC_EVENT = "jit:notifications:sync";

const NOTIFICATION_SYNC_STORAGE_KEY = "jit:notifications:last-sync";
const NOTIFICATION_SYNC_CHANNEL = "jit:notifications";

export interface NotificationSyncPayload {
  timestamp: number;
  reason?: string;
  notificationId?: string;
  unreadCount?: number;
  unreadApplicationUpdatesCount?: number;
}

let notificationChannel: BroadcastChannel | null = null;

function getNotificationChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (typeof BroadcastChannel === "undefined") {
    return null;
  }

  if (!notificationChannel) {
    notificationChannel = new BroadcastChannel(NOTIFICATION_SYNC_CHANNEL);
  }

  return notificationChannel;
}

export function emitNotificationSync(
  payload: Omit<NotificationSyncPayload, "timestamp"> = {},
): void {
  if (typeof window === "undefined") {
    return;
  }

  const syncPayload: NotificationSyncPayload = {
    timestamp: Date.now(),
    ...payload,
  };

  window.dispatchEvent(
    new CustomEvent<NotificationSyncPayload>(NOTIFICATION_SYNC_EVENT, {
      detail: syncPayload,
    }),
  );

  try {
    window.localStorage.setItem(
      NOTIFICATION_SYNC_STORAGE_KEY,
      JSON.stringify(syncPayload),
    );
  } catch {
    // Ignore storage errors in private/incognito environments.
  }

  getNotificationChannel()?.postMessage(syncPayload);
}

export function subscribeToNotificationSync(
  callback: (payload: NotificationSyncPayload) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<NotificationSyncPayload>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== NOTIFICATION_SYNC_STORAGE_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue) as NotificationSyncPayload;
      callback(payload);
    } catch {
      // Ignore malformed payloads.
    }
  };

  const channel = getNotificationChannel();
  const handleChannelMessage = (
    event: MessageEvent<NotificationSyncPayload>,
  ) => {
    if (event.data) {
      callback(event.data);
    }
  };

  window.addEventListener(
    NOTIFICATION_SYNC_EVENT,
    handleCustomEvent as EventListener,
  );
  window.addEventListener("storage", handleStorage);
  channel?.addEventListener("message", handleChannelMessage);

  return () => {
    window.removeEventListener(
      NOTIFICATION_SYNC_EVENT,
      handleCustomEvent as EventListener,
    );
    window.removeEventListener("storage", handleStorage);
    channel?.removeEventListener("message", handleChannelMessage);
  };
}
