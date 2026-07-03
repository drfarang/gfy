import { describe, expect, test } from "bun:test";
import { applyTheme, omarchyPalettes, resolveThemeName, theme, themeNames, themes } from "../src/ui/theme";

const HEX = /^#[0-9a-f]{6}$/i;
const MIN_BODY_CONTRAST = 4.5;

describe("themes", () => {
  test("exposes Omarchy palettes as app themes", () => {
    expect(themeNames).toContain("tokyo-night");
    expect(themeNames).toContain("catppuccin-latte");
    expect(themeNames).toContain("vantablack");
    expect(themeNames).toHaveLength(Object.keys(omarchyPalettes).length);

    for (const name of themeNames) {
      const appTheme = themes[name]!;
      for (const color of Object.values(appTheme)) {
        expect(color).toMatch(HEX);
      }
    }
  });

  test("resolves legacy theme aliases", () => {
    expect(resolveThemeName("latte")).toBe("catppuccin-latte");
    expect(applyTheme("latte")).toBe(true);
    expect(theme.bg).toBe(omarchyPalettes["catppuccin-latte"].background);
  });

  test("rejects unknown theme names without mutating the current theme", () => {
    applyTheme("tokyo-night");
    const before = { ...theme };

    expect(applyTheme("does-not-exist")).toBe(false);
    expect(theme).toEqual(before);
    expect(resolveThemeName("does-not-exist")).toBe("tokyo-night");
  });

  test("quote body colors use foreground when dim is background-adjacent", () => {
    expect(themes.gruvbox!.dim).toBe(omarchyPalettes.gruvbox.color8);
    expect(themes.gruvbox!.quoteFg).toBe(omarchyPalettes.gruvbox.foreground);
    expect(themes.gruvbox!.quoteFg).not.toBe(themes.gruvbox!.dim);
  });

  test("quote body text has readable contrast in every theme", () => {
    for (const name of themeNames) {
      const appTheme = themes[name]!;
      expect(contrastRatio(appTheme.quoteFg, appTheme.bg), name).toBeGreaterThanOrEqual(MIN_BODY_CONTRAST);
    }
  });
});

function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [lr, lg, lb] = [r!, g!, b!].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * lr! + 0.7152 * lg! + 0.0722 * lb!;
}
