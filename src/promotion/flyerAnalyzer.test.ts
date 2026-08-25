import{afterEach,describe,expect,it,vi}from"vitest";
import{analyzeFlyer,flyerErrorText}from"./flyerAnalyzer";

afterEach(()=>vi.unstubAllGlobals());

describe("flyer analyzer request flow",()=>{
 it("reports uploading then analyzing and returns structured promotions",async()=>{
  const fetchMock=vi.fn(async()=>new Response(JSON.stringify({validFrom:null,validTo:null,numberOfPages:2,warnings:[],promotions:[{displayName:"Potatis",normalizedName:"potatis",warnings:[]}]}),{status:200,headers:{"Content-Type":"application/json"}}));vi.stubGlobal("fetch",fetchMock);const progress:Array<"uploading"|"analyzing">=[];
  const result=await analyzeFlyer(new File(["%PDF-test"],"willys.pdf",{type:"application/pdf"}),state=>progress.push(state));
  expect(progress).toEqual(["uploading","analyzing"]);expect(result.promotions[0]).toMatchObject({displayName:"Potatis",normalizedName:"potatis",currency:"SEK",ignored:false});expect(fetchMock).toHaveBeenCalledTimes(1);
 });
 it.each([["unreadable_pdf","PDF-filen kunde inte läsas"],["result_too_large","fler kampanjer"],["malformed_model_response","kunde inte färdigställa"]])("preserves a precise server error: %s",async(code,message)=>{vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({error:code}),{status:502,headers:{"Content-Type":"application/json"}})));await expect(analyzeFlyer(new File(["%PDF-test"],"willys.pdf",{type:"application/pdf"}))).rejects.toMatchObject({code});expect(flyerErrorText(code)).toContain(message)});
});
