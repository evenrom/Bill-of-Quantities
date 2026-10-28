import {useEffect,useState} from 'react';
import {type Project,convertRow} from './model';
import {copyRows,pasteRows,clipboardText,readClipboard,checkProject,type Issue} from './editor';

export function RowTools({project,selected,select,update,jump}:{project:Project;selected:Set<string>;select:(ids:Set<string>)=>void;update:(p:Project)=>void;jump:(issue:Issue)=>void}){
  const [query,setQuery]=useState('');const [anchor,setAnchor]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const [issues,setIssues]=useState<Issue[]|null>(null);const [menu,setMenu]=useState<{x:number;y:number}|null>(null);
  const rows=project.chapters.flatMap(c=>c.rows.map(r=>({c,r})));
  const chosen=rows.filter(({r})=>selected.has(r.id));
  const matches=query.trim()?rows.filter(({r})=>r.description.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())):[];
  useEffect(()=>{
    const listener=(e:MouseEvent)=>{const row=(e.target as HTMLElement).closest<HTMLElement>('tr[data-row-id]');if(!row)return;e.preventDefault();const rowId=row.dataset.rowId!;setAnchor(rowId);if(!selected.has(rowId))select(new Set([rowId]));setMenu({x:Math.min(e.clientX,window.innerWidth-235),y:Math.min(e.clientY,window.innerHeight-280)});};
    const focus=(e:FocusEvent)=>{const row=(e.target as HTMLElement).closest<HTMLElement>('tr[data-row-id]');if(row)setAnchor(row.dataset.rowId!);};document.addEventListener('focusin',focus);document.addEventListener('contextmenu',listener);return()=>{document.removeEventListener('contextmenu',listener);document.removeEventListener('focusin',focus);};
  },[selected,select]);
  const target=rows.find(({r})=>r.id===anchor)??chosen.at(-1);
  const chapter=target?.c;
  function insertion(){return chapter?chapter.rows.findIndex(r=>r.id===target?.r.id)+1:0;}
  async function action(kind:string){
    setMenu(null);setMessage('');
    try{
      if(kind==='copy'){await navigator.clipboard.writeText(clipboardText(copyRows(project,selected)));setMessage('הועתק');return;}
      if(kind==='paste'){if(!chapter)throw new Error('יש לבחור שורה להדבקה');const data=readClipboard(await navigator.clipboard.readText());update(pasteRows(project,chapter.id,insertion(),data));setMessage(`הודבקו ${data.length} שורות ללא מחיר`);return;}
      if(!chosen.length)return;
      if(kind==='duplicate'){let next=project;for(const c of project.chapters){const data=copyRows(project,new Set(c.rows.filter(r=>selected.has(r.id)).map(r=>r.id)));if(data.length){const index=c.rows.map(r=>selected.has(r.id)).lastIndexOf(true)+1;next=pasteRows(next,c.id,index,data);}}update(next);return;}
      if(kind==='note'&&chosen.some(({r})=>r.quantity!==null||r.price!==null)&&!window.confirm('המרה להערה תנקה יחידות, כמויות ומחירים בשורות הנבחרות. אפשר לשחזר בביטול פעולה. להמשיך?'))return;
      let next=project;
      if(kind==='note'||kind==='item'){for(const {c,r} of chosen)next=convertRow(next,c.id,r.id,kind);}
      else next={...project,chapters:project.chapters.map(c=>({...c,rows:kind==='delete'?c.rows.filter(r=>!selected.has(r.id)):c.rows.map(r=>selected.has(r.id)?{...r,frozen:kind==='freeze'?true:undefined}:r)}))};
      update(next);if(kind==='delete')select(new Set());
    }catch(e){setMessage(e instanceof Error?e.message:'הפעולה נכשלה');}
  }
  const actions=<><button disabled={!chosen.length} onClick={()=>void action('copy')}>העתקת שורות</button><button disabled={!target} onClick={()=>void action('paste')}>הדבקת שורות</button><button disabled={!chosen.length} onClick={()=>void action('duplicate')}>שכפול שורות</button><button disabled={!chosen.length} onClick={()=>void action('delete')}>מחיקת נבחרים</button><button disabled={!chosen.length} onClick={()=>void action('freeze')}>הקפאת נבחרים</button><button disabled={!chosen.length} onClick={()=>void action('activate')}>הפעלת נבחרים</button><button disabled={!chosen.length} onClick={()=>void action('note')}>המרה להערות</button><button disabled={!chosen.length} onClick={()=>void action('item')}>המרה לסעיפים</button></>;
  return <section className="row-tools" aria-label="עריכה וחיפוש">
    <div className="tool-line"><label>חיפוש בתיאורים <input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label><button onClick={()=>setIssues(checkProject(project))}>בדיקת חוסרים</button>{chosen.length>0&&<><span>{chosen.length} נבחרו</span><button onClick={()=>select(new Set())}>ביטול בחירה</button></>}</div>
    {message&&<p role="status">{message}</p>}
    {query&&<div className="search-results">{matches.length?matches.slice(0,100).map(({c,r})=><button key={r.id} onClick={()=>jump({chapterId:c.id,rowId:r.id,field:'description',message:''})}>{c.title}: {r.description.slice(0,90)}</button>):'לא נמצאו תוצאות'}{matches.length>100&&<p>מוצגות 100 תוצאות ראשונות — ניתן לצמצם את החיפוש.</p>}</div>}
    {menu&&<div role="menu" className="row-context" style={{left:menu.x,top:menu.y}}>{actions}<button onClick={()=>setMenu(null)}>סגירה</button></div>}
    {issues&&<div className="overlay"><section className="dialog" role="dialog" aria-modal="true" aria-label="בדיקת חוסרים"><h2>בדיקת חוסרים — {issues.length}</h2><p>נבדקים השער והפרקים הפעילים. מחירים ריקים במכרז אינם חוסר.</p>{issues.map((issue,i)=><p key={i}><button onClick={()=>{setIssues(null);jump(issue);}}>מעבר לתיקון</button> {issue.message}</p>)}<button onClick={()=>setIssues(null)}>סגירה</button></section></div>}
  </section>;
}
