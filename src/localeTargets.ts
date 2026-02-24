import * as path from "node:path";

const LOCALE_CODE_REGEX = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;

function cleanLocale(locale: string, sourceLocale: string): string | undefined {
  const normalized = locale.trim();
  if (!normalized) {
    return undefined;
  }
  if (!LOCALE_CODE_REGEX.test(normalized)) {
    return undefined;
  }
  if (normalized.toLowerCase() === sourceLocale.toLowerCase()) {
    return undefined;
  }
  return normalized;
}

function inferFromSiblingLocaleJson(
  sourceBasename: string,
  sourceLocale: string,
  candidateBasename: string
): string | undefined {
  const sourceLower = sourceLocale.toLowerCase();
  const sourceFileLower = sourceBasename.toLowerCase();
  const candidateLower = candidateBasename.toLowerCase();

  if (sourceFileLower === `${sourceLower}.json`) {
    if (!candidateLower.endsWith(".json")) {
      return undefined;
    }
    const locale = candidateBasename.slice(0, -5);
    return cleanLocale(locale, sourceLocale);
  }

  const sourceSuffix = `.${sourceLower}.json`;
  if (!sourceFileLower.endsWith(sourceSuffix)) {
    return undefined;
  }

  const prefix = sourceBasename.slice(0, sourceBasename.length - sourceSuffix.length);
  const candidatePrefix = `${prefix.toLowerCase()}.`;
  if (!candidateLower.startsWith(candidatePrefix) || !candidateLower.endsWith(".json")) {
    return undefined;
  }

  const locale = candidateBasename.slice(prefix.length + 1, -5);
  return cleanLocale(locale, sourceLocale);
}

export function inferTargetLocalesFromSiblingNames(
  sourcePath: string,
  siblingNames: string[],
  sourceLocale: string
): string[] {
  const sourceBasename = path.basename(sourcePath);
  const unique = new Set<string>();

  for (const sibling of siblingNames) {
    const locale = inferFromSiblingLocaleJson(sourceBasename, sourceLocale, sibling);
    if (locale) {
      unique.add(locale);
    }
  }

  return [...unique];
}

export function mergeTargetLocales(
  configuredLocales: string[],
  inferredLocales: string[],
  sourceLocale: string
): string[] {
  const unique = new Set<string>();
  const sourceLower = sourceLocale.toLowerCase();

  for (const locale of [...configuredLocales, ...inferredLocales]) {
    const normalized = locale.trim();
    if (!normalized || normalized.toLowerCase() === sourceLower) {
      continue;
    }
    unique.add(normalized);
  }

  return [...unique];
}

export function extractLocaleCandidatesFromFileName(fileName: string, sourceLocale: string): string[] {
  if (!fileName.toLowerCase().endsWith(".json")) {
    return [];
  }

  const base = fileName.slice(0, -5);
  const pieces = base.split(".");
  const candidates = new Set<string>();

  if (pieces.length === 1) {
    const locale = cleanLocale(pieces[0] ?? "", sourceLocale);
    if (locale) {
      candidates.add(locale);
    }
    return [...candidates];
  }

  const finalPiece = pieces[pieces.length - 1] ?? "";
  const locale = cleanLocale(finalPiece, sourceLocale);
  if (locale) {
    candidates.add(locale);
  }

  return [...candidates];
}

