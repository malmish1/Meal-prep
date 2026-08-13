import { exportAllData, importBackup, validateBackup } from './db'
export async function downloadBackup() { const data=await exportAllData(); const date=new Date().toISOString().slice(0,10); const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); const link=document.createElement('a'); link.href=url; link.download=`meal-prep-backup-${date}.json`; link.click(); URL.revokeObjectURL(url) }
export async function readBackupFile(file: File) { let parsed: unknown; try { parsed=JSON.parse(await file.text()) } catch { throw new Error('Filen innehåller inte giltig JSON.') } if (!validateBackup(parsed)) throw new Error('Filen är inte en giltig Meal Prep-backup.'); return parsed }
export { importBackup }
