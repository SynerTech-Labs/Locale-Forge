import { describe, expect, it } from "vitest";
import {
  extractLocaleCandidatesFromFileName,
  inferTargetLocalesFromSiblingNames,
  mergeTargetLocales
} from "../../localeTargets";

describe("localeTargets", () => {
  it("infers sibling targets for en.json layout", () => {
    const locales = inferTargetLocalesFromSiblingNames(
      "/repo/locales/en.json",
      ["en.json", "es.json", "ar.json", "readme.md"],
      "en"
    );
    expect(locales.sort()).toEqual(["ar", "es"]);
  });

  it("infers sibling targets for *.en.json layout", () => {
    const locales = inferTargetLocalesFromSiblingNames(
      "/repo/locales/messages.en.json",
      ["messages.en.json", "messages.fr.json", "messages.pt-BR.json", "other.es.json"],
      "en"
    );
    expect(locales.sort()).toEqual(["fr", "pt-BR"]);
  });

  it("merges configured and inferred targets", () => {
    const merged = mergeTargetLocales(["es", "fr"], ["fr", "de", "en"], "en");
    expect(merged).toEqual(["es", "fr", "de"]);
  });

  it("extracts locale candidates from generic json file names", () => {
    expect(extractLocaleCandidatesFromFileName("ar.json", "en")).toEqual(["ar"]);
    expect(extractLocaleCandidatesFromFileName("messages.es.json", "en")).toEqual(["es"]);
    expect(extractLocaleCandidatesFromFileName("en.json", "en")).toEqual([]);
  });
});

