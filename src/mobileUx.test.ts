import { describe, expect, it } from "vitest";
// @ts-expect-error Node typings are intentionally not shipped in the browser tsconfig.
import fs from "node:fs";

describe("mobile planner UX regression", () => {
  it("keeps safe areas, sticky macros and collision-safe recipe cards", () => {
    const html = fs.readFileSync("index.html", "utf8");
    const globalCss = fs.readFileSync("src/styles.css", "utf8");
    const weeklyCss = fs.readFileSync("src/weekly-extra.css", "utf8");
    const promotionCss = fs.readFileSync("src/promotions.css", "utf8");

    expect(html).toContain("viewport-fit=cover");
    expect(globalCss).toContain("env(safe-area-inset-top)");
    expect(globalCss).toContain("env(safe-area-inset-bottom)");
    expect(weeklyCss).toContain("position:sticky");
    expect(weeklyCss).toContain("top:calc(8px + env(safe-area-inset-top))");
    expect(weeklyCss).toContain("grid-template-columns:minmax(0,1fr) auto");
    expect(weeklyCss).toContain("overflow-wrap:anywhere");
    expect(weeklyCss).not.toContain(".selection-button{position:absolute");
    expect(weeklyCss).toContain(".edit-proposal{display:flex");
    expect(weeklyCss).toContain(".edit-proposal{align-items:stretch;flex-direction:column}");
    expect(promotionCss).toContain("env(safe-area-inset-bottom)");
  });

  it("keeps each meal section independently accessible and collapsible", () => {
    const component = fs.readFileSync("src/components/WeeklyGenerator.tsx", "utf8");

    expect(component).toContain("aria-expanded={!collapsed}");
    expect(component).toContain("LiveDailyMacroBar");
    expect(component).toContain("calculateSelectionDailyAverage");
    expect(component).toContain("proposedSelections");
    expect(component).toContain("BEKRÄFTA BYTE");
  });
});
