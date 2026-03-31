const truthy = new Set(["1", "true", "yes", "on"]);

function readFlag(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  return truthy.has(value.trim().toLowerCase());
}

export const growthFeatureFlags = {
  quickPost: readFlag(process.env.FF_QUICK_POST, false),
  quickApplyTemplates: readFlag(process.env.FF_QUICK_APPLY_TEMPLATES, false),
};
