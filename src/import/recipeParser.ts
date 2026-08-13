import {
  emptyRecipe,
  type Ingredient,
  type RecipeDraft,
} from "../domain/recipe";
export type OcrLine = {
  text: string;
  page: number;
  top?: number;
  bottom?: number;
};
export type LineKind =
  | "title"
  | "servings"
  | "ingredient"
  | "section"
  | "instructionsHeading"
  | "instruction"
  | "nutrition"
  | "source"
  | "uiNoise"
  | "unknown";
export type ClassifiedLine = OcrLine & {
  normalized: string;
  kind: LineKind;
  titleScore: number;
  removed: boolean;
};
export type ParserDebug = {
  raw: OcrLine[];
  classified: ClassifiedLine[];
  removed: ClassifiedLine[];
  fields: { title: string; ingredients: number; instructions: number };
};
const unitPattern = "g|kg|ml|cl|dl|l|st|msk|tsk|krm|portion(?:er)?|paket|burk";
const uiWords =
  /^(safari|chrome|tillbaka|back|dela|share|save|spara|likes?|gilla|comments?|kommentarer?|följer|follow(?:ing)?|hem|home|recept|recipe)$/i;
const sectionPattern =
  /^(ingredienser?|ingredients?|sås|sauce|marinad|marinade|topping|till servering|to serve)$/i;
const methodPattern =
  /^(gör så ?här|tillagning|instruktioner?|method|directions)[:.]?$/i;
const nutritionPattern =
  /\b(kcal|kalorier|calories|protein|kolhydrater|carbs|fett|fat)\b/i;
const instructionVerb =
  /^(koka|stek|skär|hacka|blanda|tillsätt|lägg|värm|vispa|baka|servera|cook|fry|cut|chop|mix|add|heat|bake|serve)\b/i;
export function normalizeOcr(text: string) {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/([,.;:!?])\1+/g, "$1");
}
export function isUiNoise(text: string, top?: number, bottom?: number) {
  const x = normalizeOcr(text);
  return (
    !x ||
    /^\d{1,2}[:.]\d{2}$/.test(x) ||
    /^\d{1,3}\s*%$/.test(x) ||
    /^(https?:\/\/|www\.)|\.(com|se|net|org)(\/|$)/i.test(x) ||
    uiWords.test(x) ||
    (((top !== undefined && top < 0.075) ||
      (bottom !== undefined && bottom > 0.94)) &&
      (/^[\d:%.]+$/.test(x) || uiWords.test(x)))
  );
}
export function parseIngredient(line: string): Ingredient {
  const clean = normalizeOcr(line);
  const m = clean.match(
    new RegExp(`^([0-9O]+(?:[,.][0-9O]+)?)\\s*(${unitPattern})?\\s+(.+)$`, "i"),
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
  const numeric = m[1].replace(/O/g, "0").replace(",", ".");
  return {
    id: crypto.randomUUID(),
    quantity: numeric,
    unit: (m[2] ?? "").toLowerCase().replace(/portioner/, "portion"),
    name: m[3].trim(),
    uncertain: !m[2],
  };
}
function ingredientLike(x: string) {
  return (
    new RegExp(
      `^[0-9O]+(?:[,.][0-9O]+)?\\s*(?:${unitPattern})?\\s+\\p{L}`,
      "iu",
    ).test(x) || /\b(efter smak|to taste)$/.test(x.toLowerCase())
  );
}
function titleScore(x: string, index: number, top?: number) {
  if (
    !/\p{L}/u.test(x) ||
    /^\d+$/.test(x) ||
    isUiNoise(x, top) ||
    nutritionPattern.test(x) ||
    /\d+\s*(portion|serving)/i.test(x) ||
    ingredientLike(x) ||
    sectionPattern.test(x) ||
    methodPattern.test(x)
  )
    return -100;
  let score = 5 - Math.min(index, 0.9 * index);
  if (x.split(/\s+/).length >= 2) score += 3;
  if (x.length >= 8 && x.length <= 80) score += 2;
  if (top !== undefined && top > 0.08 && top < 0.5) score += 2;
  if (/[.!?]$/.test(x)) score -= 2;
  return score;
}
export function classifyLines(lines: OcrLine[]): ClassifiedLine[] {
  let afterMethod = false;
  return lines.map((line, index) => {
    const normalized = normalizeOcr(line.text);
    let kind: LineKind = "unknown";
    if (isUiNoise(normalized, line.top, line.bottom)) kind = "uiNoise";
    else if (methodPattern.test(normalized)) {
      kind = "instructionsHeading";
      afterMethod = true;
    } else if (sectionPattern.test(normalized)) kind = "section";
    else if (/\d+\s*(portion|serving)/i.test(normalized)) kind = "servings";
    else if (nutritionPattern.test(normalized)) kind = "nutrition";
    else if (ingredientLike(normalized)) kind = "ingredient";
    else if (
      afterMethod &&
      (/^\d+[.)]\s*/.test(normalized) || instructionVerb.test(normalized))
    )
      kind = "instruction";
    else if (/^(källa|source)\b/i.test(normalized)) kind = "source";
    const score = titleScore(normalized, index, line.top);
    if (kind === "unknown" && score >= 3) kind = "title";
    return {
      ...line,
      normalized,
      kind,
      titleScore: score,
      removed: kind === "uiNoise",
    };
  });
}
export function dedupeOcrLines(pages: OcrLine[][]) {
  const seen = new Set<string>();
  return pages
    .flatMap((page) => page)
    .filter((line) => {
      const key = normalizeOcr(line.text).toLocaleLowerCase("sv");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
export function dedupeLines(pages: string[]) {
  return dedupeOcrLines(
    pages.map((p, page) => p.split(/\r?\n/).map((text) => ({ text, page }))),
  ).map((x) => normalizeOcr(x.text));
}
export function structureRecipeFromLines(pages: OcrLine[][]): {
  draft: RecipeDraft;
  debug: ParserDebug;
} {
  const raw = dedupeOcrLines(pages),
    classified = classifyLines(raw),
    meaningful = classified.filter((x) => !x.removed);
  const draft = emptyRecipe();
  draft.sourceType = "image";
  const title = meaningful
    .filter((x) => x.kind === "title")
    .sort((a, b) => b.titleScore - a.titleScore || a.page - b.page)[0];
  draft.title = title?.normalized ?? "";
  const serving = meaningful
    .find((x) => x.kind === "servings")
    ?.normalized.match(/\d+/);
  draft.servings = serving ? Number(serving[0]) : undefined;
  let group: string | undefined;
  draft.ingredients = [];
  for (const line of meaningful) {
    if (line.kind === "section" && !/ingredien/i.test(line.normalized)) {
      group = line.normalized;
      continue;
    }
    if (line.kind === "ingredient")
      draft.ingredients.push({ ...parseIngredient(line.normalized), group });
  }
  draft.instructions = meaningful
    .filter((x) => x.kind === "instruction")
    .map((x, i) => ({
      id: crypto.randomUUID(),
      order: i + 1,
      text: x.normalized.replace(/^\d+[.)]\s*/, ""),
    }));
  const names = draft.ingredients.map((i) => i.name.toLowerCase()).join(" ");
  draft.primaryProtein = /kyckling|chicken/.test(names) ? "Kyckling" : "";
  return {
    draft,
    debug: {
      raw,
      classified,
      removed: classified.filter((x) => x.removed),
      fields: {
        title: draft.title,
        ingredients: draft.ingredients.length,
        instructions: draft.instructions.length,
      },
    },
  };
}
export function structureRecipe(pages: string[]): RecipeDraft {
  return structureRecipeFromLines(
    pages.map((p, page) => p.split(/\r?\n/).map((text) => ({ text, page }))),
  ).draft;
}
