import type { Service } from '../data/forms';

// Normalize Hebrew (and general) text for forgiving matching:
// - lowercase
// - strip Hebrew niqqud (diacritics) if present
// - strip common punctuation
// - collapse whitespace
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[֑-ׇ]/g, '') // Hebrew niqqud/cantillation
    .replace(/["'׳״.,!?/\\()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/**
 * Very small Hebrew-aware "stem": strips a handful of very common
 * one-letter prefixes (ה, ו, ב, כ, ל, מ, ש) so that partial / inflected
 * words still match their base keyword (e.g. "לדירה" -> "דירה").
 * Intentionally simple — no external NLP/AI engine.
 */
function stripPrefixes(word: string): string {
  let w = word;
  const prefixes = ['ש', 'ה', 'ו', 'ב', 'כ', 'ל', 'מ'];
  while (w.length > 3 && prefixes.includes(w[0])) {
    w = w.slice(1);
  }
  return w;
}

function tokenVariants(word: string): string[] {
  const variants = new Set<string>([word]);
  const stripped = stripPrefixes(word);
  if (stripped !== word) variants.add(stripped);
  return Array.from(variants);
}

/** Does a single field token match a single query token (exact or partial)? */
function tokensMatch(qToken: string, fToken: string): number {
  const qVariants = tokenVariants(qToken);
  const fVariants = tokenVariants(fToken);
  let best = 0;
  for (const qv of qVariants) {
    for (const fv of fVariants) {
      if (fv === qv) {
        best = Math.max(best, 10);
      } else if (fv.startsWith(qv) || qv.startsWith(fv)) {
        const shorter = Math.min(fv.length, qv.length);
        const longer = Math.max(fv.length, qv.length);
        if (shorter >= 2 && shorter / longer >= 0.6) {
          best = Math.max(best, 6);
        }
      } else if (fv.includes(qv) || qv.includes(fv)) {
        const shorter = Math.min(fv.length, qv.length);
        if (shorter >= 3) {
          best = Math.max(best, 3);
        }
      }
    }
  }
  return best;
}

/**
 * Scores a SINGLE source string (one keyword, or one title/description/etc.)
 * against the query tokens. Matches are only rewarded at full strength when
 * a large share of the query's tokens are found within this same string —
 * this stops isolated single-token stem collisions (e.g. query "עבר" loosely
 * matching "העברה") from outranking a real multi-token phrase match.
 */
function scoreValue(queryTokens: string[], value: string): number {
  if (!value) return 0;
  const valueNorm = normalize(value);
  const valueTokens = tokenize(value);
  if (valueTokens.length === 0) return 0;

  let rawScore = 0;
  let matchedCount = 0;

  for (const qToken of queryTokens) {
    if (qToken.length < 2) continue;
    let bestForToken = 0;
    for (const fToken of valueTokens) {
      bestForToken = Math.max(bestForToken, tokensMatch(qToken, fToken));
    }
    if (bestForToken > 0) {
      matchedCount += 1;
      rawScore += bestForToken;
    }
  }

  const meaningfulTokenCount = queryTokens.filter((t) => t.length >= 2).length;
  if (meaningfulTokenCount === 0) return 0;

  // Coverage factor: penalize matches that only cover a small fraction of
  // the query's tokens within this specific string. Full coverage (all
  // query tokens found in this same string) keeps full score; partial
  // coverage is squared down so multi-word queries need a real phrase hit.
  const coverage = matchedCount / meaningfulTokenCount;
  let score = rawScore * coverage * coverage;

  // Extra bonus for a full contiguous phrase substring match.
  const queryPhrase = queryTokens.join(' ');
  if (queryPhrase && valueNorm.includes(queryPhrase)) {
    score += 50;
  }

  return score;
}

function fieldScore(queryTokens: string[], values: string[]): number {
  let best = 0;
  for (const value of values) {
    best = Math.max(best, scoreValue(queryTokens, value));
  }
  return best;
}

export interface SearchResult {
  service: Service;
  score: number;
}

/**
 * Ranks services against a free-text Hebrew query.
 * Field weighting per spec: title > keywords > whenToUse/description.
 */
export function searchServices(query: string, services: Service[]): SearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const service of services) {
    const titleScore = fieldScore(queryTokens, [service.title]) * 4;
    const officialTitleScore = fieldScore(queryTokens, [service.officialTitle]) * 3;
    const keywordsScore = fieldScore(queryTokens, service.keywords) * 3;
    const whenToUseScore = fieldScore(queryTokens, [service.whenToUse]) * 1.5;
    const descriptionScore = fieldScore(queryTokens, [service.description]) * 1;
    const categoryScore = fieldScore(queryTokens, [service.category]) * 1;

    const total =
      titleScore +
      officialTitleScore +
      keywordsScore +
      whenToUseScore +
      descriptionScore +
      categoryScore;

    if (total > 0) {
      results.push({ service, score: total });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
