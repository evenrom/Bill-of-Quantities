import fs from 'node:fs';
import assert from 'node:assert/strict';
const request=fs.readFileSync('docs/BFRESH_QA_APPROVED_20261028.md','utf8');
const b=JSON.parse(fs.readFileSync('src/data/bfresh.json','utf8')),old=structuredClone(b);
const find=id=>b.chapters.flatMap(c=>c.rows).find(r=>r.sourceId===id);
const additions={
  'bfresh.partitions.partFullHeight':['bfresh.partitions.partLow','מ"ר','QA-001'],
  'bfresh.ceilings.gypsumCeiling':['bfresh.ceilings.nCeil','מ"ר','QA-002'],
  'bfresh.electrical.elecEmergency':['bfresh.electrical.elecSign',"קומפ'",'QA-003'],
  'bfresh.tiling.tileConcreteWall':['bfresh.tiling.tileKitchenWall','מ"ר','QA-007'],
};
const newRows=[...request.matchAll(/- sourceId: (bfresh\.[\w.]+)[\s\S]*?- נוסח מלא:\r?\n([^\r\n]+)/g)];
assert.equal(newRows.length,4);
for(const [,sourceId,description] of newRows){
  assert.ok(!find(sourceId));const [after,unit]=additions[sourceId];
  const c=b.chapters.find(c=>c.rows.some(r=>r.sourceId===after));
  c.rows.splice(c.rows.findIndex(r=>r.sourceId===after)+1,0,{sourceId,kind:'item',description,unit});
}
for(const suffix of ['nJoin','counterInner'])find(`bfresh.joinery.${suffix}`).description=request.split(`ב־bfresh.joinery.${suffix} להחליף את הנוסח המלא ל־:`)[1].trimStart().split(/\r?\n/)[0];
const replace=(id,from,to)=>{const r=find(id);assert.ok(r.description.includes(from),id);r.description=r.description.replace(from,to);};
replace('bfresh.joinery.counterOuter',' אין להחליף בחזית אלון מולבן מן המקורות הישנים.','');
replace('bfresh.tiling.tileWork','{בחירה לפי שימוש ותכנון הסניף; אינם מפורטים במקור דובאי}','{בחירה לפי שימוש ותכנון הסניף}');
replace('bfresh.supplies.nSupply','דגמי גופי התאורה טרם בוססו כסטנדרט עדכני: BF-08.','דגמי גופי התאורה יוגדרו בפרויקט.');
for(const suffix of ['alucobondSmooth','alucobondPerforated']){
  find(`bfresh.metalwork.${suffix}`).unit='מ.א.';
  replace(`bfresh.metalwork.${suffix}`,'{פרט תכנון, אינו מפורט במקור}','{פרט תכנון}');
}
for(const r of b.chapters.flatMap(c=>c.rows))r.description=r.description.replaceAll('Alucobond','אלוקובונד');
b.instructions=b.instructions.replace('; אין למלא מחלוקת מערך של סניף קודם ללא אישור.','.');
assert.equal(b.chapters.flatMap(c=>c.rows).filter(r=>r.kind==='item').length,80);
assert.deepEqual(b.chapters.map(c=>c.active),old.chapters.map(c=>c.active));
let spec=fs.readFileSync('docs/BOQ_TEMPLATE_SPEC.md','utf8');
const begin=spec.indexOf('## 8 תבנית ביפרש'),end=spec.indexOf('## 9 תבנית אושי־אושי');
let section=spec.slice(begin,end).replace(/\r\n/g,'\n');
section=section.replace('**הכרעת משתמש מאושרת, 28.10.2026:**','**הכרעת משתמש קודמת, 28.10.2026 (לפני סבב QA):**');
section=section.replace('מזהה תבנית: bfresh.','מזהה תבנית: bfresh.\n\n**תיקוני QA מאושרים — הכרעה עדכנית:** [הוראות המשתמש](BFRESH_QA_APPROVED_20261028.md) גוברות על ההחלטות הקודמות במקומות שפורטו בהן. הפורמייקה היא בירמן 1100; נוספו ארבעה סעיפים ויחידת האלוקובונד היא מ.א. הספירה העדכנית: 80 סעיפים ו־21 הערות ב־21 פרקים, מהם 7 פעילים. העדכון חל על פרויקטים חדשים בלבד.');
section=section.replace(old.instructions,b.instructions);
const parts=section.split(/(?=^### )/m);
for(let i=0;i<parts.length;i++){
  const c=b.chapters.find(c=>parts[i].includes(`מזהה פרק: ${c.sourceId}.`));
  if(!c||JSON.stringify(c)===JSON.stringify(old.chapters.find(o=>o.sourceId===c.sourceId)))continue;
  const previous=parts[i];
  const refs=new Map([...previous.matchAll(/^- שורת תוכן \d+: ([\w.]+); (הערה|סעיף);([^\n]*)/gm)].map(m=>[m[1],m[3]]));
  const prefix=previous.match(/^\| (\d+)\.\d+ \|/m)?.[1];let item=0;
  const table=['| סעיף | תיאור עבודה | יח׳ | כמות | מחיר יחידה | סה״כ |','| --- | --- | --- | --- | --- | --- |',...c.rows.map(r=>{
    const label=r.kind==='item'?(prefix?`${prefix}.${String(++item).padStart(2,'0')}`:'בהפעלה'):'';
    return `| ${label} | ${r.description.replaceAll('\n','<br>')} | ${r.unit} | ${r.kind==='item'?'XX':''} |  |  |`;
  })].join('\n');
  parts[i]=previous.replace(/\| סעיף \| תיאור עבודה[^\n]*\n(?:\|[^\n]*\n)+/,table+'\n');
  const mapping=c.rows.map((r,j)=>`- שורת תוכן ${j+1}: ${r.sourceId}; ${r.kind==='item'?'סעיף':'הערה'};${refs.get(r.sourceId)??` הכרעת משתמש ${additions[r.sourceId][2]}, 28.10.2026; ללא כמויות או מחירי פרויקט.`}`).join('\n');
  parts[i]=parts[i].replace(/(?:^- שורת תוכן[^\n]*\n)+/m,mapping+'\n');
  assert.notEqual(parts[i],previous,c.sourceId);
}
section=parts.join('').split('\n').map(line=>{
  if(!/^\| \d+ \|/.test(line))return line;
  const cells=line.split('|').slice(1,-1).map(s=>s.trim());
  const c=b.chapters.find(c=>c.title===cells[1]);
  if(c&&cells.length===5){cells[3]=String(c.rows.filter(r=>r.kind==='item').length);return '| '+cells.join(' | ')+' |';}
  return line;
}).join('\n');
fs.writeFileSync('docs/BOQ_TEMPLATE_SPEC.md',spec.slice(0,begin)+section+spec.slice(end));
const review=fs.readFileSync('docs/CHAIN_TEMPLATE_REVIEW.md','utf8').replace(/^(# [^\r\n]+)\r?\n/,'$1\n\n**תיקוני QA מאוחרים יותר באותו יום:** [הכרעות ביפרש](BFRESH_QA_APPROVED_20261028.md) גוברות על ההחלטות הקודמות בדוח במקומות שאושרו: בירמן 1100 במקום D2178, ארבעה סעיפים חדשים, אלוקובונד במ.א. וניקוי תוכן הקבלן מהערות ביקורת. ביפרש כוללת כעת 80 סעיפים, 21 הערות ו־21 פרקים; אושי־אושי לא שונתה. יתר הדוח מתעד את סבב ההשוואה הקודם.\n');
fs.writeFileSync('docs/CHAIN_TEMPLATE_REVIEW.md',review);
const generator=fs.readFileSync('scripts/extract-template.mjs','utf8').replace("['bfresh','ביפרש',21,7,76,21]","['bfresh','ביפרש',21,7,80,21]").replaceAll('sourceIds.length,656','sourceIds.length,660').replaceAll('new Set(sourceIds).size,656','new Set(sourceIds).size,660');
fs.writeFileSync('scripts/extract-template.mjs',generator);
console.log('Applied approved Bfresh-only specification changes.');
