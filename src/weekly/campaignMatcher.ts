import type { PromotionItem } from "../domain/promotion";
import type { Recipe } from "../domain/recipe";

export type MatchKind="normalized"|"category";
export interface IngredientConcept{id:string;aliases:string[]}
export const INGREDIENT_TAXONOMY:IngredientConcept[]=[
 {id:"RICE",aliases:["ris","jasminris","basmatiris","langkornigt ris","fullkornsris"]},
 {id:"PASTA",aliases:["pasta","spaghetti","penne","fusilli","tagliatelle","makaroner"]},
 {id:"POTATO",aliases:["potatis","fast potatis","mjolig potatis","farskpotatis"]},
 {id:"BELL_PEPPER",aliases:["paprika","rod paprika","gul paprika","gron paprika"]},
 {id:"ONION",aliases:["lok","gul lok","rodlok"]},
 {id:"CHICKEN_BREAST",aliases:["kycklingfile","kycklingfileer","farsk kycklingfile"]},
 {id:"GROUND_BEEF",aliases:["notfars","kottfars av not","notfars 5","notfars 10","notfars 12","notfars 20"]},
 {id:"CREME_FRAICHE",aliases:["creme fraiche"]},
 {id:"OATS",aliases:["havregryn","fiberhavregryn","fullkornshavregryn"]},
];
const noise=/\b(svensk|ekologisk|extra|klassisk|original|ca|cirka|kg|gram|g|st|pack|paket)\b/g;
export function normalizeIngredient(value:string){return value.toLocaleLowerCase("sv-SE").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/%/g," ").replace(/[^a-z0-9 ]/g," ").replace(noise," ").replace(/\s+/g," ").trim()}
const concepts=new Map(INGREDIENT_TAXONOMY.flatMap(c=>c.aliases.map(a=>[normalizeIngredient(a),c.id] as const)));
export function matchIngredientConcept(recipeIngredient:string,promotionName:string):{kind:MatchKind;concept:string}|null{const a=normalizeIngredient(recipeIngredient),b=normalizeIngredient(promotionName);if(!a||!b)return null;if(a===b)return{kind:"normalized",concept:concepts.get(a)??a};const ca=concepts.get(a),cb=concepts.get(b);return ca&&ca===cb?{kind:"category",concept:ca}:null}
export function ingredientCampaignMatch(ingredient:string,promotion:string){return matchIngredientConcept(ingredient,promotion)!=null}
export interface CampaignMatch{promotionId:string;promotionName:string;ingredientName:string;promotionPrice:number|null;promotionPriceType:string;kind:MatchKind;quality:"strong";relevance:number}
const numericQuantity=(value:string)=>{const match=value.trim().replace(",",".").match(/^\d+(?:\.\d+)?/);return match?Number(match[0]):null};
const ingredientRelevance=(recipe:Pick<Recipe,"ingredients">,index:number)=>{const ingredient=recipe.ingredients[index],amount=numericQuantity(ingredient.quantity),position=index<3?2:index<6?1.4:1,quantity=amount==null?1:amount>=500?1.5:amount>=100?1.25:amount>=2?1.1:1;return Math.round(position*quantity*100)/100};
export function campaignMatches(recipe:Pick<Recipe,"ingredients">,promotions:PromotionItem[]):CampaignMatch[]{const result:CampaignMatch[]=[];for(const p of promotions.filter(x=>!x.ignored)){let found:CampaignMatch|undefined;for(const[ingredientIndex,ingredient]of recipe.ingredients.entries()){const match=matchIngredientConcept(ingredient.name,p.displayName)||matchIngredientConcept(ingredient.name,p.normalizedName);if(match){found={promotionId:p.id,promotionName:p.displayName,ingredientName:ingredient.name,promotionPrice:p.price,promotionPriceType:p.priceType,kind:match.kind,quality:"strong",relevance:ingredientRelevance(recipe,ingredientIndex)};break}}if(found)result.push(found)}return result}
export const campaignRelevance=(matches:CampaignMatch[])=>matches.reduce((total,match)=>total+match.relevance,0);
