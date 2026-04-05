import { normalizeSheng, normalizeShengToken } from "@/lib/sheng-normalizer";

const EN_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "that",
  "this",
  "from",
  "have",
  "are",
  "was",
  "were",
  "been",
  "has",
  "had",
  "will",
  "can",
  "our",
  "all",
  "but",
  "not",
  "what",
  "when",
  "where",
  "who",
  "how",
  "why",
]);

const SW_STOP_WORDS = new Set([
  "na",
  "ya",
  "wa",
  "kwa",
  "ni",
  "la",
  "za",
  "cha",
  "vya",
  "mimi",
  "sisi",
  "hii",
  "ile",
  "huyo",
  "hawa",
  "wako",
  "ziko",
  "kuna",
]);

const TOKEN_ALIASES: Record<string, string[]> = {
  fundi: ["technician", "artisan", "repair"],
  mafundi: ["fundi", "technician", "artisan", "repair"],
  plumber: ["plumbing", "pipes", "pipe repair"],
  plumbing: ["plumber", "pipes", "pipe repair"],
  kinyozi: ["barber", "barbershop", "haircut"],
  barber: ["kinyozi", "barbershop", "haircut"],
  stima: ["electricity", "electrician", "electrical"],
  electrician: ["stima", "electrical", "wiring"],
  mabati: ["roofing", "roofer", "roof"],
  roofing: ["mabati", "roofer", "roof"],
  kupaint: ["painting", "painter", "paint"],
  paint: ["painting", "painter", "kupaint"],
  painter: ["painting", "paint", "kupaint"],
  msee: ["professional", "provider"],
  janta: ["job", "task", "work"],
  wera: ["job", "task", "work"],
  kibarua: ["casual", "job", "task", "gig"],
  dere: ["driver", "transport"],
  makanga: ["conductor", "transport"],
};

const PHRASE_ALIASES: Array<{ pattern: RegExp; expansions: string[] }> = [
  {
    pattern: /\bfundi wa mabati\b/,
    expansions: ["roofer", "roofing", "mabati", "roof repair"],
  },
  {
    pattern: /\bmsee wa plumbing\b/,
    expansions: ["plumber", "plumbing", "pipe repair"],
  },
  {
    pattern: /\bkupaint nyumba\b/,
    expansions: ["house painting", "painter", "paint"],
  },
];

export type NormalizedMarketplaceQuery = {
  raw: string;
  cleaned: string;
  canonical: string;
  tokens: string[];
  expandedTokens: string[];
  variants: string[];
};

function sanitizeQuery(query: string): string {
  return query
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function typoFold(token: string): string {
  if (token === "plumming") return "plumbing";
  if (token === "electritian") return "electrician";
  if (token === "barba") return "barber";
  if (token === "paintng") return "painting";
  return token;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }

  return out;
}

function isStopWord(token: string): boolean {
  return EN_STOP_WORDS.has(token) || SW_STOP_WORDS.has(token);
}

export function normalizeMarketplaceQuery(
  query: string,
): NormalizedMarketplaceQuery {
  const raw = query ?? "";
  const cleaned = sanitizeQuery(raw);

  if (!cleaned) {
    return {
      raw,
      cleaned: "",
      canonical: "",
      tokens: [],
      expandedTokens: [],
      variants: [],
    };
  }

  const shengCanonical = normalizeSheng(cleaned);
  const baseTokens = shengCanonical
    .split(/\s+/)
    .map((token) => typoFold(normalizeShengToken(token)))
    .filter((token) => token.length > 1)
    .filter((token) => !isStopWord(token));

  const phraseExpansions: string[] = [];
  for (const phraseAlias of PHRASE_ALIASES) {
    if (phraseAlias.pattern.test(shengCanonical)) {
      phraseExpansions.push(...phraseAlias.expansions);
    }
  }

  const tokenExpansions: string[] = [];
  for (const token of baseTokens) {
    tokenExpansions.push(token);
    tokenExpansions.push(...(TOKEN_ALIASES[token] || []));
  }

  const expandedTokens = dedupe(
    [...tokenExpansions, ...phraseExpansions]
      .map((value) => sanitizeQuery(value))
      .flatMap((value) => value.split(/\s+/))
      .map((value) => typoFold(normalizeShengToken(value)))
      .filter((value) => value.length > 1)
      .filter((value) => !isStopWord(value)),
  );

  const variants = dedupe([
    shengCanonical,
    expandedTokens.join(" "),
    ...expandedTokens,
  ]);

  return {
    raw,
    cleaned,
    canonical: shengCanonical,
    tokens: baseTokens,
    expandedTokens,
    variants,
  };
}

export function getMarketplaceSearchTerms(
  query: string,
  maxTerms = 10,
): string[] {
  const normalized = normalizeMarketplaceQuery(query);
  return dedupe([normalized.canonical, ...normalized.expandedTokens])
    .flatMap((entry) => entry.split(/\s+/))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 1)
    .slice(0, maxTerms);
}
