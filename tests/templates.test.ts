import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {templates,templateCounts} from '../src/templates';
import {createProject} from '../src/model';
import {encodeProject,decodeProject} from '../src/workbook';
import {layoutDocument} from '../src/layout';

const spec=readFileSync('docs/BOQ_TEMPLATE_SPEC.md','utf8');
describe('six approved templates',()=>{
  it('contains the complete catalog',()=>{
    expect(templates.map(t=>t.name)).toEqual(['מסעדה','דוכן','דירה','בית פרטי','ביפרש','אושי־אושי']);
    expect(templates.map(templateCounts)).toEqual([
      {chapters:22,items:79,notes:23},{chapters:20,items:60,notes:20},
      {chapters:16,items:51,notes:16},{chapters:18,items:60,notes:18},
      {chapters:21,items:76,notes:21},{chapters:22,items:90,notes:23}
    ]);
    expect(()=>createProject({},'unknown')).toThrow();
  });
  for(const [index,t] of templates.entries()){
    it(`${t.name}: matches every specification row and creates independent projects`,()=>{
      const section=spec.split(`## ${index+4} תבנית ${t.name}`)[1].split(/^## /m)[0];
      const sections=section.split(/^### /m).filter(s=>s.includes('מזהה פרק:'));
      expect(t.instructions).toBe(section.split('### שער והנחיות כלליות')[1].split(/^### /m)[0].split(/\r?\n/).filter(l=>/^\d+\. /.test(l)).join('\n'));
      sections.forEach((s,i)=>{
        const chapter=t.chapters[i];expect(chapter.title).toBe(s.split(/\r?\n/)[0]);
        expect(chapter.active).toBe(/מצב: פעיל\./.test(s));
        const rows=s.split(/\r?\n/).filter(l=>l.startsWith('|')).slice(2);
        expect(chapter.rows.map(r=>[r.kind,r.description,r.unit])).toEqual(rows.map(l=>{
          const c=l.split('|').slice(1,-1).map(v=>v.trim());
          return [c[0]?'item':'note',c[1].replace(/<br\s*\/?\s*>/g,'\n'),c[2]];
        }));
      });
      const p=createProject({},t.id),q=createProject({},t.id);
      const ids=(p:ReturnType<typeof createProject>)=>[p.id,p.revisionId,...p.chapters.flatMap(c=>[c.id,...c.rows.map(r=>r.id)])];
      expect(new Set([...ids(p),...ids(q)]).size).toBe(ids(p).length*2);
      expect(p.chapters.flatMap(c=>c.rows).every(r=>r.quantity===null&&r.price===null)).toBe(true);
      p.chapters[0].rows[0].description='edited';expect(q.chapters[0].rows[0].description).toBe(t.chapters[0].rows[0].description);
    });
    it(`${t.name}: saves and reopens edits and chapter states, including all chapters enabled`,async()=>{
      const p=createProject({title:`בדיקת ${t.name}`},t.id);
      p.chapters[0].active=!p.chapters[0].active;p.chapters[0].rows[0].description+='\nעריכת בדיקה';
      const row=p.chapters.flatMap(c=>c.rows).find(r=>r.kind==='item')!;row.quantity=0;row.price=10.5;
      const result=await decodeProject(await encodeProject(p) as never);
      expect(result.project).toEqual(p);expect(result.warnings).toEqual([]);
      p.chapters.forEach(c=>c.active=true);
      const layout=layoutDocument(p);expect(layout.chapters.every(c=>c.start>=3)).toBe(true);
      expect((await decodeProject(await encodeProject(p) as never)).project).toEqual(p);
    });
  }
});
