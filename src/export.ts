import type {Project} from './model';
import {encodeProject} from './workbook';
export function contractorSnapshot(project:Project):Project{
  if(project.kind!=='project')throw new Error('הפקה לקבלן זמינה לפרויקט בלבד');
  return {...structuredClone(project),contractor:'',chapters:project.chapters.filter(c=>c.active).map(c=>({...c,rows:c.rows.filter(r=>!r.frozen)}))};
}
export async function encodeContractor(project:Project):Promise<Uint8Array>{
  return encodeProject(contractorSnapshot(project),true);
}
export function downloadFile(bytes:Uint8Array,name:string,type:string){
  const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
