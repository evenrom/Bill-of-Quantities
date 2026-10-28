import { encodeProject, decodeProject,RecoveryRequired } from './workbook';
import type { Project } from './model';
import {withOfficeLogo} from './branding';

export interface FileBinding {handle:FileSystemFileHandle; fingerprint:string}
const types:FilePickerAcceptType[]=[{description:'קובץ פרויקט או תבנית Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}];
export const fingerprint = async (file: File) => {
  const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
};
export async function openFile() {
  if(!window.showOpenFilePicker) throw new Error('פתיחה ישירה זמינה בכרום דרך HTTPS או localhost.');
  const [handle]=await window.showOpenFilePicker({types,multiple:false});
  const file=await handle.getFile();
  if(file.size>15*1024*1024) throw new Error('הקובץ גדול מ־15MB. נדרשת בדיקה לפני פתיחה.');
  let result;
  try{result=await decodeProject(await file.arrayBuffer());}catch(e){if(e instanceof RecoveryRequired)e.sourceFile=file;throw e;}
  return {...result,binding:{handle,fingerprint:await fingerprint(file)},name:file.name};
}
export async function saveFile(project:Project, binding:FileBinding|null) {
  if(!window.showSaveFilePicker) throw new Error('שמירה לקובץ נבחר דורשת כרום דרך HTTPS או localhost.');
  // Invoke the picker/permission request before serialization, while user activation is available.
  const handle=await window.showSaveFilePicker({types,suggestedName:binding?.handle.name??`${project.kind==='template'?'תבנית - ':''}${project.title||'כתב כמויות'}.xlsx`});
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
