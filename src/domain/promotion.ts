export const promotionCategories = ["meat-poultry","fish-seafood","dairy","eggs","fruit-veg","frozen","pantry","bread","drinks","snacks","ready-meals","other"] as const;
export const priceTypes = ["fixed","perKg","perUnit","multibuy","unknown"] as const;
export type PromotionCategory = typeof promotionCategories[number];
export type PriceType = typeof priceTypes[number];

export interface PromotionItem {
  id: string; flyerId: string; displayName: string; normalizedName: string; brand?: string;
  category: PromotionCategory; price: number | null; currency: "SEK"; priceType: PriceType;
  unitPrice?: number | null; unit?: string; packageSize?: string; weight?: string;
  quantityRequirement?: number | null; multibuy?: { quantity: number; totalPrice: number } | null;
  memberOnly: boolean; conditions?: string; sourcePage?: number | null; ignored: boolean;
  confidence: number; warnings: string[]; createdAt: string; updatedAt: string;
}

export interface PromotionFlyer {
  id: string; store: "Willys"; fileName: string; fingerprint: string; importedAt: string;
  validFrom?: string | null; validTo?: string | null; numberOfPages?: number | null;
  analysisVersion: string; provider: "OpenAI" | "manual"; status: "review" | "confirmed";
  promotionItemIds: string[];
}

export type PromotionDraft = Omit<PromotionItem,"id"|"flyerId"|"createdAt"|"updatedAt">;
export const categoryLabels: Record<PromotionCategory,string> = {
  "meat-poultry":"Kött & fågel","fish-seafood":"Fisk & skaldjur",dairy:"Mejeri",eggs:"Ägg",
  "fruit-veg":"Frukt & grönt",frozen:"Fryst",pantry:"Skafferi",bread:"Bröd",drinks:"Dryck",
  snacks:"Snacks","ready-meals":"Färdigmat",other:"Övrigt"
};
export const priceTypeLabels: Record<PriceType,string> = {fixed:"Fast pris",perKg:"Per kg",perUnit:"Per styck",multibuy:"Flerköp",unknown:"Okänd"};

export function eligiblePromotions(items: PromotionItem[]) { return items.filter(item => !item.ignored); }
export function emptyPromotion(): PromotionDraft { return {displayName:"",normalizedName:"",category:"other",price:null,currency:"SEK",priceType:"unknown",memberOnly:false,ignored:false,confidence:1,warnings:[]}; }
