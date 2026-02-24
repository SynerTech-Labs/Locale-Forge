import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import * as vscode from "vscode";

function getExtensionId(): string {
  const packageJsonPath = path.resolve(__dirname, "../../../package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    publisher: string;
    name: string;
  };
  return `${packageJson.publisher}.${packageJson.name}`;
}

describe("Locale Forge integration", () => {
  it("registers commands on activation", async () => {
    const extension = vscode.extensions.getExtension(getExtensionId());
    assert.ok(extension, "Expected extension to be discoverable by id.");
    await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("localeforge.generateFromActiveFile"));
    assert.ok(commands.includes("localeforge.generateFromOpenTabs"));
    assert.ok(commands.includes("localeforge.setApiKey"));
    assert.ok(commands.includes("localeforge.configureLocales"));
  });
});
