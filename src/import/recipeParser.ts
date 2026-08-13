import {
  emptyRecipe,
  type Ingredient,
  type RecipeDraft,
} from "../domain/recipe";
const units = "g|kg|ml|cl|dl|l|st|msk|tsk|krm|portion|paket|burk";
export function parseIngredient(line: string): Ingredient {
  const clean = line.trim(),
    m = clean.match(
      new RegExp(`^(\\d+(?:[,.]\\d+)?)\\s*(${units})?\\s+(.+)$`, "i"),
    );
  if (!m)
    return {
      id: crypto.randomUUID(),
      name: clean.replace(/\s+(efter smak|to taste)$/i, ""),
      quantity: "",
      unit: "",
      note: /efter smak|to taste/i.test(clean)
        ? clean.match(/(efter smak|to taste)/i)?.[0]
        : undefined,
      uncertain: true,
    };
  return {
    id: crypto.randomUUID(),
    quantity: m[1].replace(",", "."),
    unit: (m[2] ?? "").toLowerCase(),
    name: m[3].trim(),
  };
}
export function dedupeLines(pages: string[]) {
  const seen = new Set<string>();
  return pages
    .flatMap((p) => p.split(/\r?\n/))
    .map((x) => x.trim())
    .filter((x) => {
      const key = x.toLocaleLowerCase("sv").replace(/\s+/g, " ");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
export function structureRecipe(pages: string[]): RecipeDraft {
  const lines = dedupeLines(pages),
    draft = emptyRecipe();
  draft.sourceType = "image";
  draft.title = lines[0] ?? "";
  const serving = lines
    .find((l) => /\d+\s*(portion|serving)/i.test(l))
    ?.match(/\d+/);
  draft.servings = serving ? Number(serving[0]) : undefined;
  const method = lines.findIndex((l) =>
    /gör så här|instruktion|method|directions/i.test(l),
  );
  draft.ingredients = lines
    .slice(1, method < 0 ? lines.length : method)
    .filter((l) => /^\d|efter smak|to taste/i.test(l) && !/portion/i.test(l))
    .map(parseIngredient);
  draft.instructions = (method < 0 ? [] : lines.slice(method + 1))
    .map((l) => l.replace(/^\d+[.)]\s*/, ""))
    .filter(Boolean)
    .map((text, i) => ({ id: crypto.randomUUID(), order: i + 1, text }));
  const names = draft.ingredients.map((i) => i.name.toLowerCase()).join(" ");
  draft.primaryProtein = /kyckling|chicken/.test(names) ? "Kyckling" : "";
  return draft;
}
