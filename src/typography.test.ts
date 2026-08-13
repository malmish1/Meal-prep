import{describe,expect,it}from"vitest";
// @ts-expect-error Node typings are intentionally not shipped in the browser tsconfig.
import fs from"node:fs";describe("approved typography regression",()=>{it("keeps DM Sans body and Manrope headings from pre-Milestone 7",()=>{const css=fs.readFileSync("src/styles.css","utf8");expect(css).toContain(":root{font-family:'DM Sans',system-ui,sans-serif");expect(css).toContain(".page>h1{font:800 34px Manrope");expect(css).toContain("button,input{font:inherit}")})});
