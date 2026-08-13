import {describe,expect,it} from "vitest";import {parseSwedishPromotionPrice} from "./priceParser";
describe("svenska kampanjpriser",()=>{
 it("tolkar decimalpris per kg",()=>expect(parseSwedishPromotionPrice("89,90/kg")).toMatchObject({price:89.9,priceType:"perKg",unit:"kg"}));
 it("tolkar fast pris",()=>expect(parseSwedishPromotionPrice("15:-")).toMatchObject({price:15,priceType:"fixed"}));
 it("tolkar flerköp",()=>expect(parseSwedishPromotionPrice("2 för 35")).toMatchObject({price:35,priceType:"multibuy",quantityRequirement:2,multibuy:{quantity:2,totalPrice:35}}));
});
