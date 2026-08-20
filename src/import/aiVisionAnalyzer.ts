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
  detectedLanguage:"sv"|"en"|"other";
  originalText:string;
  originalServings: number | null;
  /** Temporary response compatibility while the GitHub Pages client and Worker deploy independently. */
  servings?: number | null;
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
    const images = await Promise.all(files.map(optimizeRecipeImage));
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
  const originalServings = result.originalServings ?? result.servings ?? null;
  if (originalServings === null) warnings.push("Originalportioner saknas – fyll i dem för tillförlitlig skalning.");
  if (result.confidence.title < 0.7) warnings.push("Kontrollera receptets titel.");
  return {
    ...base,
    title: result.title,
    description: result.description,
    sourceType: "ai-image",
    importLanguage: result.detectedLanguage,
    originalImportText: result.originalText,
    importWarnings: [...new Set(warnings)],
    sourceName: result.source.name ?? "",
    sourceUrl: result.source.url ?? "",
    servings: originalServings ?? undefined,
    originalServings,
    caloriesPerServing: result.nutrition.caloriesPerServing ?? undefined,
    proteinGramsPerServing: result.nutrition.proteinGramsPerServing ?? undefined,
    carbsGramsPerServing: result.nutrition.carbsGramsPerServing ?? undefined,
    fatGramsPerServing: result.nutrition.fatGramsPerServing ?? undefined,
    ingredients: result.ingredients.map((item) => {const converted=convertMeasurement(item.amount,item.unit);return({
      id: crypto.randomUUID(),
      name: item.ingredient,
      quantity: converted.amount,
      unit: converted.unit,
      note: item.note ?? undefined,
      uncertain: item.uncertain,
    })}),
    instructions: result.instructions.map((text, index) => ({
      id: crypto.randomUUID(), order: index + 1, text:convertTemperatures(text),
    })),
  };
}

const numeric=(value:string|null)=>{if(!value)return null;const n=Number(value.replace(",","."));return Number.isFinite(n)?n:null};
const rounded=(value:number,step=5)=>String(Math.round(value/step)*step).replace(".",",");
export function convertMeasurement(amount:string|null,unit:string|null){const u=(unit??"").trim().toLowerCase(),n=numeric(amount);if(n==null)return{amount:amount??"",unit:unit??""};if(["lb","lbs","pound","pounds"].includes(u)){const g=n*453.592;return g>=1000?{amount:(Math.round(g/100)/10).toString().replace(".",","),unit:"kg"}:{amount:rounded(g,5),unit:"g"}}if(["oz","ounce","ounces"].includes(u))return{amount:rounded(n*28.3495,5),unit:"g"};if(["fl oz","fluid ounce","fluid ounces"].includes(u)){const ml=n*29.5735;return ml>=100?{amount:(Math.round(ml/10)/10).toString().replace(".",","),unit:"dl"}:{amount:rounded(ml,5),unit:"ml"}}if(["cup","cups"].includes(u))return{amount:(Math.round(n*24)/10).toString().replace(".",","),unit:"dl"};if(["tbsp","tablespoon","tablespoons"].includes(u))return{amount:amount??String(n),unit:"msk"};if(["tsp","teaspoon","teaspoons"].includes(u))return{amount:amount??String(n),unit:"tsk"};return{amount:amount??"",unit:unit??""}}
export function convertTemperatures(text:string){return text.replace(/(\d{2,3})\s*°?\s*F\b/gi,(_,raw)=>`${Math.round(((Number(raw)-32)*5/9)/10)*10} °C`)}

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
