import { encodeProject, decodeProject } from './workbook';
import type { Project } from './model';
import {withOfficeLogo} from './branding';

export interface FileBinding {handle:FileSystemFileHandle; fingerprint:string}
const types:FilePickerAcceptType[]=[{description:'קובץ עבודה Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}];
export const fingerprint = async (file: File) => {
  const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
};
export async function openFile() {
  if(!window.showOpenFilePicker) throw new Error('פתיחה ישירה זמינה בכרום דרך HTTPS או localhost.');
  const [handle]=await window.showOpenFilePicker({types,multiple:false});
  const file=await handle.getFile();
  if(file.size>15*1024*1024) throw new Error('הקובץ גדול מ־15MB. נדרשת בדיקה לפני פתיחה.');
  const result=await decodeProject(await file.arrayBuffer());
  return {...result,binding:{handle,fingerprint:await fingerprint(file)},name:file.name};
}
export async function saveFile(project:Project, binding:FileBinding|null, saveAs=false) {
  if(!window.showSaveFilePicker) throw new Error('שמירה לקובץ נבחר דורשת כרום דרך HTTPS או localhost.');
  // Invoke the picker/permission request before serialization, while user activation is available.
  const handle=saveAs || !binding ? await window.showSaveFilePicker({types,suggestedName:`${project.title||'כתב כמויות'}.xlsx`}) : binding.handle;
  if(binding && !saveAs) {
    if(await handle.requestPermission({mode:'readwrite'})!=='granted') throw new Error('לא ניתנה הרשאת כתיבה. ניתן לבחור „שמירה בשם”.');
  }
  // Save As may select the original file too; do not bypass the conflict check.
  const sameFile=binding && await handle.isSameEntry(binding.handle);
  if(sameFile && await fingerprint(await handle.getFile())!==binding!.fingerprint) throw new Error('הקובץ השתנה מחוץ למערכת. בחרו „שמירה בשם” בשם אחר כדי למנוע דריסה.');
  const bytes=await encodeProject(await withOfficeLogo(project));
  if(sameFile && await fingerprint(await handle.getFile())!==binding!.fingerprint) throw new Error('הקובץ השתנה בזמן הכנת השמירה. בחרו „שמירה בשם” בשם אחר.');
  const stream=await handle.createWritable();
  try { await stream.write(new Blob([bytes as BlobPart])); await stream.close(); }
  catch(error) {try{await stream.abort();}catch{/* Preserve original write error. */}throw error;}
  // Hash what was written, rather than a subsequent read which may already contain someone else's edit.
  return {name:handle.name,binding:{handle,fingerprint:await fingerprint(new File([bytes as BlobPart],handle.name))}};
}
export const isCancelled = (error:unknown) => error instanceof DOMException && error.name==='AbortError';
