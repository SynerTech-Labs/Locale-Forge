import type { LocaleMap } from "./types";

const PLACEHOLDER_REGEX = /(\{\{[^{}]+\}\}|\{[^{}\r\n]+\}|%(?:\d+\$)?[sdif])/g;

function countPlaceholders(text: string): Map<string, number> {
  const matches = text.match(PLACEHOLDER_REGEX) ?? [];
  const counts = new Map<string, number>();
  for (const token of matches) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function samePlaceholderCounts(source: string, target: string): boolean {
  const sourceCounts = countPlaceholders(source);
  const targetCounts = countPlaceholders(target);

  if (sourceCounts.size !== targetCounts.size) {
    return false;
  }

  for (const [token, count] of sourceCounts) {
    if ((targetCounts.get(token) ?? 0) !== count) {
      return false;
    }
  }

  return true;
}

export function validatePlaceholderPreservation(
  sourceMap: LocaleMap,
  translatedMap: LocaleMap
): string[] {
  const failures: string[] = [];
  for (const [key, sourceValue] of Object.entries(sourceMap)) {
    const translatedValue = translatedMap[key];
    if (translatedValue === undefined) {
      continue;
    }
    if (!samePlaceholderCounts(sourceValue, translatedValue)) {
      failures.push(`Placeholder mismatch for key "${key}"`);
    }
  }
  return failures;
}

