import { render,screen,within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach,describe,expect,it } from "vitest";
import { emptyRecipe } from "../domain/recipe";
import { emptyPromotion } from "../domain/promotion";
import { resetDBConnectionForTests } from "../storage/db";
import { saveRecipe } from "../storage/recipes";
import { savePromotionWeek } from "../storage/promotions";
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
});
