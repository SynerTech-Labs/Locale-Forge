import { validatePlaceholderPreservation } from "./placeholders";
import type { LocaleMap } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseLocaleMap(rawJson: string, contextLabel: string): LocaleMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${contextLabel} is not valid JSON: ${message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`${contextLabel} must be a flat JSON object of string values.`);
  }

  const map: LocaleMap = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new Error(`${contextLabel} key "${key}" must map to a string value.`);
    }
    map[key] = value;
  }

  return map;
}

export function validateTranslatedMap(sourceMap: LocaleMap, translatedMap: LocaleMap): string[] {
  const errors: string[] = [];

  for (const sourceKey of Object.keys(sourceMap)) {
    if (!(sourceKey in translatedMap)) {
      errors.push(`Missing key "${sourceKey}" in translated output.`);
    }
  }

  for (const translatedKey of Object.keys(translatedMap)) {
    if (!(translatedKey in sourceMap)) {
      errors.push(`Unexpected key "${translatedKey}" in translated output.`);
    }
  }

  errors.push(...validatePlaceholderPreservation(sourceMap, translatedMap));
  return errors;
}

