import type {BoqRow, Project, Chapter} from './model';

export const PAGE_HEIGHT=720;
export const COLUMN_WIDTHS=[7.29,66.29,8.14,8.14,8.14,8.14];
export interface ChapterPage {rows:{row:BoqRow;height:number}[];used:number}
export interface ChapterLayout {chapter:Chapter;pages:ChapterPage[];start:number}
// Point-based measurement shared by workbook pagination and browser preview.
// A conservative content width leaves room for Excel/Sheets font metrics.
export function textHeight(text:string,width=320,size=12,padding=12):number {
  let measure=(s:string)=>s.length*size*.55;
  if(typeof document!=='undefined') {
    const ctx=document.createElement('canvas').getContext('2d');
    if(ctx){ctx.font=`${size*4/3}px Assistant`;measure=s=>ctx.measureText(s).width*3/4;}
  }
  let lines=0;
  for(const paragraph of text.split('\n')) {
    let line='';lines++;
    for(const word of paragraph.split(/\s+/)) {
      const candidate=line?`${line} ${word}`:word;
      if(measure(candidate)<=width){line=candidate;continue;}
      if(line)lines++;
      line=word;
      while(measure(line)>width){let count=Math.max(1,Math.floor(line.length*width/measure(line)));line=line.slice(count);lines++;}
    }
  }
  return Math.max(padding?30:0,lines*size*1.45+padding);
}
export function layoutDocument(project:Project) {
  const active=project.chapters.filter(c=>c.active);
  // Keep notes on the second page; overflow creates explicit continuation pages.
  const notes=project.instructions.split('\n').map(text=>({text,height:text.trim()?textHeight(text,520,12,0):0}));
  const introPages:{entries:typeof active;notes:typeof notes}[]=[{entries:[],notes:[]}];
  let used=64;
  for(const chapter of active){if(used+30>PAGE_HEIGHT-40){introPages.push({entries:[],notes:[]});used=64;}introPages.at(-1)!.entries.push(chapter);used+=30;}
  used+=48+32;
  for(const note of notes){if(note.height>400)throw new Error('פסקת הנחיות ארוכה מדי לשורת Excel. יש להפריד לפסקאות.');if(used+note.height>PAGE_HEIGHT-30){introPages.push({entries:[],notes:[]});used=68;}introPages.at(-1)!.notes.push(note);used+=note.height;}
  let start=2+introPages.length;
  const chapters:ChapterLayout[]=project.chapters.map(chapter=>{
    const rows=chapter.rows.filter(row=>!row.frozen).map(row=>({row,height:Math.max(textHeight(row.description),row.kind==='item'?textHeight(row.unit,35):0)}));
    const pages:ChapterPage[]=[{rows:[],used:0}];
    for(let i=0;i<rows.length;i++){
      const entry=rows[i];
      if(entry.height>400)throw new Error(`בפרק „${chapter.title}” יש סעיף ארוך מגובה שורת Excel הנתמך. התוכן לא ייחתך; יש לקצר את התיאור לפני הפקה.`);
      const next=entry.row.kind==='note'?rows[i+1]:undefined;
      const needed=entry.height+(next?.height??0);
      let page=pages.at(-1)!;
      if(page.rows.length && page.used+needed>PAGE_HEIGHT-100){pages.push({rows:[],used:0});page=pages.at(-1)!;}
      if(page.used+entry.height>PAGE_HEIGHT-100){pages.push({rows:[],used:0});page=pages.at(-1)!;}
      page.rows.push(entry);page.used+=entry.height;
    }
    const result={chapter,pages,start:chapter.active?start:0};if(chapter.active)start+=pages.length;return result;
  });
  return {introPages,chapters,totalPages:start,summaryPage:start};
}
