export type TeamSection =
  | "overview"
  | "members"
  | "jobs"
  | "payroll"
  | "settings";

export function getTeamSectionPath(
  teamId: string,
  section: TeamSection = "overview",
) {
  if (section === "overview") {
    return `/dashboard/team/${teamId}`;
  }

  return `/dashboard/team/${teamId}/${section}`;
}

export function buildSectionPathWithQuery(
  teamId: string,
  section: TeamSection,
  query?: Record<string, string>,
) {
  const basePath = getTeamSectionPath(teamId, section);
  const params = new URLSearchParams(query || {});
  const queryString = params.toString();
  return queryString.length > 0 ? `${basePath}?${queryString}` : basePath;
}
