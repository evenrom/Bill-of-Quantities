import {it,expect} from 'vitest';
import apartment from '../src/data/apartment.json';
import house from '../src/data/private_house.json';
import {templates} from '../src/templates';
import {createProject} from '../src/model';
import {encodeProject,decodeProject} from '../src/workbook';

it('keeps Bfresh optional floor work disabled and uses corrected chapter names and Oshi paint order',async()=>{
  const b=templates.find(t=>t.id==='bfresh')!,o=templates.find(t=>t.id==='oshi_oshi')!;
  expect(b.chapters.find(c=>c.sourceId==='bfresh.doors')!.title).toBe('דלתות פנים');
  expect(o.chapters.find(c=>c.sourceId==='oshi_oshi.tiling')!.title).toBe('ריצוף וחיפוי');
  for(const id of ['bfresh.floorprep','bfresh.waterproofing'])expect(b.chapters.find(c=>c.sourceId===id)!.active).toBe(false);
  const p=createProject({},'bfresh');expect((await decodeProject(await encodeProject(p) as never)).project).toEqual(p);
  const rows=o.chapters.find(c=>c.sourceId==='oshi_oshi.painting')!.rows;
  expect(rows.slice(1).map(r=>r.description.split('\n')[0])).toEqual(['קירות:','קרניזים:','קירות מחסן:','נישה או קטע קיר, לפי התכנון:']);
  expect(rows[1].description).toContain('440');expect(rows[2].description).toContain('תואם לקרניז הקיים באתר');
  expect(rows[2].description).not.toContain('שחור');expect(rows[3].description).toContain('לבן');
});

it('merges every unique residential row once and keeps structural work optional',()=>{
  const merged=templates.find(t=>t.id==='residential')!;
  const key=(r:{sourceId:string})=>r.sourceId.split('.').slice(1).join('.');
  const expected=new Set([apartment,house].flatMap(t=>t.chapters.flatMap(c=>c.rows.map(key))));
  const rows=merged.chapters.flatMap(c=>c.rows);
  expect(new Set(rows.map(key))).toEqual(expected);expect(rows.length).toBe(expected.size);
  expect(merged.chapters.filter(c=>/shell|exterior/.test(c.sourceId)).every(c=>!c.active)).toBe(true);
  expect(JSON.stringify(merged)).not.toMatch(/מפריד שומן|מרכך מים|מושב גנות|בן דוד|3\.87/);
});

it.each(['apartment','private_house'])('keeps a saved %s project independent of the new residential catalog',async(templateId)=>{
  const base=templateId==='apartment'?apartment:house;
  const p=createProject({title:'פרויקט קיים'});p.templateId=templateId;
  p.chapters=base.chapters.map(c=>({id:crypto.randomUUID(),title:c.title,active:c.active,rows:c.rows.map(r=>({id:crypto.randomUUID(),kind:r.kind as 'item'|'note',description:r.description,unit:r.unit,quantity:null,price:null}))}));
  Object.assign(p.chapters[0].rows[1],{description:'מפרט פרטי לשמירה',quantity:7,price:12.75,frozen:true});
  const saved=await encodeProject(p);const result=await decodeProject(saved as never);
  expect(result.project).toEqual(p);expect(result.project.templateId).toBe(templateId);
});

it('applies the approved common wording and note structure while keeping chain finishes fixed',()=>{
  for(const t of templates){
    const chapter=(id:string)=>t.chapters.find(c=>c.sourceId.endsWith('.'+id))!;
    const electrical=chapter('electrical');
    expect(electrical.rows.slice(2,5).map(r=>r.kind)).toEqual(['note','note','note']);
    expect(electrical.rows.slice(2,5).map(r=>r.description.slice(0,2))).toEqual(['א.','ב.','ג.']);
    for(const id of ['joinery','metalwork'])expect(chapter(id).rows.slice(0,2).map(r=>r.kind)).toEqual(['note','note']);
    expect(t.instructions).toBe(templates[0].instructions);
    expect(JSON.stringify(t)).not.toMatch(/OS-\d|BF-\d|במקורות|טרפנטין/);
  }
  const oshi=templates.find(t=>t.id==='oshi_oshi')!;
  const rows=oshi.chapters.flatMap(c=>c.rows);
  for(const [id,token]of [['tileBackWall','13×13'],['tileKitchenWall','20×20'],['waiter','בייץ שחור']])expect(rows.find(r=>r.sourceId.endsWith('.'+id))!.description).toContain(token);
});
