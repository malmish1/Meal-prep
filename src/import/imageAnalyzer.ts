import type { RecipeDraft } from "../domain/recipe";
import {
  structureRecipeFromLines,
  type OcrLine,
  type ParserDebug,
} from "./recipeParser";
export let lastImportDebug: ParserDebug | undefined;
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
    const pages: OcrLine[][] = [];
    try {
      for (let page = 0; page < files.length; page++) {
        const data = (await worker.recognize(files[page], {}, { blocks: true }))
          .data;
        const lines = (data.blocks ?? []).flatMap((block) =>
          block.paragraphs.flatMap((paragraph) => paragraph.lines),
        );
        const height = Math.max(1, ...lines.map((line) => line.bbox.y1));
        pages.push(
          lines.length
            ? lines.map((line) => ({
                text: line.text,
                page,
                top: line.bbox.y0 / height,
                bottom: line.bbox.y1 / height,
              }))
            : data.text.split(/\r?\n/).map((text) => ({ text, page })),
        );
      }
    } finally {
      await worker.terminate();
    }
    status("Strukturerar ingredienser…");
    const result = structureRecipeFromLines(pages);
    lastImportDebug = result.debug;
    status("Kontrollerar resultat…");
    return result.draft;
  }
}
