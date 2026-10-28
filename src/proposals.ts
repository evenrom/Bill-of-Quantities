import {decodeProject} from './workbook';
import {id,type Project} from './model';
import {checkProject} from './editor';
export function compareProposal(source:Project|null,returned:Project):string[]{
  const differences:string[]=[];
  if(!source){differences.push('לא בוצעה השוואה למסמך מקור. יש לבחור מקור כדי לזהות שינויים בהיקף העבודה.');return differences;}
  if(source.id!==returned.id)differences.push('מזהה הפרויקט שונה מהמקור');
  if(source.revisionId!==returned.revisionId||source.revision!==returned.revision)differences.push('המהדורה שונה מהמקור');
  for(const field of ['title','client','location','date','instructions','office','vat'] as const)if(source[field]!==returned[field])differences.push(`שונה שדה מסמך: ${field}`);
  const original=new Map(source.chapters.filter(c=>c.active).map(c=>[c.id,c]));
  const received=new Map(returned.chapters.map(c=>[c.id,c]));
  if([...original.keys()].join()!==[...received.keys()].join())differences.push('רשימת הפרקים או סדרם השתנו');
  for(const [cid,c] of original){
    const other=received.get(cid);if(!other){differences.push(`פרק חסר: ${c.title}`);continue;}
    if(other.title!==c.title||!other.active)differences.push(`שם/מצב פרק השתנה: ${c.title}`);
    const rows=c.rows.filter(r=>!r.frozen),byId=new Map(other.rows.map(r=>[r.id,r]));
    if(rows.map(r=>r.id).join()!==other.rows.map(r=>r.id).join())differences.push(`סדר או רשימת שורות השתנו: ${c.title}`);
    for(const row of rows){const r=byId.get(row.id);if(!r){differences.push(`שורה חסרה: ${c.title} — ${row.description.slice(0,50)}`);continue;}
      const changed=(['kind','description','unit','quantity','frozen'] as const).filter(f=>row[f]!==r[f]);
      if(changed.length)differences.push(`${c.title}: ${row.description.slice(0,50)} — שינוי ב־${changed.join(', ')}`);
      if(row.price!==r.price)differences.push(`${c.title}: ${row.description.slice(0,50)} — מחיר ${String(row.price??'ריק')} ← ${String(r.price??'ריק')}`);
    }
    for(const r of other.rows)if(!rows.some(x=>x.id===r.id))differences.push(`שורה חדשה: ${c.title} — ${r.description.slice(0,50)}`);
  }
  for(const [cid,c] of received)if(!original.has(cid))differences.push(`פרק נוסף: ${c.title}`);
  return differences;
}
export async function inspectProposal(bytes:ArrayBuffer,source:Project|null){
  const {project,warnings}=await decodeProject(bytes,true);
  if(project.kind!=='project')throw new Error('קובץ תבנית אינו הצעת קבלן');
  return {project,warnings,differences:compareProposal(source,project),issues:checkProject(project,true)};
}
export function adoptProposal(returned:Project,contractor:string):Project{
  if(!contractor.trim())throw new Error('יש להזין שם קבלן');
  return {...structuredClone(returned),revisionId:id(),contractor:contractor.trim(),revision:`${returned.revision?returned.revision+' — ':''}הצעת ${contractor.trim()}`};
}
