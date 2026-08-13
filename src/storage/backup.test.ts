import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exportAllData, getSetting, importBackup, resetDBConnectionForTests, setSetting, validateBackup } from './db'
import { downloadBackup, readBackupFile } from './backup'
beforeEach(async()=>{await resetDBConnectionForTests();await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase('meal-prep');request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)})})
describe('backup',()=>{
  it('exporterar samtliga stores och korrekt filnamn',async()=>{await setSetting('profileName','Victor');const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});await downloadBackup();expect(URL.createObjectURL).toHaveBeenCalled();expect(click).toHaveBeenCalled();const data=await exportAllData();expect(data.stores.settings[0].value).toBe('Victor');expect(Object.keys(data.stores)).toHaveLength(12)})
  it('validerar och återställer en backup',async()=>{await setSetting('profileName','Victor');const backup=await exportAllData();expect(validateBackup(backup)).toBe(true);await setSetting('profileName','Annat');await importBackup(backup);expect(await getSetting('profileName')).toBe('Victor')})
  it('avvisar felaktiga filer',async()=>{expect(validateBackup({app:'Meal Prep'})).toBe(false);const bad=new File(['inte json'],'bad.json',{type:'application/json'});await expect(readBackupFile(bad)).rejects.toThrow('giltig JSON')})
})
