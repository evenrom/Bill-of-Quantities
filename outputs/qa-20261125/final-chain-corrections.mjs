import fs from 'node:fs';
let spec=fs.readFileSync('docs/BOQ_TEMPLATE_SPEC.md','utf8');
for(const id of ['bfresh','oshi_oshi']){
 const path=`src/data/${id}.json`,t=JSON.parse(fs.readFileSync(path,'utf8'));
 const chapter=key=>t.chapters.find(c=>c.sourceId===`${id}.${key}`);
 const rename=(key,title)=>{const c=chapter(key);spec=spec.replace(`### ${c.title}\n\nמזהה פרק: ${c.sourceId}`,`### ${title}\n\nמזהה פרק: ${c.sourceId}`);c.title=title;};
 if(id==='bfresh'){
  rename('doors','דלתות פנים');
  for(const key of ['floorprep','waterproofing'])chapter(key).active=false;
 }else{
  rename('tiling','ריצוף וחיפוי');
  const c=chapter('painting');
  const text={
   paintDecor:'קירות:\nא. הכנת קירות ועמודים בשכבת יסוד מתאימה לתשתית.\nב. מריחת טיח אפקט בטון משופשף של טמבור בשתי שכבות לפחות ועד לכיסוי מלא. גוון: 440.',
   paintCeiling:'קרניזים:\nא. צביעת קרניזים מגבס בשטח האולם ובהיקף הדלפק בשכבת יסוד מתאימה לתשתית.\nב. מריחת שפכטל אמריקאי במספר שכבות נדרש, עד להחלקה בכל השטח.\nג. צביעה בצבע אקרילי מסוג סופרקריל, בשתי שכבות לפחות ועד לכיסוי מלא. גוון: תואם לקרניז הקיים באתר.',
   paintWarehouse:'קירות מחסן:\nא. הכנת קירות ועמודים בשכבת יסוד מתאימה לתשתית.\nב. צביעה בצבע אקרילי מסוג סופרקריל, בשתי שכבות לפחות ועד לכיסוי מלא. גוון: לבן.',
   paintWall:'נישה או קטע קיר, לפי התכנון:\nא. הכנת התשתית ושכבת יסוד מתאימה.\nב. צביעה בסופרקריל בשתי שכבות לפחות ועד לכיסוי מלא. גוון: אפור טמבור 1537T.',
  };
  const start=spec.indexOf('מזהה פרק: '+c.sourceId+'.'),end=spec.indexOf('\n### ',start);
  let chunk=spec.slice(start,end);const lines=chunk.split('\n'),tables=lines.filter(l=>l.startsWith('|'));
  const refs=new Map([...chunk.matchAll(/^- שורת תוכן \d+: ([\w.]+); (?:הערה|סעיף); (.*)$/gm)].map(m=>[m[1],m[2]]));
  c.rows=['nPaint','paintDecor','paintCeiling','paintWarehouse','paintWall'].map(key=>{const r=c.rows.find(r=>r.sourceId.endsWith('.'+key));if(text[key])r.description=text[key];return r;});
  let number=0;const prefix=t.chapters.indexOf(c)+1;
  const table=[...tables.slice(0,2),...c.rows.map(r=>`| ${r.kind==='item'?`${prefix}.${String(++number).padStart(2,'0')}`:''} | ${r.description.replaceAll('\n','<br>')} | ${r.unit} | ${r.kind==='item'?'XX':''} |  |  |`)];
  lines.splice(lines.findIndex(l=>l.startsWith('|')),tables.length,...table);chunk=lines.join('\n');
  chunk=chunk.replace(/^- שורת תוכן \d+:.*(?:\n- שורת תוכן \d+:.*)*/m,c.rows.map((r,i)=>`- שורת תוכן ${i+1}: ${r.sourceId}; ${r.kind==='note'?'הערה':'סעיף'}; ${refs.get(r.sourceId)}`).join('\n'));
  spec=spec.slice(0,start)+chunk+spec.slice(end);
 }
 fs.writeFileSync(path,JSON.stringify(t,null,2)+'\n');
}
fs.writeFileSync('docs/BOQ_TEMPLATE_SPEC.md',spec);
