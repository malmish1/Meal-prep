import type { ExternalRecipeCandidate } from "../domain/externalRecipe";

const ALIASES: Record<string, string[]> = {
  kycklingfile: ["kyckling", "kycklingfilé", "chicken", "proteinrik kyckling", "chicken meal prep"],
  kyckling: ["kyckling", "kycklingfilé", "chicken", "proteinrik kyckling", "chicken meal prep"],
  notfars: ["nötfärs", "köttfärs", "beef mince", "high protein beef"],
  lax: ["lax", "salmon", "proteinrik lax"],
  cremefraiche: ["crème fraîche", "krämig", "creamy"],
};
export function normalizeSearchIntent(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("sv-SE").replace(/\s+/g, "").replace(/[^a-z0-9åäö]/g, ""); }
export function expandSearchConcepts(value: string) { const normalized=normalizeSearchIntent(value); const direct=ALIASES[normalized]; if(direct)return direct; const words=value.trim().split(/\s+/).filter(Boolean); const alias=Object.entries(ALIASES).find(([key])=>normalized.includes(key)); return [...new Set([value.trim(),...(alias?.[1]??[]),words[0]??value.trim()])].filter(Boolean); }
export interface SearchStage { name:string; query:string }
export function buildSearchStages(query:string, kind:"manual"|"weekly"="manual", promotions:string[]=[]):SearchStage[]{
  const concepts=expandSearchConcepts(query), core=concepts[0]??query, broad=concepts[1]??core, english=concepts.find(x=>/[a-z]/.test(x)&&/chicken|beef|salmon|protein|meal prep|creamy/.test(x))??`${broad} high protein`;
  const promo=promotions.slice(0,3).join(" ");
  return [
    {name:"exakt svensk",query:`${core} ${kind==="weekly"?"proteinrik matlåda komplett näring":"recept komplett näring"} ${promo}`.trim()},
    {name:"breddad svensk",query:`${broad} proteinrik recept näringsvärde per portion`},
    {name:"svenska källor",query:`${concepts.slice(0,3).join(" ")} lunch middag makron ICA Arla STC`},
    {name:"rättvariationer",query:`${broad} gryta bowl ris pasta meal prep proteinrik ${promo}`.trim()},
    {name:"internationell",query:`${english} high protein meal prep complete nutrition per serving`},
    {name:"internationell bred",query:`${english} healthy recipe macros calories protein carbs fat`},
  ];
}
export const dedupeCandidates=(items:ExternalRecipeCandidate[])=>{const urls=new Set<string>(),titles=new Set<string>();return items.filter(x=>{const url=x.sourceUrl.toLowerCase().replace(/\?.*$/,"").replace(/\/$/,""),title=normalizeSearchIntent(x.title);if(urls.has(url)||titles.has(title))return false;urls.add(url);titles.add(title);return true})};
