import { render,screen,within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach,describe,expect,it } from "vitest";
import { emptyRecipe } from "../domain/recipe";
import { emptyPromotion } from "../domain/promotion";
import { EMPTY_MACRO_FILTERS,emptyWeeklySelections,type MealCategory,type WeeklyPlan,type WeeklyRecommendation } from "../domain/weeklyPlan";
import { resetDBConnectionForTests } from "../storage/db";
import { saveRecipe } from "../storage/recipes";
import { savePromotionWeek } from "../storage/promotions";
import { saveWeeklyPlan } from "../storage/weeklyPlans";
import { buildShoppingList,makeWeeklySelection } from "../weekly/generator";
import { WeeklyGenerator } from "./WeeklyGenerator";

const title="Krämig kycklingpasta med en mycket lång titel som måste radbrytas på mobil";

beforeEach(async()=>{
 await resetDBConnectionForTests();
 await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase("meal-prep");request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)});
});

async function seedRecipe(){
 await saveRecipe({...emptyRecipe(),title,sourceType:"manual",originalServings:4,servings:4,mealTypes:["Lunch"],primaryProtein:"Kyckling",caloriesPerServing:600,proteinGramsPerServing:45,carbsGramsPerServing:60,fatGramsPerServing:20,ingredients:[{id:"i",name:"Kycklingfilé",quantity:"800",unit:"g"}],instructions:[]});
}

describe("weekly campaign and planner UI",()=>{
 it("shows one compact campaign row and no duplicate protein reason",async()=>{
  await seedRecipe();
  const promotion={...emptyPromotion(),displayName:"Kycklingfilé",normalizedName:"kycklingfile",price:89.9,priceType:"perKg"as const};
  await savePromotionWeek({flyer:{id:"f",store:"Willys",fileName:"vecka.pdf",fingerprint:"fp",importedAt:new Date().toISOString(),analysisVersion:"flyer-v1",provider:"OpenAI",status:"confirmed"},items:[promotion]});
  render(<WeeklyGenerator/>);await userEvent.click(await screen.findByRole("button",{name:"GENERERA FÖRSLAG"}));
  expect(await screen.findAllByText("Passar veckans kampanjer")).not.toHaveLength(0);
  expect(screen.getAllByText(/Kycklingfilé — 89,9 kr\/kg/).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button",{name:"VÄLJ"}).length).toBeGreaterThan(0);
  expect(screen.queryByText("45 g protein")).not.toBeInTheDocument();
  const card=screen.getAllByText(title)[0].closest("article")!;
  expect(within(card).getByRole("button",{name:"VÄLJ"}).closest(".recommendation-card-heading")).not.toBeNull();
 });

 it("keeps selection, portions and live macros when Lunch collapses and expands",async()=>{
  await seedRecipe();const user=userEvent.setup();render(<WeeklyGenerator/>);await user.click(await screen.findByRole("button",{name:"GENERERA FÖRSLAG"}));
  const lunchToggle=screen.getByRole("button",{name:/Lunch.*0 recept valda/i}),lunchSection=lunchToggle.closest("section")!;
  await user.click(within(lunchSection).getByRole("button",{name:"VÄLJ"}));
  const macroBar=screen.getByText("DAGLIGT SNITT").closest("aside")!;
  expect(within(macroBar).getByText("🔥 600 kcal")).toBeInTheDocument();
  expect(within(lunchSection).getByText(/1 recept valda · 5 portioner/)).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:/Lunch.*1 recept valda/i}));
  expect(screen.queryByText("Ta bort valet")).not.toBeInTheDocument();
  expect(within(macroBar).getByText("🔥 600 kcal")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:/Lunch.*1 recept valda/i}));
  expect(screen.getByText("Ta bort valet")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:`Öka portioner ${title}`}));
  expect(within(macroBar).getByText("🔥 720 kcal")).toBeInTheDocument();
  expect(screen.getByRole("status",{name:`portioner ${title}`})).toHaveTextContent("6");
 });

 it("previews full-week macros in change mode, cancels cleanly and confirms consistently",async()=>{
  const replacement=await saveRecipe({...emptyRecipe(),title:"Middag ny",sourceType:"manual",originalServings:5,servings:5,mealTypes:["Middag"],primaryProtein:"Kyckling",caloriesPerServing:900,proteinGramsPerServing:65,carbsGramsPerServing:85,fatGramsPerServing:28,ingredients:[{id:"new-i",name:"Potatis",quantity:"1000",unit:"g"}],instructions:[]});
  const rec=(id:string,category:MealCategory,calories:number,protein:number,carbs:number,fat:number,ingredient:string):WeeklyRecommendation=>({id,category,title:id,sourceName:"Mina recept",sourceUrl:"",sourceType:"personal",calories,protein,carbs,fat,servings:5,originalServings:5,ingredients:[{name:ingredient,quantity:"500",unit:"g"}],primaryProtein:id,cuisine:"",favorite:false,score:0,campaignRelevance:0,reasons:[]});
  const selections=emptyWeeklySelections(),values:[MealCategory,number,number,number,number,string][]=[["breakfast",400,30,45,10,"Havregryn"],["lunch",600,50,65,18,"Ris"],["dinner",700,55,70,22,"Pasta"],["snack",300,20,30,8,"Kvarg"]];for(const[category,calories,protein,carbs,fat,ingredient]of values)selections[category]=[makeWeeklySelection(rec(category==="dinner"?"Middag original":category,category,calories,protein,carbs,fat,ingredient),5)];
  const plan={id:"active-week",createdAt:"2026-08-21T10:00:00.000Z",updatedAt:"2026-08-21T10:00:00.000Z",dietPhaseSnapshot:"maintenance",calorieTargetSnapshot:2500,macroFiltersSnapshot:EMPTY_MACRO_FILTERS,plannedDays:5,recommendations:{breakfast:[],lunch:[],dinner:[],snack:[]},selections,shoppingList:buildShoppingList(selections,[],[]),status:"finalized"}as WeeklyPlan;await saveWeeklyPlan(plan);
  const user=userEvent.setup();render(<WeeklyGenerator/>);const macroBar=(await screen.findByText("DAGLIGT SNITT")).closest("aside")!;expect(within(macroBar).getByText("🔥 2 000 kcal")).toBeInTheDocument();
  const originalCard=(await screen.findAllByText("Middag original")).map(node=>node.closest("article")).find(article=>article&&within(article).queryByRole("button",{name:"BYT"}))!;await user.click(within(originalCard).getByRole("button",{name:"BYT"}));await user.click(await screen.findByRole("button",{name:"FÖRHANDSVISA"}));expect(within(macroBar).getByText("🔥 2 200 kcal")).toBeInTheDocument();expect(within(macroBar).getByText("💪 165 g")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Avbryt"}));expect(within(macroBar).getByText("🔥 2 000 kcal")).toBeInTheDocument();expect(screen.getAllByText("Middag original").length).toBeGreaterThan(0);
  await user.click(within(originalCard).getByRole("button",{name:"BYT"}));await user.click(await screen.findByRole("button",{name:"FÖRHANDSVISA"}));await user.click(screen.getByRole("button",{name:"BEKRÄFTA BYTE"}));expect(await within(macroBar).findByText("🔥 2 200 kcal")).toBeInTheDocument();expect((await screen.findAllByText(replacement.title)).length).toBeGreaterThan(0);expect(screen.queryAllByText("Middag original")).toHaveLength(0);
 });
});
