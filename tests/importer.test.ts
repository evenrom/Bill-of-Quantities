import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {inspectWorkbook,buildImport,type SheetPlan} from '../src/importer';
describe('guided external import',()=>{
  it('reads cached formulas, retains zero, previews ignored rows and rejects destructive note mapping',async()=>{
    const b=new ExcelJS.Workbook(),s=b.addWorksheet('חיצוני');s.addRow(['כותרת']);s.addRow(['מספר','תיאור','יחידה','כמות','מחיר','סהכ']);s.addRow([1,'description',"יח'",0,10,{formula:'D3*E3',result:0}]);
    const [sheet]=await inspectWorkbook(await b.xlsx.writeBuffer() as never);
    const plan:SheetPlan={sheet,enabled:true,title:'import',active:true,mapping:{description:2,unit:3,quantity:4,price:5,start:3},kinds:{}};
    const result=buildImport([plan],'import');expect(result.project.chapters[0].rows[0].quantity).toBe(0);expect(result.warnings.some(w=>w.includes('נוסחאות'))).toBe(true);
    plan.kinds[3]='note';expect(()=>buildImport([plan],'import')).toThrow('הערה מכילה');
  });
});
