import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {inspectWorkbook,buildImport,importPlans,type SheetPlan} from '../src/importer';
describe('guided external import',()=>{
  it('reads cached formulas, retains zero and preserves quantitative note mapping',async()=>{
    const b=new ExcelJS.Workbook(),s=b.addWorksheet('חיצוני');s.addRow(['כותרת']);s.addRow(['מספר','תיאור','יחידה','כמות','מחיר','סהכ']);s.addRow([1,'description',"יח'",0,10,{formula:'D3*E3',result:0}]);
    const [sheet]=await inspectWorkbook(await b.xlsx.writeBuffer() as never);
    const plan:SheetPlan={sheet,enabled:true,title:'import',active:true,mapping:{description:2,unit:3,quantity:4,price:5,start:3},kinds:{}};
    const result=buildImport([plan],'import');expect(result.project.chapters[0].rows[0].quantity).toBe(0);expect(result.warnings.some(w=>w.includes('נוסחאות'))).toBe(true);
    plan.kinds[3]='note';expect(buildImport([plan],'import').project.chapters[0].rows[0].kind).toBe('note');
  });
  it('skips repeated headers and transfer totals, merges continued pages and keeps real descriptions',async()=>{
    const b=new ExcelJS.Workbook(),s=b.addWorksheet('גיליון1');
    s.addRow([null,'פרטי הפרויקט']);
    s.addRow(['סעיף','תיאור עבודה',"יח'",'כמות',"מחיר יח'",'סה״כ']);
    s.addRow([null,'פרק 4 - חשמל']);
    s.addRow([1,'נקודת חשמל',"נק'",2,25]);
    s.addRow([null,"סהכ׳ לעברה-",null,null,null,{formula:'D4*E4',result:50}]);
    s.addRow(['סעיף','תאור עבודה',"יח'",'כמות','מחיר יחידה','סהכ']);
    s.addRow([null,'פרק 4 - חשמל (המשך)']);
    s.addRow([2,'תיאור עבודה לפי תכנית',"יח'",0,10]);
    s.addRow([null,'סה״כ להעברה']);s.addRow([null,'סיכום חלקי פרק 4 להעברה']);
    s.addRow([null,'פרק 5 - צבע']);s.addRow([1,'צביעת קירות','מ"ר',3,20]);
    s.addRow([null,'ריכוז עלויות']);s.addRow([null,'חשמל',null,null,50]);
    const result=buildImport(importPlans(await inspectWorkbook(await b.xlsx.writeBuffer() as never)),'בדיקה');
    expect(result.project.chapters.map(c=>c.title)).toEqual(['חשמל','צבע']);
    expect(result.project.chapters.flatMap(c=>c.rows).map(r=>[r.description,r.quantity,r.price])).toEqual([
      ['נקודת חשמל',2,25],['תיאור עבודה לפי תכנית',0,10],['צביעת קירות',3,20]
    ]);
  });
  it('detects reordered columns and ignores cover sheets without losing content on chapter sheets',async()=>{
    const b=new ExcelJS.Workbook();b.addWorksheet('שער').addRow([null,'פרויקט בדיקה']);
    const s=b.addWorksheet('נגרות');s.addRow(['תיאור עבודה','מחיר יחידה','כמות','יחידה']);
    s.addRow(['ארון',80,2,"יח'"]);s.addRow(['הערה טכנית']);
    const result=buildImport(importPlans(await inspectWorkbook(await b.xlsx.writeBuffer() as never)),'בדיקה');
    expect(result.project.chapters).toHaveLength(1);
    expect(result.project.chapters[0].rows[0]).toMatchObject({description:'ארון',price:80,quantity:2,unit:"יח'"});
    expect(result.project.chapters[0].rows[1]).toMatchObject({kind:'note',description:'הערה טכנית'});
  });
});
