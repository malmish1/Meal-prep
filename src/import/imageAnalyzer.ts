import type { RecipeDraft } from "../domain/recipe";
import { structureRecipe } from "./recipeParser";
export type AnalysisStatus =
  | "Förbereder bilder…"
  | "Läser recept…"
  | "Strukturerar ingredienser…"
  | "Kontrollerar resultat…";
export interface RecipeImageAnalyzer {
  analyze(
    files: File[],
    status: (s: AnalysisStatus) => void,
  ): Promise<RecipeDraft>;
}
export class LocalOcrAnalyzer implements RecipeImageAnalyzer {
  async analyze(files: File[], status: (s: AnalysisStatus) => void) {
    status("Förbereder bilder…");
    const { createWorker } = await import("tesseract.js");
    status("Läser recept…");
    const worker = await createWorker(["swe", "eng"]);
    const texts: string[] = [];
    try {
      for (const file of files)
        texts.push((await worker.recognize(file)).data.text);
    } finally {
      await worker.terminate();
    }
    status("Strukturerar ingredienser…");
    const draft = structureRecipe(texts);
    status("Kontrollerar resultat…");
    return draft;
  }
}
