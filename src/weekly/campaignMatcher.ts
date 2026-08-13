import type { PromotionItem } from "../domain/promotion";
import type { Recipe } from "../domain/recipe";
const ALIASES:Record<string,string>={"kycklingfileer":"kycklingfile","kycklingfile":"kycklingfile","kottfars av not":"notfars","notfars":"notfars","creme fraiche":"creme fraiche","rod paprika":"paprika","gron paprika":"paprika","fast potatis":"potatis","potatis fast":"potatis"};
const descriptors=/\b(farsk|svensk|ekologisk|rod|gron|gul|fast|mogen|stor|liten)\b/g;
export function canonicalIngredient(value:string){let text=value.toLocaleLowerCase("sv-SE").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(descriptors," ").replace(/\s+/g," ").trim();return ALIASES[text]??text}
export function ingredientCampaignMatch(ingredient:string,promotion:string){const a=canonicalIngredient(ingredient),b=canonicalIngredient(promotion);return!!a&&a===b}
export interface CampaignMatch{promotionId:string;promotionName:string;ingredientName:string;quality:"strong"}
export function campaignMatches(recipe:Pick<Recipe,"ingredients">,promotions:PromotionItem[]):CampaignMatch[]{const result:CampaignMatch[]=[];for(const p of promotions.filter(x=>!x.ignored)){const ingredient=recipe.ingredients.find(i=>ingredientCampaignMatch(i.name,p.displayName)||ingredientCampaignMatch(i.name,p.normalizedName));if(ingredient)result.push({promotionId:p.id,promotionName:p.displayName,ingredientName:ingredient.name,quality:"strong"})}return result}
