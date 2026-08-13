import type { PriceType } from "../domain/promotion";
export interface ParsedPrice { price: number | null; priceType: PriceType; unit?: string; quantityRequirement?: number; multibuy?: {quantity:number;totalPrice:number}; memberOnly: boolean }
const number = (value:string) => Number(value.replace(",","."));
export function parseSwedishPromotionPrice(input:string): ParsedPrice {
  const text=input.trim(); const memberOnly=/medlemspris|stammispris/i.test(text);
  const multi=text.match(/(?:köp\s*)?(\d+)\s*för\s*(\d+(?:[,.]\d+)?)\s*(?::?-)?/i);
  if(multi){const quantity=Number(multi[1]),totalPrice=number(multi[2]);return{price:totalPrice,priceType:"multibuy",quantityRequirement:quantity,multibuy:{quantity,totalPrice},memberOnly};}
  const single=text.match(/(\d+(?:[,.]\d+)?)\s*(?::?-)?\s*(?:\/\s*(kg|st))?/i);
  if(!single)return{price:null,priceType:"unknown",memberOnly};
  const unit=single[1] ? single[2]?.toLowerCase() : undefined;
  return{price:number(single[1]),priceType:unit==="kg"?"perKg":unit==="st"?"perUnit":"fixed",unit,memberOnly};
}
