export const MEAL_TYPES=['Frukost','Lunch','Middag','Mellanmål'] as const
export const PROTEINS=['Kyckling','Nöt','Fläsk','Fisk','Skaldjur','Ägg','Vegetariskt','Veganskt','Mejeri','Annat'] as const
export const UNITS=['','g','kg','ml','cl','dl','l','st','msk','tsk','krm','portion','paket','burk'] as const
export const SUITABILITY={excellent:'Utmärkt',very_good:'Mycket bra',good:'Bra',poor:'Dålig'} as const
export type Suitability=keyof typeof SUITABILITY
export type Ingredient={id:string;name:string;quantity:string;unit:string;note?:string;group?:string;uncertain?:boolean}
export type InstructionStep={id:string;order:number;text:string}
export type Recipe={id:string;title:string;description:string;sourceType:string;sourceName:string;sourceUrl:string;servings?:number;prepTimeMinutes?:number;cookTimeMinutes?:number;cuisine:string;primaryProtein:string;mealTypes:string[];tags:string[];mealPrepSuitability?:Suitability;favorite:boolean;rating?:number;personalComment:string;timesCooked:number;lastCookedAt?:string;createdAt:string;updatedAt:string;caloriesPerServing?:number;proteinGramsPerServing?:number;carbsGramsPerServing?:number;fatGramsPerServing?:number;nutritionComplete?:boolean;nutritionEligible?:boolean;nutritionSource?:"published"|"calculated"|"unknown";nutritionConfidence?:number;ingredients:Ingredient[];instructions:InstructionStep[]}
export type RecipeDraft=Omit<Recipe,'id'|'createdAt'|'updatedAt'|'timesCooked'|'lastCookedAt'> & Partial<Pick<Recipe,'id'|'createdAt'|'updatedAt'|'timesCooked'|'lastCookedAt'>> & {importWarnings?:string[]}
export function emptyRecipe():RecipeDraft{return{title:'',description:'',sourceType:'manual',sourceName:'',sourceUrl:'',cuisine:'',primaryProtein:'',mealTypes:[],tags:[],favorite:false,personalComment:'',rating:undefined,mealPrepSuitability:undefined,ingredients:[{id:crypto.randomUUID(),name:'',quantity:'',unit:''}],instructions:[{id:crypto.randomUUID(),order:1,text:''}]}}
