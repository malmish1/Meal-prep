import type { DietPhase, InventoryItem, StandardMeal } from "./personalization";
import type { PromotionItem } from "./promotion";
import type { Recipe } from "./recipe";
import { campaignMatches } from "../weekly/campaignMatcher";

export type MealCategory = "breakfast" | "lunch" | "dinner" | "snack";
export type MacroKey = "calories" | "protein" | "carbs" | "fat";
export interface MacroBounds { min: number | null; max: number | null }
export type MacroFilters = Record<MacroKey, MacroBounds>;
export const EMPTY_MACRO_FILTERS: MacroFilters = {
  calories: { min: null, max: null }, protein: { min: null, max: null },
  carbs: { min: null, max: null }, fat: { min: null, max: null },
};
export type FilterReason = "incompleteMacros" | "calorieMin" | "calorieMax" | "proteinMin" | "proteinMax" | "carbMin" | "carbMax" | "fatMin" | "fatMax" | "duplicate" | "mealType" | "poorSource" | "unavailableSource";
export type FilterDiagnostics = Record<FilterReason, number>;
export const emptyDiagnostics = (): FilterDiagnostics => ({ incompleteMacros: 0, calorieMin: 0, calorieMax: 0, proteinMin: 0, proteinMax: 0, carbMin: 0, carbMax: 0, fatMin: 0, fatMax: 0, duplicate: 0, mealType: 0, poorSource: 0, unavailableSource: 0 });

export interface WeeklyRecommendation { id: string; category: MealCategory; title: string; sourceName: string; sourceUrl: string; sourceType: "personal" | "external" | "standard"; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; servings: number | null; ingredients: Array<{ name: string; quantity: string; unit: string }>; mealPrepSuitability?: string; primaryProtein: string; cuisine: string; favorite: boolean; score: number; reasons: string[]; campaignMatches?:Array<{promotionId:string;promotionName:string;ingredientName:string;quality:"strong"}>; standard?: boolean }
export interface ShoppingItem { displayName: string; normalizedName: string; quantity: number | null; unit: string | null; homeQuantity: number | null; warning?: string; promotion?: { displayName: string; price: number | null; priceType: string } }
export interface WeeklyPlan { id: string; createdAt: string; updatedAt: string; dietPhaseSnapshot: DietPhase; calorieTargetSnapshot: number | null; macroFiltersSnapshot: MacroFilters; activeFlyerId?: string; recommendations: Record<MealCategory, WeeklyRecommendation[]>; selections: Partial<Record<MealCategory, WeeklyRecommendation>>; shoppingList: ShoppingItem[]; status: "draft" | "finalized" | "completed" }

export const SCORE_WEIGHTS = { favorite: 18, rating: 2.2, proteinHigh: .35, proteinVeryHigh: .5, mealPrep: 8, campaign: 30, inventory: 7, useFirst: 12, swedish: 6, recentPenalty: 18, calorieDistance: 12 } as const;
const completeNumbers = (values: unknown[]) => values.every(v => typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 10000);
export function isExternalRecipeEligibleForWeeklyRecommendation(x: { sourceType?: string; nutritionEligible?: boolean; caloriesPerServing?: number | null; proteinGramsPerServing?: number | null; carbsGramsPerServing?: number | null; fatGramsPerServing?: number | null; calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null; nutritionSource?: string }) {
  return x.sourceType === "external" && x.nutritionEligible === true && x.nutritionSource === "published" && completeNumbers([x.caloriesPerServing ?? x.calories, x.proteinGramsPerServing ?? x.protein, x.carbsGramsPerServing ?? x.carbs, x.fatGramsPerServing ?? x.fat]);
}
export function macroFailure(values: Record<MacroKey, number | null | undefined>, filters: MacroFilters): FilterReason | null {
  if (!completeNumbers([values.calories, values.protein, values.carbs, values.fat])) return "incompleteMacros";
  const mapping: Array<[MacroKey, FilterReason, FilterReason]> = [["calories", "calorieMin", "calorieMax"], ["protein", "proteinMin", "proteinMax"], ["carbs", "carbMin", "carbMax"], ["fat", "fatMin", "fatMax"]];
  for (const [key, minReason, maxReason] of mapping) { const value = values[key]!; if (filters[key].min != null && value < filters[key].min!) return minReason; if (filters[key].max != null && value > filters[key].max!) return maxReason; }
  return null;
}
const mealType = (r: Recipe, c: MealCategory) => { const values = r.mealTypes.map(x => x.toLocaleLowerCase("sv")); return c === "breakfast" ? values.some(x => x.includes("frukost") || x.includes("breakfast")) : c === "snack" ? values.some(x => x.includes("mellan") || x.includes("snack")) : c === "lunch" ? values.some(x => x.includes("lunch") || x.includes("middag") || x.includes("dinner")) : values.some(x => x.includes("middag") || x.includes("dinner") || x.includes("lunch")); };
export function recipeToRecommendation(r: Recipe, category: MealCategory, context: { dailyCalories: number | null; proteinPriority: string; promotions: PromotionItem[]; inventory: InventoryItem[]; macroFilters: MacroFilters }, diagnostics?: FilterDiagnostics): WeeklyRecommendation | null {
  if (!mealType(r, category)) { if (diagnostics) diagnostics.mealType++; return null; }
  const complete=completeNumbers([r.caloriesPerServing,r.proteinGramsPerServing,r.carbsGramsPerServing,r.fatGramsPerServing]);
  if(complete){const failure=macroFailure({calories:r.caloriesPerServing,protein:r.proteinGramsPerServing,carbs:r.carbsGramsPerServing,fat:r.fatGramsPerServing},context.macroFilters??EMPTY_MACRO_FILTERS);if(failure){if(diagnostics)diagnostics[failure]++;return null}}
  const names = r.ingredients.map(x => x.name.toLocaleLowerCase("sv")), matches=campaignMatches(r,context.promotions), inventoryMatches = context.inventory.filter(i => names.some(n => n.includes(i.normalizedName) || i.normalizedName.includes(n))), target = (context.dailyCalories ?? 2500) * (category === "snack" ? .14 : category === "breakfast" ? .2 : .25), distance = complete?Math.min(1,Math.abs((r.caloriesPerServing!-target)/target)):0;
  let score = (r.favorite ? SCORE_WEIGHTS.favorite : 0) + (r.rating ?? 0) * SCORE_WEIGHTS.rating + (r.proteinGramsPerServing ?? 0) * (context.proteinPriority === "veryHigh" ? SCORE_WEIGHTS.proteinVeryHigh : context.proteinPriority === "high" ? SCORE_WEIGHTS.proteinHigh : .2) + (r.mealPrepSuitability === "excellent" || r.mealPrepSuitability === "very_good" ? SCORE_WEIGHTS.mealPrep : 0) + matches.length * SCORE_WEIGHTS.campaign + inventoryMatches.length * SCORE_WEIGHTS.inventory + inventoryMatches.filter(x => x.useFirst).length * SCORE_WEIGHTS.useFirst - distance * SCORE_WEIGHTS.calorieDistance;
  if (r.lastCookedAt && Date.now() - new Date(r.lastCookedAt).getTime() < 14 * 86400000) score -= SCORE_WEIGHTS.recentPenalty;
  const reasons = [matches.length?`🔥 ${matches.length} kampanjvaror`:"",r.favorite ? "❤️ Ett av dina favoritrecept" : "", inventoryMatches[0] ? `🏠 Du har ${inventoryMatches[0].displayName} hemma` : "", complete?`${r.proteinGramsPerServing} g protein`:""].filter(Boolean).slice(0, 3);
  return { id: r.id, category, title: r.title, sourceName:"Mina recept", sourceUrl:"", sourceType:"personal", calories:r.caloriesPerServing??null,protein:r.proteinGramsPerServing??null,carbs:r.carbsGramsPerServing??null,fat:r.fatGramsPerServing??null, servings: r.servings ?? null, ingredients: r.ingredients.map(x => ({ name: x.name, quantity: x.quantity, unit: x.unit })), mealPrepSuitability: r.mealPrepSuitability, primaryProtein: r.primaryProtein, cuisine: r.cuisine, favorite: r.favorite, score, reasons,campaignMatches:matches };
}
export function standardRecommendation(meal: StandardMeal, category: "breakfast" | "snack"): WeeklyRecommendation { return { id: meal.id, category, title: meal.title, sourceName: "Din standard", sourceUrl: "", sourceType: "standard", calories: meal.nutrition.calories, protein: meal.nutrition.protein, carbs: meal.nutrition.carbs, fat: meal.nutrition.fat, servings: 1, ingredients: meal.ingredients.map(x => ({ name: x.displayName, quantity: x.quantity, unit: x.unit })), primaryProtein: "", cuisine: "", favorite: false, score: 999, reasons: ["⭐ Din standard"], standard: true }; }
const titleIdentity = (x: WeeklyRecommendation) => x.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9åäö]/g, "");
const urlIdentity = (x: WeeklyRecommendation) => x.sourceUrl.toLowerCase().replace(/\?.*$/, "").replace(/\/$/, "");
export function diverseTop(items: WeeklyRecommendation[], limit: number, diagnostics?: FilterDiagnostics) { const titles = new Set<string>(), urls = new Set<string>(), proteinCount = new Map<string, number>(); return [...items].sort((a, b) => b.score - a.score).filter(x => { const title=titleIdentity(x),url=urlIdentity(x); if (titles.has(title)||(url&&urls.has(url))) { if (diagnostics) diagnostics.duplicate++; return false; } const protein = x.primaryProtein.toLocaleLowerCase("sv"); if (protein && (proteinCount.get(protein) ?? 0) >= 4) return false; titles.add(title);if(url)urls.add(url);proteinCount.set(protein,(proteinCount.get(protein)??0)+1);return true; }).slice(0, limit); }
