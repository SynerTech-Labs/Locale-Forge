import { describe, expect, it } from "vitest";
import { parseLocaleMap, validateTranslatedMap } from "../../validation";

describe("validation", () => {
  it("parses flat locale map", () => {
    const parsed = parseLocaleMap('{"hello":"Hello","bye":"Goodbye"}', "test");
    expect(parsed).toEqual({ hello: "Hello", bye: "Goodbye" });
  });

  it("rejects nested values", () => {
    expect(() => parseLocaleMap('{"hello":{"nested":"x"}}', "test")).toThrow(
      'test key "hello" must map to a string value.'
    );
  });

  it("detects missing keys and placeholder mismatches", () => {
    const source = { greeting: "Hello {name}", count: "Count {{count}}" };
    const translated = { greeting: "Hola {nombre}" };
    const errors = validateTranslatedMap(source, translated);

    expect(errors).toContain('Missing key "count" in translated output.');
    expect(errors).toContain('Placeholder mismatch for key "greeting"');
  });
});

