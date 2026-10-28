import {describe,it,expect} from 'vitest';
import {createProject,id} from '../src/model';
import {layoutDocument} from '../src/layout';
import {contractorSnapshot,encodeContractor} from '../src/export';
import {decodeProject} from '../src/workbook';
import {renderDocument} from '../src/print';
import {inspectProposal,adoptProposal} from '../src/proposals';
import ExcelJS from 'exceljs';
describe('contractor production and returned proposal',()=>{
  it('paginates summaries longer than one page without duplicate totals',async()=>{
    const p=createProject();const base=p.chapters[1];p.chapters=Array.from({length:25},(_,i)=>({...base,id:id(),title:`פרק ${i}`,active:true,rows:[{...base.rows[1],id:id(),description:'simple',quantity:1,price:10}]}));
    const layout=layoutDocument(p),html=renderDocument(p);expect(layout.summaryPages).toHaveLength(2);
    expect(html.match(/class="summary-total"/g)).toHaveLength(1);expect(html.match(/class="boq-page"/g)).toHaveLength(layout.totalPages);
    const result=await decodeProject(await encodeContractor(p) as never,true);expect(result.project.chapters).toHaveLength(25);
  });
  it('physically excludes disabled and frozen content and keeps the source intact',async()=>{
    const p=createProject({title:'export-test'});p.chapters[0].rows[0].description='DISABLED-SECRET';p.chapters[1].rows[1].frozen=true;p.chapters[1].rows[1].description='FROZEN-SECRET';
    const before=structuredClone(p),snapshot=contractorSnapshot(p),bytes=await encodeContractor(p),book=new ExcelJS.Workbook();await book.xlsx.load(bytes as never);
    expect(book.getWorksheet('_BOQ_META')!.getCell('C1').value).toBe('contractor');
    expect(book.worksheets.some(s=>s.name===p.chapters[0].title)).toBe(false);
    const text=JSON.stringify(book.model);expect(text).not.toContain('DISABLED-SECRET');expect(text).not.toContain('FROZEN-SECRET');
    const html=renderDocument(snapshot);expect(html).not.toContain('SECRET');expect(html).toContain('summary-total');
    expect(html).toContain('data-page="2"');expect(p).toEqual(before);
    await expect(decodeProject(bytes as never)).rejects.toThrow('הצעה מוחזרת');
    expect((await decodeProject(bytes as never,true)).project.chapters).toEqual(snapshot.chapters);
  });
  it('escapes descriptions and keeps placeholder styling out of print and Excel',async()=>{
    const p=createProject();p.chapters[1].rows[1].description='<script>alert(1)</script>';
    const html=renderDocument(p);expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');
    p.chapters[1].rows[1].description='תיאור {גוון}';
    expect(renderDocument(p,true)).toContain('<mark class="variable-token">{גוון}</mark>');
    expect(renderDocument(p)).not.toContain('<mark');
    const b=new ExcelJS.Workbook();await b.xlsx.load(await encodeContractor(p) as never);
    const cell=b.getWorksheet(p.chapters[1].title)!.getCell('B4');
    expect(cell.value).toBe('תיאור {גוון}');expect(cell.fill).toEqual({type:'pattern',pattern:'none'});
  });
  it('reports altered scope and formulas before adopting a separate priced copy',async()=>{
    const p=createProject(),book=new ExcelJS.Workbook();await book.xlsx.load(await encodeContractor(p) as never);
    const c=book.getWorksheet(p.chapters[1].title)!;c.getCell('B4').value='changed scope';c.getCell('D4').value=4;c.getCell('E4').value=10;c.getCell('F4').value={formula:'1+1',result:2};
    const result=await inspectProposal(await book.xlsx.writeBuffer() as never,p);
    expect(result.differences.some(d=>d.includes('description'))).toBe(true);expect(result.warnings.some(w=>w.includes('נוסחת'))).toBe(true);
    const proposal=adoptProposal(result.project,'קבלן א');expect(proposal.revisionId).not.toBe(p.revisionId);expect(proposal.contractor).toBe('קבלן א');expect(p.contractor).toBe('');
  });
});
