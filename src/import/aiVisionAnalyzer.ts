import { emptyRecipe, type RecipeDraft } from "../domain/recipe";
import type { AnalysisStatus, RecipeImageAnalyzer } from "./imageAnalyzer";

type AiIngredient = {
  amount: string | null;
  unit: string | null;
  ingredient: string;
  note: string | null;
  uncertain: boolean;
};

export type AiRecipeResult = {
  title: string;
  description: string;
  servings: number | null;
  ingredients: AiIngredient[];
  instructions: string[];
  nutrition: {
    caloriesPerServing: number | null;
    proteinGramsPerServing: number | null;
    carbsGramsPerServing: number | null;
    fatGramsPerServing: number | null;
  };
  source: { name: string | null; url: string | null };
  confidence: {
    overall: number;
    title: number;
    ingredients: number;
    instructions: number;
  };
  warnings: string[];
};

export class AiAnalysisError extends Error {
  constructor(public readonly kind: "offline" | "unavailable" | "limit" | "invalid") {
    super(kind);
  }
}

const apiUrl =
  (import.meta.env.VITE_RECIPE_API_URL as string | undefined) ??
  "https://meal-prep-api.malmish1.workers.dev";

export class AiVisionAnalyzer implements RecipeImageAnalyzer {
  async analyze(files: File[], status: (s: AnalysisStatus) => void) {
    if (!navigator.onLine) throw new AiAnalysisError("offline");
    if (!apiUrl) throw new AiAnalysisError("unavailable");
    status("Förbereder bilder…");
    const images: string[] = [];
    for (const file of files) images.push(await optimizeRecipeImage(file));
    status("AI-tolkar receptet…");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
        signal: controller.signal,
      });
      if (response.status === 429 || response.status === 402)
        throw new AiAnalysisError("limit");
      if (!response.ok) throw new AiAnalysisError("unavailable");
      const result = (await response.json()) as AiRecipeResult;
      status("Kontrollerar resultat…");
      return toRecipeDraft(result);
    } catch (error) {
      if (error instanceof AiAnalysisError) throw error;
      throw new AiAnalysisError(error instanceof DOMException && error.name === "AbortError" ? "unavailable" : "offline");
    } finally {
      window.clearTimeout(timeout);
    }
  }
}

export function toRecipeDraft(result: AiRecipeResult): RecipeDraft {
  const base = emptyRecipe();
  const warnings = [...result.warnings];
  if (result.servings === null) warnings.push("Kontrollera portionsantal – det kunde inte läsas säkert.");
  if (result.confidence.title < 0.7) warnings.push("Kontrollera receptets titel.");
  return {
    ...base,
    title: result.title,
    description: result.description,
    sourceType: "ai-image",
    importWarnings: [...new Set(warnings)],
    sourceName: result.source.name ?? "",
    sourceUrl: result.source.url ?? "",
    servings: result.servings ?? undefined,
    caloriesPerServing: result.nutrition.caloriesPerServing ?? undefined,
    proteinGramsPerServing: result.nutrition.proteinGramsPerServing ?? undefined,
    carbsGramsPerServing: result.nutrition.carbsGramsPerServing ?? undefined,
    fatGramsPerServing: result.nutrition.fatGramsPerServing ?? undefined,
    ingredients: result.ingredients.map((item) => ({
      id: crypto.randomUUID(),
      name: item.ingredient,
      quantity: item.amount ?? "",
      unit: item.unit ?? "",
      note: item.note ?? undefined,
      uncertain: item.uncertain,
    })),
    instructions: result.instructions.map((text, index) => ({
      id: crypto.randomUUID(), order: index + 1, text,
    })),
  };
}

async function optimizeRecipeImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new AiAnalysisError("invalid");
  const bitmap = await createImageBitmap(file);
  try {
    const maxSide = 2400;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new AiAnalysisError("invalid");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    bitmap.close();
  }
}
