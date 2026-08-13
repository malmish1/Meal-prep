export const recipeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "detectedLanguage", "originalText", "servings", "ingredients", "instructions", "nutrition", "source", "confidence", "warnings"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    detectedLanguage: { type:"string", enum:["sv","en","other"] },
    originalText: { type:"string" },
    servings: { type: ["number", "null"] },
    ingredients: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["amount", "unit", "ingredient", "note", "uncertain"],
        properties: {
          amount: { type: ["string", "null"] }, unit: { type: ["string", "null"] },
          ingredient: { type: "string" }, note: { type: ["string", "null"] }, uncertain: { type: "boolean" },
        },
      },
    },
    instructions: { type: "array", items: { type: "string" } },
    nutrition: nullableNumbers(["caloriesPerServing", "proteinGramsPerServing", "carbsGramsPerServing", "fatGramsPerServing"]),
    source: {
      type: "object", additionalProperties: false, required: ["name", "url"],
      properties: { name: { type: ["string", "null"] }, url: { type: ["string", "null"] } },
    },
    confidence: {
      type: "object", additionalProperties: false,
      required: ["overall", "title", "ingredients", "instructions"],
      properties: Object.fromEntries(["overall", "title", "ingredients", "instructions"].map((key) => [key, { type: "number", minimum: 0, maximum: 1 }])),
    },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;

function nullableNumbers(keys: string[]) {
  return {
    type: "object", additionalProperties: false, required: keys,
    properties: Object.fromEntries(keys.map((key) => [key, { type: ["number", "null"] }])),
  };
}

export function isRecipeResult(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.title === "string" && typeof v.description === "string" && ["sv","en","other"].includes(String(v.detectedLanguage)) && typeof v.originalText === "string" &&
    Array.isArray(v.ingredients) && v.ingredients.every((item) => {
      if (!item || typeof item !== "object") return false;
      const i = item as Record<string, unknown>;
      return typeof i.ingredient === "string" && typeof i.uncertain === "boolean";
    }) && Array.isArray(v.instructions) && v.instructions.every((step) => typeof step === "string") &&
    Array.isArray(v.warnings);
}
