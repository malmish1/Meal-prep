import { isRecipeResult, recipeSchema } from "./schema";
import { isPromotionResult, promotionSchema } from "./promotionSchema";
import { discoverySchema, likelyIndividualRecipe, nutritionEligible, validDiscovery } from "./discoverySchema";

type Env = { OPENAI_API_KEY: string; ALLOWED_ORIGIN: string };
const localOrigins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = origin === env.ALLOWED_ORIGIN || localOrigins.has(origin);
    const headers = corsHeaders(allowed ? origin : env.ALLOWED_ORIGIN);
    if (request.method === "OPTIONS") return allowed ? new Response(null, { status: 204, headers }) : json({ error: "origin_not_allowed" }, 403, headers);
    if (!allowed) return json({ error: "origin_not_allowed" }, 403, headers);
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, headers);

    const path=new URL(request.url).pathname;
    if(path==="/recipes/discover") return discoverRecipes(request,env,headers);
    if(path==="/flyers/analyze") return analyzeFlyer(request,env,headers);
    let images: unknown;
    try { ({ images } = await request.json() as { images?: unknown }); }
    catch { return json({ error: "invalid_request" }, 400, headers); }
    if (!Array.isArray(images) || images.length < 1 || images.length > 6 ||
        images.some((image) => typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > 8_000_000))
      return json({ error: "invalid_images" }, 400, headers);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40_000);
    try {
      const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4.1-mini-2025-04-14",
          store: false,
          max_output_tokens: 2500,
          input: [{ role: "user", content: [
            { type: "input_text", text: recipePrompt },
            ...images.map((image) => ({ type: "input_image", image_url: image, detail: "high" })),
          ] }],
          text: { format: { type: "json_schema", name: "meal_prep_recipe", strict: true, schema: recipeSchema } },
        }),
      });
      if (!openAiResponse.ok) {
        const status = openAiResponse.status === 429 ? 429 : openAiResponse.status === 402 ? 402 : 503;
        return json({ error: status === 429 ? "rate_limit" : status === 402 ? "spend_limit" : "upstream_unavailable" }, status, headers);
      }
      const payload = await openAiResponse.json() as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
      const text = payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
      if (!text) return json({ error: "malformed_model_response" }, 502, headers);
      const result: unknown = JSON.parse(text);
      if (!isRecipeResult(result)) return json({ error: "malformed_model_response" }, 502, headers);
      return json(result, 200, headers);
    } catch {
      return json({ error: "upstream_unavailable" }, 503, headers);
    } finally { clearTimeout(timeout); }
  },
};

async function discoverRecipes(request:Request,env:Env,headers:Record<string,string>){
 let query:unknown;try{({query}=await request.json() as {query?:unknown})}catch{return json({error:"invalid_request"},400,headers)}
 if(typeof query!=="string"||query.trim().length<2||query.length>120)return json({error:"invalid_query"},400,headers);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),90_000);
 try{const upstream=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({model:"gpt-5.4-mini",store:false,max_output_tokens:5000,tools:[{type:"web_search",search_context_size:"medium"}],include:["web_search_call.action.sources"],input:`${discoveryPrompt}\n\nUser search: ${query.trim()}`,text:{format:{type:"json_schema",name:"external_recipe_candidates",strict:true,schema:discoverySchema}}})});
 if(!upstream.ok){const code=await safeUpstreamError(upstream);console.warn("recipe_discovery_error",{status:upstream.status,code});const status=upstream.status===429?429:upstream.status===402?402:503;return json({error:status===429?"rate_limit":status===402?"spend_limit":"upstream_unavailable"},status,headers)}
 const payload=await upstream.json() as {output?:Array<{content?:Array<{type?:string;text?:string}>;action?:{sources?:Array<{url?:string}>}}>};const text=payload.output?.flatMap(x=>x.content??[]).find(x=>x.type==="output_text")?.text;if(!text)return json({error:"no_results"},404,headers);const parsed:unknown=JSON.parse(text);if(!validDiscovery(parsed))return json({error:"malformed_model_response"},502,headers);const sourceUrls=new Set(payload.output?.flatMap(x=>x.action?.sources??[]).map(x=>canonicalSource(x.url??"")).filter(Boolean));const now=new Date().toISOString();const candidates=(parsed as any).candidates.filter((x:any)=>validHttpUrl(x.sourceUrl)&&sourceUrls.has(canonicalSource(x.sourceUrl))&&likelyIndividualRecipe(x)&&nutritionEligible(x)).map((x:any)=>({...x,nutritionEligible:true,id:crypto.randomUUID(),discoveredAt:now,searchTerms:[query],savedToLibrary:false,dismissed:false}));return candidates.length?json({candidates,webSearchInvoked:true},200,headers):json({error:"no_results"},404,headers);
 }catch(error){const timedOut=error instanceof Error&&error.name==="AbortError";console.warn("recipe_discovery_failed",{code:timedOut?"timeout":"transport"});return json({error:timedOut?"analysis_timeout":"upstream_unavailable"},503,headers)}finally{clearTimeout(timeout)}
}

const discoveryPrompt=`Search the live web for 4-8 real, individual recipe detail pages matching the user's request. Strongly prioritize Swedish sources, metric units and ingredients readily available in Swedish supermarkets; prefer ICA, STC, Arla and other reputable Swedish nutrition-rich publishers, then use reputable international sources only as fallback. Every candidate must be one specific named dish on its own recipe page, never a collection or category page. Open and verify each page and preserve its canonical URL. Extract calories, protein, carbohydrates and fat per serving only when all values are explicitly published by the original source. Set unavailable values to null and nutritionSource to unknown; never calculate, infer or invent macros. Assess Swedish ingredient availability. Include ingredients and instructions only when supported by evidence. Return fewer high-quality candidates rather than weak results.`;
function validHttpUrl(value:string){try{const url=new URL(value);return(url.protocol==="https:"||url.protocol==="http:")&&url.hostname.includes(".")}catch{return false}}
function canonicalSource(value:string){try{const url=new URL(value);return`${url.hostname.toLocaleLowerCase()}${url.pathname.replace(/\/$/,"")}`}catch{return""}}

async function analyzeFlyer(request:Request,env:Env,headers:Record<string,string>){
 let body:{pdf?:unknown;fileName?:unknown};try{body=await request.json() as typeof body}catch{return json({error:"invalid_request"},400,headers)}
 if(typeof body.pdf!=="string"||!body.pdf.startsWith("data:application/pdf;base64,")||body.pdf.length>28_000_000||typeof body.fileName!=="string")return json({error:"invalid_pdf"},400,headers);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),115_000);
 try{const upstream=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({model:"gpt-4.1-mini-2025-04-14",store:false,max_output_tokens:6000,input:[{role:"user",content:[{type:"input_text",text:flyerPrompt},{type:"input_file",filename:String(body.fileName).slice(0,120),file_data:body.pdf}]}],text:{format:{type:"json_schema",name:"meal_prep_promotions",strict:true,schema:promotionSchema}}})});
 if(!upstream.ok){const upstreamError=await safeUpstreamError(upstream);console.warn("flyer_openai_error",{status:upstream.status,code:upstreamError});const status=upstream.status===429?429:upstream.status===402?402:upstream.status===401?401:503;return json({error:status===429?"rate_limit":status===402?"spend_limit":status===401?"authentication_failed":"upstream_unavailable"},status,headers)}
 const payload=await upstream.json() as {output?:Array<{content?:Array<{type?:string;text?:string}>}>};const text=payload.output?.flatMap(x=>x.content??[]).find(x=>x.type==="output_text")?.text;if(!text)return json({error:"malformed_model_response"},502,headers);const result:unknown=JSON.parse(text);if(!isPromotionResult(result))return json({error:"malformed_model_response"},502,headers);return json(result,200,headers);
 }catch(error){const timedOut=error instanceof Error&&error.name==="AbortError";console.warn("flyer_analysis_failed",{code:timedOut?"timeout":"transport"});return json({error:timedOut?"analysis_timeout":"upstream_unavailable"},503,headers)}finally{clearTimeout(timeout)}
}

async function safeUpstreamError(response:Response){try{const value=await response.json() as {error?:{code?:unknown;type?:unknown}};return String(value.error?.code??value.error?.type??"unknown").slice(0,80)}catch{return"unreadable"}}

const flyerPrompt=`Analyze the attached Willys weekly promotional PDF, using both embedded text and page images. Extract real purchasable product promotions only; ignore slogans, recipes, branding, opening hours and general loyalty advertising. Preserve the displayed product name and add a conservative Swedish normalizedName. Parse Swedish prices and decimal commas. Use perKg, perUnit, fixed, multibuy or unknown. For multibuy return quantity and total price. Never invent brand, size, weight, price, dates or conditions: return null and a short Swedish warning when unclear. Categorize conservatively. Confidence is 0–1. Return all relevant pages in one concise structured result.`;

const recipePrompt = `Interpret all attached screenshots, in their given order, as ONE recipe. Semantically distinguish title, introduction, ingredients, instructions, servings, nutrition and source. Ignore phone clock, status bar, browser/navigation/social controls, likes, comments, ads and unrelated recommendations. Remove overlap duplicates across screenshots. Never invent missing quantities, ingredients, times, temperatures, servings or nutrition: use null/empty values and a short Swedish warning. Mark an ingredient uncertain when its name, amount or unit cannot be read confidently. Confidence values must be 0–1. Return only the required structured result.`;

function corsHeaders(origin: string) {
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin", "Cache-Control": "no-store" };
}
function json(value: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(value), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
