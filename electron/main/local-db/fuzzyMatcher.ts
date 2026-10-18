/**
 * Audit #60: Levenshtein distance & fuzzy string matching utility
 * to match raw bank transaction narrations against chart-of-accounts ledgers.
 */

export function calculateLevenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    const row = new Array<number>(n + 1).fill(0);
    dp.push(row);
  }

  for (let i = 0; i <= m; i++) {
    const row = dp[i];
    if (row) row[0] = i;
  }
  
  const firstRow = dp[0];
  if (firstRow) {
    for (let j = 0; j <= n; j++) firstRow[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    const currentRow = dp[i];
    const prevRow = dp[i - 1];
    if (!currentRow || !prevRow) continue;

    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      const valDelete = (prevRow[j] ?? 0) + 1;
      const valInsert = (currentRow[j - 1] ?? 0) + 1;
      const valSubstitute = (prevRow[j - 1] ?? 0) + cost;

      currentRow[j] = Math.min(valDelete, valInsert, valSubstitute);
    }
  }

  const lastRow = dp[m];
  return lastRow ? (lastRow[n] ?? 0) : 0;
}

export function computeFuzzyMatchScore(source: string, target: string): number {
  const s1 = source.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const s2 = target.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();

  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.95;
  }

  const words1 = s1.split(/\s+/).filter(w => w.length > 2);
  const words2 = s2.split(/\s+/).filter(w => w.length > 2);

  const matchedWords = words1.filter(w1 => words2.some(w2 => w2.includes(w1) || w1.includes(w2)));
  if (words1.length > 0 && matchedWords.length > 0) {
    const wordScore = matchedWords.length / Math.max(words1.length, words2.length);
    if (wordScore > 0.4) return Math.min(0.9, 0.5 + wordScore * 0.4);
  }

  const distance = calculateLevenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;

  return Math.max(0, 1 - distance / maxLength);
}

export function findBestMatchingLedger<T extends { readonly name: string }>(
  description: string,
  ledgers: readonly T[],
  minThreshold = 0.4
): { readonly ledger: T; readonly score: number } | null {
  let bestMatch: T | null = null;
  let highestScore = 0;

  for (const ledger of ledgers) {
    const score = computeFuzzyMatchScore(description, ledger.name);
    if (score > highestScore && score >= minThreshold) {
      highestScore = score;
      bestMatch = ledger;
    }
  }

  return bestMatch ? { ledger: bestMatch, score: highestScore } : null;
}
