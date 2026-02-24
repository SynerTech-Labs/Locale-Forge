# Locale Forge

Locale Forge is a VS Code extension that generates locale JSON files from English source files using OpenAI, with parallel translation requests and strict placeholder preservation checks.

## Features

- Generate locale files from the active file.
- Generate locale files from all currently open tabs.
- Support both locale layouts:
  - `.../en.json` -> `.../<locale>.json`
  - `.../*.en.json` -> `.../*.<locale>.json`
- Parallel translation for faster runs.
- Strict validation:
  - Flat JSON object only.
  - Keys must be identical.
  - Placeholders such as `{name}`, `{{count}}`, `%s` must remain intact.

## Commands

- `Locale Forge: Set OpenAI API Key` (`localeforge.setApiKey`)
- `Locale Forge: Configure Locales` (`localeforge.configureLocales`)
- `Locale Forge: Generate Locales From Active File` (`localeforge.generateFromActiveFile`)
- `Locale Forge: Generate Locales From Open Tabs` (`localeforge.generateFromOpenTabs`)

## Configuration

| Setting | Default | Description |
|---|---|---|
| `localeforge.sourceLocale` | `"en"` | Source locale code. |
| `localeforge.targetLocales` | `["es","fr","de","it","pt-BR"]` | Locales to generate. |
| `localeforge.autoDetectTargetLocales` | `true` | Auto-include locales detected from sibling files. |
| `localeforge.openai.model` | `"gpt-4.1-mini"` | OpenAI model for translations. |
| `localeforge.concurrency` | `4` | Max parallel translation calls. |
| `localeforge.filePatterns` | `["**/en.json","**/*.en.json"]` | Source file detection patterns. |
| `localeforge.overwriteExisting` | `true` | Overwrite existing locale files when generating. |

## Usage

1. Run `Locale Forge: Set OpenAI API Key`.
2. Run `Locale Forge: Configure Locales` and choose source/target locales interactively.
3. Open a source locale file such as `en.json` or `messages.en.json`.
4. Run one of:
   - `Locale Forge: Generate Locales From Active File`
   - `Locale Forge: Generate Locales From Open Tabs`
5. Review output in the `Locale Forge` output channel.

If `autoDetectTargetLocales` is enabled, Locale Forge also discovers existing sibling locale files automatically (for example, `ar.json` next to `en.json`, or `messages.fr.json` next to `messages.en.json`).

## Development

```bash
npm install
npm run lint
npm run compile
npm run test
npm run package:vsix
```

## Release

- CI runs on every push to `main`.
- The workflow builds, tests, packages a `.vsix`, and attempts publish to Marketplace if `VSCE_PAT` is available and the version is not already published.

See:

- `docs/architecture.md`
- `docs/release.md`
