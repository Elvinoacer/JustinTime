// Sheng Normalizer Utility
// Maps Nairobi urban slang to standard English/Swahili keywords for search indexing

const SHENG_MAP: Record<string, string> = {
  // Jobs/Work
  wera: "job",
  janta: "job",
  kibarua: "casual job",
  mjei: "construction work",

  // Money
  chapaa: "money",
  dooh: "money",
  mkwanja: "money",

  // People/Roles
  fundi: "technician",
  daktari: "doctor",
  dere: "driver",
  makanga: "conductor",
  maasai: "security guard",
  soldier: "security guard",

  // Services
  stima: "electricity",
  majire: "water",
  ploti: "house",
  keja: "house",

  // Actions
  saka: "search",
  tafuta: "search",
};

const SWAHILI_PLURAL_PREFIXES = ["ma", "wa", "vi", "mi"];

function normalizeWord(rawWord: string): string {
  const cleaned = rawWord
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
  if (!cleaned) return "";

  if (SHENG_MAP[cleaned]) {
    return SHENG_MAP[cleaned];
  }

  // Handle common Swahili/Bantu plural prefixes: mafundi -> fundi, wajenzi -> jenz(i)
  for (const prefix of SWAHILI_PLURAL_PREFIXES) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length + 2) {
      const singularCandidate = cleaned.slice(prefix.length);
      if (SHENG_MAP[singularCandidate]) {
        return SHENG_MAP[singularCandidate];
      }
    }
  }

  // Lightweight English plural fallback for mixed queries: fundis -> fundi
  if (cleaned.endsWith("es") && SHENG_MAP[cleaned.slice(0, -2)]) {
    return SHENG_MAP[cleaned.slice(0, -2)];
  }
  if (cleaned.endsWith("s") && SHENG_MAP[cleaned.slice(0, -1)]) {
    return SHENG_MAP[cleaned.slice(0, -1)];
  }

  return cleaned;
}

export function normalizeShengToken(word: string): string {
  return normalizeWord(word);
}

export function normalizeSheng(text: string): string {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  const normalizedWords = words
    .map((word) => normalizeWord(word))
    .filter((word) => word.length > 0);

  return normalizedWords.join(" ");
}

// Example usage: "Natafuta fundi wa stima" -> "Natafuta technician wa electricity"
