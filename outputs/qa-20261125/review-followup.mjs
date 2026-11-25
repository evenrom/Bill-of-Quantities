import fs from 'node:fs';
const path='src/data/restaurant.json';
const template=JSON.parse(fs.readFileSync(path,'utf8'));
const source=JSON.parse(fs.readFileSync('outputs/qa-20261125/source-descriptions.json','utf8')).corn;
const before=structuredClone(template);
const chapter=id=>template.chapters.find(c=>c.sourceId===`restaurant.${id}`);
const note=(chapterId,id,description,unit='')=>({sourceId:`restaurant.${chapterId}.${id}`,kind:'note',description,unit});
const plumbing=chapter('plumbing');
const order=['nPlumb','plumbMain','plumbHeater','plumbHotCold','plumbCold','plumbDrain','plumbAC','plumbCistern','plumbChannel'];
plumbing.rows=order.map(id=>plumbing.rows.find(r=>r.sourceId.endsWith('.'+id)));
const electrical=chapter('electrical');
electrical.rows.splice(2,0,note('electrical','elecLightPreparation',source['חשמל ותקשורת'].B5,"נק'"));
for(const [id,cell]of [['elecExtra','B6'],['elecInstall','B7']]){
 const row=electrical.rows.find(r=>r.sourceId.endsWith('.'+id));
 row.kind='note';row.description=source['חשמל ותקשורת'][cell];
}
const general=source['נגרות ומסגרות'].B3.split('1. נגרות:')[0].trim();
chapter('joinery').rows[0].description=general;
chapter('joinery').rows.splice(1,0,note('joinery','nJoinSpecification',
 'א. כל העבודה תעשה מלוחות עץ לבוד מצופים פורניר {סוג פורניר} וסרגלי עץ מסיבי פרופיל {פרופיל}.\nב. צביעה בבייץ גוון {גוון} וצבע {צבע} RAL {מספר}.\nג. גמר: לכה וצבע {גמר} {אחוז ברק}% ברק.\nד. פורמייקה: גוון {גוון פורמייקה}.'));
chapter('metalwork').rows.splice(1,0,note('metalwork','nMetalSpecification',
 'א. צביעה בצבע יסוד, צבע גמר {צבע} RAL {מספר}.\nב. משטחים: פח מגולוון {עובי} מ"מ.\nג. פרופיל: ברזל מגולוון {חתך פרופיל} מ"מ.'));
let spec=fs.readFileSync('docs/BOQ_TEMPLATE_SPEC.md','utf8');
for(const id of ['plumbing','electrical','joinery','metalwork']){
 const c=chapter(id),start=spec.indexOf('מזהה פרק: '+c.sourceId),end=spec.indexOf('\n### ',start);
 let chunk=spec.slice(start,end);
 const lines=chunk.split(/\r?\n/),tableLines=lines.filter(l=>l.startsWith('|'));
 const prefix=tableLines[2].split('|')[1].trim().split('.')[0]||tableLines[3].split('|')[1].trim().split('.')[0];
 let number=0;
 const table=[...tableLines.slice(0,2),...c.rows.map(r=>`| ${r.kind==='item'?`${prefix}.${String(++number).padStart(2,'0')}`:''} | ${r.description.replaceAll('\n','<br>')} | ${r.unit} | ${r.kind==='item'?'XX':''} |  |  |`)];
 const first=lines.findIndex(l=>l.startsWith('|'));lines.splice(first,tableLines.length,...table);
 chunk=lines.join('\n');
 const oldRefs=[...chunk.matchAll(/^- שורת תוכן \d+: ([\w.]+); (?:הערה|סעיף); (.*)$/gm)];
 const refs=new Map(oldRefs.map(m=>[m[1],m[2]]));
 const newRefs=c.rows.map((r,i)=>`- שורת תוכן ${i+1}: ${r.sourceId}; ${r.kind==='note'?'הערה':'סעיף'}; ${refs.get(r.sourceId)||'מיסטר קורן; משוב משתמש 25.11.2026; מפרט עם משתני פרויקט.'}`).join('\n');
 chunk=chunk.replace(/^- שורת תוכן \d+:.*(?:\r?\n- שורת תוכן \d+:.*)*/m,newRefs);
 spec=spec.slice(0,start)+chunk+spec.slice(end);
}
fs.writeFileSync('docs/BOQ_TEMPLATE_SPEC.md',spec);
fs.writeFileSync(path,JSON.stringify(template,null,2)+'\n');
// Keep the earlier comparison as historical evidence; this report covers this revision.
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let html='<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>עסק מסחרי — תיקוני המשך</title><style>body{font:18px Arial;max-width:1100px;margin:30px auto}td,th{border:1px solid #bbb;padding:12px;text-align:right;white-space:pre-wrap}table{border-collapse:collapse;width:100%}code{font-size:12px}h2{margin-top:40px}</style><h1>עסק מסחרי — תיקוני המשך</h1><p>סדר האינסטלציה והערות החשמל, הנגרות והמסגרות לאחר משוב המשתמש. סעיפים שאינם במיסטר קורן נשמרו. סכומי אפס ב־Excel מוסתרים בעיצוב התאים; הנוסחאות נשמרות.</p>';
for(const c of template.chapters.filter(c=>['plumbing','electrical','joinery','metalwork'].some(id=>c.sourceId.endsWith('.'+id)))){
 html+=`<h2>${c.title}</h2><table><tr><th>סוג / יחידה</th><th>נוסח מעודכן לפי הסדר</th></tr>`;
 for(const r of c.rows)html+=`<tr><td>${r.kind==='note'?'הערה':'סעיף'} ${esc(r.unit)}<br><code>${r.sourceId}</code></td><td>${esc(r.description)}</td></tr>`;
 html+='</table>';
}
fs.writeFileSync('outputs/qa-20261125/commercial-followup.html',html+'</html>');
