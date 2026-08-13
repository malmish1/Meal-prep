import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export const STORE_NAMES = ['recipes','recipeIngredients','favorites','ratings','comments','cookingHistory','inventory','promotions','weeklyPlans','mealSelections','shoppingLists','settings'] as const
type StoreName = typeof STORE_NAMES[number]
interface MealPrepDB extends DBSchema { recipes: {key: string,value: unknown}; recipeIngredients: {key:string,value:unknown}; favorites:{key:string,value:unknown}; ratings:{key:string,value:unknown}; comments:{key:string,value:unknown}; cookingHistory:{key:string,value:unknown}; inventory:{key:string,value:unknown}; promotions:{key:string,value:unknown}; weeklyPlans:{key:string,value:unknown}; mealSelections:{key:string,value:unknown}; shoppingLists:{key:string,value:unknown}; settings:{key:string,value:unknown} }
let connection: Promise<IDBPDatabase<MealPrepDB>> | undefined
export function getDB() { return connection ??= openDB<MealPrepDB>('meal-prep', 1, { upgrade(db) { for (const name of STORE_NAMES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name) } }) }
export async function getSetting<T>(key: string) { return (await getDB()).get('settings', key) as Promise<T | undefined> }
export async function setSetting<T>(key: string, value: T) { return (await getDB()).put('settings', value, key) }
export async function exportAllData() { const db = await getDB(); const stores: Record<string, {key: string,value: unknown}[]> = {}; for (const name of STORE_NAMES) { const tx=db.transaction(name); const keys=await tx.store.getAllKeys(); const values=await tx.store.getAll(); stores[name]=keys.map((key,i)=>({key:String(key),value:values[i]})) } return { app:'Meal Prep', formatVersion:1, exportedAt:new Date().toISOString(), stores } }
export type Backup = Awaited<ReturnType<typeof exportAllData>>
export function validateBackup(input: unknown): input is Backup { if (!input || typeof input !== 'object') return false; const x=input as Partial<Backup>; return x.app==='Meal Prep' && x.formatVersion===1 && !!x.stores && typeof x.stores==='object' && STORE_NAMES.every(name => Array.isArray(x.stores?.[name]) && x.stores[name].every(item => item && typeof item==='object' && 'key' in item && 'value' in item)) }
export async function importBackup(backup: Backup) { const db=await getDB(); const tx=db.transaction([...STORE_NAMES],'readwrite'); for (const name of STORE_NAMES) { await tx.objectStore(name).clear(); for (const item of backup.stores[name]) await tx.objectStore(name).put(item.value,item.key) } await tx.done }
export async function resetDBConnectionForTests() { if (connection) (await connection).close(); connection=undefined }
