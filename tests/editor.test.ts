import {describe,it,expect} from 'vitest';
import {createProject,deriveDocument} from '../src/model';
import {copyRows,pasteRows,clipboardText,readClipboard,checkProject} from '../src/editor';
describe('row tools and validation',()=>{
  it('copies a mixed group without prices or identities and cleans quantities in template targets',()=>{
    const p=createProject(),c=p.chapters[1];c.rows[1].quantity=2;c.rows[1].price=20;
    const selected=new Set(c.rows.slice(0,2).map(r=>r.id)),data=readClipboard(clipboardText(copyRows(p,selected)));
    expect(JSON.stringify(data)).not.toContain('price');expect(JSON.stringify(data)).not.toContain(c.rows[1].id);
    const next=pasteRows(p,c.id,1,data);expect(next.chapters[1].rows[2].quantity).toBe(2);expect(next.chapters[1].rows[2].price).toBeNull();
    expect(next.chapters[1].rows[2].id).not.toBe(c.rows[1].id);expect(p.chapters[1].rows).toHaveLength(c.rows.length);
    const t=deriveDocument(p,'template');expect(pasteRows(t,t.chapters[1].id,0,data).chapters[1].rows[1].quantity).toBeNull();
    expect(()=>readClipboard('{"format":"BOQ_ROWS","version":1,"rows":[{}]}')).toThrow();
  });
  it('ignores disabled/frozen content, distinguishes zeros and only checks missing prices in returns',()=>{
    const p=createProject({title:'t',client:'c',location:'l'});p.instructions='';
    p.chapters.forEach(c=>c.active=false);const c=p.chapters[1];c.active=true;c.rows=c.rows.slice(1,2);const r=c.rows[0];r.description='clean';r.quantity=1;
    expect(checkProject(p).some(i=>i.field==='price')).toBe(false);
    expect(checkProject(p,true).some(i=>i.field==='price')).toBe(true);
    r.quantity=0;expect(checkProject(p).some(i=>i.message.includes('אפס'))).toBe(true);
    r.description='דגם {גוון} ??? לבחירה';expect(checkProject(p).some(i=>i.field==='description')).toBe(true);
    r.frozen=true;expect(checkProject(p).some(i=>i.rowId===r.id)).toBe(false);
    expect(checkProject(deriveDocument(p,'template',{title:'t'})).some(i=>['date','client','quantity'].includes(i.field))).toBe(false);
  });
});
