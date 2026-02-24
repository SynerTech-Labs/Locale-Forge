import * as vscode from "vscode";
import type { ExtensionConfig } from "./types";

const SECTION = "localeforge";
const DEFAULT_SOURCE_LOCALE = "en";
const DEFAULT_TARGET_LOCALES = ["es", "fr", "de", "it", "pt-BR"];
const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_FILE_PATTERNS = ["**/en.json", "**/*.en.json"];

function sanitizeLocaleList(locales: unknown, sourceLocale: string): string[] {
  if (!Array.isArray(locales)) {
    return DEFAULT_TARGET_LOCALES;
  }

  const unique = new Set<string>();
  for (const locale of locales) {
    if (typeof locale !== "string") {
      continue;
    }
    const normalized = locale.trim();
    if (!normalized) {
      continue;
    }
    if (normalized.toLowerCase() === sourceLocale.toLowerCase()) {
      continue;
    }
    unique.add(normalized);
  }

  return [...unique];
}

function sanitizePatterns(patterns: unknown): string[] {
  if (!Array.isArray(patterns)) {
    return DEFAULT_FILE_PATTERNS;
  }

  const next = patterns
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  return next.length > 0 ? next : DEFAULT_FILE_PATTERNS;
}

export function getExtensionConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration(SECTION);
  const sourceLocale =
    config.get<string>("sourceLocale", DEFAULT_SOURCE_LOCALE).trim() || DEFAULT_SOURCE_LOCALE;

  return {
    sourceLocale,
    targetLocales: sanitizeLocaleList(config.get("targetLocales"), sourceLocale),
    autoDetectTargetLocales: config.get<boolean>("autoDetectTargetLocales", true),
    model: config.get<string>("openai.model", DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    concurrency: Math.max(1, config.get<number>("concurrency", DEFAULT_CONCURRENCY)),
    filePatterns: sanitizePatterns(config.get("filePatterns")),
    overwriteExisting: config.get<boolean>("overwriteExisting", true)
  };
}
