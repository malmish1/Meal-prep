import{describe,expect,it}from"vitest";import{campaignMatches,ingredientCampaignMatch}from"./campaignMatcher";import{emptyPromotion}from"../domain/promotion";const p=(name:string)=>({...emptyPromotion(),id:name,flyerId:"f",displayName:name,normalizedName:name.toLowerCase(),ignored:false,createdAt:"",updatedAt:""}),recipe=(names:string[])=>({ingredients:names.map((name,i)=>({id:String(i),name,quantity:"1",unit:"st"}))});
describe("controlled campaign taxonomy",()=>{it("matches normalized and category variants",()=>{expect(ingredientCampaignMatch("crème fraîche","Creme Fraiche")).toBe(true);expect(ingredientCampaignMatch("ris","jasminris")).toBe(true);expect(ingredientCampaignMatch("havregryn","fiberhavregryn")).toBe(true);expect(ingredientCampaignMatch("pasta","spaghetti")).toBe(true);expect(ingredientCampaignMatch("nötfärs","Nötfärs 12%")).toBe(true)});it("prevents misleading partial words",()=>{expect(ingredientCampaignMatch("kycklingfond","Kycklingfilé")).toBe(false);expect(ingredientCampaignMatch("tomatpuré","tomater")).toBe(false);expect(ingredientCampaignMatch("kokosmjölk","mjölk")).toBe(false);expect(ingredientCampaignMatch("jordnötssmör","smör")).toBe(false);expect(ingredientCampaignMatch("risvinäger","jasminris")).toBe(false)});it("preserves recipe and promotion names plus kind",()=>expect(campaignMatches(recipe(["ris"]),[p("Jasminris")])[0]).toMatchObject({ingredientName:"ris",ingredientIdentity:"RICE",promotionName:"Jasminris",kind:"category"}));it("counts one campaign per unique recipe ingredient and chooses a compact primary offer",()=>{const fixed={...p("Kvisttomater"),id:"tomat-a",price:24.9,priceType:"fixed"as const},perKg={...p("Kvisttomater"),id:"tomat-b",price:19.9,priceType:"perKg"as const},pork={...p("Fläskfärs"),price:49.9,priceType:"fixed"as const},matches=campaignMatches(recipe(["kvisttomat","tomater","fläskfärs"]),[fixed,perKg,pork]);expect(matches).toHaveLength(2);expect(matches[0]).toMatchObject({ingredientName:"kvisttomat",ingredientIdentity:"TOMATO",promotionId:"tomat-b",promotionPrice:19.9,promotionPriceType:"perKg"});expect(matches[1]).toMatchObject({ingredientName:"fläskfärs",ingredientIdentity:"GROUND_PORK"})})});
describe("home ingredient name variants",()=>{it("matches related Swedish pork fillet names",()=>{expect(ingredientCampaignMatch("Fläskytterfilé","fläskfilé")).toBe(true);expect(ingredientCampaignMatch("ytterfilé av fläsk","fläskinnerfilé")).toBe(true)});it("matches generic chicken with chicken fillet variants",()=>{expect(ingredientCampaignMatch("Kyckling","kycklingfilé")).toBe(true);expect(ingredientCampaignMatch("Kycklinginnerfilé","kyckling")).toBe(true)});it("ignores packaging words around tuna",()=>{expect(ingredientCampaignMatch("1 burk tonfisk i vatten","tonfisk")).toBe(true);expect(ingredientCampaignMatch("Tonfiskfilé","2 konservburkar tonfisk")).toBe(true)});it("does not confuse processed or unrelated products",()=>{expect(ingredientCampaignMatch("fläskfärs","fläskfilé")).toBe(false);expect(ingredientCampaignMatch("tonfisk","laxfilé")).toBe(false);expect(ingredientCampaignMatch("kycklingfond","kyckling")).toBe(false)})});

describe("hierarchical raw-material matching",()=>{
 it("matches the real chicken thigh flyer offer despite brand, package and preparation text",()=>{
  const offer=p("ELDORADO Kycklinglårfilé 700g Djupfryst Sverige");
  const matches=campaignMatches(recipe(["Kycklinglårfilé"]),[offer]);
  expect(matches).toEqual([expect.objectContaining({ingredientName:"Kycklinglårfilé",ingredientIdentity:"CHICKEN_THIGH",promotionName:offer.displayName})]);
 });
 it("accepts spelling and word-order variants for the same chicken cut",()=>{
  expect(ingredientCampaignMatch("Kyckling lårfilé","lårfilé av kyckling")).toBe(true);
  expect(ingredientCampaignMatch("Kycklinglårfilé, strimlad","Eldorado kyckling lårfilé 700 g")).toBe(true);
 });
 it("lets a generic family match a cut but keeps explicitly different cuts apart",()=>{
  expect(ingredientCampaignMatch("Kyckling","Kycklinglårfilé")).toBe(true);
  expect(ingredientCampaignMatch("Kycklinglårfilé","Kycklingbröstfilé")).toBe(false);
  expect(ingredientCampaignMatch("Kycklinglårfilé","Kycklingfilé")).toBe(false);
  expect(ingredientCampaignMatch("Kycklingfärs","Kycklinglårfilé")).toBe(false);
 });
 it("does not mistake a flavour mention on a processed product for the raw material",()=>{
  expect(ingredientCampaignMatch("Gurka","GARANT bredbar leverpastej 200g Original Gurka")).toBe(false);
  expect(ingredientCampaignMatch("Kycklinglårfilé","Kycklingkebab 275 g")).toBe(false);
 });
 it("keeps packaging and preparation variation harmless across common raw materials",()=>{
  expect(ingredientCampaignMatch("2 burkar röda kidneybönor, avrunna","Kidneybönor 400 g")).toBe(true);
  expect(ingredientCampaignMatch("1 påse fryst babyspenat","Spenat hackad 500g")).toBe(true);
  expect(ingredientCampaignMatch("Champinjoner, skivade","Färska champinjoner Sverige 250 g")).toBe(true);
 });
 it("normalizes arbitrary unlisted raw materials without requiring a catalog entry",()=>{
  expect(ingredientCampaignMatch("Gröna ärtor, frysta","2 påsar frysta gröna ärter 500 g")).toBe(true);
  expect(ingredientCampaignMatch("Solrosfrön","Solrosfrön 300 g")).toBe(true);
 });
});

describe("real flyer product names",()=>{
 it("matches controlled concepts inside brands, package sizes and preparation text",()=>{
  expect(ingredientCampaignMatch("Kycklingfilé, strimlad","Garant Kycklingfilé Sverige ca 900 g")).toBe(true);
  expect(ingredientCampaignMatch("Ris, kokt","Garant Jasminris 1 kg")).toBe(true);
  expect(ingredientCampaignMatch("Broccoli i buketter","Garant Broccoli Sverige 250 g")).toBe(true);
  expect(ingredientCampaignMatch("Crème fraîche","Crème Fraîche 34% 2 dl")).toBe(true);
  expect(ingredientCampaignMatch("Morötter, skivade","Svensk morot 1 kg")).toBe(true);
  expect(ingredientCampaignMatch("Laxfilé","Färsk lax 500 g")).toBe(true);
 });
 it("keeps explicitly different varieties apart",()=>{
  expect(ingredientCampaignMatch("Basmatiris, kokt","Garant Jasminris 1 kg")).toBe(false);
  expect(ingredientCampaignMatch("Röd paprika","Gul paprika 500 g")).toBe(false);
  expect(ingredientCampaignMatch("Rödlök","Gul lök 1 kg")).toBe(false);
  expect(ingredientCampaignMatch("Bulgur","Couscous 500 g")).toBe(false);
 });
 it("keeps false-positive guards with decorated names",()=>{expect(ingredientCampaignMatch("Kycklingfond","Garant Kycklingfilé Sverige 900 g")).toBe(false);expect(ingredientCampaignMatch("Tomatpuré","Ekologiska kvisttomater 500 g")).toBe(false);expect(ingredientCampaignMatch("Tomat puré","Ekologiska tomater 500 g")).toBe(false);expect(ingredientCampaignMatch("Lök pulver","Gul lök 1 kg")).toBe(false);expect(ingredientCampaignMatch("Kokosmjölk","Arla mjölk 1 l")).toBe(false)});
});
