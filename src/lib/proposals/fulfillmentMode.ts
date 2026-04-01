export type ProposalFulfillmentMode = "INDIVIDUAL" | "TEAM";

export interface ProposalFulfillmentPreference {
  mode: ProposalFulfillmentMode;
  teamId?: string;
  teamName?: string;
}

const FULFILLMENT_META_PREFIX = "meta:fulfillment:";

export function encodeFulfillmentPreference(
  preference: ProposalFulfillmentPreference,
): string {
  const encodedName = encodeURIComponent(preference.teamName || "");
  return `${FULFILLMENT_META_PREFIX}${preference.mode}:${preference.teamId || ""}:${encodedName}`;
}

export function parseFulfillmentPreference(
  attachments: Array<string | null | undefined> | null | undefined,
): ProposalFulfillmentPreference | null {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const metadataToken = attachments.find(
    (value) =>
      typeof value === "string" && value.startsWith(FULFILLMENT_META_PREFIX),
  );

  if (!metadataToken) {
    return null;
  }

  const payload = metadataToken.slice(FULFILLMENT_META_PREFIX.length);
  const [modeRaw, teamIdRaw, encodedTeamName] = payload.split(":");

  const mode: ProposalFulfillmentMode =
    modeRaw === "TEAM" ? "TEAM" : "INDIVIDUAL";
  const teamId = teamIdRaw || undefined;
  const teamName = encodedTeamName
    ? decodeURIComponent(encodedTeamName)
    : undefined;

  return {
    mode,
    teamId,
    teamName,
  };
}

export function withFulfillmentPreference(
  attachments: string[] | null | undefined,
  preference: ProposalFulfillmentPreference,
): string[] {
  const withoutMetadata = (attachments || []).filter(
    (value) => !value.startsWith(FULFILLMENT_META_PREFIX),
  );

  return [...withoutMetadata, encodeFulfillmentPreference(preference)];
}

export function stripFulfillmentMetadata(
  attachments: string[] | null | undefined,
): string[] {
  return (attachments || []).filter(
    (value) => !value.startsWith(FULFILLMENT_META_PREFIX),
  );
}
