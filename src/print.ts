import {chapterTotal,isNumber,money,numbering,rowTotal,type Project} from './model';
import {layoutDocument,textHeight,PAGE_HEIGHT} from './layout';
import Decimal from 'decimal.js';
import {splitMarkers} from './markers';

export const escapeHtml=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const printStyles=`
.boq-pages{direction:rtl;font-family:Assistant,Arial,sans-serif;color:#111;font-size:12pt;line-height:1.45}
.boq-page{box-sizing:border-box;position:relative;background:white;width:210mm;height:297mm;padding:19.05mm 6.35mm;margin:12px auto;box-shadow:0 2px 10px #0003;overflow:hidden;break-after:page;page-break-after:always}
.boq-page:last-child{break-after:auto;page-break-after:auto}.boq-page h1,.boq-page h2,.boq-page p{margin:0}.boq-content{height:720pt;position:relative}.boq-page footer{position:absolute;bottom:5mm;left:0;right:0;text-align:center;font-size:11pt}.boq-page table{width:100%;table-layout:fixed;border-collapse:collapse}.boq-page td,.boq-page th{vertical-align:top;border-left:1px solid #505b55;border-right:1px solid #505b55;padding:3pt 2pt;text-align:center;overflow-wrap:anywhere;white-space:pre-wrap}.boq-page th{font-weight:700;border-top:1px solid #505b55;border-bottom:1px solid #505b55;height:32pt;box-sizing:border-box}.boq-page td.desc{text-align:right}.boq-page .print-title{height:32pt;font-size:14pt;font-weight:700;text-align:right}.boq-page .print-chapter{display:flex;flex-direction:column;height:720pt}.boq-page .print-chapter table{border-bottom:1px solid #505b55}.boq-page .chapter-transfer{margin-top:auto;border-top:1px solid #505b55;border-bottom:1px solid #505b55;display:flex;justify-content:space-between;padding:5pt;font-weight:700;min-height:32pt;box-sizing:border-box}.boq-page .print-note{color:#47574d}.boq-page .print-cover{text-align:center}.boq-page .print-cover h1{font-size:36pt;line-height:1.4;overflow-wrap:anywhere;white-space:pre-wrap}.boq-page .print-cover h2{font-size:18pt}.boq-page .print-logo{max-width:360px;max-height:100px;object-fit:contain;margin:18pt auto;display:block}.boq-page .print-office{margin-top:26pt}.boq-page .print-toc td{height:30pt;border-bottom:1px solid #ccd5cf;box-sizing:border-box}.boq-page .print-instructions{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45}.boq-page .summary-table td{height:24pt;border-bottom:1px solid #d7ddd9;box-sizing:border-box}.boq-page .summary-total{margin-top:24pt;background:#f3f6f4;border-top:1px solid #505b55;font-weight:700}.boq-page .summary-total div{display:flex;justify-content:space-between;min-height:32pt;box-sizing:border-box;padding:4pt 8pt;border-bottom:1px solid #505b55}.boq-page .summary-total div:last-child{background:#e3ece6}.boq-page button.print-row{all:unset;cursor:pointer;display:block;width:100%}
.boq-page .chapter-transfer{border-left:1px solid #505b55;border-right:1px solid #505b55}.boq-page .summary-table th{height:30pt}
@page{size:A4 portrait;margin:0}@media print{html,body{margin:0!important;background:white!important}.boq-page{margin:0;box-shadow:none}.print-actions{display:none!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;
export function renderDocument(p:Project,highlight=false):string{
  const layout=layoutDocument(p),numbers=numbering(p);let pageNo=0;
  const page=(body:string,cover=false)=>{pageNo++;return `<article class="boq-page" data-page="${pageNo}"><div class="boq-content">${body}</div>${cover?'':`<footer>עמוד ${pageNo}</footer>`}</article>`;};
  const h=(value:unknown)=>highlight?splitMarkers(String(value??'')).map(p=>p.marked?`<mark class="variable-token">${escapeHtml(p.text)}</mark>`:escapeHtml(p.text)).join(''):escapeHtml(value);
  const numeric=(value:unknown)=>{
    const text=String(value??'');let width=text.length*6;
    if(typeof document!=='undefined'){const ctx=document.createElement('canvas').getContext('2d');if(ctx){ctx.font='16px Assistant';width=ctx.measureText(text).width*.75;}}
    const size=Math.min(12,12*42/Math.max(1,width));
    if(size<6)throw new Error('מספר ארוך מדי לעמודת A4. יש לבדוק את הערך לפני הפקה.');
    return `<td dir="ltr" style="white-space:nowrap;font-size:${size}pt">${h(text)}</td>`;
  };
  if(46+36+65+Math.max(70,textHeight(p.title,480,36))+Math.max(38,textHeight(p.location,480,20))+32+35+28+70+90+Math.max(38,textHeight(p.office,480))>PAGE_HEIGHT)throw new Error('תוכן השער חורג מעמוד A4. יש לקצר את פרטי השער.');
  let html=page(`<div class="print-cover"><div style="height:46pt"></div><h2 style="height:36pt">פירוט טכני וכתב כמויות</h2><div style="height:65pt"></div><h1 style="min-height:${Math.max(70,textHeight(p.title,480,36))}pt">${h(p.title)}</h1><p style="font-size:20pt;min-height:${Math.max(38,textHeight(p.location,480,20))}pt">${h(p.location)}</p><p style="min-height:32pt;font-size:14pt">${h(p.client)}</p><p style="margin-top:35pt">תאריך: ${h(p.date)}</p><div style="height:70pt"></div>${p.logo?`<img class="print-logo" alt="לוגו המשרד" src="${h(p.logo.data)}">`:''}<p class="print-office">${h(p.office)}</p></div>`,true);
  layout.introPages.forEach((intro,index)=>{
    let body=`<h2 style="font-size:14pt;height:36pt">${index?'מקרא והנחיות — המשך':'מקרא ותוכן עניינים'}</h2>`;
    if(intro.entries.length)body+=`<table class="print-toc"><colgroup><col style="width:10%"><col style="width:80%"><col style="width:10%"></colgroup><thead><tr><th style="height:28pt">פרק</th><th style="height:28pt">שם הפרק</th><th style="height:28pt">עמוד</th></tr></thead><tbody>${intro.entries.map(c=>`<tr><td>${numbers.chapters.get(c.id)}</td><td class="desc">${h(c.title)}</td><td>${layout.chapters.find(x=>x.chapter.id===c.id)!.start}</td></tr>`).join('')}</tbody></table>`;
    if(intro.notes.length)body+=`${intro.entries.length?'<div style="height:48pt"></div>':''}<h2 style="font-size:14pt;height:32pt">הנחיות והערות כלליות לקבלן</h2>${intro.notes.map(n=>`<p class="print-instructions" style="height:${n.height}pt;${!n.height?'display:none':''}">${h(n.text)}</p>`).join('')}`;
    html+=page(body);
  });
  layout.chapters.filter(c=>c.chapter.active).forEach(({chapter,pages})=>pages.forEach((part,index)=>{
    const total=chapterTotal(chapter);
    let body=`<div class="print-chapter"><h2 class="print-title">פרק ${numbers.chapters.get(chapter.id)} ${h(chapter.title)}${index?' (המשך)':''}</h2><table><colgroup><col style="width:7%"><col style="width:59%">${Array(4).fill('<col style="width:8.5%">').join('')}</colgroup><thead><tr>${['סעיף','תיאור עבודה','יח׳','כמות','מחיר יחידה','סה״כ'].map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>`;
    body+=part.rows.map(({row:r,height})=>`<tr style="height:${height}pt" class="${r.kind==='note'?'print-note':''}"><td>${h(numbers.rows.get(r.id))}</td><td class="desc"><button class="print-row" data-jump="${h(r.id)}" data-chapter="${h(chapter.id)}">${h(r.description)}</button></td><td>${h(r.unit)}</td>${numeric(r.quantity)}${numeric(isNumber(r.price)?money(r.price):r.price)}${numeric(rowTotal(r)===null?'':money(rowTotal(r)!))}</tr>`).join('');
    const spacer=PAGE_HEIGHT-64-part.used-(index===pages.length-1?32:0);
    if(spacer>0)body+=`<tr aria-hidden="true" style="height:${spacer}pt">${Array(6).fill('<td style="padding:0"></td>').join('')}</tr>`;
    body+='</tbody></table>';
    if(index===pages.length-1)body+=`<div class="chapter-transfer"><span>${total.partial?'סיכום חלקי':'סה״כ'} פרק ${numbers.chapters.get(chapter.id)} להעברה</span><span dir="ltr">${money(total.value)}</span></div>`;
    html+=page(body+'</div>');
  }));
  const active=p.chapters.filter(c=>c.active);const base=active.reduce((v,c)=>v.plus(chapterTotal(c).value),new Decimal(0));const vat=isNumber(p.vat)?base.times(p.vat).div(100).toDecimalPlaces(2,Decimal.ROUND_HALF_UP):null;
  layout.summaryPages.forEach((entries,index)=>{
  html+=page(`<h2 style="height:40pt;font-size:20pt">ריכוז עלויות${index?' (המשך)':''}</h2><table class="summary-table"><colgroup><col style="width:7%"><col style="width:75%"><col style="width:18%"></colgroup><thead><tr><th>פרק</th><th>תיאור</th><th>סה״כ</th></tr></thead><tbody>${entries.map(c=>`<tr><td>${numbers.chapters.get(c.id)}</td><td class="desc">${h(c.title)}</td><td dir="ltr">${money(chapterTotal(c).value)}</td></tr>`).join('')}</tbody></table>${index===layout.summaryPages.length-1?`<p style="height:24pt;font-size:10pt;color:#68756e">${active.some(c=>chapterTotal(c).partial)?'סכומים חלקיים — קיימים סעיפים ללא תמחור מלא':''}</p><div class="summary-total" style="margin-top:0"><div><span>סה״כ</span><span dir="ltr">${money(base.toNumber())}</span></div><div><span>מע״מ (${h(p.vat)}%)</span><span dir="ltr">${vat?money(vat.toNumber()):'לא הוגדר'}</span></div><div><span>סה״כ כולל מע״מ</span><span dir="ltr">${vat?money(base.plus(vat).toNumber()):''}</span></div></div>`:''}`);
  });
  return `<div class="boq-pages">${html}</div>`;
}
export function printWindowHtml(p:Project):string{
  const styles=[...document.head.querySelectorAll('style,link[rel="stylesheet"]')].map(el=>el.outerHTML).join('');
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><base href="${escapeHtml(location.origin)}/"><title>${escapeHtml(p.title)} — כתב כמויות</title>${styles}<style>${printStyles}</style></head><body><div class="print-actions" style="padding:16px"><button onclick="window.print()">הדפסה / שמירה כ־PDF</button><p>בחרו „שמירה כ־PDF”, גודל A4, קנה מידה 100%, ללא כותרות עליונות ותחתונות של הדפדפן.</p></div>${renderDocument(p)}</body></html>`;
}
