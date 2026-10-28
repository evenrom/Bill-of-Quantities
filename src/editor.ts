import {id,type Project,type BoqRow,isNumber} from './model';
export type CopiedRow=Pick<BoqRow,'kind'|'description'|'unit'|'quantity'>;
export function copyRows(project:Project,selected:Set<string>):CopiedRow[]{
  return project.chapters.flatMap(c=>c.rows.filter(r=>selected.has(r.id)).map(({kind,description,unit,quantity})=>({kind,description,unit,quantity:project.kind==='template'?null:quantity})));
}
export function pasteRows(project:Project,chapterId:string,index:number,rows:CopiedRow[]):Project {
  const copies=rows.map(r=>({...r,id:id(),price:null,quantity:project.kind==='template'||r.kind==='note'?null:r.quantity,unit:r.kind==='note'?'':r.unit}));
  return {...project,chapters:project.chapters.map(c=>c.id===chapterId?{...c,rows:[...c.rows.slice(0,index),...copies,...c.rows.slice(index)]}:c)};
}
export const clipboardText=(rows:CopiedRow[])=>JSON.stringify({format:'BOQ_ROWS',version:1,rows});
export function readClipboard(text:string):CopiedRow[]{
  if(text.length>2_000_000)throw new Error('תוכן ההעתקה גדול מדי');
  let data;try{data=JSON.parse(text);}catch{throw new Error('הלוח אינו מכיל סעיפים שהועתקו מהמערכת');}
  if(data?.format!=='BOQ_ROWS'||data.version!==1||!Array.isArray(data.rows)||!data.rows.length||data.rows.length>2000)throw new Error('תוכן העתקה אינו תקין');
  return data.rows.map((r:CopiedRow)=>{
    if(!r||!['item','note'].includes(r.kind)||typeof r.description!=='string'||typeof r.unit!=='string'||!(r.quantity===null||typeof r.quantity==='string'||isNumber(r.quantity)))throw new Error('שורת העתקה אינה תקינה');
    return {kind:r.kind,description:r.description,unit:r.kind==='note'?'':r.unit,quantity:r.kind==='note'?null:r.quantity};
  });
}
export interface Issue {chapterId?:string;rowId?:string;field:string;message:string}
const unfinished=/\{[^}]*\}|\?{2,}|לבחירה/g;
export function checkProject(p:Project,returned=false):Issue[]{
  const issues:Issue[]=[];
  if(p.logo?.reviewRequired)issues.push({field:'logo',message:'הלוגו השתנה בתוכנה חיצונית ועלול להיות פגום — יש לבדוק את השער או לטעון את לוגו המשרד הקבוע'});
  for(const [field,label] of [['title','שם פרויקט'],['client','לקוח'],['location','מיקום'],['date','תאריך'],['office','פרטי משרד']] as const){
    if(p.kind==='template'&&['client','location','date'].includes(field))continue;
    if(!p[field].trim())issues.push({field,message:`${label} חסר`});
    else if(p[field].match(unfinished))issues.push({field,message:`${label} מכיל סימון להשלמה`});
  }
  if(!isNumber(p.vat))issues.push({field:'vat',message:'שיעור מע״מ חסר או אינו תקין'});
  if(p.instructions.match(unfinished))issues.push({field:'instructions',message:'ההנחיות הכלליות מכילות סימונים להשלמה'});
  if(!p.chapters.some(c=>c.active))issues.push({field:'chapters',message:'אין פרקים פעילים להפצה'});
  for(const c of p.chapters.filter(c=>c.active))for(const r of c.rows.filter(r=>!r.frozen)){
    const add=(field:string,message:string)=>issues.push({chapterId:c.id,rowId:r.id,field,message:`${c.title}: ${message}`});
    if(!r.description.trim())add('description','תיאור חסר');
    const markers=[...new Set(r.description.match(unfinished)??[])];if(markers.length)add('description',`יש להשלים ${markers.join(', ')}`);
    if(r.kind==='note')continue;
    if(!r.unit.trim())add('unit','יחידה חסרה');
    if(p.kind!=='template'){
      if(!isNumber(r.quantity))add('quantity','כמות חסרה או אינה תקינה');
      else if(r.quantity===0)add('quantity','כמות אפס — לבדיקה מקצועית');
      if(r.price!==null&&!isNumber(r.price)&&r.price!=='כלול'&&r.price!=='לא רלוונטי')add('price','מחיר לא תקין');
      else if(returned&&r.price===null)add('price','מחיר חסר בהצעה המוחזרת');
      if(returned&&r.price==='לא רלוונטי')add('price','הקבלן סימן לא רלוונטי — לבדיקה מקצועית');
    }
  }
  return issues;
}
