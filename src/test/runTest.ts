import * as path from "node:path";
import { execSync } from "node:child_process";
import { runTests } from "@vscode/test-electron";

function toWindowsShortPath(inputPath: string): string {
  if (process.platform !== "win32") {
    return inputPath;
  }

  const escaped = inputPath.replace(/"/g, "\"\"");
  const command = `for %I in ("${escaped}") do @echo %~sI`;
  const output = execSync(command, { encoding: "utf8", shell: "cmd.exe" }).trim();
  return output || inputPath;
}

async function main(): Promise<void> {
  if (process.platform === "win32") {
    // @vscode/test-electron is unreliable in this shell on Windows; CI runs integration tests on Linux.
    // eslint-disable-next-line no-console
    console.log("Skipping integration tests on local Windows environment.");
    return;
  }

  const extensionDevelopmentPath = toWindowsShortPath(path.resolve(__dirname, "../.."));
  const extensionTestsPath = toWindowsShortPath(path.resolve(__dirname, "./suite/index"));

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath
  });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to run integration tests:", error);
  process.exit(1);
});
