import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire('C:/Users/Rom/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.cjs');
const { Workbook, SpreadsheetFile } = await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const wb = Workbook.create();
console.log(wb.help('worksheet', {search:'visibility|rightToLeft',include:'index,notes,examples',maxChars:2500}).ndjson);
const active = wb.worksheets.add('פרק פעיל');
const inactive = wb.worksheets.add('פרק כבוי');
const meta = wb.worksheets.add('_BOQ_META');
const headers = ['סעיף','תיאור עבודה','יחידה','כמות','מחיר יחידה','סה״כ','row_id','row_type'];
const rows = [
 headers,
 ['1.01','דלת ניסוי\nמידות: {מידות}; תכנית: {הפניה}',"יח'",2.5,12.34,null,'row-001','item'],
 [null,'הערת ניסוי ללא תמחור',null,null,null,null,'row-002','note'],
 ['1.02','בדיקת מחיר ריק',"מ״ר",3,null,null,'row-003','item'],
 ['1.03','בדיקת אפס',"יח'",1,0,null,'row-004','item'],
 ['1.04','בדיקת כלול',"יח'",2,'כלול',null,'row-005','item'],
 ['1.05','בדיקת לא רלוונטי',"יח'",1,'לא רלוונטי',null,'row-006','item'],
 ['1.06','בדיקת כמות חסרה',"יח'",null,10,null,'row-007','item'],
 ['1.07','בדיקת מחיר לא תקין',"יח'",1,'טקסט שגוי',null,'row-008','item'],
 ['1.08','בדיקת עיגול',"יח'",0.5,0.01,null,'row-009','item'],
 [null,'סה״כ חלקי',null,null,null,null,null,null],
 ];
active.getRange('A1:H11').values=rows;
for (const r of [2,4,5,6,7,8,9,10]) {
 active.getRange(`F${r}`).formulas=[[`=IF(OR(ISBLANK(D${r}),ISBLANK(E${r})),"",IF(NOT(ISNUMBER(D${r})),"קלט לא תקין",IF(D${r}<0,"קלט לא תקין",IF(ISNUMBER(E${r}),IF(E${r}<0,"קלט לא תקין",ROUND(D${r}*E${r},2)),IF(OR(E${r}="כלול",E${r}="לא רלוונטי"),0,"קלט לא תקין")))))`]];
}
active.getRange('F11').formulas=[['=SUM(F2:F10)']];
inactive.getRange('A1:H2').values=[headers,[null,'תוכן פרק כבוי נשמר להמשך עריכה',"מ״ר",7,null,null,'row-010','item']];
meta.getRange('A1:D8').values=[
 ['BOQ_WORKBOOK',1,null,null],
 ['document_id','probe-20261026',null,null],
 ['kind','project',null,null],
 ['project_name','ניסוי סינתטי בלבד',null,null],
 ['vat_rate',0.18,null,null],
 ['chapter_id','sheet_name','active','order'],
 ['chapter-001','פרק פעיל',true,0],
 ['chapter-002','פרק כבוי',false,1],
];
for (const [s,last] of [[active,11],[inactive,2]]) {
 s.getRange(`A1:H${last}`).format.font={name:'Assistant',size:12};
 s.getRange(`A1:H${last}`).format.verticalAlignment='top';
 s.getRange(`A1:H${last}`).format.rowHeight=34;
 s.getRange(`A1:H${last}`).format.wrapText=true;
 s.getRange('A:A').format.columnWidth=9;
 s.getRange('B:B').format.columnWidth=60;
 s.getRange('C:F').format.columnWidth=15;
 s.getRange('G:H').format.columnWidth=18;
 s.getRange('A1:H1').format.fill='#E8EDF2';
 s.getRange('A1:H1').format.font.bold=true;
 s.getRange(`E2:F${last}`).setNumberFormat('0.00"₪"');
}
active.getRange('A2:H2').format.rowHeight=60;
meta.getRange('A1:D8').format.columnWidth=24;
meta.getRange('A1:D8').format.font={name:'Assistant',size:12};
meta.getRange('A1:D8').format.rowHeight=28;
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:"'פרק פעיל'!D2:F11",include:'values,formulas',maxChars:2000,tableMaxRows:10,tableMaxCols:3})).ndjson);
for(const name of ['פרק פעיל','פרק כבוי','_BOQ_META']) {
 const blob=await wb.render({sheetName:name,range:name==='_BOQ_META'?'A1:D8':name==='פרק כבוי'?'A1:F2':'A1:F11',scale:1.5});
 await fs.writeFile(new URL(`./preview-${name==='_BOQ_META'?'meta':name==='פרק כבוי'?'inactive':'active'}.png`,import.meta.url),new Uint8Array(await blob.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(wb)).save(new URL('./baseline.xlsx',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
