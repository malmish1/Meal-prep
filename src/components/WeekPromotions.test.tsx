import { render,screen,waitFor,within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach,describe,expect,it,vi } from "vitest";
import { WeekPromotions } from "./WeekPromotions";
import { resetDBConnectionForTests } from "../storage/db";
import { getActivePromotionWeek,listPromotionFlyers,savePromotionWeek } from "../storage/promotions";
import { emptyPromotion } from "../domain/promotion";

vi.mock("../promotion/flyerAnalyzer",()=>{
 class FlyerAnalysisError extends Error{constructor(public code:string){super(code)}}
 return{FlyerAnalysisError,fingerprintFile:vi.fn(async()=>"new-fingerprint"),analyzeFlyer:vi.fn(async()=>({validFrom:"2026-08-24",validTo:"2026-08-30",numberOfPages:8,warnings:[],promotions:[{...emptyPromotion(),displayName:"Kycklingfilé",normalizedName:"kycklingfile",price:89.9,priceType:"perKg"}]}))}
});

const flyer=(id:string,fileName:string,importedAt:string)=>({id,store:"Willys" as const,fileName,fingerprint:id,importedAt,validFrom:null,validTo:null,numberOfPages:4,analysisVersion:"flyer-v1",provider:"OpenAI" as const,status:"confirmed" as const});

beforeEach(async()=>{await resetDBConnectionForTests();await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase("meal-prep");request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)});vi.stubGlobal("confirm",vi.fn(()=>true))});

describe("reklambladshantering",()=>{
 it("visar ett nysparat reklamblad och kan radera det gamla",async()=>{
  await savePromotionWeek({flyer:flyer("old","gammalt.pdf","2026-08-01T10:00:00.000Z"),items:[{...emptyPromotion(),displayName:"Ris",normalizedName:"ris"}]});
  const onChanged=vi.fn();const user=userEvent.setup();const view=render(<WeekPromotions onChanged={onChanged}/>);
  expect(await screen.findByText("gammalt.pdf")).toBeInTheDocument();
  const input=view.container.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input,new File(["pdf"],"nytt.pdf",{type:"application/pdf"}));
  await user.click(await screen.findByRole("button",{name:"Spara veckans kampanjer"}));
  expect(await screen.findByText("nytt.pdf")).toBeInTheDocument();
  const oldRow=screen.getByText("gammalt.pdf").closest("article")!;
  await user.click(within(oldRow).getByRole("button",{name:"Radera"}));
  await waitFor(()=>expect(screen.queryByText("gammalt.pdf")).not.toBeInTheDocument());
  expect(await listPromotionFlyers()).toHaveLength(1);
  expect((await getActivePromotionWeek())?.flyer.fileName).toBe("nytt.pdf");
  expect(onChanged).toHaveBeenCalledTimes(2);
 });
});
