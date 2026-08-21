import { render,screen,waitFor,within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach,describe,expect,it,vi } from "vitest";
import { WeekPromotions } from "./WeekPromotions";
import { resetDBConnectionForTests } from "../storage/db";
import { getActivePromotionWeek,listPromotionFlyers,savePromotionWeek } from "../storage/promotions";
import { emptyPromotion } from "../domain/promotion";

const flyerMocks=vi.hoisted(()=>({analyze:vi.fn(),fingerprint:vi.fn(async()=>"new-fingerprint")}));
vi.mock("../promotion/flyerAnalyzer",()=>{
 class FlyerAnalysisError extends Error{constructor(public code:string){super(code)}}
 return{FlyerAnalysisError,fingerprintFile:flyerMocks.fingerprint,analyzeFlyer:flyerMocks.analyze};
});

const flyer=(id:string,fileName:string,importedAt:string)=>({id,store:"Willys" as const,fileName,fingerprint:id,importedAt,validFrom:null,validTo:null,numberOfPages:4,analysisVersion:"flyer-v1",provider:"OpenAI" as const,status:"confirmed" as const});
const successfulAnalysis=()=>({validFrom:"2026-08-24",validTo:"2026-08-30",numberOfPages:8,warnings:[],promotions:[{...emptyPromotion(),displayName:"Kycklingfilé",normalizedName:"kycklingfile",price:89.9,priceType:"perKg"}]});

beforeEach(async()=>{
 await resetDBConnectionForTests();await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase("meal-prep");request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)});
 vi.stubGlobal("confirm",vi.fn(()=>true));flyerMocks.analyze.mockReset();flyerMocks.fingerprint.mockClear();flyerMocks.analyze.mockResolvedValue(successfulAnalysis());
});

describe("reklambladshantering",()=>{
 it("visar ett nysparat reklamblad och kan radera det gamla",async()=>{
  await savePromotionWeek({flyer:flyer("old","gammalt.pdf","2026-08-01T10:00:00.000Z"),items:[{...emptyPromotion(),displayName:"Ris",normalizedName:"ris"}]});
  const onChanged=vi.fn(),user=userEvent.setup(),view=render(<WeekPromotions onChanged={onChanged}/>);expect(await screen.findByText("gammalt.pdf")).toBeInTheDocument();
  const input=view.container.querySelector('input[type="file"]') as HTMLInputElement;await user.upload(input,new File(["pdf"],"nytt.pdf",{type:"application/pdf"}));await user.click(await screen.findByRole("button",{name:"Spara veckans kampanjer"}));
  expect(await screen.findByText("nytt.pdf")).toBeInTheDocument();const oldRow=screen.getByText("gammalt.pdf").closest("article")!;await user.click(within(oldRow).getByRole("button",{name:"Radera"}));
  await waitFor(()=>expect(screen.queryByText("gammalt.pdf")).not.toBeInTheDocument());expect(await listPromotionFlyers()).toHaveLength(1);expect((await getActivePromotionWeek())?.flyer.fileName).toBe("nytt.pdf");expect(onChanged).toHaveBeenCalledTimes(2);
 });

 it("raderar aktivt blad och kan analysera samt spara ett nytt utan omladdning",async()=>{
  await savePromotionWeek({flyer:flyer("old","gammalt.pdf","2026-08-01T10:00:00.000Z"),items:[{...emptyPromotion(),displayName:"Ris",normalizedName:"ris"}]});
  const user=userEvent.setup(),view=render(<WeekPromotions/>);const oldRow=(await screen.findByText("gammalt.pdf")).closest("article")!;await user.click(within(oldRow).getByRole("button",{name:"Radera"}));await waitFor(()=>expect(screen.queryByText("gammalt.pdf")).not.toBeInTheDocument());
  expect(screen.getByText("Reklambladet är raderat.")).toBeInTheDocument();const input=view.container.querySelector('input[type="file"]') as HTMLInputElement;await user.upload(input,new File(["pdf"],"ersattning.pdf",{type:"application/pdf"}));await user.click(await screen.findByRole("button",{name:"Spara veckans kampanjer"}));
  expect(await screen.findByText("ersattning.pdf")).toBeInTheDocument();expect(screen.queryByText("Reklambladet är raderat.")).not.toBeInTheDocument();expect((await getActivePromotionWeek())?.flyer.fileName).toBe("ersattning.pdf");
 });

 it("rensar ett gammalt analysfel när radering lyckas",async()=>{
  await savePromotionWeek({flyer:flyer("old","gammalt.pdf","2026-08-01T10:00:00.000Z"),items:[{...emptyPromotion(),displayName:"Ris",normalizedName:"ris"}]});
  const {FlyerAnalysisError}=await import("../promotion/flyerAnalyzer");flyerMocks.analyze.mockRejectedValueOnce(new FlyerAnalysisError("analysis_timeout"));
  const user=userEvent.setup(),view=render(<WeekPromotions/>),input=view.container.querySelector('input[type="file"]') as HTMLInputElement;await user.upload(input,new File(["pdf"],"fel.pdf",{type:"application/pdf"}));expect(await screen.findByRole("alert")).toHaveTextContent("tog för lång tid");
  const oldRow=screen.getByText("gammalt.pdf").closest("article")!;await user.click(within(oldRow).getByRole("button",{name:"Radera"}));expect(await screen.findByText("Reklambladet är raderat.")).toBeInTheDocument();expect(screen.queryByRole("alert")).not.toBeInTheDocument();
 });
});
