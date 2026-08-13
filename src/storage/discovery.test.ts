import {beforeEach,describe,expect,it} from "vitest";
import type {ExternalRecipeCandidate} from "../domain/externalRecipe";
import {candidateToRecipe} from "../domain/externalRecipe";
import {resetDBConnectionForTests} from "./db";
import {dismissCandidate,getCachedDiscovery,saveDiscovery} from "./discovery";
import {filterRecipes,listRecipes,saveRecipe,toggleFavorite} from "./recipes";
beforeEach(async()=>{await resetDBConnectionForTests();await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase("meal-prep");request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)})});
function candidate(sourceUrl="https://www.ica.se/recept/kycklinggryta"):ExternalRecipeCandidate{return{id:"external-1",title:"Kycklinggryta",description:"En gryta",sourceName:"ICA",sourceUrl,primaryProtein:"Kyckling",mealTypes:["Middag"],cuisine:null,estimatedPrepTime:30,servings:4,caloriesPerServing:null,proteinPerServing:null,ingredientNames:["kyckling"],ingredients:[{name:"Kyckling",quantity:"500",unit:"g"}],instructions:["Tillaga."],tags:["Meal prep"],mealPrepSuitability:"very_good",sourceEvidence:"Receptsidan",nutritionEvidence:"unavailable",metadataEvidence:"extracted",confidence:.9,warnings:[],searchTerms:["kyckling"],discoveredAt:new Date().toISOString(),savedToLibrary:false,dismissed:false}}
describe("external recipe discovery",()=>{
 it("mappar källa utan att hitta på nutrition",()=>{const draft=candidateToRecipe(candidate());expect(draft).toMatchObject({title:"Kycklinggryta",favorite:false,sourceName:"ICA",sourceUrl:"https://www.ica.se/recept/kycklinggryta"});expect(draft.caloriesPerServing).toBeUndefined();expect(draft.proteinGramsPerServing).toBeUndefined()});
 it("sparas inte som favorit men kan favoritmarkeras",async()=>{const saved=await saveRecipe(candidateToRecipe(candidate()));expect(saved.favorite).toBe(false);await toggleFavorite(saved.id);expect(filterRecipes(await listRecipes(),"",{favoriteOnly:true})).toHaveLength(1)});
 it("återanvänder normaliserad cache och deduplicerar URL",async()=>{await saveDiscovery("kyckling + paprika",[candidate(),{...candidate(),id:"external-2"}]);const cached=await getCachedDiscovery("kyckling paprika");expect(cached?.candidates).toHaveLength(1)});
 it("visar inte avfärdade kandidater igen",async()=>{await saveDiscovery("kyckling",[candidate()]);await dismissCandidate("external-1");expect((await getCachedDiscovery("kyckling"))?.candidates).toHaveLength(0)});
});
