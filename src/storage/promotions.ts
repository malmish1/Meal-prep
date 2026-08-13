import type { PromotionDraft,PromotionFlyer,PromotionItem } from "../domain/promotion";
import { getDB } from "./db";
const id=()=>crypto.randomUUID();
export async function savePromotionWeek(input:{flyer:Omit<PromotionFlyer,"promotionItemIds">;items:Array<PromotionDraft & {id?:string}>}){
 const db=await getDB(),now=new Date().toISOString();
 const items:PromotionItem[]=input.items.map(item=>({...item,id:item.id??id(),flyerId:input.flyer.id,createdAt:now,updatedAt:now}));
 const flyer:PromotionFlyer={...input.flyer,promotionItemIds:items.map(x=>x.id)};
 const tx=db.transaction(["promotions","promotionFlyers"],"readwrite");
 const old=await tx.objectStore("promotions").getAll() as PromotionItem[];
 for(const item of old.filter(x=>x.flyerId===flyer.id))await tx.objectStore("promotions").delete(item.id);
 for(const item of items)await tx.objectStore("promotions").put(item,item.id);
 await tx.objectStore("promotionFlyers").put(flyer,flyer.id); await tx.done; return{flyer,items};
}
export async function listPromotionFlyers(){return (await (await getDB()).getAll("promotionFlyers") as PromotionFlyer[]).sort((a,b)=>b.importedAt.localeCompare(a.importedAt));}
export async function getPromotionItems(flyerId:string){return ((await (await getDB()).getAll("promotions")) as PromotionItem[]).filter(x=>x.flyerId===flyerId);}
export async function findFlyerByFingerprint(fingerprint:string){return (await listPromotionFlyers()).find(x=>x.fingerprint===fingerprint);}
export async function getActivePromotionWeek(){const flyer=(await listPromotionFlyers()).find(x=>x.status==="confirmed");return flyer?{flyer,items:(await getPromotionItems(flyer.id)).map(x=>({...x,normalizedName:canonicalName(x.displayName)}))}:undefined;}
const canonicalName=(value:string)=>value.trim().toLocaleLowerCase("sv-SE").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
