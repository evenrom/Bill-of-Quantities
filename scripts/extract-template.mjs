// Content comes exclusively from the approved Markdown specification.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const spec = readFileSync('docs/BOQ_TEMPLATE_SPEC.md', 'utf8');
const definitions=[['restaurant','מסעדה',22,9,79,23],['kiosk','דוכן',20,6,60,20],['apartment','דירה',16,10,51,16],['private_house','בית פרטי',18,9,60,18],['bfresh','ביפרש',21,7,80,21],['oshi_oshi','אושי־אושי',22,9,90,23]];
// Optional IDs limit writes, so a chain-only revision cannot rewrite other templates.
const selected=process.argv.slice(2);
for(const id of selected)assert.ok(definitions.some(d=>d[0]===id),`Unknown template: ${id}`);
const templates=definitions.map(([id,name,chapterCount,activeCount,itemCount,noteCount],index)=>{
const section = spec.split(`## ${index+4} תבנית ${name}`)[1].split(/^## /m)[0];
const instructions = section.split('### שער והנחיות כלליות')[1].split(/^### /m)[0]
  .split(/\r?\n/).filter(l => /^\d+\. /.test(l)).join('\n');
const chapters = section.split(/^### /m).slice(1).filter(s => s.includes('מזהה פרק:')).map(s => {
  const title = s.split(/\r?\n/)[0];
  const [, sourceId, state] = s.match(/מזהה פרק: ([\w.]+)\. מצב: ([^\r\n]+)/);
  const table = s.split(/\r?\n/).filter(l => l.startsWith('|')).slice(2).map(l => l.split('|').slice(1,-1).map(v => v.trim()));
  const refs = [...s.matchAll(/- שורת תוכן (\d+): ([\w.]+); (הערה|סעיף);/g)];
  assert.equal(table.length, refs.length, sourceId);
  const rows = table.map((cells,i) => {
    assert.equal(cells.length, 6);
    const kind = refs[i][3] === 'הערה' ? 'note' : 'item';
    assert.equal(Boolean(cells[0]), kind === 'item');
    assert.equal(cells[3], kind === 'item' ? 'XX' : '');
    assert.equal(cells[4] + cells[5], '');
    return {sourceId:refs[i][2], kind, description:cells[1].replace(/<br\s*\/?\s*>/g,'\n'), unit:cells[2]};
  });
  return {sourceId, title, active:state === 'פעיל.', rows};
});
assert.equal(chapters.length,chapterCount);
assert.equal(chapters.filter(c => c.active).length,activeCount);
const counts = {chapters:chapters.length, items:chapters.flatMap(c=>c.rows).filter(r=>r.kind==='item').length, notes:chapters.flatMap(c=>c.rows).filter(r=>r.kind==='note').length};
assert.equal(counts.items,itemCount); assert.equal(counts.notes,noteCount);
assert.ok(instructions.length,name);
console.log(name,counts);
return {id,name:id==='restaurant'?'עסק מסחרי':name,instructions,chapters};
});
const sourceIds=templates.flatMap(t=>t.chapters.flatMap(c=>[c.sourceId,...c.rows.map(r=>r.sourceId)]));
assert.equal(sourceIds.length,660);assert.equal(new Set(sourceIds).size,660);
mkdirSync('src/data',{recursive:true});
for(const template of templates.filter(t=>t.id!=='kiosk'&&(!selected.length||selected.includes(t.id))))writeFileSync(`src/data/${template.id}.json`,JSON.stringify(template,null,2)+'\n');
