import Decimal from 'decimal.js';
import restaurant from './data/restaurant.json';

export type Value = number | string | null;
export interface BoqRow { id: string; kind: 'item' | 'note'; description: string; unit: string; quantity: Value; price: Value; frozen?:boolean }
export interface Chapter { id: string; title: string; active: boolean; rows: BoqRow[] }
export interface Project {
  id: string; revisionId: string; templateId: string; kind: 'project';
  title: string; client: string; location: string; date: string; revision: string;
  instructions: string; office: string; contractor: string; vat: Value;
  logo?: {data:string;width:number;height:number};
  layout: {font: string; sideMarginMm: number; verticalMarginMm: number};
  chapters: Chapter[];
}
export const id = () => crypto.randomUUID();
export const OFFICE_DETAILS='נחלת יצחק 34 ת"א | טל- 0505241244';
export const DEFAULT_VAT=18;
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function createProject(fields: Partial<Pick<Project, 'title'|'client'|'location'|'date'|'revision'|'vat'>> = {}): Project {
  return {
    id:id(), revisionId:id(), templateId:restaurant.id, kind:'project',
    title:'', client:'', location:'', date:today(), revision:'', vat:DEFAULT_VAT,
    instructions:restaurant.instructions, office:OFFICE_DETAILS, contractor:'',
    layout:{font:'Assistant',sideMarginMm:6.35,verticalMarginMm:19.05},
    ...fields,
    chapters:restaurant.chapters.map(c => ({id:id(), title:c.title, active:c.active,
      rows:c.rows.map(r => ({id:id(),kind:r.kind as BoqRow['kind'],description:r.description,unit:r.unit,quantity:null,price:null}))})),
  };
}
export const isNumber = (v: Value): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function rowTotal(row: BoqRow): number | null {
  if (row.frozen || row.kind === 'note' || !isNumber(row.quantity)) return null;
  if (row.price === 'כלול' || row.price === 'לא רלוונטי') return 0;
  if (!isNumber(row.price)) return null;
  return new Decimal(row.quantity).mul(row.price).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}
export function chapterTotal(chapter: Chapter) {
  const items = chapter.rows.filter(r=>r.kind==='item'&&!r.frozen);
  return {value:items.reduce((sum,r)=>sum.add(rowTotal(r) ?? 0),new Decimal(0)).toNumber(), partial:items.some(r=>rowTotal(r)===null)};
}
export function numbering(project: Project) {
  const chapters = new Map<string,number>(); const rows = new Map<string,string>();
  let n=0;
  for (const c of project.chapters) if (c.active) {
    chapters.set(c.id,++n); let item=0;
    for (const r of c.rows) if(r.kind==='item'&&!r.frozen) rows.set(r.id,`${n}.${String(++item).padStart(2,'0')}`);
  }
  return {chapters,rows};
}
export const money = (value: number) => {
  const rounded=new Decimal(value).toDecimalPlaces(2,Decimal.ROUND_HALF_UP).toNumber();
  return `${rounded.toLocaleString('he-IL',{minimumFractionDigits:Number.isInteger(rounded)?0:2,maximumFractionDigits:2})}₪`;
};
export function parseInput(text: string): Value {
  if(text.trim()==='') return null;
  if(/^\d+(?:\.\d*)?$/.test(text.trim()) && Number.isFinite(Number(text))) return Number(text);
  return text;
}

export function insertRow(project:Project,chapterId:string,index:number,kind:BoqRow['kind']):Project {
  const row:BoqRow={id:id(),kind,description:'',unit:'',quantity:null,price:null};
  return {...project,chapters:project.chapters.map(c=>c.id===chapterId?{...c,rows:[...c.rows.slice(0,index),row,...c.rows.slice(index)]}:c)};
}
export function convertRow(project:Project,chapterId:string,rowId:string,kind:BoqRow['kind']):Project {
  return {...project,chapters:project.chapters.map(c=>c.id===chapterId?{...c,rows:c.rows.map(r=>r.id===rowId?{...r,kind,...(kind==='note'?{unit:'',quantity:null,price:null}:{})}:r)}:c)};
}
export function deleteRow(project:Project,chapterId:string,rowId:string):Project {
  return {...project,chapters:project.chapters.map(c=>c.id===chapterId?{...c,rows:c.rows.filter(r=>r.id!==rowId)}:c)};
}
