import { describe, expect, it } from "vitest";
import { isRecipeResult } from "./schema";

describe("server response validation", () => {
  it("rejects prose or incomplete ingredient rows", () => {
    expect(isRecipeResult("a recipe")) .toBe(false);
    expect(isRecipeResult({ title: "Soppa", description: "", ingredients: [{}], instructions: [], warnings: [] })).toBe(false);
  });
  it("requires explicit original servings or null",()=>{const valid={title:"Soppa",description:"",detectedLanguage:"sv",originalText:"4 portioner",originalServings:4,servings:4,ingredients:[],instructions:[],warnings:[]};expect(isRecipeResult(valid)).toBe(true);expect(isRecipeResult({...valid,originalServings:null,servings:null})).toBe(true);expect(isRecipeResult({...valid,originalServings:0,servings:0})).toBe(false);expect(isRecipeResult({...valid,servings:2})).toBe(false)});
});
