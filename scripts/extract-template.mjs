// Content comes exclusively from the approved Markdown specification.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const spec = readFileSync('docs/BOQ_TEMPLATE_SPEC.md', 'utf8');
const section = spec.split('## 4 תבנית מסעדה')[1].split('## 5 תבנית דוכן')[0];
const instructions = section.split('### שער והנחיות כלליות')[1].split('### פירוק והריסה')[0]
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
assert.equal(chapters.length,22);
assert.equal(chapters.filter(c => c.active).length,9);
const counts = {chapters:chapters.length, items:chapters.flatMap(c=>c.rows).filter(r=>r.kind==='item').length, notes:chapters.flatMap(c=>c.rows).filter(r=>r.kind==='note').length};
assert.equal(counts.items,79); assert.equal(counts.notes,23);
mkdirSync('src/data',{recursive:true});
writeFileSync('src/data/restaurant.json', JSON.stringify({id:'restaurant',name:'מסעדה',instructions,chapters},null,2)+'\n');
console.log(counts);
