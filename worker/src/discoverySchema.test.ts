import {describe,expect,it} from "vitest";
import {validDiscovery} from "./discoverySchema";
const candidate={title:"Kycklinggryta",sourceName:"ICA",sourceUrl:"https://www.ica.se/recept/kycklinggryta",ingredientNames:["kyckling"],ingredients:[],instructions:[],warnings:[]};
describe("discovery response",()=>{it("kräver en riktig källa",()=>{expect(validDiscovery({candidates:[candidate]})).toBe(true);expect(validDiscovery({candidates:[{...candidate,sourceUrl:"påhittad"}]})).toBe(false);expect(validDiscovery({candidates:[{...candidate,sourceName:""}]})).toBe(false)})});
