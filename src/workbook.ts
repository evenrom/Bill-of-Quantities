import type ExcelJS from 'exceljs';
import { chapterTotal, isNumber, numbering, rowTotal, type Project, type Value, type BoqRow } from './model';
import Decimal from 'decimal.js';
import {layoutDocument, textHeight, PAGE_HEIGHT, COLUMN_WIDTHS} from './layout';

// This is a product codec, independent of the format-probe experiment.
export const SIGNATURE = 'BOQ_WORKBOOK';
export const SCHEMA = 3;
export class RecoveryRequired extends Error {}
const fail = (message: string): never => { throw new RecoveryRequired(message); };
const fields = ['title','client','location','date','revision','instructions','office','contractor','vat'] as const;
export const itemFormula = (n: number) => `IF(ISBLANK(D${n}),"",IF(NOT(ISNUMBER(D${n})),"קלט לא תקין",IF(D${n}<0,"קלט לא תקין",IF(ISBLANK(E${n}),"",IF(OR(E${n}="כלול",E${n}="לא רלוונטי"),0,IF(NOT(ISNUMBER(E${n})),"קלט לא תקין",IF(E${n}<0,"קלט לא תקין",ROUND(D${n}*E${n},2))))))))`;
const totalFormula = (rows: number[]) => rows.length ? `SUM(${rows.map(n=>`F${n}`).join(',')})` : '0';
function currencyCell(sheet:ExcelJS.Worksheet,cell:ExcelJS.Cell) {
  const value=typeof cell.value==='number'?cell.value:cell.result;
  // The fallback keeps cents visible after external edits, even in readers that
  // don't support conditional number formats (notably Google Sheets).
  cell.numFmt=typeof value==='number'&&Number.isInteger(value)
    ?`[=${value}]#,##0"₪";#,##0.00"₪"`:'#,##0.00"₪"';
  sheet.addConditionalFormatting({ref:cell.address,rules:[
    {type:'expression',priority:1,formulae:[`AND(ISNUMBER(${cell.address}),ROUND(${cell.address},2)=INT(ROUND(${cell.address},2)))`],style:{numFmt:'#,##0"₪"'}},
    {type:'expression',priority:2,formulae:[`AND(ISNUMBER(${cell.address}),ROUND(${cell.address},2)<>INT(ROUND(${cell.address},2)))`],style:{numFmt:'#,##0.00"₪"'}}
  ]});
}
function styleSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{rightToLeft:true,showGridLines:false}];
  sheet.columns = [...COLUMN_WIDTHS,36,12].map(width=>({width}));
  sheet.getColumn(7).hidden=true; sheet.getColumn(8).hidden=true;sheet.getColumn(9).hidden=true;
  sheet.pageSetup = {paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,
    margins:{left:.25,right:.25,top:.75,bottom:.75,header:0,footer:.25}};
  sheet.properties.defaultRowHeight=24;
}

const border:ExcelJS.Border={style:'thin',color:{argb:'FF505B55'}};
function frame(sheet:ExcelJS.Worksheet,first:number,last:number) {
  for(let n=first;n<=last;n++)for(let c=1;c<=6;c++)sheet.getCell(n,c).border={left:border,right:border,
    ...(n===first?{top:border}:{}),...(n===last?{bottom:border}:{})};
}
function band(sheet:ExcelJS.Worksheet,n:number,text:string,height=30) {
  sheet.mergeCells(n,2,n,6);sheet.getCell(n,2).value=text;sheet.getRow(n).height=height;
  sheet.getCell(n,2).font={name:'Assistant',size:14,bold:true};
}
function pad(sheet:ExcelJS.Worksheet,height:number) {
  while(height>0.1){const h=Math.min(height,400);const r=sheet.addRow([null,null,null,null,null,null,null,'spacer']);r.height=h;height-=h;}
}
function uniqueName(title:string,used:Set<string>) {
  const base=title.replace(/[\\/*?:\[\]]/g,' ').replace(/^'+|'+$/g,'').trim()||'פרק';
  let result=base.slice(0,31),i=1;
  while(used.has(result.toLocaleLowerCase())){const suffix=` (${++i})`;result=base.slice(0,31-suffix.length)+suffix;}
  used.add(result.toLocaleLowerCase());return result;
}
type FieldMap=Record<string,{sheet:string;cell:string}[]>;
export async function encodeProject(project: Project): Promise<Uint8Array> {
  if(typeof document!=='undefined')await document.fonts.ready;
  const ExcelJS=(await import('exceljs')).default;
  const book = new ExcelJS.Workbook(); book.calcProperties.fullCalcOnLoad=true;
  const layout=layoutDocument(project);
  const cover=book.addWorksheet('שער');styleSheet(cover);
  const toc=book.addWorksheet('מקרא והנחיות');styleSheet(toc);
  const mapping:FieldMap={};
  const setField=(field:typeof fields[number],sheet:ExcelJS.Worksheet,cell:string)=>{sheet.getCell(cell).value=project[field];mapping[field]=[{sheet:sheet.name,cell}];};
  cover.getRow(1).height=46;band(cover,2,'פירוט טכני וכתב כמויות',36);
  cover.getRow(3).height=65;
  band(cover,4,project.title,Math.max(70,textHeight(project.title,480,36)));setField('title',cover,'B4');
  cover.getCell('B4').font={name:'Assistant',size:36,bold:true};
  band(cover,5,project.location,Math.max(38,textHeight(project.location,480,20)));setField('location',cover,'B5');cover.getCell('B5').font={name:'Assistant',size:20};
  band(cover,6,project.client,32);setField('client',cover,'B6');
  cover.getRow(7).height=35;
  for(const [row,label,field] of [[8,'תאריך','date']] as const){cover.mergeCells(row,2,row,6);setField(field,cover,`B${row}`);cover.getCell(row,2).numFmt=`"${label}: "@`;cover.getRow(row).height=28;}
  cover.getRow(10).height=70;
  cover.getRow(11).height=90;
  if(project.logo){
    const imageId=book.addImage({base64:project.logo.data,extension:'png'});
    const width=Math.min(360,project.logo.width),height=width*project.logo.height/project.logo.width;
    const scale=Math.min(1,100/height),imageWidth=width*scale,imageHeight=height*scale;
    const spanPixels=COLUMN_WIDTHS.slice(1).reduce((sum,w)=>sum+Math.floor(w*7+5),0);
    // ExcelJS accepts native EMU anchors; its public image type omits these fields.
    const anchor={nativeCol:1,nativeColOff:Math.round((spanPixels-imageWidth)/2*9525),nativeRow:10,nativeRowOff:Math.round((120-imageHeight)/2*9525)};
    cover.addImage(imageId,{tl:anchor as unknown as {col:number;row:number},ext:{width:imageWidth,height:imageHeight}});
  }
  else band(cover,11,'[לוגו המשרד — להשלמה]',90);
  band(cover,12,project.office,Math.max(38,textHeight(project.office,480)));setField('office',cover,'B12');
  cover.getCell('B12').font={name:'Assistant',size:12};
  let coverHeight=0;cover.eachRow({includeEmpty:true},r=>{coverHeight+=r.height??24;});
  if(coverHeight>PAGE_HEIGHT)throw new Error('תוכן השער חורג מעמוד A4. יש לקצר את שם הפרויקט או פרטי השער; לא הופק תוכן חתוך.');
  pad(cover,PAGE_HEIGHT-coverHeight);cover.pageSetup.printArea=`A1:F${cover.rowCount}`;
  // Preserve existing revision/contractor data without displaying it on the cover.
  const internalRow=cover.rowCount+1;setField('revision',cover,`B${internalRow}`);setField('contractor',cover,`D${internalRow}`);setField('vat',cover,`F${internalRow}`);cover.getRow(internalRow).hidden=true;
  cover.pageSetup.fitToHeight=1;
  mapping.instructions=[];
  layout.introPages.forEach((page,index)=>{
    if(index)toc.getRow(toc.rowCount).addPageBreak();
    const start=toc.rowCount+1;band(toc,start,index?'מקרא והנחיות — המשך':'מקרא ותוכן עניינים',36);
    let height=36;
    if(page.entries.length){const n=toc.rowCount+1;toc.addRow(['פרק','שם הפרק',null,null,null,'עמוד']);toc.mergeCells(n,2,n,5);toc.getRow(n).height=28;height+=28;
      for(const c of page.entries){const n=toc.rowCount+1;toc.addRow([project.chapters.filter(x=>x.active).indexOf(c)+1,c.title,null,null,null,layout.chapters.find(x=>x.chapter.id===c.id)!.start]);toc.mergeCells(n,2,n,5);toc.getRow(n).height=30;height+=30;frame(toc,n,n);}}
    if(page.notes.length){if(page.entries.length){pad(toc,24);pad(toc,24);height+=48;}band(toc,toc.rowCount+1,'הנחיות והערות כלליות לקבלן',32);height+=32;
      for(const note of page.notes){const n=toc.rowCount+1;toc.mergeCells(n,1,n,6);toc.getCell(n,1).value=note.text;toc.getRow(n).height=note.height||1;toc.getRow(n).hidden=!note.height;mapping.instructions.push({sheet:toc.name,cell:`A${n}`});height+=note.height;}}
    pad(toc,PAGE_HEIGHT-height);
  });
  toc.pageSetup.printArea=`A1:F${toc.rowCount}`;toc.pageSetup.firstPageNumber=2;
  const meta=book.addWorksheet('_BOQ_META'); meta.state='hidden';
  meta.addRow([SIGNATURE,SCHEMA,project.kind,project.id,project.revisionId,project.templateId,JSON.stringify(project.chapters.map(c=>c.id))]);
  meta.addRow(['layout',JSON.stringify(project.layout),null,project.logo?JSON.stringify({width:project.logo.width,height:project.logo.height}):null]);
  meta.addRow(['chapterId','sheet','active','rowIds']);
  const numbers=numbering(project);
  const used=new Set(book.worksheets.map(s=>s.name.toLocaleLowerCase()));used.add('ריכוז עלויות');
  const totals:{sheet:string;row:number;value:number;partial:boolean;title:string}[]=[];
  layout.chapters.forEach(({chapter,pages,start})=>{
    const sheet=book.addWorksheet(uniqueName(chapter.title,used)); styleSheet(sheet);
    sheet.state=chapter.active?'visible':'hidden';
    const itemRows:number[]=[];
    const frozen=chapter.rows.filter(r=>r.frozen);let frozenIndex=0;
    function writeFrozenBefore(targetIndex:number){while(frozenIndex<frozen.length&&chapter.rows.indexOf(frozen[frozenIndex])<targetIndex){const row=frozen[frozenIndex++];const r=sheet.addRow([null,row.description,row.unit||null,row.quantity,row.price,null,row.id,row.kind,1]);r.hidden=true;}}
    pages.forEach((page,pageIndex)=>{
      if(pageIndex)sheet.getRow(sheet.rowCount).addPageBreak();
      const first=sheet.rowCount+1;
      band(sheet,first,pageIndex?`${chapter.title} (המשך)`:chapter.title,32);
      sheet.getCell(first,1).value=numbers.chapters.get(chapter.id)??null;
      sheet.getCell(first,1).numFmt='"פרק "0';
      sheet.getCell(first,7).value=pageIndex?null:chapter.id;sheet.getCell(first,8).value=pageIndex?'heading':'chapter';
      sheet.addRow(['סעיף','תיאור עבודה','יח׳','כמות','מחיר יחידה','סה״כ',null,'columns']);sheet.getRow(first+1).height=32;
      for(let c=1;c<=6;c++)sheet.getCell(first+1,c).font={name:'Assistant',size:12,bold:true};
      page.rows.forEach(({row,height})=>{
      writeFrozenBefore(chapter.rows.indexOf(row));
      const n=sheet.rowCount+1;
      sheet.addRow([numbers.rows.get(row.id)??null,row.description,row.unit||null,row.quantity,row.price,null,row.id,row.kind]);
      sheet.getRow(n).height=height;
      if(row.kind==='item') {
        itemRows.push(n);
        sheet.getCell(n,6).value={formula:itemFormula(n),result:rowTotal(row)??''};
        sheet.getCell(n,4).dataValidation={type:'decimal',operator:'greaterThanOrEqual',formulae:[0],allowBlank:true,showErrorMessage:true,error:'יש להזין מספר לא שלילי'};
        sheet.getCell(n,5).dataValidation={type:'custom',formulae:[`OR(ISBLANK(E${n}),AND(ISNUMBER(E${n}),E${n}>=0),E${n}="כלול",E${n}="לא רלוונטי")`],allowBlank:true,showErrorMessage:true,error:'מספר לא שלילי, כלול או לא רלוונטי בלבד'};
      }
      });
      const last=pageIndex===pages.length-1;
      if(last)writeFrozenBefore(Infinity);
      pad(sheet,PAGE_HEIGHT-64-page.used-(last?32:0));
      if(last){const total=chapterTotal(chapter);const n=sheet.rowCount+1;sheet.addRow([null,`${total.partial?'סיכום חלקי':'סה״כ'} פרק ${numbers.chapters.get(chapter.id)??''} להעברה`,null,null,null,{formula:totalFormula(itemRows),result:total.value},null,'total']);sheet.mergeCells(n,2,n,5);sheet.getRow(n).height=32;}
      frame(sheet,first+1,sheet.rowCount);
      if(last)for(let c=1;c<=6;c++)sheet.getCell(sheet.rowCount,c).border={...sheet.getCell(sheet.rowCount,c).border,top:border};
      for(let c=1;c<=6;c++)sheet.getCell(first+1,c).border={...sheet.getCell(first+1,c).border,bottom:border};
    });
    const total=chapterTotal(chapter);
    if(chapter.active)totals.push({sheet:sheet.name,row:sheet.rowCount,...total,title:chapter.title});
    sheet.eachRow(row=>{
      if(row.getCell(8).value==='item')currencyCell(sheet,row.getCell(5));
      if(row.getCell(8).value==='item'||row.getCell(8).value==='total')currencyCell(sheet,row.getCell(6));
    });
    sheet.pageSetup.printArea=`A1:F${sheet.rowCount}`;
    sheet.pageSetup.firstPageNumber=start||1;
    meta.addRow([chapter.id,sheet.name,chapter.active?1:0,JSON.stringify(chapter.rows.map(r=>r.id))]);
  });
  const summary=book.addWorksheet('ריכוז עלויות');styleSheet(summary);band(summary,1,'ריכוז עלויות',40);
  summary.addRow(['פרק','תיאור',null,null,'סה״כ']);summary.mergeCells('B2:D2');summary.mergeCells('E2:F2');summary.getRow(2).height=30;
  totals.forEach((t,i)=>{const n=i+3;summary.addRow([i+1,t.title,null,null,{formula:`'${t.sheet.replaceAll("'","''")}'!F${t.row}`,result:t.value}]);summary.mergeCells(n,2,n,4);summary.mergeCells(n,5,n,6);summary.getRow(n).height=24;});
  const detailEnd=summary.rowCount;
  const gap=summary.addRow([null,totals.some(t=>t.partial)?'סכומים חלקיים — קיימים סעיפים ללא תמחור מלא':null]);
  summary.mergeCells(gap.number,2,gap.number,6);gap.height=24;
  gap.getCell(2).font={name:'Assistant',size:10,italic:true,color:{argb:'FF68756E'}};
  const baseRow=summary.rowCount+1;const sum=totals.reduce((v,t)=>v.add(t.value),new Decimal(0));
  summary.addRow([null,'סה״כ',null,null,{formula:totals.length?`SUM(E3:E${detailEnd})`:'0',result:sum.toNumber()}]);
  const rateRef=`'שער'!F${internalRow}`;
  const vatRow=baseRow+1;const vat=isNumber(project.vat)?sum.mul(project.vat).div(100).toDecimalPlaces(2,Decimal.ROUND_HALF_UP):null;
  summary.addRow([null,{formula:`IF(ISNUMBER(${rateRef}),"מע"&CHAR(34)&"מ ("&${rateRef}&"%)","מע"&CHAR(34)&"מ (לא הוגדר)")`,result:isNumber(project.vat)?`מע״מ (${project.vat}%)`:'מע״מ (לא הוגדר)'},null,null,{formula:`IF(ISBLANK(${rateRef}),"",IF(ISNUMBER(${rateRef}),ROUND(E${baseRow}*${rateRef}/100,2),"קלט לא תקין"))`,result:vat?.toNumber()??''}]);
  const grandRow=vatRow+1;summary.addRow([null,'סה״כ כולל מע״מ',null,null,{formula:`IF(ISNUMBER(E${vatRow}),SUM(E${baseRow},E${vatRow}),"")`,result:vat?sum.add(vat).toNumber():''}]);
  frame(summary,2,detailEnd);
  for(let n=2;n<=detailEnd;n++)for(let c=1;c<=6;c++)summary.getCell(n,c).border={...summary.getCell(n,c).border,bottom:{style:'hair',color:{argb:'FFD7DDD9'}}};
  for(let n=baseRow;n<=grandRow;n++){
    summary.mergeCells(n,2,n,4);summary.mergeCells(n,5,n,6);summary.getRow(n).height=32;
    for(let c=2;c<=6;c++){summary.getCell(n,c).font={name:'Assistant',size:12,bold:true};summary.getCell(n,c).fill={type:'pattern',pattern:'solid',fgColor:{argb:n===grandRow?'FFE3ECE6':'FFF3F6F4'}};}
    summary.getCell(n,2).border={bottom:border,...(n===baseRow?{top:border}:{})};summary.getCell(n,5).border={bottom:border,...(n===baseRow?{top:border}:{})};
  }
  for(let n=3;n<=grandRow;n++)if(n!==gap.number)currencyCell(summary,summary.getCell(n,5));
  summary.pageSetup.printArea=`A1:F${grandRow}`;summary.pageSetup.firstPageNumber=layout.summaryPage;
  if(40+30+totals.length*24+24+3*32>PAGE_HEIGHT)throw new Error('טבלת ריכוז העלויות חורגת מעמוד A4. נדרש עימוד ריכוז רב־עמודי.');
  meta.getCell('C2').value=JSON.stringify(mapping);
  for(const sheet of book.worksheets.filter(s=>s!==meta)) sheet.eachRow({includeEmpty:true},(row,n)=>row.eachCell({includeEmpty:true},cell=>{
    if(cell.isMerged && cell.master.address!==cell.address)return;
    // Break shared column/merged styles before setting cell alignment. Otherwise a
    // later merged or numeric cell can change an earlier cell's vertical alignment.
    cell.style={...structuredClone(cell.style),font:cell.font?.name?{...cell.font}:{name:project.layout.font,size:12,bold:n<=2},
      alignment:{vertical:'top',horizontal:sheet===cover?'center':Number(cell.col)===2||sheet===toc&&Number(cell.col)===1&&cell.isMerged?'right':'center',wrapText:true,readingOrder:'rtl'}};
  }));
  for(const sheet of book.worksheets.filter(s=>s!==cover&&s!==meta))sheet.headerFooter.oddFooter='&Cעמוד &P';
  return new Uint8Array(await book.xlsx.writeBuffer());
}
function value(cell: ExcelJS.Cell): Value {
  const v=cell.value;
  if(v===null || v===undefined) return null;
  if(typeof v==='string' || typeof v==='number') return v;
  if(typeof v==='object' && 'richText' in v) return v.richText.map(r=>r.text).join('');
  return fail(`תא ${cell.address}: סוג ערך שאינו נתמך (למשל נוסחה בשדה עריכה). נדרש ייבוא מונחה.`);
}
function textCell(cell: ExcelJS.Cell): string { const v=value(cell); return v===null?'':String(v); }
function json<T>(s:string): T { try{return JSON.parse(s) as T;}catch{return fail('נתוני מבנה אינם תקינים');} }
export async function decodeProject(bytes: ArrayBuffer): Promise<{project:Project;warnings:string[]}> {
  const ExcelJS=(await import('exceljs')).default;
  const book=new ExcelJS.Workbook();
  try { await book.xlsx.load(bytes); } catch { return fail('לא ניתן לקרוא את קובץ ה־Excel. המקור לא שונה.'); }
  const meta=book.getWorksheet('_BOQ_META');
  const version=meta?.getCell('B1').value;
  const cover=book.getWorksheet(version===1?'פרטי מסמך':'שער');
  if(!meta || !cover || meta.getCell('A1').value!==SIGNATURE) return fail('זה אינו קובץ עבודה מזוהה של המערכת. נדרש ייבוא מונחה.');
  if((version!==1&&version!==2&&version!==SCHEMA) || meta.getCell('C1').value!=='project') return fail('גרסת הקובץ או סוג המסמך אינם נתמכים בשלב זה.');
  const seen=new Set<string>();
  function identity(v:string) { if(!v || seen.has(v)) return fail('מזהה חסר או כפול בקובץ. נדרש שחזור מונחה.'); seen.add(v); return v; }
  const layout=json<Project['layout']>(textCell(meta.getCell('B2')));
  if(!layout || typeof layout.font!=='string' || !Number.isFinite(layout.sideMarginMm) || !Number.isFinite(layout.verticalMarginMm)) return fail('הגדרות עיצוב פגומות');
  const project:Project={id:identity(textCell(meta.getCell('D1'))),revisionId:identity(textCell(meta.getCell('E1'))),templateId:textCell(meta.getCell('F1')),kind:'project',
    title:'',client:'',location:'',date:'',revision:'',instructions:'',office:'',contractor:'',vat:null,layout,chapters:[]};
  const warnings:string[]=[]; const matched=new Set([cover.id,meta.id]);
  if(version===1)fields.forEach((field,i)=>{if(field==='vat')project.vat=value(cover.getCell(i+1,2));else project[field]=textCell(cover.getCell(i+1,2));});
  else {
    const mapping=json<FieldMap>(textCell(meta.getCell('C2')));
    for(const name of ['מקרא והנחיות','ריכוז עלויות']){const s=book.getWorksheet(name);if(!s)return fail('גיליון מסמך חסר');matched.add(s.id);}
    for(const field of fields){const refs=mapping[field];if(!Array.isArray(refs)||!refs.length)return fail('מיפוי פרטי מסמך חסר');
      const cells=refs.map(ref=>{const s=book.getWorksheet(ref.sheet);if(!s||!matched.has(s.id)||!/^\$?[A-F]\$?\d+$/.test(ref.cell))return fail('מיפוי שדה לא תקין');return s.getCell(ref.cell);});
      if(field==='vat'){if(cells.length!==1)return fail('שיעור מע״מ כפול');project.vat=value(cells[0]);}
      else project[field]=cells.map(textCell).join(field==='instructions'?'\n':'');
    }
    if(meta.getCell('D2').value){const dimensions=json<{width:number;height:number}>(textCell(meta.getCell('D2')));const images=cover.getImages();
      if(images.length!==1||!isNumber(dimensions.width)||!isNumber(dimensions.height)||!dimensions.width||!dimensions.height)return fail('לוגו המסמך חסר או פגום');
      const media=book.getImage(Number(images[0].imageId));
      const data=media.base64 || (media.buffer?`data:image/png;base64,${btoa(Array.from(new Uint8Array(media.buffer as unknown as ArrayBuffer),b=>String.fromCharCode(b)).join(''))}`:'');
      if(!data)return fail('לא ניתן לקרוא את לוגו המסמך');project.logo={...dimensions,data};
    }
  }
  const expectedChapters=json<unknown>(textCell(meta.getCell('G1')));
  if(!Array.isArray(expectedChapters) || expectedChapters.some(v=>typeof v!=='string') || new Set(expectedChapters).size!==expectedChapters.length) return fail('רשימת הפרקים אינה תקינה');
  if(project.vat!==null && !isNumber(project.vat)) warnings.push('שיעור מע״מ אינו מספר תקין');
  for(let m=4;m<=meta.rowCount;m++) {
    const chapterId=identity(textCell(meta.getCell(m,1)));
    const active=value(meta.getCell(m,3)); if(active!==0 && active!==1) return fail('מצב פרק חסר או לא תקין');
    const expected=json<unknown>(textCell(meta.getCell(m,4)));
    if(!Array.isArray(expected) || expected.some(v=>typeof v!=='string') || new Set(expected).size!==expected.length) return fail('רשימת מזהי השורות אינה תקינה');
    const sheets=book.worksheets.filter(s=>s.getCell('G1').value===chapterId && s.getCell('H1').value==='chapter');
    if(sheets.length!==1) return fail('פרק חסר או כפול. לא ניתן לפתוח באופן מלא.');
    const sheet=sheets[0]; matched.add(sheet.id);
    const chapter={id:chapterId,title:textCell(sheet.getCell(version===1?'A1':'B1')),active:active===1,rows:[] as BoqRow[]};
    const rowIds:string[]=[]; const itemRows:number[]=[]; let totals=0;
    if(sheet.rowCount>20000) return fail('מספר השורות גדול מהמגבלה הנתמכת');
    for(let n=3;n<=sheet.rowCount;n++) {
      const raw=sheet.getRow(n); if(!raw.hasValues) continue;
      const kind=textCell(sheet.getCell(n,8));
      if(version!==1 && ['spacer','heading','columns'].includes(kind))continue;
      if(kind==='total') {totals++; if(n!==sheet.rowCount) return fail('שורת סיכום אינה בסוף הפרק'); continue;}
      if(kind!=='item' && kind!=='note') return fail(`סוג שורה לא מזוהה בגיליון ${sheet.name}, שורה ${n}`);
      const row:BoqRow={id:identity(textCell(sheet.getCell(n,7))),kind,description:textCell(sheet.getCell(n,2)),unit:textCell(sheet.getCell(n,3)),quantity:value(sheet.getCell(n,4)),price:value(sheet.getCell(n,5))};
      if(version===3){const flag=value(sheet.getCell(n,9));if(flag!==null&&flag!==0&&flag!==1)return fail('מצב הקפאת שורה אינו תקין');if(flag===1)row.frozen=true;}
      if(kind==='note' && (row.unit!=='' || row.quantity!==null || row.price!==null || sheet.getCell(n,6).value!==null)) return fail('הערה מכילה נתוני כמות או מחיר. יש לבחור כיצד לשחזר אותה.');
      if(kind==='item'&&!row.frozen) {
        itemRows.push(n);
        if(row.quantity!==null && !isNumber(row.quantity)) warnings.push(`${chapter.title}, שורה ${n}: כמות לא תקינה נשמרה לבדיקה`);
        if(row.price!==null && !isNumber(row.price) && row.price!=='כלול' && row.price!=='לא רלוונטי') warnings.push(`${chapter.title}, שורה ${n}: מחיר לא תקין נשמר לבדיקה`);
        // ExcelJS expands shared formulas through cell.formula.
        if(sheet.getCell(n,6).formula!==itemFormula(n)) warnings.push(`${chapter.title}, שורה ${n}: נוסחת הסכום שונתה; הסכום חושב מחדש`);
      }
      rowIds.push(row.id);chapter.rows.push(row);
    }
    if(totals!==1 || expected.length!==rowIds.length || expected.some(id=>!rowIds.includes(id))) return fail('שורות חסרות או נוספו ללא התאמת מבנה. נדרש ייבוא/שחזור מונחה.');
    if(sheet.getCell(sheet.rowCount,6).formula!==totalFormula(itemRows)) warnings.push(`${chapter.title}: נוסחת הסיכום שונתה; הסיכום חושב מחדש`);
    project.chapters.push(chapter);
  }
  if(!project.chapters.length || matched.size!==book.worksheets.length || expectedChapters.length!==project.chapters.length || expectedChapters.some(id=>!project.chapters.some(c=>c.id===id))) return fail('פרקים חסרים או גיליונות לא מזוהים בקובץ');
  return {project,warnings};
}
