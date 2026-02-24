# Locale Forge Architecture

## Overview

Locale Forge translates flat English locale JSON files into multiple target locales using OpenAI. The extension processes either the active file or all open tabs and writes translated sibling files.

## Module Layout

- `src/extension.ts`
  - Command registration.
  - Main workflow for active file/open tabs processing.
  - Progress and output channel reporting.
  - SecretStorage integration for API key.
  - Interactive locale setup command.
- `src/config.ts`
  - Reads and sanitizes VS Code settings.
- `src/localeDiscovery.ts`
  - Detects source locale documents via glob patterns and locale naming conventions.
  - Enumerates open tab documents.
- `src/pathMapping.ts`
  - Maps source paths to target locale output paths.
- `src/translator.ts`
  - Calls OpenAI with parallelism and structured output requirements.
  - Validates translated JSON shape and placeholders.
- `src/validation.ts`
  - Parses locale JSON and enforces flat object/string values.
- `src/placeholders.ts`
  - Validates placeholder token preservation.

## Data Flow

1. Command is triggered.
2. Candidate documents are collected.
3. Source locale documents are filtered by pattern/locale naming.
4. Source JSON is parsed and validated.
5. Target locales are resolved from configured locales plus optional sibling-file auto-detection.
6. OpenAI requests run in parallel for target locales.
7. Each result is validated for key and placeholder consistency.
8. Output locale files are written and summarized in output channel.

## Failure Behavior

- Translation failures for one locale do not stop other locales.
- Invalid model output for one locale is reported and skipped.
- Source parse errors fail only that file.

## Security

- API key is stored in VS Code `SecretStorage`.
- Key is never persisted to workspace settings.
