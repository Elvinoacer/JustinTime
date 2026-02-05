// Sheng Normalizer Utility
// Maps Nairobi urban slang to standard English/Swahili keywords for search indexing

const SHENG_MAP: Record<string, string> = {
  // Jobs/Work
  "wera": "job",
  "janta": "job",
  "kibarua": "casual job",
  "mjei": "construction work",
  
  // Money
  "chapaa": "money",
  "dooh": "money",
  "mkwanja": "money",
  
  // People/Roles
  "fundi": "technician",
  "daktari": "doctor",
  "dere": "driver",
  "makanga": "conductor",
  "maasai": "security guard",
  "soldier": "security guard",
  
  // Services
  "stima": "electricity",
  "majire": "water",
  "ploti": "house",
  "keja": "house",
  
  // Actions
  "saka": "search",
  "tafuta": "search",
};

export function normalizeSheng(text: string): string {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  
  const normalizedWords = words.map(word => {
    // Check direct map
    if (SHENG_MAP[word]) return SHENG_MAP[word];
    // Check basic plurals (simple heuristic)
    if (word.endsWith('s') && SHENG_MAP[word.slice(0, -1)]) return SHENG_MAP[word.slice(0, -1)];
    return word;
  });
  
  return normalizedWords.join(" ");
}

// Example usage: "Natafuta fundi wa stima" -> "Natafuta technician wa electricity"
