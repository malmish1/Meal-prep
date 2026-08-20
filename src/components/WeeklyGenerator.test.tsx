import{render,screen}from"@testing-library/react";
import userEvent from"@testing-library/user-event";
import{beforeEach,describe,expect,it}from"vitest";
import{emptyRecipe}from"../domain/recipe";
import{emptyPromotion}from"../domain/promotion";
import{resetDBConnectionForTests}from"../storage/db";
import{saveRecipe}from"../storage/recipes";
import{savePromotionWeek}from"../storage/promotions";
import{WeeklyGenerator}from"./WeeklyGenerator";

beforeEach(async()=>{await resetDBConnectionForTests();await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase("meal-prep");request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)})});
describe("weekly campaign UI",()=>{it("shows which personal ingredient is on promotion before selection",async()=>{await saveRecipe({...emptyRecipe(),title:"Krämig kycklingpasta",sourceType:"manual",originalServings:4,servings:4,mealTypes:["Lunch"],primaryProtein:"Kyckling",caloriesPerServing:600,proteinGramsPerServing:45,carbsGramsPerServing:60,fatGramsPerServing:20,ingredients:[{id:"i",name:"Kycklingfilé",quantity:"800",unit:"g"}],instructions:[]});const promotion={...emptyPromotion(),displayName:"Kycklingfilé",normalizedName:"kycklingfile",price:89.9,priceType:"perKg"as const};await savePromotionWeek({flyer:{id:"f",store:"Willys",fileName:"vecka.pdf",fingerprint:"fp",importedAt:new Date().toISOString(),analysisVersion:"flyer-v1",provider:"OpenAI",status:"confirmed"},items:[promotion]});render(<WeeklyGenerator/>);await userEvent.click(await screen.findByRole("button",{name:"GENERERA FÖRSLAG"}));expect(await screen.findAllByText("Passar veckans kampanjer")).not.toHaveLength(0);expect(screen.getAllByText(/Kycklingfilé — 89,9 kr\/kg/).length).toBeGreaterThan(0);expect(screen.getAllByRole("button",{name:"+ LÄGG TILL"}).length).toBeGreaterThan(0)})});
