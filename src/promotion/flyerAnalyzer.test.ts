import{afterEach,describe,expect,it,vi}from"vitest";
import{analyzeFlyer}from"./flyerAnalyzer";

afterEach(()=>vi.unstubAllGlobals());

describe("flyer analyzer request flow",()=>{
 it("reports uploading then analyzing and returns structured promotions",async()=>{
  const fetchMock=vi.fn(async()=>new Response(JSON.stringify({validFrom:null,validTo:null,numberOfPages:2,warnings:[],promotions:[{displayName:"Potatis",normalizedName:"potatis",warnings:[]}]}),{status:200,headers:{"Content-Type":"application/json"}}));vi.stubGlobal("fetch",fetchMock);const progress:Array<"uploading"|"analyzing">=[];
  const result=await analyzeFlyer(new File(["%PDF-test"],"willys.pdf",{type:"application/pdf"}),state=>progress.push(state));
  expect(progress).toEqual(["uploading","analyzing"]);expect(result.promotions[0]).toMatchObject({displayName:"Potatis",normalizedName:"potatis",currency:"SEK",ignored:false});expect(fetchMock).toHaveBeenCalledTimes(1);
 });
});
