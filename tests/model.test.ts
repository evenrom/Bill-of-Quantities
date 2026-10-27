import { describe,it,expect } from 'vitest';
import { createProject,rowTotal,numbering,chapterTotal,today,OFFICE_DETAILS } from '../src/model';
describe('project model',()=>{
  it('instantiates the full approved restaurant template with independent identities',()=>{
    const p=createProject(),q=createProject();
    expect(p.chapters).toHaveLength(22);
    expect(p.chapters.filter(c=>c.active)).toHaveLength(9);
    expect(p.chapters.flatMap(c=>c.rows).filter(r=>r.kind==='item')).toHaveLength(79);
    expect(p.chapters.flatMap(c=>c.rows).filter(r=>r.kind==='note')).toHaveLength(23);
    expect(p.chapters[0].id).not.toBe(q.chapters[0].id);
    expect(p.chapters.flatMap(c=>c.rows).every(r=>r.quantity===null&&r.price===null)).toBe(true);
    expect(p.client+p.location+p.revision).toBe('');
    expect(p.date).toBe(today());expect(p.vat).toBe(18);expect(p.office).toBe(OFFICE_DETAILS);
  });
  it('renumbers active chapters without mutating identities or content',()=>{
    const p=createProject();const before=structuredClone(p.chapters[1]);
    expect(numbering(p).rows.get(before.rows[1].id)).toBe('1.01');
    p.chapters[0].active=true;
    expect(numbering(p).rows.get(before.rows[1].id)).toBe('2.01');
    expect(p.chapters[1]).toEqual(before);
  });
  it.each([
    [null,0,null],[0,null,null],[0,15,0],[2,'כלול',0],[2,'לא רלוונטי',0],
    ['XX',2,null],[1,'bad',null],[.5,.01,.01],[1.005,1,1.01],[1,-1,null],['2',2,null],
  ])('quantity %s and price %s produce %s',(quantity,price,expected)=>{
    const row=createProject().chapters[0].rows[1];
    expect(rowTotal({...row,quantity,price})).toBe(expected);
  });
  it('marks incomplete chapter totals as partial and sums rounded rows',()=>{
    const c=createProject().chapters[0];c.rows=c.rows.slice(1,4);
    c.rows[0].quantity=.5;c.rows[0].price=.01;c.rows[1].quantity=.5;c.rows[1].price=.01;
    expect(chapterTotal(c)).toEqual({value:.02,partial:true});
  });
});
