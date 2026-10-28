import type ExcelJS from 'exceljs';
import {createProject,id,type Project,type Value,type Chapter} from './model';
export interface SourceRow {number:number;cells:Value[];formulas:number;hidden:boolean}
export interface SourceSheet {name:string;rows:SourceRow[];hidden:boolean}
export type ImportKind='item'|'note'|'chapter'|'ignore';
export interface Mapping {description:number;unit:number;quantity:number;price:number;start:number}
export interface SheetPlan {sheet:SourceSheet;enabled:boolean;title:string;active:boolean;mapping:Mapping;kinds:Record<number,ImportKind>}
function cellValue(cell:ExcelJS.Cell):Value{
  if(cell.isMerged&&cell.master.address!==cell.address)return null;
  const v=cell.value;if(v===null||v===undefined)return null;
  if(typeof v==='string'||typeof v==='number')return v;
  if(v instanceof Date)return v.toISOString().slice(0,10);
  if(typeof v==='object'&&'richText'in v)return v.richText.map(r=>r.text).join('');
  if(typeof v==='object'&&'hyperlink'in v)return v.text??v.hyperlink;
  if(typeof v==='object'&&'error'in v)return v.error;
  if(typeof v==='object'&&('formula'in v||'sharedFormula'in v)){
    const result=cell.result;if(typeof result==='string'||typeof result==='number')return result;
    return result===undefined||result===null?'[נוסחה ללא תוצאה שמורה]':String(result);
  }
  return String(v);
}
export async function inspectWorkbook(bytes:ArrayBuffer):Promise<SourceSheet[]>{
  const ExcelJS=(await import('exceljs')).default;const b=new ExcelJS.Workbook();
  try{await b.xlsx.load(bytes);}catch{throw new Error('הקובץ אינו XLSX קריא. לא ניתן לשחזר נתונים ממנו; יש לבחור עותק תקין.');}
  const result:SourceSheet[]=[];let total=0;
  for(const s of b.worksheets){
    if(s.name==='_BOQ_META')continue;
    if(s.rowCount>10000||s.columnCount>100)throw new Error('הקובץ חורג ממגבלת הייבוא (10,000 שורות ו־100 עמודות לגיליון).');
    const rows:SourceRow[]=[];
    s.eachRow(row=>{const cells:Value[]=[];let formulas=0;for(let c=1;c<=s.columnCount;c++){const cell=row.getCell(c);cells.push(cellValue(cell));if(cell.type===6)formulas++;}if(cells.some(v=>v!==null&&v!==''))rows.push({number:row.number,cells,formulas,hidden:!!row.hidden});});
    total+=rows.length;if(total>20000)throw new Error('יותר מ־20,000 שורות בקובץ. יש לפצל את הייבוא.');
    result.push({name:s.name,rows,hidden:s.state!=='visible'});
  }
  if(!result.length)throw new Error('לא נמצאו גיליונות תוכן');return result;
}
export function suggestKind(row:SourceRow,m:Mapping):ImportKind{
  if(row.number<m.start||row.hidden)return 'ignore';
  const desc=String(row.cells[m.description-1]??'').trim();if(!desc)return 'ignore';
  if(['total','heading','columns','spacer'].includes(String(row.cells[7]??'')))return 'ignore';
  if(row.cells[7]==='item'||row.cells[7]==='note')return row.cells[7] as ImportKind;
  if(/^פרק\s*\d/.test(desc)||/^פרק\s*\d/.test(String(row.cells[0]??'')))return 'chapter';
  if(![m.unit,m.quantity,m.price].some(c=>c&&row.cells[c-1]!==null&&row.cells[c-1]!==''&&row.cells[c-1]!==undefined))return 'note';
  return 'item';
}
export const mapped=(row:SourceRow,column:number):Value=>column?row.cells[column-1]??null:null;
export function buildImport(plans:SheetPlan[],title:string):{project:Project;warnings:string[]}{
  const project=createProject({title});project.templateId='imported';project.chapters=[];project.instructions='';const warnings:string[]=[];
  for(const plan of plans.filter(p=>p.enabled)){
    const m=plan.mapping;if(!m.description)throw new Error('יש למפות עמודת תיאור');
    const cols=[m.description,m.unit,m.quantity,m.price].filter(Boolean);if(new Set(cols).size!==cols.length)throw new Error('אין למפות אותה עמודה לשני שדות');
    let chapter:Chapter={id:id(),title:plan.title,active:plan.active,rows:[]};project.chapters.push(chapter);
    let ignored=0,unmapped=0;
    for(const source of plan.sheet.rows){
      const kind=plan.kinds[source.number]??suggestKind(source,m);if(kind==='ignore'){ignored++;continue;}
      if(source.formulas)warnings.push(`${plan.sheet.name}, שורה ${source.number}: נוסחאות יובאו מתוצאות שמורות בלבד, בלי להריצן`);
      if(source.cells.some((v,i)=>v!==null&&v!==''&&!cols.includes(i+1)))unmapped++;
      const description=String(mapped(source,m.description)??'');const unit=String(mapped(source,m.unit)??'');
      const quantity=mapped(source,m.quantity),price=mapped(source,m.price);
      if(kind==='chapter'){
        if(chapter.rows.length){chapter={id:id(),title:description,active:plan.active,rows:[]};project.chapters.push(chapter);}else chapter.title=description;
        if(quantity!==null||price!==null)warnings.push(`${plan.sheet.name}, שורה ${source.number}: נתונים מספריים בשורת כותרת לא ייובאו`);
        continue;
      }
      if(kind==='note'&&(unit||quantity!==null||price!==null))throw new Error(`${plan.sheet.name}, שורה ${source.number}: הערה מכילה יחידה/כמות/מחיר. יש לבחור סעיף או התעלמות מפורשת.`);
      chapter.rows.push({id:id(),kind,description,unit:kind==='note'?'':unit,quantity:kind==='note'?null:quantity,price:kind==='note'?null:price});
    }
    if(ignored)warnings.push(`${plan.sheet.name}: ${ignored} שורות מסומנות להתעלמות`);
    if(unmapped)warnings.push(`${plan.sheet.name}: ${unmapped} שורות מכילות גם מידע בעמודות שאינן ממופות (למשל מספור או סכום); מידע זה אינו מועתק`);
  }
  if(!project.chapters.some(c=>c.rows.length))throw new Error('לא נבחרו שורות תוכן לייבוא');
  return {project,warnings};
}
