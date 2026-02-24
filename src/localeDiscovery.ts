import path from "node:path";
import { minimatch } from "minimatch";
import * as vscode from "vscode";
import { isSourceLocalePath, normalizePathForMatch } from "./pathMapping";
import type { ExtensionConfig } from "./types";

function toNormalizedPattern(pattern: string): string {
  return pattern.replace(/\\/g, "/");
}

function getRelativeCandidates(filePath: string, workspaceFolderPaths: string[]): string[] {
  const candidates: string[] = [];
  for (const folderPath of workspaceFolderPaths) {
    const relativePath = path.relative(folderPath, filePath);
    if (!relativePath || relativePath.startsWith("..")) {
      continue;
    }
    candidates.push(normalizePathForMatch(relativePath));
  }
  return candidates;
}

export function matchesSourceLocaleFilePath(
  filePath: string,
  config: ExtensionConfig,
  workspaceFolderPaths: string[]
): boolean {
  const normalizedAbsolutePath = normalizePathForMatch(filePath);
  const candidates = [normalizedAbsolutePath, ...getRelativeCandidates(filePath, workspaceFolderPaths)];

  const patternMatch = config.filePatterns.some((pattern) => {
    const normalizedPattern = toNormalizedPattern(pattern);
    return candidates.some((candidate) =>
      minimatch(candidate, normalizedPattern, { nocase: true, dot: true, matchBase: true })
    );
  });

  if (patternMatch) {
    return true;
  }

  return isSourceLocalePath(filePath, config.sourceLocale);
}

export function isSourceLocaleDocument(
  document: vscode.TextDocument,
  config: ExtensionConfig,
  workspaceFolderPaths: string[]
): boolean {
  if (document.uri.scheme !== "file") {
    return false;
  }
  if (!(document.languageId === "json" || document.languageId === "jsonc")) {
    return false;
  }
  return matchesSourceLocaleFilePath(document.uri.fsPath, config, workspaceFolderPaths);
}

function getUriFromTab(tab: vscode.Tab): vscode.Uri | undefined {
  if (tab.input instanceof vscode.TabInputText) {
    return tab.input.uri;
  }
  if (tab.input instanceof vscode.TabInputTextDiff) {
    return tab.input.modified;
  }
  return undefined;
}

export async function getOpenTabDocuments(): Promise<vscode.TextDocument[]> {
  const uniqueUris = new Map<string, vscode.Uri>();
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const uri = getUriFromTab(tab);
      if (uri?.scheme === "file") {
        uniqueUris.set(uri.toString(), uri);
      }
    }
  }

  const documents = await Promise.all(
    [...uniqueUris.values()].map(async (uri) => {
      try {
        return await vscode.workspace.openTextDocument(uri);
      } catch {
        return undefined;
      }
    })
  );

  return documents.filter((value): value is vscode.TextDocument => value !== undefined);
}

