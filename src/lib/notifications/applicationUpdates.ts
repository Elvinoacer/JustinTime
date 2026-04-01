export const APPLICATION_UPDATE_NOTIFICATION_TYPES = [
  "PROPOSAL_STATUS_UPDATE",
  "NEW_PROPOSAL",
  "PROPOSAL",
] as const;

export function isApplicationUpdateNotification(type: string): boolean {
  return APPLICATION_UPDATE_NOTIFICATION_TYPES.includes(
    type as (typeof APPLICATION_UPDATE_NOTIFICATION_TYPES)[number],
  );
}
