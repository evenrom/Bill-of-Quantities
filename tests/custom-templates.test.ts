import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {createProject,deriveDocument,today} from '../src/model';
import {encodeProject,decodeProject,RecoveryRequired} from '../src/workbook';

describe('custom template and duplication boundaries',()=>{
  function source(){const p=createProject({title:'original',client:'private',location:'private',revision:'5'});p.contractor='private';const r=p.chapters[0].rows[1];r.quantity=3;r.price=11;r.frozen=true;return p;}
  it('cleans project details and values while retaining content and draft states independently',()=>{
    const p=source(),before=structuredClone(p);const t=deriveDocument(p,'template',{title:'תבנית משרד'});
    expect(t.kind).toBe('template');expect(t.client+t.location+t.date+t.revision+t.contractor).toBe('');
    expect(t.chapters.flatMap(c=>c.rows).every(r=>r.quantity===null&&r.price===null)).toBe(true);
    expect(t.chapters[0].rows[1].frozen).toBe(true);expect(t.chapters[0].active).toBe(p.chapters[0].active);
    expect(t.id).not.toBe(p.id);expect(t.chapters[0].rows[1].id).not.toBe(p.chapters[0].rows[1].id);
    t.chapters[0].rows[1].description='changed';expect(p).toEqual(before);
  });
  it('duplicates project quantities including zero, but clears every price and asks for fresh details',()=>{
    const p=source();p.chapters[1].rows[1].quantity=0;p.chapters[1].rows[1].price='כלול';
    const copy=deriveDocument(p,'project',{title:'new'});
    expect(copy.chapters[0].rows[1].quantity).toBe(3);expect(copy.chapters[1].rows[1].quantity).toBe(0);
    expect(copy.chapters.flatMap(c=>c.rows).every(r=>r.price===null)).toBe(true);
    expect(copy.client+copy.location+copy.revision+copy.contractor).toBe('');expect(copy.date).toBe(today());
  });
  it('round-trips a portable template and creates independent projects without quantities',async()=>{
    const t=deriveDocument(source(),'template',{title:'תבנית עצמאית'});
    const b=new ExcelJS.Workbook();await b.xlsx.load(await encodeProject(t) as never);
    expect(b.getWorksheet('_BOQ_META')!.getCell('C1').value).toBe('template');
    const sheet=b.getWorksheet(t.chapters[1].title)!;
    expect(sheet.getCell('D4').value).toBeNull();expect(sheet.getCell('E4').value).toBeNull();expect(sheet.getCell('F4').value).toBeNull();
    expect(sheet.getCell(sheet.rowCount,6).value).toBeNull();
    const result=await decodeProject(await b.xlsx.writeBuffer() as never);
    expect(result.project).toEqual(t);expect(result.warnings).toEqual([]);
    const p=deriveDocument(result.project,'project',{title:'new'});
    expect(p.templateId).toBe(t.id);expect(p.chapters[0].rows[1].quantity).toBeNull();
    expect(deriveDocument(t,'template',{title:'copy'}).id).not.toBe(t.id);
  });
  it('refuses values injected into template files instead of silently dropping them',async()=>{
    const t=deriveDocument(source(),'template',{title:'test'});
    const b=new ExcelJS.Workbook();await b.xlsx.load(await encodeProject(t) as never);
    b.getWorksheet(t.chapters[1].title)!.getCell('D4').value=5;
    await expect(decodeProject(await b.xlsx.writeBuffer() as never)).rejects.toBeInstanceOf(RecoveryRequired);
    t.chapters[0].rows[1].price=1;await expect(encodeProject(t)).rejects.toThrow();
  });
  it('continues opening schema v3 projects including frozen rows',async()=>{
    const p=source(),b=new ExcelJS.Workbook();await b.xlsx.load(await encodeProject(p) as never);
    b.getWorksheet('_BOQ_META')!.getCell('B1').value=3;
    expect((await decodeProject(await b.xlsx.writeBuffer() as never)).project).toEqual(p);
  });
});
