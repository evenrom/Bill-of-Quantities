import {it,expect} from 'vitest';
import {createProject,insertRow,convertRow,numbering} from '../src/model';
import {layoutDocument} from '../src/layout';
it('inserts at the beginning, middle and end without reusing identities',()=>{
  let p=createProject();const c=p.chapters[1];const first=c.rows[1].id;
  p=insertRow(p,c.id,0,'note');p=insertRow(p,c.id,2,'item');p=insertRow(p,c.id,p.chapters[1].rows.length,'item');
  expect(numbering(p).rows.get(first)).toBe('1.02');
  const ids=p.chapters[1].rows.map(r=>r.id);expect(new Set(ids).size).toBe(ids.length);
  expect(p.chapters[1].rows.at(-1)?.quantity).toBeNull();
});
it('clears pricing on conversion while preserving the immutable snapshot for undo',()=>{
  const p=createProject();const c=p.chapters[1],r=c.rows[1];r.quantity=2;r.price=50;
  const next=convertRow(p,c.id,r.id,'note');
  expect(next.chapters[1].rows[1]).toMatchObject({id:r.id,kind:'note',unit:'',quantity:null,price:null});
  expect(p.chapters[1].rows[1]).toMatchObject({quantity:2,price:50});
});
it('moves whole items and preceding notes to continuation pages',()=>{
  const p=createProject();const layout=layoutDocument(p);const joinery=layout.chapters.find(c=>c.chapter.title==='נגרות ייעודית')!;
  expect(joinery.pages.length).toBeGreaterThan(1);
  expect(joinery.pages.flatMap(page=>page.rows).map(x=>x.row.id)).toEqual(joinery.chapter.rows.map(r=>r.id));
  expect(joinery.pages.slice(0,-1).every(page=>page.rows.at(-1)?.row.kind!=='note')).toBe(true);
  for(const c of layout.chapters)for(const page of c.pages)expect(page.used).toBeLessThanOrEqual(620);
});
