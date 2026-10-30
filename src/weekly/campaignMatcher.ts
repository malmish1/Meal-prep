import type { PromotionItem } from "../domain/promotion";
import type { Recipe } from "../domain/recipe";

export type MatchKind="normalized"|"category";

/** A generic family can match a specific member, but different members cannot. */
export interface IngredientConcept{id:string;family:string;aliases:string[]}
const concept=(id:string,aliases:string[],family=id):IngredientConcept=>({id,family,aliases});

export const INGREDIENT_TAXONOMY:IngredientConcept[]=[
 concept("CHICKEN_THIGH",["kycklinglarfile","kyckling larfile","larfile av kyckling","kycklinglar","kyckling lar","lar av kyckling"],"CHICKEN"),
 concept("CHICKEN_BREAST",["kycklingbrostfile","kyckling brostfile","brostfile av kyckling","kycklingfile","kycklingfileer","kycklinginnerfile","kyckling brost","kycklingbrost"],"CHICKEN"),
 concept("CHICKEN_DRUMSTICK",["kycklingklubba","kycklingklubbor","kycklingben","drumsticks"],"CHICKEN"),
 concept("CHICKEN_WING",["kycklingvinge","kycklingvingar","chicken wings"],"CHICKEN"),
 concept("GROUND_CHICKEN",["kycklingfars","fars av kyckling"],"CHICKEN"),
 concept("WHOLE_CHICKEN",["hel kyckling","grillkyckling"],"CHICKEN"),
 concept("CHICKEN",["kyckling"]),
 concept("PORK_TENDERLOIN",["flaskfile","flaskytterfile","flaskinnerfile","ytterfile av flask","innerfile av flask"],"PORK"),
 concept("GROUND_PORK",["flaskfars","flaskkottfars","fars av flask"],"PORK"),
 concept("PORK_CHOP",["flaskkotlett","flaskkotletter","kotlett av flask"],"PORK"),
 concept("PORK_BELLY",["sidflask","flasksida"],"PORK"),
 concept("PORK",["flaskkott","flask"],"PORK"),
 concept("GROUND_BEEF",["notfars","kottfars av not","fars av not"],"BEEF"),
 concept("BEEF_TENDERLOIN",["oxfile"],"BEEF"),
 concept("BEEF_ENTRECOTE",["entrecote"],"BEEF"),
 concept("BEEF_ROAST",["rostbiff"],"BEEF"),
 concept("BEEF_TOPSIDE",["notinnanlar","innanlar av not"],"BEEF"),
 concept("BEEF_STEAK",["ryggbiff","biff av not"],"BEEF"),
 concept("BEEF",["notkott","not"],"BEEF"),
 concept("TUNA",["tonfisk","tonfiskfile","tonfisk pa burk","tonfisk i vatten","tonfisk i olja"]),
 concept("SALMON",["lax","laxfile","laxfileer"]),
 concept("COD",["torsk","torskfile","torskfileer"]),
 concept("HADDOCK",["kolja","koljafile"]),
 concept("SEITHE",["sej","sejfile"]),
 concept("SHRIMP",["rakor","handskalade rakor","scampi"]),
 concept("JASMINE_RICE",["jasminris","jasmine ris"],"RICE"),
 concept("BASMATI_RICE",["basmatiris","basmati ris"],"RICE"),
 concept("BROWN_RICE",["fullkornsris","brunt ris"],"RICE"),
 concept("LONG_GRAIN_RICE",["langkornigt ris"],"RICE"),
 concept("RICE",["ris"]),
 concept("PASTA",["pasta","spaghetti","penne","fusilli","tagliatelle","makaroner","lasagneplattor"]),
 concept("POTATO",["potatis","fast potatis","mjolig potatis","farskpotatis"]),
 concept("OATS",["havregryn","fiberhavregryn","fullkornshavregryn"]),
 concept("QUINOA",["quinoa"]),
 concept("COUSCOUS",["couscous"]),
 concept("BULGUR",["bulgur"]),
 concept("RED_BELL_PEPPER",["rod paprika"],"BELL_PEPPER"),
 concept("YELLOW_BELL_PEPPER",["gul paprika"],"BELL_PEPPER"),
 concept("GREEN_BELL_PEPPER",["gron paprika"],"BELL_PEPPER"),
 concept("BELL_PEPPER",["paprika"]),
 concept("RED_ONION",["rod lok","rodlok"],"ONION"),
 concept("YELLOW_ONION",["gul lok"],"ONION"),
 concept("ONION",["lok"]),
 concept("TOMATO",["tomat","tomater","kvisttomat","kvisttomater","cocktailtomat","korsbarstomat"]),
 concept("CARROT",["morot","morotter"]),
 concept("CUCUMBER",["gurka","gurkor"]),
 concept("BROCCOLI",["broccoli"]),
 concept("CAULIFLOWER",["blomkal"]),
 concept("ZUCCHINI",["zucchini","squash"]),
 concept("AVOCADO",["avokado","avokador"]),
 concept("LEMON",["citron","citroner"]),
 concept("LIME",["lime"]),
 concept("GARLIC",["vitlok","vitloksklyfta","vitloksklyftor"]),
 concept("SPINACH",["spenat","babyspenat"]),
 concept("MUSHROOM",["champinjon","champinjoner","svamp"]),
 concept("CORN",["majs","majskorn"]),
 concept("GREEN_BEANS",["haricots verts","grona bonor"]),
 concept("EGGS",["agg"]),
 concept("CREME_FRAICHE",["creme fraiche"]),
 concept("MILK",["mjolk"]),
 concept("BUTTER",["smor"]),
 concept("YOGURT",["yoghurt","yogurt"]),
 concept("COTTAGE_CHEESE",["keso","cottage cheese"]),
 concept("QUARK",["kvarg"]),
 concept("CREAM",["gradde","matlagningsgradde","vispgradde"]),
 concept("CHEESE",["ost","riven ost"]),
 concept("KIDNEY_BEANS",["kidneybonor","roda bonor"],"BEANS"),
 concept("BLACK_BEANS",["svarta bonor"],"BEANS"),
 concept("WHITE_BEANS",["vita bonor"],"BEANS"),
 concept("BEANS",["bonor"]),
 concept("CHICKPEAS",["kikartor"]),
 concept("LENTILS",["linser","roda linser","grona linser"]),
 concept("TOFU",["tofu"]),
];

const noise=/\b(svensk|svenskt|sverige|ekologisk|ekologiskt|extra|klassisk|original|naturell|ca|cirka|farsk|farskt|fryst|frysta|djupfryst|hackad|hackat|finhackad|grovhackad|strimlad|strimlat|skivad|skivat|tarnad|tarnat|kokt|kokta|avrunnen|avrunna|valfri|buketter|bitar|styckfryst|i|till|per|kg|gram|g|hg|mg|ml|cl|dl|liter|l|st|styck|pack|paket|forpackning|burk|burkar|konservburk|konservburkar|flaska|pasar|pase)\b/g;
export function normalizeIngredient(value:string){return value.toLocaleLowerCase("sv-SE").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/%/g," ").replace(/[^a-z0-9 ]/g," ").replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|hg|mg|g|ml|cl|dl|l|st)\b/g," ").replace(noise," ").replace(/\b\d+(?:[.,]\d+)?\b/g," ").replace(/\s+/g," ").trim()}

type IndexedAlias={alias:string;compact:string;concept:IngredientConcept};
const indexedAliases:IndexedAlias[]=INGREDIENT_TAXONOMY.flatMap(entry=>entry.aliases.map(alias=>{const normalized=normalizeIngredient(alias);return{alias:normalized,compact:normalized.replace(/\s/g,""),concept:entry}})).sort((a,b)=>b.compact.length-a.compact.length);
const phraseIncluded=(text:string,phrase:string)=>` ${text} `.includes(` ${phrase} `);
const aliasIncluded=(text:string,item:IndexedAlias)=>phraseIncluded(text,item.alias)||(item.alias.includes(" ")&&text.replace(/\s/g,"").includes(item.compact));
const conceptFor=(value:string)=>indexedAliases.find(item=>aliasIncluded(value,item))?.concept;
const genericWords=new Set(["mat","mix","file","produkt","vara"]);
const processedForms=[["pure","pure"],["pulver","pulver"],["fond","fond"],["buljong","buljong"],["sas","sas"],["juice","juice"],["koncentrat","koncentrat"],["vinager","vinager"],["pastej","pastej"],["korv","korv"],["kebab","kebab"],["burgare","burgare"],["nuggets","nuggets"],["schnitzel","schnitzel"],["fardigmat","fardigmat"]] as const;
const processedForm=(value:string)=>processedForms.find(([token])=>value.split(" ").some(word=>word===token||word.endsWith(token)))?.[1]??null;
const irregularStems:Record<string,string>={artor:"art",arter:"art",agg:"agg",notter:"nott",morotter:"morot",fron:"fro"};
const wordStem=(word:string)=>{if(irregularStems[word])return irregularStems[word];if(word.length>6&&/(erna|orna|arna)$/.test(word))return word.slice(0,-4);if(word.length>5&&/(er|or|ar)$/.test(word))return word.slice(0,-2);if(word.length>5&&word.endsWith("a"))return word.slice(0,-1);return word};
const genericSignature=(value:string)=>value.split(" ").filter(Boolean).map(wordStem).sort().join(" ");

export function recipeIngredientIdentity(value:string){const normalized=normalizeIngredient(value);return conceptFor(normalized)?.id??normalized}
export function matchIngredientConcept(recipeIngredient:string,promotionName:string):{kind:MatchKind;concept:string}|null{
 const a=normalizeIngredient(recipeIngredient),b=normalizeIngredient(promotionName);if(!a||!b)return null;
 const formA=processedForm(a),formB=processedForm(b);if(formA!==formB&&(formA||formB))return null;
 const ca=conceptFor(a),cb=conceptFor(b);
 if(ca&&cb){
  if(ca.id===cb.id)return{kind:a===b?"normalized":"category",concept:ca.id};
  if(ca.family===cb.family&&(ca.id===ca.family||cb.id===cb.family))return{kind:"category",concept:ca.id===ca.family?cb.id:ca.id};
  return null;
 }
 if(a===b||(!ca&&!cb&&genericSignature(a)===genericSignature(b)))return{kind:"normalized",concept:ca?.id??cb?.id??genericSignature(a)};
 const shorter=a.length<=b.length?a:b,longer=shorter===a?b:a;
 if(shorter.length>=3&&!genericWords.has(shorter)&&phraseIncluded(longer,shorter))return{kind:"normalized",concept:ca?.id??cb?.id??shorter};
 return null;
}

export function ingredientCampaignMatch(ingredient:string,promotion:string){return matchIngredientConcept(ingredient,promotion)!=null}
export interface CampaignMatch{promotionId:string;promotionName:string;ingredientName:string;ingredientIdentity:string;promotionPrice:number|null;promotionPriceType:string;kind:MatchKind;quality:"strong";relevance:number}
const numericQuantity=(value:string)=>{const match=value.trim().replace(",",".").match(/^\d+(?:\.\d+)?/);return match?Number(match[0]):null};
const ingredientRelevance=(recipe:Pick<Recipe,"ingredients">,index:number)=>{const ingredient=recipe.ingredients[index],amount=numericQuantity(ingredient.quantity),position=index<3?2:index<6?1.4:1,quantity=amount==null?1:amount>=500?1.5:amount>=100?1.25:amount>=2?1.1:1;return Math.round(position*quantity*100)/100};
const priceTypePriority:Record<string,number>={perKg:5,perUnit:4,multibuy:3,fixed:2,unknown:1};
const preferOffer=(a:{promotion:PromotionItem;kind:MatchKind},b:{promotion:PromotionItem;kind:MatchKind})=>{const kind=(b.kind==="normalized"?1:0)-(a.kind==="normalized"?1:0);if(kind)return kind;const type=(priceTypePriority[b.promotion.priceType]??0)-(priceTypePriority[a.promotion.priceType]??0);if(type)return type;if(a.promotion.price==null)return b.promotion.price==null?0:1;if(b.promotion.price==null)return-1;return a.promotion.price-b.promotion.price};
export function campaignMatches(recipe:Pick<Recipe,"ingredients">,promotions:PromotionItem[]):CampaignMatch[]{
 const matchesByIngredient=new Map<string,CampaignMatch>(),active=promotions.filter(x=>!x.ignored);
 for(const[ingredientIndex,ingredient]of recipe.ingredients.entries()){
  const identity=recipeIngredientIdentity(ingredient.name);if(!identity||matchesByIngredient.has(identity))continue;
  const candidates=active.flatMap(p=>{const match=matchIngredientConcept(ingredient.name,p.displayName)||matchIngredientConcept(ingredient.name,p.normalizedName);return match?[{promotion:p,kind:match.kind,concept:match.concept}]:[]});
  if(!candidates.length)continue;
  const primary=[...candidates].sort(preferOffer)[0];
  matchesByIngredient.set(identity,{promotionId:primary.promotion.id,promotionName:primary.promotion.displayName,ingredientName:ingredient.name,ingredientIdentity:identity,promotionPrice:primary.promotion.price,promotionPriceType:primary.promotion.priceType,kind:primary.kind,quality:"strong",relevance:ingredientRelevance(recipe,ingredientIndex)});
 }
 return[...matchesByIngredient.values()];
}
export const campaignRelevance=(matches:CampaignMatch[])=>matches.reduce((total,match)=>total+match.relevance,0);
