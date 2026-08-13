import { describe, expect, it } from "vitest";
import { dedupeLines, parseIngredient, structureRecipe } from "./recipeParser";
const fixture = `Krämig kycklingpasta
4 portioner
500 g kycklingfilé
300 g pasta
2 dl matlagningsgrädde
1 gul lök
salt och peppar efter smak
Gör så här:
1. Koka pastan enligt anvisningarna.
2. Skär kycklingen i bitar.
3. Stek kycklingen tillsammans med lök.
4. Tillsätt grädde och kryddor.`;
describe("lokal receptparser", () => {
  it("tolkar mängd, enhet och svenskt decimaltecken", () => {
    expect(parseIngredient("500 g kycklingfilé")).toMatchObject({
      quantity: "500",
      unit: "g",
      name: "kycklingfilé",
    });
    expect(parseIngredient("1,5 dl grädde")).toMatchObject({
      quantity: "1.5",
      unit: "dl",
      name: "grädde",
    });
  });
  it("uppfinner inte mängd", () => {
    expect(parseIngredient("salt efter smak")).toMatchObject({
      quantity: "",
      unit: "",
      name: "salt",
      note: "efter smak",
    });
  });
  it("kombinerar sidor i ordning och tar bort exakt överlapp", () => {
    expect(
      dedupeLines(["Titel\n2 dl grädde", "2 dl grädde\nGör så här"]),
    ).toEqual(["Titel", "2 dl grädde", "Gör så här"]);
  });
  it("skapar instruktioner och lämnar näring tom", () => {
    const draft = structureRecipe([fixture]);
    expect(draft.title).toBe("Krämig kycklingpasta");
    expect(draft.servings).toBe(4);
    expect(draft.ingredients).toHaveLength(5);
    expect(draft.instructions.map((s) => s.order)).toEqual([1, 2, 3, 4]);
    expect(draft.caloriesPerServing).toBeUndefined();
    expect(draft.proteinGramsPerServing).toBeUndefined();
    expect(draft.sourceType).toBe("image");
  });
  it("ignorerar telefonklocka vid titelval", () => {
    expect(
      structureRecipe([
        "11:25\nKrämig kycklingpasta\n4 portioner\n500 g kycklingfilé",
      ]).title,
    ).toBe("Krämig kycklingpasta");
  });
  it("ignorerar kalorier ovanför titel", () => {
    expect(
      structureRecipe([
        "650 kcal\nChicken Burrito Bowl\n2 portioner\n500 g chicken",
      ]).title,
    ).toBe("Chicken Burrito Bowl");
  });
  it("ignorerar webbläsar- och social UI-text", () => {
    const draft = structureRecipe([
      "Safari\nexample.com\nLasagne\nIngredienser\n500 g köttfärs\nLikes\nComments\nShare\nSave",
    ]);
    expect(draft.title).toBe("Lasagne");
    expect(draft.ingredients.map((i) => i.name)).toEqual(["köttfärs"]);
  });
  it("lämnar titel tom när bara ingredienser och instruktioner finns", () => {
    expect(
      structureRecipe([
        "Ingredienser\n500 g kyckling\nGör så här\n1. Stek kycklingen",
      ]).title,
    ).toBe("");
  });
});
