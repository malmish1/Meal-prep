import type { DietProfile, InventoryItem, StandardMeal } from "../domain/personalization";
import { normalizeFoodName } from "../domain/personalization";
import type { PromotionFlyer, PromotionItem } from "../domain/promotion";
import type { Recipe } from "../domain/recipe";
import { emptyDiagnostics, emptyWeeklySelections, MEAL_CATEGORIES, recipeToRecommendation, standardRecommendation, type FilterDiagnostics, type MacroFilters, type MealCategory, type ShoppingItem, type WeeklyPlan, type WeeklyRecommendation, type WeeklySelection, type WeeklySelections } from "../domain/weeklyPlan";
import { ingredientCampaignMatch } from "./campaignMatcher";

export interface RecommendationResult{recommendations:Record<MealCategory,WeeklyRecommendation[]>;diagnostics:Record<MealCategory,FilterDiagnostics>;totalCandidates:number}
export type RecipeCandidateInput={profile:DietProfile;recipes:Recipe[];promotions:PromotionItem[];inventory:InventoryItem[];macroFilters:MacroFilters;excludedIds?:Set<string>};
export function compareRecipeCandidates(a:WeeklyRecommendation,b:WeeklyRecommendation){return(b.campaignMatches?.length??0)-(a.campaignMatches?.length??0)||b.campaignRelevance-a.campaignRelevance||b.score-a.score||a.title.localeCompare(b.title,"sv")}
export function getEligibleRecipesForMealType(input:RecipeCandidateInput,category:MealCategory,diagnostics=emptyDiagnostics()){
 const context={dailyCalories:input.profile.dailyCalories,proteinPriority:input.profile.proteinPriority,promotions:input.promotions,inventory:input.inventory,macroFilters:input.macroFilters};
 return input.recipes.map(recipe=>recipeToRecommendation(recipe,category,context,diagnostics)).filter((candidate):candidate is WeeklyRecommendation=>!!candidate&&!input.excludedIds?.has(candidate.id)).sort(compareRecipeCandidates);
}
export function buildRecommendationResult(input:RecipeCandidateInput&{breakfast:StandardMeal;snack:StandardMeal}):RecommendationResult{
 const diagnostics={breakfast:emptyDiagnostics(),lunch:emptyDiagnostics(),dinner:emptyDiagnostics(),snack:emptyDiagnostics()},build=(category:MealCategory)=>getEligibleRecipesForMealType(input,category,diagnostics[category]);
 return{recommendations:{breakfast:[...build("breakfast"),standardRecommendation(input.breakfast,"breakfast")],lunch:build("lunch"),dinner:build("dinner"),snack:[...build("snack"),standardRecommendation(input.snack,"snack")]},diagnostics,totalCandidates:input.recipes.length}
}
export const buildRecommendations=(input:Parameters<typeof buildRecommendationResult>[0])=>buildRecommendationResult(input).recommendations;

const unicodeFractions:Record<string,number>={"¼":.25,"½":.5,"¾":.75,"⅓":1/3,"⅔":2/3,"⅕":.2,"⅖":.4,"⅗":.6,"⅘":.8};
export function parseIngredientQuantity(value:string){const raw=value.trim().replace(",",".");if(!raw)return null;const unicode=raw.match(/^(\d+)?\s*([¼½¾⅓-⅘])$/);if(unicode)return Number(unicode[1]??0)+unicodeFractions[unicode[2]];const mixed=raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);if(mixed&&Number(mixed[3]))return Number(mixed[1])+Number(mixed[2])/Number(mixed[3]);const fraction=raw.match(/^(\d+)\/(\d+)$/);if(fraction&&Number(fraction[2]))return Number(fraction[1])/Number(fraction[2]);return /^\d+(?:\.\d+)?$/.test(raw)?Number(raw):null}
const culinaryRound=(value:number,unit:string)=>{if((unit==="g"||unit==="ml")&&value>=100)return Math.round(value/5)*5;if(unit==="st"||unit==="tsk"||unit==="msk")return Math.round(value*4)/4;return Math.round(value*100)/100};
export function scaleIngredient(quantity:string,fromServings:number|null,toServings:number){const amount=parseIngredientQuantity(quantity);return amount!=null&&fromServings!=null&&fromServings>0?culinaryRound(amount*(toServings/fromServings),""):null}
const unitInfo=(unit:string)=>{const value=unit.trim().toLocaleLowerCase("sv-SE");if(value==="kg")return{unit:"g",factor:1000};if(value==="g")return{unit:"g",factor:1};if(value==="l")return{unit:"ml",factor:1000};if(value==="dl")return{unit:"ml",factor:100};if(value==="cl")return{unit:"ml",factor:10};if(value==="ml")return{unit:"ml",factor:1};return{unit:value||null,factor:1}};
const asSelections=(input:WeeklySelections|Partial<Record<MealCategory,WeeklyRecommendation>>):WeeklySelections=>{const result=emptyWeeklySelections();for(const category of MEAL_CATEGORIES){const value=(input as any)?.[category];if(Array.isArray(value))result[category]=value;else if(value)result[category]=[makeWeeklySelection(value,5)]}return result};
export function makeWeeklySelection(recipe:WeeklyRecommendation,desiredServings=5,label=""):WeeklySelection{return{id:crypto.randomUUID(),recipe,desiredServings:Math.max(1,Math.round(desiredServings)),label}}

export function buildShoppingList(input:WeeklySelections|Partial<Record<MealCategory,WeeklyRecommendation>>,inventory:InventoryItem[],promotions:PromotionItem[]):ShoppingItem[]{
 const selections=asSelections(input),needs=new Map<string,{displayName:string;normalizedName:string;required:number|null;unit:string|null;unscaled:string[];warning?:string}>();
 for(const category of MEAL_CATEGORIES)for(const selection of selections[category])for(const ingredient of selection.recipe.ingredients){
  const normalizedName=normalizeFoodName(ingredient.name),parsed=parseIngredientQuantity(ingredient.quantity),original=selection.recipe.originalServings??selection.recipe.servings,info=unitInfo(ingredient.unit),scaled=parsed!=null&&original!=null&&original>0?culinaryRound(parsed*(selection.desiredServings/original)*info.factor,info.unit??""):null,key=`${normalizedName}|${info.unit??ingredient.unit}`;
  const current=needs.get(key);if(!current){const unscaled=[ingredient.quantity,ingredient.unit].filter(Boolean).join(" ");needs.set(key,{displayName:ingredient.name,normalizedName,required:scaled,unit:info.unit,unscaled:scaled==null&&unscaled?[unscaled]:[],warning:parsed!=null&&original==null?"Originalportioner saknas – mängden kan inte skalas säkert.":parsed==null?"Mängden behöver kontrolleras manuellt.":undefined})}else if(current.required!=null&&scaled!=null)current.required=culinaryRound(current.required+scaled,current.unit??"");else{current.required=null;if(ingredient.quantity)current.unscaled.push([ingredient.quantity,ingredient.unit].filter(Boolean).join(" "));current.warning=current.warning??"En eller flera mängder behöver kontrolleras manuellt."}
 }
 return[...needs.values()].map(need=>{
  const home=inventory.find(item=>need.normalizedName===item.normalizedName||need.normalizedName.includes(item.normalizedName)||item.normalizedName.includes(need.normalizedName)),homeInfo=unitInfo(home?.unit??""),compatible=!!home&&home.quantity!=null&&(need.unit==null||homeInfo.unit===need.unit),homeQuantity=!home?0:compatible?culinaryRound(home.quantity!*homeInfo.factor,need.unit??""):home.quantity??null,promotion=promotions.find(item=>!item.ignored&&ingredientCampaignMatch(need.displayName,item.displayName)),buy=need.required==null?null:compatible?culinaryRound(Math.max(0,need.required-homeQuantity!),need.unit??""):need.required,warning=home&&home.quantity==null?"Finns hemma – kontrollera mängd.":home&&home.quantity!=null&&!compatible?"Hemma-varans enhet skiljer sig – inget automatiskt avdrag.":need.warning;
  return{displayName:need.displayName,normalizedName:need.normalizedName,quantity:buy,buyQuantity:buy,requiredQuantity:need.required,unit:need.unit,homeQuantity,unscaledText:need.unscaled.filter(Boolean).join(" + ")||undefined,warning,promotion:promotion?{displayName:promotion.displayName,price:promotion.price,priceType:promotion.priceType}:undefined}
 }).sort((a,b)=>a.displayName.localeCompare(b.displayName,"sv"))
}

export interface NutritionTotals{calories:number;protein:number;carbs:number;fat:number}
export interface CategoryNutrition{totalServings:number;recipeCount:number;complete:boolean;averagePerServing:NutritionTotals|null;batchTotals:NutritionTotals|null}
export interface WeeklyNutritionSummary{categories:Record<MealCategory,CategoryNutrition>;plannedDaily:NutritionTotals|null;targetCalories:number|null;differenceCalories:number|null;missingNutritionCount:number;scheduleComplete:boolean}
const nutritionFor=(selection:WeeklySelection):NutritionTotals|null=>{const recipe=selection.recipe,values=[recipe.calories,recipe.protein,recipe.carbs,recipe.fat];if(!values.every(value=>typeof value==="number"&&Number.isFinite(value)))return null;return{calories:recipe.calories!*selection.desiredServings,protein:recipe.protein!*selection.desiredServings,carbs:recipe.carbs!*selection.desiredServings,fat:recipe.fat!*selection.desiredServings}}
const addTotals=(a:NutritionTotals,b:NutritionTotals):NutritionTotals=>({calories:a.calories+b.calories,protein:a.protein+b.protein,carbs:a.carbs+b.carbs,fat:a.fat+b.fat});
export function calculateNutritionSummary(input:WeeklySelections,plannedDays:number,targetCalories:number|null):WeeklyNutritionSummary{
 const categories={}as Record<MealCategory,CategoryNutrition>;let missing=0,scheduleComplete=true,daily:{calories:number;protein:number;carbs:number;fat:number}={calories:0,protein:0,carbs:0,fat:0};
 for(const category of MEAL_CATEGORIES){const selections=input[category],totalServings=selections.reduce((sum,item)=>sum+item.desiredServings,0),parts=selections.map(nutritionFor),complete=selections.length>0&&parts.every((part):part is NutritionTotals=>part!=null),batch=complete?parts.reduce(addTotals,{calories:0,protein:0,carbs:0,fat:0}):null;missing+=parts.filter(x=>x==null).length;const average=batch&&totalServings?{calories:batch.calories/totalServings,protein:batch.protein/totalServings,carbs:batch.carbs/totalServings,fat:batch.fat/totalServings}:null;categories[category]={totalServings,recipeCount:selections.length,complete,averagePerServing:average,batchTotals:batch};if(!complete||totalServings!==plannedDays)scheduleComplete=false;else daily=addTotals(daily,{calories:batch!.calories/plannedDays,protein:batch!.protein/plannedDays,carbs:batch!.carbs/plannedDays,fat:batch!.fat/plannedDays})}
 const plannedDaily=scheduleComplete?daily:null;return{categories,plannedDaily,targetCalories,differenceCalories:plannedDaily&&targetCalories!=null?targetCalories-plannedDaily.calories:null,missingNutritionCount:missing,scheduleComplete}
}

export interface SelectionDailyAverage{totals:NutritionTotals|null;selectionCount:number;missingNutritionCount:number}
export function calculateSelectionDailyAverage(input:WeeklySelections,plannedDays:number):SelectionDailyAverage{
 const selections=MEAL_CATEGORIES.flatMap(category=>input[category]),parts=selections.map(nutritionFor),missingNutritionCount=parts.filter(part=>part==null).length;
 if(!selections.length||missingNutritionCount||plannedDays<1)return{totals:null,selectionCount:selections.length,missingNutritionCount};
 const batch=(parts as NutritionTotals[]).reduce(addTotals,{calories:0,protein:0,carbs:0,fat:0});
 return{totals:{calories:batch.calories/plannedDays,protein:batch.protein/plannedDays,carbs:batch.carbs/plannedDays,fat:batch.fat/plannedDays},selectionCount:selections.length,missingNutritionCount};
}

export function previewWeeklySelection(input:WeeklySelections,category:MealCategory,selectionId:string|undefined,replacement:WeeklyRecommendation,desiredServings:number):WeeklySelections{
 const next={...input,[category]:selectionId?input[category].map(item=>item.id===selectionId?{...item,recipe:replacement}:item):[...input[category],{id:`preview-${replacement.id}`,recipe:replacement,desiredServings:Math.max(1,Math.round(desiredServings)),label:""}]};
 return next;
}

export function createWeeklyPlan(input:{profile:DietProfile;flyer?:PromotionFlyer;recommendations:Record<MealCategory,WeeklyRecommendation[]>;selections:WeeklySelections;inventory:InventoryItem[];promotions:PromotionItem[];macroFilters:MacroFilters;plannedDays:number}):WeeklyPlan{const now=new Date().toISOString();return{id:crypto.randomUUID(),createdAt:now,updatedAt:now,dietPhaseSnapshot:input.profile.phase,calorieTargetSnapshot:input.profile.dailyCalories,macroFiltersSnapshot:input.macroFilters,activeFlyerId:input.flyer?.id,plannedDays:Math.min(7,Math.max(1,input.plannedDays)),recommendations:input.recommendations,selections:input.selections,shoppingList:buildShoppingList(input.selections,input.inventory,input.promotions),status:"finalized"}}
const recalculate=(plan:WeeklyPlan,selections:WeeklySelections,inventory:InventoryItem[],promotions:PromotionItem[],plannedDays=plan.plannedDays):WeeklyPlan=>({...plan,plannedDays,updatedAt:new Date().toISOString(),selections,shoppingList:buildShoppingList(selections,inventory,promotions)});
export function addWeeklySelection(plan:WeeklyPlan,category:MealCategory,recipe:WeeklyRecommendation,inventory:InventoryItem[],promotions:PromotionItem[],desiredServings=5){return recalculate(plan,{...plan.selections,[category]:[...plan.selections[category],makeWeeklySelection(recipe,desiredServings)]},inventory,promotions)}
export function removeWeeklySelection(plan:WeeklyPlan,category:MealCategory,selectionId:string,inventory:InventoryItem[],promotions:PromotionItem[]){return recalculate(plan,{...plan.selections,[category]:plan.selections[category].filter(item=>item.id!==selectionId)},inventory,promotions)}
export function replaceWeeklySelection(plan:WeeklyPlan,category:MealCategory,selectionId:string,replacement:WeeklyRecommendation,inventory:InventoryItem[],promotions:PromotionItem[]){return recalculate(plan,{...plan.selections,[category]:plan.selections[category].map(item=>item.id===selectionId?{...item,recipe:replacement}:item)},inventory,promotions)}
export function updateWeeklySelection(plan:WeeklyPlan,category:MealCategory,selectionId:string,patch:Partial<Pick<WeeklySelection,"desiredServings"|"label">>,inventory:InventoryItem[],promotions:PromotionItem[]){return recalculate(plan,{...plan.selections,[category]:plan.selections[category].map(item=>item.id===selectionId?{...item,...patch,desiredServings:patch.desiredServings==null?item.desiredServings:Math.max(1,Math.round(patch.desiredServings))}:item)},inventory,promotions)}
export function updatePlannedDays(plan:WeeklyPlan,plannedDays:number,inventory:InventoryItem[],promotions:PromotionItem[]){return recalculate(plan,plan.selections,inventory,promotions,Math.min(7,Math.max(1,Math.round(plannedDays))))}

export function normalizeWeeklyPlan(value:unknown):WeeklyPlan{const raw=value as WeeklyPlan&{selections?:unknown;plannedDays?:number},selections=emptyWeeklySelections();for(const category of MEAL_CATEGORIES){const categoryValue=(raw.selections as any)?.[category];if(Array.isArray(categoryValue))selections[category]=categoryValue.map((item:any)=>item?.recipe?{id:item.id??crypto.randomUUID(),recipe:{...item.recipe,originalServings:item.recipe.originalServings??item.recipe.servings??null,campaignRelevance:item.recipe.campaignRelevance??0},desiredServings:Math.max(1,Number(item.desiredServings)||5),label:String(item.label??"")}:makeWeeklySelection({...item,originalServings:item.originalServings??item.servings??null,campaignRelevance:item.campaignRelevance??0},5));else if(categoryValue)selections[category]=[makeWeeklySelection({...categoryValue,originalServings:categoryValue.originalServings??categoryValue.servings??null,campaignRelevance:categoryValue.campaignRelevance??0},5)]}return{...raw,plannedDays:Math.min(7,Math.max(1,Number(raw.plannedDays)||5)),selections,shoppingList:Array.isArray(raw.shoppingList)?raw.shoppingList.map((item:any)=>({...item,requiredQuantity:item.requiredQuantity??item.quantity??null,buyQuantity:item.buyQuantity??item.quantity??null,quantity:item.buyQuantity??item.quantity??null})):[]}}

export const GROCERY_CATEGORIES=["FRUKT & GRÖNT","KÖTT & PROTEIN","MEJERI & KYL","ÄGG","SKAFFERI","FRYST","BRÖD","ÖVRIGT"]as const;
export type GroceryCategory=typeof GROCERY_CATEGORIES[number];
export function groceryCategory(item:Pick<ShoppingItem,"normalizedName"|"displayName">):GroceryCategory{
 const name=normalizeFoodName(item.normalizedName||item.displayName);
 if(/\b(agg|honsagg)\b/.test(name))return"ÄGG";
 if(/\b(gurka|potatis|rodlok|lok|sallad|tomat|paprika|broccoli|spenat|morot|kål|kal|avokado|citron|lime|apple|banan|frukt|bar|persilja|dill|vitlok)\b/.test(name))return"FRUKT & GRÖNT";
 if(/\b(kyckling|file|kott|fars|flask|not|lax|fisk|tonfisk|tofu|quorn|korv)\b/.test(name))return"KÖTT & PROTEIN";
 if(/\b(mjolk|grädde|gradde|yoghurt|kvarg|ost|fraiche|smor|kesella|keso)\b/.test(name))return"MEJERI & KYL";
 if(/\b(frust|fryst|glass)\b/.test(name))return"FRYST";
 if(/\b(brod|tortilla|wrap|fralla|limpa)\b/.test(name))return"BRÖD";
 if(/\b(ris|pasta|havregryn|fiberhavregryn|mjol|olja|honung|musli|müsli|salt|peppar|krydda|buljong|sas|sås|konserv|bonor|linser|notter|nötter)\b/.test(name))return"SKAFFERI";
 return"ÖVRIGT";
}
const swedishNumber=(value:number)=>value.toLocaleString("sv-SE",{maximumFractionDigits:2});
export function practicalAmount(value:number,unit:string|null){if(unit==="g"&&value>=1000)return`${swedishNumber(value/1000)} kg`;if(unit==="ml"&&value>=1000)return`${swedishNumber(value/1000)} l`;return`${swedishNumber(value)}${unit?` ${unit}`:""}`}
const capitalize=(value:string)=>value?value[0].toLocaleUpperCase("sv-SE")+value.slice(1):value;
export function formatShoppingList(items:ShoppingItem[]){
 const numeric=items.filter(item=>{const value=item.buyQuantity??item.quantity;return value!=null&&value>0}),unknown=items.filter(item=>(item.buyQuantity??item.quantity)==null),lines=["INKÖPSLISTA",""];
 for(const category of GROCERY_CATEGORIES){const values=numeric.filter(item=>groceryCategory(item)===category);if(values.length)lines.push(category,...values.map(item=>`${capitalize(item.displayName)} — ${practicalAmount((item.buyQuantity??item.quantity)!,item.unit)}`),"")}
 if(unknown.length)lines.push("KONTROLLERA",...unknown.map(item=>capitalize(item.displayName)),"");
 return lines.join("\n").trim();
}
