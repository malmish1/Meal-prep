import type { PromotionDraft } from "../domain/promotion";
const apiBase=(import.meta.env.VITE_RECIPE_API_URL as string|undefined)??"https://meal-prep-api.malmish1.workers.dev";
export class FlyerAnalysisError extends Error{constructor(public code:string){super(code)}}
export async function fingerprintFile(file:File){const hash=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");}
async function dataUrl(file:File){return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new FlyerAnalysisError("invalid_pdf"));reader.readAsDataURL(file)});}
export interface FlyerAnalysis {validFrom:string|null;validTo:string|null;numberOfPages:number|null;warnings:string[];promotions:PromotionDraft[]}
export type FlyerProgress="uploading"|"analyzing";
export function flyerErrorText(code:string){if(code==="invalid_pdf")return"Välj ett giltigt PDF-reklamblad på högst 20 MB.";if(code==="unreadable_pdf")return"PDF-filen kunde inte läsas av AI-tjänsten. Hämta reklambladet på nytt och försök igen.";if(code==="no_promotions")return"Inga tydliga kampanjer hittades.";if(code==="rate_limit")return"AI-tjänsten är tillfälligt upptagen. Försök igen senare.";if(code==="spend_limit")return"Projektets kostnadsgräns är nådd.";if(code==="analysis_timeout")return"Reklambladet tog för lång tid att tolka. Analysen avbröts efter fyra minuter.";if(code==="result_too_large")return"Reklambladet innehöll fler kampanjer än AI-svaret kunde slutföra.";if(code==="analysis_incomplete"||code==="malformed_model_response")return"AI-tjänsten läste PDF-filen men kunde inte färdigställa kampanjlistan.";if(code==="authentication_failed")return"AI-tjänstens serveranslutning behöver återställas.";if(code==="worker_unavailable"||code==="upstream_unavailable")return"AI-tjänsten kunde inte nås. Försök igen om en stund.";return`AI-tolkningen kunde inte slutföras (felkod: ${code}).`}
export async function analyzeFlyer(file:File,onProgress?:(state:FlyerProgress)=>void):Promise<FlyerAnalysis>{
 if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf"))throw new FlyerAnalysisError("invalid_pdf");
 if(!file.size||file.size>20*1024*1024)throw new FlyerAnalysisError("invalid_pdf");
 onProgress?.("uploading");const pdf=await dataUrl(file);onProgress?.("analyzing");const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),240_000);
 let response:Response;try{response=await fetch(`${apiBase}/flyers/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileName:file.name,pdf}),signal:controller.signal})}catch(error){throw new FlyerAnalysisError(error instanceof DOMException&&error.name==="AbortError"?"analysis_timeout":"worker_unavailable")}finally{window.clearTimeout(timeout)}
 let payload:any;try{payload=await response.json()}catch{throw new FlyerAnalysisError("malformed_response")}
 if(!response.ok)throw new FlyerAnalysisError(payload?.error??"analysis_failed");
 if(!Array.isArray(payload.promotions))throw new FlyerAnalysisError("malformed_response");
 return {...payload,promotions:payload.promotions.map((item:any)=>({...item,currency:"SEK",ignored:false,warnings:item.warnings??[],normalizedName:item.normalizedName||String(item.displayName??"").toLocaleLowerCase("sv-SE")}))};
}
