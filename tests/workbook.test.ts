import { describe,it,expect } from 'vitest';
import ExcelJS from 'exceljs';
import { createProject, money } from '../src/model';
import { encodeProject,decodeProject,RecoveryRequired,itemFormula } from '../src/workbook';
import {readFile} from 'node:fs/promises';
async function fixture() {const p=createProject({title:'בדיקת מוצר',vat:17.5}); const b=new ExcelJS.Workbook();await b.xlsx.load(await encodeProject(p) as never);return {p,b};}
async function decode(b:ExcelJS.Workbook) {return decodeProject(await b.xlsx.writeBuffer() as unknown as ArrayBuffer);}
describe('workbook boundaries',()=>{
  it('styles empty editable prices before a contractor enters a value',async()=>{
    const {b}=await fixture();const s=b.getWorksheet('בנייה ומחיצות פנים')!;
    for(let n=3;n<=s.rowCount;n++)if(s.getCell(n,8).value==='item'){
      const cell=s.getCell(n,5);expect(cell.value).toBeNull();
      expect(cell.font.name).toBe('Assistant');expect(cell.alignment.vertical).toBe('top');
      cell.value=10.5;
      expect(cell.font.name).toBe('Assistant');expect(cell.alignment.vertical).toBe('top');
    }
  });
  it('formats whole amounts without cents and fractional amounts with two digits',async()=>{
    expect(money(10)).toBe('10₪');expect(money(10.5)).toBe('10.50₪');expect(money(0)).toBe('0₪');
    const p=createProject();p.chapters[1].rows[1].price=10;
    const b=new ExcelJS.Workbook();await b.xlsx.load(await encodeProject(p) as never);
    const s=b.getWorksheet('בנייה ומחיצות פנים')!;
    expect(s.getCell('E4').numFmt).toBe('[=10]#,##0"₪";#,##0.00"₪"');
    const rules=(s as unknown as {conditionalFormattings:{ref:string;rules:unknown[]}[]}).conditionalFormattings;
    expect(rules.some(cf=>cf.ref==='E4'&&cf.rules.length===2)).toBe(true);
    expect((await decode(b)).project.chapters[1].rows[1].price).toBe(10);
  });
  it('top-aligns table cells and gives summary amounts E:F with a separate three-line total',async()=>{
    const {b}=await fixture();const summary=b.getWorksheet('ריכוז עלויות')!;
    expect(summary.getCell('F3').master.address).toBe('E3');
    expect(summary.getCell('D3').master.address).toBe('B3');
    expect(summary.getCell('B13').value).toBe('סה״כ');
    expect(summary.getCell('B14').result).toBe('מע״מ (17.5%)');
    expect(summary.getCell('B15').value).toBe('סה״כ כולל מע״מ');
    expect(summary.getCell('E15').font.bold).toBe(true);
    for(const sheet of b.worksheets.filter(s=>s.state==='visible'))sheet.eachRow(row=>row.eachCell(cell=>{
      if(!cell.isMerged)expect(cell.alignment.vertical,`${sheet.name}!${cell.address}`).toBe('top');
    }));
    expect((await decode(b)).project.vat).toBe(17.5);
  });
  it('preserves frozen rows and prices without counting or printing them',async()=>{
    const p=createProject();const c=p.chapters[1];c.rows[1].frozen=true;c.rows[1].quantity=7;c.rows[1].price=20;
    c.rows.at(-1)!.frozen=true;
    const b=new ExcelJS.Workbook();await b.xlsx.load(await encodeProject(p) as never);
    const s=b.getWorksheet(c.title)!;
    expect(s.getRow(4).hidden).toBe(true);expect(s.getCell('E4').value).toBe(20);expect(s.getCell('F4').value).toBeNull();
    expect(s.getCell(s.rowCount,6).formula).not.toContain('F4');
    expect((await decode(b)).project).toEqual(p);
    expect(s.getCell(s.rowCount,1).border.top?.style).toBe('thin');
  });
  it('omits revision and contractor from the printed cover while retaining their saved data',async()=>{
    const p=createProject({revision:'revision-secret'});p.contractor='contractor-secret';
    const b=new ExcelJS.Workbook();await b.xlsx.load(await encodeProject(p) as never);
    const s=b.getWorksheet('שער')!;const visible:string[]=[];
    s.eachRow(row=>{if(!row.hidden)row.eachCell(cell=>visible.push(String(cell.value??'')));});
    expect(visible.join(' ')).not.toMatch(/revision-secret|contractor-secret|חותמת|פרטי קבלן/);
    expect((await decode(b)).project).toEqual(p);
  });
  it('opens an existing v1 file and migrates it without losing data',async()=>{
    const bytes=await readFile('tests/fixtures/legacy-v1.xlsx');const {project}=await decodeProject(bytes as never);
    expect(project.chapters).toHaveLength(22);
    expect((await decodeProject(await encodeProject(project) as never)).project).toEqual(project);
  });
  it('puts headings in B1, outlines chapters and links the active summary',async()=>{
    const {b,p}=await fixture();const s=b.getWorksheet('בנייה ומחיצות פנים')!;
    expect(s.getCell('B1').value).toBe(p.chapters[1].title);
    expect(s.getCell('B1').alignment.horizontal).toBe('right');
    expect(s.getCell('A2').border.right?.style).toBe('thin');
    expect(s.getCell(s.rowCount,6).border.bottom?.style).toBe('thin');
    const summary=b.getWorksheet('ריכוז עלויות')!;
    expect(summary.getCell('E3').formula).toBe(`'${s.name}'!F${s.rowCount}`);
    expect(summary.rowCount).toBe(15);
    expect(b.worksheets.filter(x=>x.state==='visible').slice(0,2).map(s=>s.name)).toEqual(['שער','מקרא והנחיות']);
    expect(b.getWorksheet('מקרא והנחיות')!.getCell('F3').value).toBe(3);
  });
  it('keeps an embedded office logo independent of the repository',async()=>{
    const p=createProject();p.logo={data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=',width:1,height:1};
    expect((await decodeProject(await encodeProject(p) as never)).project).toEqual(p);
  });
  it('round-trips every field, inactive chapter and stable identity',async()=>{
    const p=createProject({title:'פרויקט בדיקה',client:'לקוח לבדיקה',vat:0});
    p.chapters[0].rows[1].description='טיוטה כבויה\nשורה שנייה';p.chapters[0].rows[1].quantity=0;p.chapters[0].rows[1].price='כלול';
    const result=await decodeProject(await encodeProject(p) as never);
    expect(result.project).toEqual(p);expect(result.warnings).toEqual([]);
  });
  it('reads externally edited cells, including zero vs blank, and renamed sheets',async()=>{
    const {p,b}=await fixture();const s=b.getWorksheet('פירוק והריסה')!;
    s.name='שם שנערך בחוץ';s.state='visible';s.getCell('B4').value='נערך ב־Excel';s.getCell('D4').value=0;s.getCell('E4').value=0;
    const result=await decode(b);const c=result.project.chapters[0];
    expect(c.active).toBe(false);expect(c.id).toBe(p.chapters[0].id);
    expect(c.rows[1]).toMatchObject({description:'נערך ב־Excel',quantity:0,price:0});
    expect(c.rows[2].quantity).toBeNull();
  });
  it('preserves invalid external input and warns about changed formulas without executing them',async()=>{
    const {b}=await fixture();const s=b.getWorksheet('בנייה ומחיצות פנים')!;
    s.getCell('D4').value='XX';s.getCell('E4').value='הצעה אחרת';s.getCell('F4').value={formula:'1+999',result:1000};
    const result=await decode(b);
    expect(result.project.chapters[1].rows[1].price).toBe('הצעה אחרת');
    expect(result.warnings).toHaveLength(3);
  });
  it('expands shared formulas before comparison',async()=>{
    const {b}=await fixture();const s=b.getWorksheet('בנייה ומחיצות פנים')!;
    s.getCell('F4').value={formula:itemFormula(4),shareType:'shared',ref:'F4:F9'} as ExcelJS.CellFormulaValue;
    for(let n=5;n<=9;n++)s.getCell(n,6).value={sharedFormula:'F4'};
    expect((await decode(b)).warnings).toEqual([]);
  });
  it.each(['meta','version','duplicate','missing-id','deleted-row','deleted-sheet','deleted-chapter-and-mapping','added-sheet','note-price','input-formula','chapter-id'])('rejects %s damage instead of losing data',async damage=>{
    const {b}=await fixture();const s=b.getWorksheet('פירוק והריסה')!;
    if(damage==='meta')b.removeWorksheet('_BOQ_META');
    if(damage==='version')b.getWorksheet('_BOQ_META')!.getCell('B1').value=99;
    if(damage==='duplicate')s.getCell('G5').value=s.getCell('G4').value;
    if(damage==='missing-id')s.getCell('G4').value=null;
    if(damage==='deleted-row')s.spliceRows(4,1);
    if(damage==='deleted-sheet')b.removeWorksheet(s.id);
    if(damage==='deleted-chapter-and-mapping'){b.removeWorksheet(s.id);b.getWorksheet('_BOQ_META')!.spliceRows(4,1);}
    if(damage==='added-sheet')b.addWorksheet('Unknown').getCell('A1').value='Unmapped data';
    if(damage==='note-price')s.getCell('E3').value=5;
    if(damage==='input-formula')s.getCell('D4').value={formula:'1+1',result:2};
    if(damage==='chapter-id')s.getCell('G1').value=null;
    await expect(decode(b)).rejects.toBeInstanceOf(RecoveryRequired);
  });
});

