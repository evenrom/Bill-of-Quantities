import {it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {createProject,chapterTotal,numbering,convertRow,projectUnits} from '../src/model';
import {encodeProject,decodeProject,itemFormula} from '../src/workbook';
import {copyRows,pasteRows,readClipboard,clipboardText,checkProject} from '../src/editor';
import {renderDocument} from '../src/print';
import restaurant from '../src/data/restaurant.json';

function fixture(){
  const p=createProject({title:'בדיקה',date:'2026-11-24'});
  p.chapters=[{...p.chapters[1],title:'נגרות ומסגרות',rows:[
    {...p.chapters[1].rows[0],description:'הערה טכנית'},
    {...p.chapters[1].rows[1],kind:'note',description:'עבודה ללא מספר',unit:'ק״ג',quantity:2.5,price:10.12},
    {...p.chapters[1].rows[2],description:'עבודה ממוספרת',quantity:2,price:5},
  ]}];return p;
}
it('includes quantified notes exactly once without numbering them or requiring prices for plain notes',()=>{
  const p=fixture(),c=p.chapters[0];
  expect(chapterTotal(c)).toEqual({value:35.3,partial:false});
  expect(numbering(p).rows.get(c.rows[1].id)).toBeUndefined();
  expect(numbering(p).rows.get(c.rows[2].id)).toBe('1.01');
  expect(checkProject(p,true).filter(i=>i.rowId===c.rows[0].id)).toEqual([]);
  const next=convertRow(p,c.id,c.rows[2].id,'note');expect(chapterTotal(next.chapters[0]).value).toBe(35.3);
  c.rows[1].frozen=true;expect(chapterTotal(c).value).toBe(10);
});
it('preserves note units and quantities through clipboard and includes custom units from disabled chapters',()=>{
  const p=fixture(),c=p.chapters[0];c.active=false;
  expect(projectUnits(p)).toContain('ק״ג');
  const rows=readClipboard(clipboardText(copyRows(p,new Set([c.rows[1].id]))));
  expect(pasteRows(p,c.id,0,rows).chapters[0].rows[0]).toMatchObject({kind:'note',quantity:2.5,unit:'ק״ג',price:null});
});
it('round-trips quantified notes, renamed headings and date; supports contractor entry in an initially plain note',async()=>{
  const p=fixture(),b=new ExcelJS.Workbook();await b.xlsx.load(await encodeProject(p) as never);
  expect(b.getWorksheet('שער')!.getCell('B8').value).toBe('24/11/2026');
  expect(b.getWorksheet('שער')!.getCell('B8').alignment.readingOrder).toBe('ltr');
  const s=b.getWorksheet('נגרות ומסגרות')!;
  expect(s.getCell('A4').value).toBeNull();expect(s.getCell('F4').formula).toBe(itemFormula(4));
  expect(s.getCell(s.rowCount,2).value).toBe('סיכום פרק 1 להעברה');
  const decoded=await decodeProject(await b.xlsx.writeBuffer() as never);
  expect(decoded.project).toEqual(p);expect(decoded.warnings).toEqual([]);
  s.getCell('C3').value='יח׳';s.getCell('D3').value=3;s.getCell('E3').value=4;
  expect(chapterTotal((await decodeProject(await b.xlsx.writeBuffer() as never)).project.chapters[0]).value).toBe(47.3);
});
it('hides zero money in PDF and Excel without removing zero values or formulas',async()=>{
  const p=fixture();p.chapters[0].rows[1].quantity=0;p.chapters[0].rows[2].price=0;
  const html=renderDocument(p);expect(html).not.toContain('>0₪<');expect(html).toContain('dir="ltr">24/11/2026');
  expect(html).toContain('>0</td>');
  const b=new ExcelJS.Workbook();await b.xlsx.load(await encodeProject(p) as never);
  expect(b.getWorksheet(p.chapters[0].title)!.getCell('E5').value).toBe(0);
  expect(b.getWorksheet(p.chapters[0].title)!.getCell('F5').formula).toBeTruthy();
  const s=b.getWorksheet(p.chapters[0].title)!;
  for(const address of ['E5','F5',`F${s.rowCount}`])expect(s.getCell(address).numFmt).toBe('#,##0"₪";-#,##0"₪";;@');
  expect((await decodeProject(await b.xlsx.writeBuffer() as never)).project).toEqual(p);
});

it('keeps source order and unnumbered lighting subrows with separate joinery and metal specifications',()=>{
  const p=createProject({},'restaurant');
  const plumbing=restaurant.chapters.find(c=>c.title==='אינסטלציה')!;
  expect(plumbing.rows.map(r=>r.sourceId?.split('.').at(-1))).toEqual(['nPlumb','plumbMain','plumbHeater','plumbHotCold','plumbCold','plumbDrain','plumbAC','plumbCistern','plumbChannel']);
  const electrical=p.chapters.find(c=>c.title==='חשמל ותקשורת')!;
  expect(electrical.rows.slice(2,5).map(r=>r.kind)).toEqual(['note','note','note']);
  expect(electrical.rows.slice(2,5).map(r=>r.description.slice(0,2))).toEqual(['א.','ב.','ג.']);
  expect(electrical.rows[2].description).toContain('דימר');
  const numbers=numbering(p);
  expect(numbers.rows.get(electrical.rows[1].id)).toBe('3.01');
  expect(numbers.rows.get(electrical.rows[5].id)).toBe('3.02');
  for(const title of ['נגרות ייעודית','מסגרות']){
    const c=p.chapters.find(c=>c.title===title)!;
    expect(c.rows.slice(0,2).map(r=>r.kind)).toEqual(['note','note']);
    expect(c.rows[1].description).toMatch(/^א\./);
    expect(c.rows[1].description).toContain('{צבע} RAL {מספר}');
  }
});
