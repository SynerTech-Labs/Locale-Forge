import * as path from "node:path";
import * as vscode from "vscode";
import { getExtensionConfig } from "./config";
import { getOpenTabDocuments, isSourceLocaleDocument } from "./localeDiscovery";
import {
  extractLocaleCandidatesFromFileName,
  inferTargetLocalesFromSiblingNames,
  mergeTargetLocales
} from "./localeTargets";
import { buildTargetLocalePath } from "./pathMapping";
import { translateLocaleBatch } from "./translator";
import type { LocaleMap, SourceFileReport } from "./types";
import { parseLocaleMap } from "./validation";

const OUTPUT_CHANNEL_NAME = "Locale Forge";
const API_KEY_SECRET = "openai.apiKey";
const SET_API_KEY_COMMAND = "localeforge.setApiKey";
const CONFIGURE_LOCALES_COMMAND = "localeforge.configureLocales";
const GENERATE_ACTIVE_COMMAND = "localeforge.generateFromActiveFile";
const GENERATE_TABS_COMMAND = "localeforge.generateFromOpenTabs";
const COMMON_LOCALES = [
  "ar",
  "de",
  "es",
  "fr",
  "it",
  "ja",
  "ko",
  "nl",
  "pl",
  "pt-BR",
  "ru",
  "tr",
  "uk",
  "zh-CN",
  "zh-TW"
];

let outputChannel: vscode.OutputChannel;

function formatAsJson(localeMap: LocaleMap): Uint8Array {
  return Buffer.from(`${JSON.stringify(localeMap, null, 2)}\n`, "utf8");
}

async function fileExists(fileUri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(fileUri);
    return true;
  } catch {
    return false;
  }
}

function getWorkspaceFolderPaths(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
}

async function readApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(API_KEY_SECRET);
}

async function commandSetApiKey(context: vscode.ExtensionContext): Promise<void> {
  const key = await vscode.window.showInputBox({
    prompt: "Enter your OpenAI API key",
    placeHolder: "sk-...",
    password: true,
    ignoreFocusOut: true
  });

  if (!key?.trim()) {
    vscode.window.showWarningMessage("Locale Forge: API key was not provided.");
    return;
  }

  await context.secrets.store(API_KEY_SECRET, key.trim());
  vscode.window.showInformationMessage("Locale Forge: OpenAI API key saved.");
}

async function detectSiblingLocales(sourcePath: string, sourceLocale: string): Promise<string[]> {
  const directoryUri = vscode.Uri.file(path.dirname(sourcePath));
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(directoryUri);
  } catch {
    return [];
  }

  const siblingNames = entries
    .filter(([, fileType]) => fileType === vscode.FileType.File)
    .map(([fileName]) => fileName);

  return inferTargetLocalesFromSiblingNames(sourcePath, siblingNames, sourceLocale);
}

async function resolveTargetLocalesForDocument(
  sourcePath: string,
  sourceLocale: string,
  configuredLocales: string[],
  autoDetectTargetLocales: boolean
): Promise<string[]> {
  if (!autoDetectTargetLocales) {
    return configuredLocales;
  }

  const inferredLocales = await detectSiblingLocales(sourcePath, sourceLocale);
  return mergeTargetLocales(configuredLocales, inferredLocales, sourceLocale);
}

function getConfigurationTarget(): vscode.ConfigurationTarget {
  return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;
}

async function commandConfigureLocales(): Promise<void> {
  const config = getExtensionConfig();
  const activeDocument = vscode.window.activeTextEditor?.document;

  const sourceLocaleInput = await vscode.window.showInputBox({
    prompt: "Locale Forge source locale code",
    value: config.sourceLocale,
    placeHolder: "en",
    ignoreFocusOut: true
  });

  if (!sourceLocaleInput?.trim()) {
    vscode.window.showWarningMessage("Locale Forge: setup cancelled (source locale missing).");
    return;
  }

  const sourceLocale = sourceLocaleInput.trim();
  const detected = new Set<string>();

  if (activeDocument?.uri.scheme === "file") {
    const locales = await detectSiblingLocales(activeDocument.uri.fsPath, sourceLocale);
    for (const locale of locales) {
      detected.add(locale);
    }
  }

  for (const document of vscode.workspace.textDocuments) {
    if (document.uri.scheme !== "file") {
      continue;
    }
    for (const locale of extractLocaleCandidatesFromFileName(
      path.basename(document.uri.fsPath),
      sourceLocale
    )) {
      detected.add(locale);
    }
  }

  const options = [...new Set([...config.targetLocales, ...COMMON_LOCALES, ...detected])];
  const picks = options.map((locale) => {
    let description = "common";
    if (detected.has(locale)) {
      description = "detected";
    } else if (config.targetLocales.includes(locale)) {
      description = "configured";
    }
    return {
      label: locale,
      description,
      picked: config.targetLocales.includes(locale)
    };
  });

  const selected = await vscode.window.showQuickPick(picks, {
    canPickMany: true,
    title: "Locale Forge: Choose target locales",
    placeHolder: "Select locales to generate"
  });

  if (!selected) {
    vscode.window.showWarningMessage("Locale Forge: setup cancelled.");
    return;
  }

  const chosenLocales = selected.map((item) => item.label);
  const target = getConfigurationTarget();
  const settings = vscode.workspace.getConfiguration("localeforge");
  await settings.update("sourceLocale", sourceLocale, target);
  await settings.update("targetLocales", chosenLocales, target);

  const detectionChoice = await vscode.window.showQuickPick(
    [
      {
        label: "On",
        description: "Automatically include locales detected from sibling files",
        value: true
      },
      {
        label: "Off",
        description: "Use only configured locales",
        value: false
      }
    ],
    {
      title: "Locale Forge: Auto-detect target locales",
      placeHolder: "Choose auto-detection mode"
    }
  );

  if (detectionChoice) {
    await settings.update("autoDetectTargetLocales", detectionChoice.value, target);
  }

  vscode.window.showInformationMessage(
    `Locale Forge: saved source=${sourceLocale}, targets=${chosenLocales.join(", ") || "(none)"}.`
  );
}

async function processSourceDocument(
  document: vscode.TextDocument,
  apiKey: string,
  context: vscode.ExtensionContext
): Promise<SourceFileReport> {
  const config = getExtensionConfig();
  const sourcePath = document.uri.fsPath;
  const report: SourceFileReport = {
    sourcePath,
    generated: [],
    skipped: [],
    failures: []
  };

  let sourceMap: LocaleMap;
  try {
    sourceMap = parseLocaleMap(document.getText(), `Source file ${sourcePath}`);
  } catch (error) {
    report.failures.push({
      reason: error instanceof Error ? error.message : String(error)
    });
    return report;
  }

  const targetLocales = await resolveTargetLocalesForDocument(
    sourcePath,
    config.sourceLocale,
    config.targetLocales,
    config.autoDetectTargetLocales
  );
  if (targetLocales.length === 0) {
    report.failures.push({
      reason:
        "No target locales configured or detected. Run 'Locale Forge: Configure Locales' first."
    });
    return report;
  }

  const translationResult = await translateLocaleBatch({
    apiKey,
    sourceLocale: config.sourceLocale,
    sourceMap,
    targetLocales,
    concurrency: config.concurrency,
    model: config.model
  });

  for (const failure of translationResult.failures) {
    report.failures.push({
      locale: failure.locale,
      reason: failure.reason
    });
  }

  for (const [targetLocale, translatedMap] of translationResult.successes) {
    const targetPath = buildTargetLocalePath(sourcePath, config.sourceLocale, targetLocale);
    if (!targetPath) {
      report.skipped.push(
        `Could not derive target path for ${targetLocale} from ${path.basename(sourcePath)}`
      );
      continue;
    }

    const targetUri = vscode.Uri.file(targetPath);
    if (!config.overwriteExisting && (await fileExists(targetUri))) {
      report.skipped.push(`Skipped existing file ${targetPath}`);
      continue;
    }

    try {
      await vscode.workspace.fs.writeFile(targetUri, formatAsJson(translatedMap));
      report.generated.push(targetPath);
    } catch (error) {
      report.failures.push({
        locale: targetLocale,
        targetPath,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  await context.secrets.store(API_KEY_SECRET, apiKey);
  return report;
}

function appendReport(report: SourceFileReport): void {
  outputChannel.appendLine(`Source: ${report.sourcePath}`);

  if (report.generated.length > 0) {
    outputChannel.appendLine("  Generated:");
    for (const generated of report.generated) {
      outputChannel.appendLine(`    - ${generated}`);
    }
  }

  if (report.skipped.length > 0) {
    outputChannel.appendLine("  Skipped:");
    for (const skipped of report.skipped) {
      outputChannel.appendLine(`    - ${skipped}`);
    }
  }

  if (report.failures.length > 0) {
    outputChannel.appendLine("  Failures:");
    for (const failure of report.failures) {
      const localePrefix = failure.locale ? `[${failure.locale}] ` : "";
      const pathPrefix = failure.targetPath ? `${failure.targetPath}: ` : "";
      outputChannel.appendLine(`    - ${localePrefix}${pathPrefix}${failure.reason}`);
    }
  }

  outputChannel.appendLine("");
}

async function runGeneration(
  context: vscode.ExtensionContext,
  candidateDocuments: vscode.TextDocument[],
  sourceLabel: string
): Promise<void> {
  const workspaceFolderPaths = getWorkspaceFolderPaths();
  const config = getExtensionConfig();

  const sourceDocuments = candidateDocuments.filter((document) =>
    isSourceLocaleDocument(document, config, workspaceFolderPaths)
  );

  if (sourceDocuments.length === 0) {
    vscode.window.showWarningMessage(
      `Locale Forge: no source locale files found in ${sourceLabel}.`
    );
    return;
  }

  const apiKey = await readApiKey(context);
  if (!apiKey) {
    const action = "Set API Key";
    const selected = await vscode.window.showErrorMessage(
      "Locale Forge: OpenAI API key is not configured.",
      action
    );
    if (selected === action) {
      await vscode.commands.executeCommand(SET_API_KEY_COMMAND);
    }
    return;
  }

  outputChannel.clear();
  outputChannel.appendLine(`Locale Forge run source: ${sourceLabel}`);
  outputChannel.appendLine(`Source locale: ${config.sourceLocale}`);
  outputChannel.appendLine(`Configured targets: ${config.targetLocales.join(", ") || "(none)"}`);
  outputChannel.appendLine(`Auto-detect targets: ${config.autoDetectTargetLocales ? "on" : "off"}`);
  outputChannel.appendLine(`Model: ${config.model}`);
  outputChannel.appendLine("");

  const reports: SourceFileReport[] = [];
  await vscode.window.withProgress(
    {
      title: "Locale Forge: generating locale files",
      location: vscode.ProgressLocation.Notification
    },
    async (progress) => {
      const total = sourceDocuments.length;
      for (let index = 0; index < total; index += 1) {
        const document = sourceDocuments[index];
        if (!document) {
          continue;
        }
        progress.report({
          message: `Processing ${path.basename(document.uri.fsPath)} (${index + 1}/${total})`,
          increment: 100 / total
        });
        reports.push(await processSourceDocument(document, apiKey, context));
      }
    }
  );

  let totalGenerated = 0;
  let totalFailures = 0;
  let totalSkipped = 0;
  for (const report of reports) {
    totalGenerated += report.generated.length;
    totalFailures += report.failures.length;
    totalSkipped += report.skipped.length;
    appendReport(report);
  }

  outputChannel.show(true);
  vscode.window.showInformationMessage(
    `Locale Forge complete. Generated: ${totalGenerated}, Skipped: ${totalSkipped}, Failures: ${totalFailures}`
  );
}

async function commandGenerateFromActiveFile(context: vscode.ExtensionContext): Promise<void> {
  const activeDocument = vscode.window.activeTextEditor?.document;
  if (!activeDocument) {
    vscode.window.showWarningMessage("Locale Forge: no active file available.");
    return;
  }

  await runGeneration(context, [activeDocument], "active file");
}

async function commandGenerateFromOpenTabs(context: vscode.ExtensionContext): Promise<void> {
  const openTabDocuments = await getOpenTabDocuments();
  if (openTabDocuments.length === 0) {
    vscode.window.showWarningMessage("Locale Forge: no readable open tabs found.");
    return;
  }

  await runGeneration(context, openTabDocuments, "open tabs");
}

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(outputChannel);

  context.subscriptions.push(
    vscode.commands.registerCommand(SET_API_KEY_COMMAND, async () => commandSetApiKey(context))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(CONFIGURE_LOCALES_COMMAND, async () => commandConfigureLocales())
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(GENERATE_ACTIVE_COMMAND, async () =>
      commandGenerateFromActiveFile(context)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(GENERATE_TABS_COMMAND, async () =>
      commandGenerateFromOpenTabs(context)
    )
  );
}

export function deactivate(): void {
  if (outputChannel) {
    outputChannel.dispose();
  }
}
