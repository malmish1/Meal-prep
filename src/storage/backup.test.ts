import { beforeEach,describe,expect,it,vi } from 'vitest'
import { exportAllData,getSetting,importBackup,resetDBConnectionForTests,setSetting,validateBackup } from './db'
import { downloadBackup,readBackupFile } from './backup'
import { emptyRecipe } from '../domain/recipe'
import { deleteRecipe,getRecipe,saveRecipe } from './recipes'
beforeEach(async()=>{await resetDBConnectionForTests();await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase('meal-prep');request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)})})
describe('backup',()=>{
 it('exporterar samtliga stores och korrekt filnamn',async()=>{await setSetting('profileName','Victor');const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});await downloadBackup();expect(URL.createObjectURL).toHaveBeenCalled();expect(click).toHaveBeenCalled();const data=await exportAllData();expect(data.stores.settings[0].value).toBe('Victor');expect(Object.keys(data.stores)).toHaveLength(14)})
 it('validerar och återställer profil och komplett recept',async()=>{await setSetting('profileName','Victor');const recipe=await saveRecipe({...emptyRecipe(),title:'Backuppasta',ingredients:[{id:'i',name:'Pasta',quantity:'400',unit:'g'}],instructions:[{id:'s',order:1,text:'Koka pastan.'}]});const backup=await exportAllData();expect(validateBackup(backup)).toBe(true);await setSetting('profileName','Annat');await deleteRecipe(recipe.id);await importBackup(backup);expect(await getSetting('profileName')).toBe('Victor');expect(await getRecipe(recipe.id)).toMatchObject({title:'Backuppasta',ingredients:[{name:'Pasta',quantity:'400',unit:'g',id:'i'}],instructions:[{text:'Koka pastan.',order:1,id:'s'}]})})
 it('avvisar felaktiga filer',async()=>{expect(validateBackup({app:'Meal Prep'})).toBe(false);const bad=new File(['inte json'],'bad.json',{type:'application/json'});await expect(readBackupFile(bad)).rejects.toThrow('giltig JSON')})
})
