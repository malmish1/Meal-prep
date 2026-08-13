import { describe, expect, it, vi } from "vitest";
import { toRecipeDraft, type AiRecipeResult } from "./aiVisionAnalyzer";

describe("AI recipe mapping", () => {
  it("keeps semantic title, description and uncertainty", () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValueOnce("base").mockReturnValueOnce("ingredient").mockReturnValueOnce("step") });
    const result: AiRecipeResult = {
      title: "Snabb tonfiskröra", description: "Snabb tonfiskröra som du enkelt svänger ihop.", servings: null,
      ingredients: [{ amount: null, unit: null, ingredient: "olivolja", note: null, uncertain: true }],
      instructions: ["Blanda ingredienserna."],
      nutrition: { caloriesPerServing: null, proteinGramsPerServing: null, carbsGramsPerServing: null, fatGramsPerServing: null },
      source: { name: null, url: null }, confidence: { overall: .8, title: .99, ingredients: .7, instructions: .8 }, warnings: [],
    };
    const draft = toRecipeDraft(result);
    expect(draft.title).toBe("Snabb tonfiskröra");
    expect(draft.description).not.toContain("11:25");
    expect(draft.ingredients[0]).toMatchObject({ name: "olivolja", uncertain: true });
    expect(draft.sourceType).toBe("ai-image");
  });
});
