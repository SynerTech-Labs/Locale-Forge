import OpenAI from "openai";
import pLimit from "p-limit";
import type { LocaleMap, TranslateBatchOptions, TranslationBatchResult } from "./types";
import { parseLocaleMap, validateTranslatedMap } from "./validation";

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

async function translateToLocale(
  client: OpenAI,
  options: {
    model: string;
    sourceLocale: string;
    targetLocale: string;
    sourceMap: LocaleMap;
  }
): Promise<LocaleMap> {
  const completion = await client.chat.completions.create({
    model: options.model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a strict JSON translator for software localization. Return only a JSON object. Keep all keys identical. Preserve placeholders exactly, including {name}, {{count}}, and %s-style tokens."
      },
      {
        role: "user",
        content: [
          `Translate the JSON values from ${options.sourceLocale} to ${options.targetLocale}.`,
          "Rules:",
          "1) Output valid JSON object only.",
          "2) Keep all keys exactly as provided.",
          "3) Do not add or remove keys.",
          "4) Preserve placeholders and formatting tokens exactly.",
          `Input JSON: ${JSON.stringify(options.sourceMap)}`
        ].join("\n")
      }
    ]
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("OpenAI returned an empty response.");
  }

  const translatedMap = parseLocaleMap(
    stripCodeFence(rawContent),
    `Model output for locale ${options.targetLocale}`
  );
  const validationErrors = validateTranslatedMap(options.sourceMap, translatedMap);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(" "));
  }

  return translatedMap;
}

export async function translateLocaleBatch(
  options: TranslateBatchOptions
): Promise<TranslationBatchResult> {
  const client = new OpenAI({ apiKey: options.apiKey });
  const limit = pLimit(Math.max(1, options.concurrency));
  const uniqueLocales = [...new Set(options.targetLocales)];
  const successes = new Map<string, LocaleMap>();
  const failures: TranslationBatchResult["failures"] = [];

  await Promise.all(
    uniqueLocales.map((targetLocale) =>
      limit(async () => {
        try {
          const translatedMap = await translateToLocale(client, {
            model: options.model,
            sourceLocale: options.sourceLocale,
            targetLocale,
            sourceMap: options.sourceMap
          });
          successes.set(targetLocale, translatedMap);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          failures.push({ locale: targetLocale, reason });
        }
      })
    )
  );

  return { successes, failures };
}

