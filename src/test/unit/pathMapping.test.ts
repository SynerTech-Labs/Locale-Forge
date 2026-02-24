import { describe, expect, it } from "vitest";
import { buildTargetLocalePath, isSourceLocalePath } from "../../pathMapping";

function unixify(filePath: string | undefined): string | undefined {
  return filePath?.replace(/\\/g, "/");
}

describe("pathMapping", () => {
  it("maps en.json sibling files", () => {
    const output = buildTargetLocalePath("/project/locales/en.json", "en", "ar");
    expect(unixify(output)).toBe("/project/locales/ar.json");
  });

  it("maps *.en.json files", () => {
    const output = buildTargetLocalePath("/project/locales/messages.en.json", "en", "de");
    expect(unixify(output)).toBe("/project/locales/messages.de.json");
  });

  it("returns undefined for non-source files", () => {
    const output = buildTargetLocalePath("/project/locales/messages.json", "en", "fr");
    expect(output).toBeUndefined();
  });

  it("detects source locale files", () => {
    expect(isSourceLocalePath("/project/locales/en.json", "en")).toBe(true);
    expect(isSourceLocalePath("/project/locales/messages.en.json", "en")).toBe(true);
    expect(isSourceLocalePath("/project/locales/messages.fr.json", "en")).toBe(false);
  });
});
