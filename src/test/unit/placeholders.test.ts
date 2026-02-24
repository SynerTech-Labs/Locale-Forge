import { describe, expect, it } from "vitest";
import { validatePlaceholderPreservation } from "../../placeholders";

describe("placeholders", () => {
  it("passes when placeholders are preserved", () => {
    const source = {
      greeting: "Hello {name}",
      count: "You have {{count}} messages and %s tasks"
    };
    const translated = {
      greeting: "Hola {name}",
      count: "Tienes {{count}} mensajes y %s tareas"
    };

    expect(validatePlaceholderPreservation(source, translated)).toEqual([]);
  });

  it("fails when placeholders change", () => {
    const source = { greeting: "Hello {name}" };
    const translated = { greeting: "Hola {nombre}" };

    expect(validatePlaceholderPreservation(source, translated)).toEqual([
      'Placeholder mismatch for key "greeting"'
    ]);
  });
});

