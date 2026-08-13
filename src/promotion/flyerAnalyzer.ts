import type { PromotionDraft } from "../domain/promotion";
const apiBase=(import.meta.env.VITE_RECIPE_API_URL as string|undefined)??"https://meal-prep-api.malmish1.workers.dev";
export class FlyerAnalysisError extends Error{constructor(public code:string){super(code)}}
export async function fingerprintFile(file:File){const hash=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");}
async function dataUrl(file:File){return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new FlyerAnalysisError("invalid_pdf"));reader.readAsDataURL(file)});}
export interface FlyerAnalysis {validFrom:string|null;validTo:string|null;numberOfPages:number|null;warnings:string[];promotions:PromotionDraft[]}
export async function analyzeFlyer(file:File):Promise<FlyerAnalysis>{
 if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf"))throw new FlyerAnalysisError("invalid_pdf");
 if(!file.size||file.size>20*1024*1024)throw new FlyerAnalysisError("invalid_pdf");
 let response:Response;try{response=await fetch(`${apiBase}/flyers/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileName:file.name,pdf:await dataUrl(file)})})}catch{throw new FlyerAnalysisError("worker_unavailable")}
 let payload:any;try{payload=await response.json()}catch{throw new FlyerAnalysisError("malformed_response")}
 if(!response.ok)throw new FlyerAnalysisError(payload?.error??"analysis_failed");
 if(!Array.isArray(payload.promotions))throw new FlyerAnalysisError("malformed_response");
 return {...payload,promotions:payload.promotions.map((item:any)=>({...item,currency:"SEK",ignored:false,warnings:item.warnings??[],normalizedName:item.normalizedName||String(item.displayName??"").toLocaleLowerCase("sv-SE")}))};
}
