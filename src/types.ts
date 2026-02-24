export type LocaleMap = Record<string, string>;

export interface ExtensionConfig {
  sourceLocale: string;
  targetLocales: string[];
  autoDetectTargetLocales: boolean;
  model: string;
  concurrency: number;
  filePatterns: string[];
  overwriteExisting: boolean;
}

export interface LocaleTranslationFailure {
  locale: string;
  reason: string;
}

export interface TranslationBatchResult {
  successes: Map<string, LocaleMap>;
  failures: LocaleTranslationFailure[];
}

export interface TranslateBatchOptions {
  apiKey: string;
  model: string;
  sourceLocale: string;
  sourceMap: LocaleMap;
  targetLocales: string[];
  concurrency: number;
}

export interface SourceFileFailure {
  locale?: string;
  targetPath?: string;
  reason: string;
}

export interface SourceFileReport {
  sourcePath: string;
  generated: string[];
  skipped: string[];
  failures: SourceFileFailure[];
}
