import assert from "node:assert";
import * as vscode from "vscode";

describe("Locale Forge integration", () => {
  it("registers commands on activation", async () => {
    const extension = vscode.extensions.getExtension("localeforge.locale-forge");
    assert.ok(extension, "Expected extension to be discoverable by id.");
    await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("localeforge.generateFromActiveFile"));
    assert.ok(commands.includes("localeforge.generateFromOpenTabs"));
    assert.ok(commands.includes("localeforge.setApiKey"));
    assert.ok(commands.includes("localeforge.configureLocales"));
  });
});
