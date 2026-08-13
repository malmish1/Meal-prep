import { describe, expect, it } from "vitest";
import { isRecipeResult } from "./schema";

describe("server response validation", () => {
  it("rejects prose or incomplete ingredient rows", () => {
    expect(isRecipeResult("a recipe")) .toBe(false);
    expect(isRecipeResult({ title: "Soppa", description: "", ingredients: [{}], instructions: [], warnings: [] })).toBe(false);
  });
});
