import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/assistant/400.css';
import '@fontsource/assistant/600.css';
import '@fontsource/assistant/700.css';
import './style.css';
import { createProject, numbering, rowTotal, chapterTotal, money, parseInput, isNumber, insertRow, convertRow, deleteRow, today, DEFAULT_VAT, OFFICE_DETAILS, type Project, type BoqRow, type Value } from './model';
import { openFile, saveFile, isCancelled, type FileBinding } from './files';
import { RecoveryRequired } from './workbook';

function TextCell({value,onChange,label}:{value:string;onChange:(v:string)=>void;label:string}) {
  const ref=useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(()=>{const el=ref.current;if(el){el.style.height='0px';el.style.height=`${el.scrollHeight}px`;}},[value]);
  return <textarea ref={ref} rows={1} aria-label={label} value={value} onChange={e=>onChange(e.target.value)}/>;
}
function NumberCell({value,onChange,label,price=false}:{value:Value;onChange:(v:Value)=>void;label:string;price?:boolean}) {
  const [draft,setDraft]=useState(String(value??''));
  const [invalid,setInvalid]=useState(false);
  const focused=useRef(false);
  useEffect(()=>{if(!focused.current)setDraft(String(value??''));},[value]);
  const valid=value===null || isNumber(value) || (price && (value==='כלול'||value==='לא רלוונטי'));
  return <input aria-label={label} className={invalid||!valid?'invalid':''} aria-invalid={invalid||!valid}
    title={price?'מספר לא שלילי, כלול או לא רלוונטי':'מספר לא שלילי; אפשר להשאיר ריק בטיוטה'}
    list={price?'prices':undefined} inputMode={price?'text':'decimal'} value={draft}
    onFocus={()=>{focused.current=true;}}
    onChange={e=>{
      const text=e.target.value; const next=parseInput(text);
      const ok=next===null || isNumber(next) || (price && (next==='כלול'||next==='לא רלוונטי'));
      if(ok){setDraft(text);onChange(next);setInvalid(false);}else{setInvalid(true);}
    }}
    onBlur={()=>{focused.current=false;setDraft(String(value??''));setInvalid(false);}}/>;
}
function App() {
  const [project,setProject]=useState<Project|null>(null);
  const current=useRef<Project|null>(null);
  const [saved,setSaved]=useState<Project|null>(null);
  const [binding,setBinding]=useState<FileBinding|null>(null);
  const [filename,setFilename]=useState('טרם נבחר קובץ');
  const [busy,setBusy]=useState(false);const busyRef=useRef(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [warnings,setWarnings]=useState<string[]>([]);
  const [recovery,setRecovery]=useState('');
  const [create,setCreate]=useState(false);const [cover,setCover]=useState(false);
  const [pending,setPending]=useState<'new'|'open'|null>(null);
  const [expanded,setExpanded]=useState<Set<string>>(new Set());
  const [past,setPast]=useState<Project[]>([]);const [future,setFuture]=useState<Project[]>([]);
  const [insertion,setInsertion]=useState<{chapter:string;index:number}|null>(null);
  const dirty=!!project && project!==saved;
  function update(next:Project,record=true) {if(record&&current.current){const previous=current.current;setPast(p=>[...p.slice(-199),previous]);setFuture([]);}current.current=next;setProject(next);setError('');setNotice('');}
  function undo(){const previous=past.at(-1),existing=current.current;if(previous&&existing){setFuture(f=>[...f,existing]);setPast(p=>p.slice(0,-1));update(previous,false);}}
  function redo(){const next=future.at(-1),existing=current.current;if(next&&existing){setPast(p=>[...p,existing]);setFuture(f=>f.slice(0,-1));update(next,false);}}
  function add(chapterId:string,index:number,kind:BoqRow['kind']) {
    if(!current.current)return;const next=insertRow(current.current,chapterId,index,kind);update(next);setInsertion(null);
    const row=next.chapters.find(c=>c.id===chapterId)!.rows[index];requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>(`[data-row-id="${row.id}"] textarea`)?.focus());
  }
  function convert(chapterId:string,row:BoqRow) {
    if(!current.current)return;
    if(row.kind==='item'&&(row.quantity!==null||row.price!==null)&&!window.confirm('המרה להערה תנקה את היחידה, הכמות והמחיר ותוציא את הסעיף מהסיכום. אפשר לשחזר באמצעות ביטול פעולה. להמשיך?'))return;
    update(convertRow(current.current,chapterId,row.id,row.kind==='item'?'note':'item'));
  }
  useEffect(()=>{
    const handler=(e:BeforeUnloadEvent)=>{if(dirty || busy){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);
  },[dirty,busy]);
  function patch(fields:Partial<Project>) {if(current.current)update({...current.current,...fields});}
  function rowEdit(chapterId:string,rowId:string,fields:Partial<BoqRow>) {
    if(current.current)patch({chapters:current.current.chapters.map(c=>c.id===chapterId?{...c,rows:c.rows.map(r=>r.id===rowId?{...r,...fields}:r)}:c)});
  }
  function toggle(chapterId:string) {if(current.current)patch({chapters:current.current.chapters.map(c=>c.id===chapterId?{...c,active:!c.active}:c)});}
  function install(p:Project, name='טרם נבחר קובץ', file:FileBinding|null=null, clean=false) {
    const original=p;p={...p,office:OFFICE_DETAILS};update(p,false);setPast([]);setFuture([]);setInsertion(null);setSaved(clean&&original.office===OFFICE_DETAILS?p:null);setFilename(name);setBinding(file);setExpanded(new Set());setWarnings([]);setCover(false);
  }
  async function save(as=false):Promise<boolean> {
    if(!current.current || busyRef.current)return false;
    const snapshot=current.current;busyRef.current=true;setBusy(true);setSaving(true);setError('');setNotice('');
    try {
      const result=await saveFile(snapshot,binding,as);
      setBinding(result.binding);setFilename(result.name);setSaved(snapshot);
      return current.current===snapshot;
    } catch(e) {
      if(isCancelled(e))setNotice('השמירה בוטלה; השינויים נשארו בעורך.');
      else setError(`השמירה נכשלה: ${e instanceof Error?e.message:'שגיאה לא ידועה'}`);
      return false;
    } finally{busyRef.current=false;setBusy(false);setSaving(false);}
  }
  async function perform(action:'new'|'open') {
    if(action==='new'){setCreate(true);return;}
    if(busyRef.current)return;
    busyRef.current=true;setBusy(true);setError('');setNotice('');
    try{const result=await openFile();install(result.project,result.name,result.binding,true);setWarnings(result.warnings);}
    catch(e){if(e instanceof RecoveryRequired)setRecovery(e.message);else if(!isCancelled(e))setError(e instanceof Error?e.message:'הפתיחה נכשלה');}
    finally{busyRef.current=false;setBusy(false);}
  }
  function request(action:'new'|'open'){if(dirty)setPending(action);else void perform(action);}
  const numbers=project?numbering(project):null;
  const status=saving?'שומר':busy?'פותח קובץ…':error.startsWith('השמירה נכשלה')?'השמירה נכשלה':dirty?'שינויים שלא נשמרו':'נשמר';
  return <>
    <header className="topbar"><div className="brand">כתבי כמויות <small>סביבת עבודה למשרד</small></div>
      <div className="document-name"><strong>{project?.title||'פרויקט חדש'}</strong>{project&&<small>{filename} · מהדורה {project.revision||'לא הוגדרה'}</small>}</div>
      {project&&<span role="status" className={`status ${dirty?'dirty':''}`}>{status}</span>}
    </header>
    <nav className="toolbar" aria-label="פעולות מסמך">
      <button disabled={busy} onClick={()=>request('new')}>פרויקט חדש</button><button disabled={busy} onClick={()=>request('open')}>פתיחת Excel</button>
      {project&&<><span className="divider"/><button className="primary" disabled={busy} onClick={()=>void save()}>שמירה</button><button disabled={busy} onClick={()=>void save(true)}>שמירה בשם</button><button onClick={()=>setCover(true)}>שער ופרטי פרויקט</button><button disabled={!past.length} onClick={undo}>ביטול פעולה</button><button disabled={!future.length} onClick={redo}>ביצוע מחדש</button></>}
    </nav>
    {error&&<div role="alert" className="message error">{error}</div>}{notice&&<div role="status" className="message">{notice}</div>}
    {warnings.length>0&&<details className="message warning" open><summary>הקובץ נפתח עם {warnings.length} אזהרות לבדיקה</summary><ul>{warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
    {!project?<main className="welcome"><span className="eyebrow">כתבי כמויות · גרסת פיתוח</span><h1>מתחילים בפרויקט.</h1><p>בחרו תבנית, ערכו את כתב הכמויות ושמרו קובץ עבודה במיקום שתבחרו.</p><div className="start-actions"><button className="primary" onClick={()=>request('new')}>פרויקט חדש</button><button onClick={()=>request('open')}>פתיחת Excel</button></div><section className="template-card"><h2>תבניות</h2><h3>מסעדה</h3><p>22 פרקים · 79 סעיפים · 23 הערות</p><button onClick={()=>setCreate(true)}>יצירה מתבנית מסעדה</button><small>חמש התבניות הנוספות ועריכת תבניות יתווספו בשלב התבניות.</small></section><p className="muted">השמירה ידנית בלבד. בשלב זה זמינים עריכה, שמירה ופתיחה של קובץ עבודה. הפקה לקבלן ותצוגת A4 עדיין בפיתוח.</p></main>:
      <div className="workspace"><aside aria-label="רשימת פרקים"><h2>פרקי הפרויקט <small>{project.chapters.filter(c=>c.active).length} פעילים</small></h2>{project.chapters.map(c=><div className={`chapter-link ${!c.active?'inactive':''}`} key={c.id}><input aria-label={`הפעלת ${c.title}`} type="checkbox" checked={c.active} onChange={()=>toggle(c.id)}/><button onClick={()=>document.getElementById(c.id)?.scrollIntoView({block:'start',behavior:'smooth'})}>{numbers!.chapters.get(c.id)?`${numbers!.chapters.get(c.id)}. `:''}{c.title}</button></div>)}<p className="sidebar-note">פרקים כבויים נשמרים בקובץ העבודה.</p></aside>
      <main className="editor"><div className="editor-heading"><h1>כתב כמויות</h1><span>עריכה רציפה · שמירה ידנית</span></div><datalist id="units">{['מ"ר','מ.א.',"יח'","נק'","קומפ'"].map(u=><option key={u} value={u}/>)}</datalist><datalist id="prices"><option value="כלול"/><option value="לא רלוונטי"/></datalist>
      {project.chapters.map(chapter=>{const visible=chapter.active||expanded.has(chapter.id);const total=chapterTotal(chapter);return <section id={chapter.id} key={chapter.id} className={`chapter ${chapter.active?'':'draft'}`}>
        <div className="chapter-heading"><h2>{chapter.active?`פרק ${numbers!.chapters.get(chapter.id)} — `:''}{chapter.title}</h2>{!chapter.active&&<><span>כבוי</span><button onClick={()=>setExpanded(prev=>{const next=new Set(prev);next.has(chapter.id)?next.delete(chapter.id):next.add(chapter.id);return next;})}>{visible?'כיווץ טיוטה':'פתח לעריכת טיוטה'}</button></>}</div>
        {visible&&<table><colgroup><col style={{width:'7%'}}/><col style={{width:'53%'}}/>{[1,2,3,4].map(i=><col key={i} style={{width:'10%'}}/>)}</colgroup><thead><tr>{['סעיף','תיאור עבודה','יח׳','כמות','מחיר יחידה','סה״כ'].map(t=><th key={t} scope="col">{t}</th>)}</tr></thead><tbody>
          {chapter.rows.map((r,i)=>{const label=`${chapter.title}, שורה ${i+1}`;return <React.Fragment key={r.id}><tr className="insert-row"><td colSpan={6}><div className="insert-line"><button aria-label={`הוספה לפני ${label}`} onClick={()=>setInsertion({chapter:chapter.id,index:i})}>+</button>{insertion?.chapter===chapter.id&&insertion.index===i&&<div className="insert-menu"><button onClick={()=>add(chapter.id,i,'item')}>סעיף חדש</button><button onClick={()=>add(chapter.id,i,'note')}>הערה חדשה</button><button onClick={()=>setInsertion(null)}>ביטול</button></div>}</div></td></tr><tr data-row-id={r.id} className={[r.kind==='note'?'note':'',r.frozen?'frozen':''].join(' ').trim()}>
            <td className="number">{r.frozen?'מוקפא':numbers!.rows.get(r.id)??(r.kind==='note'?'הערה':'—')}<button className="row-type" aria-label={`שינוי סוג ${label}`} title={r.kind==='item'?'המרה להערה':'המרה לסעיף'} onClick={()=>convert(chapter.id,r)}>{r.kind==='item'?'להערה':'לסעיף'}</button><button className="row-type" aria-label={`הקפאה ${label}`} onClick={()=>rowEdit(chapter.id,r.id,{frozen:r.frozen?undefined:true})}>{r.frozen?'הפעלה':'הקפאה'}</button><button className="row-type" aria-label={`מחיקה ${label}`} onClick={()=>{if(current.current){update(deleteRow(current.current,chapter.id,r.id));setNotice('השורה נמחקה. ניתן לשחזר באמצעות ביטול פעולה.');}}}>מחיקה</button></td>
            <td><TextCell label={`תיאור ${label}`} value={r.description} onChange={description=>rowEdit(chapter.id,r.id,{description})}/></td>
            <td>{r.kind==='item'&&<input aria-label={`יחידה ${label}`} list="units" value={r.unit} onChange={e=>rowEdit(chapter.id,r.id,{unit:e.target.value})}/>}</td>
            <td>{r.kind==='item'&&<NumberCell label={`כמות ${label}`} value={r.quantity} onChange={quantity=>rowEdit(chapter.id,r.id,{quantity})}/>}</td>
            <td>{r.kind==='item'&&<NumberCell price label={`מחיר ${label}`} value={r.price} onChange={price=>rowEdit(chapter.id,r.id,{price})}/>}</td>
            <td className="number">{rowTotal(r)===null?'':money(rowTotal(r)!)}</td></tr></React.Fragment>;})}
            <tr className="add-end"><td colSpan={6}><button onClick={()=>add(chapter.id,chapter.rows.length,'item')}>+ סעיף חדש</button><button onClick={()=>add(chapter.id,chapter.rows.length,'note')}>+ הערה חדשה</button></td></tr>
          </tbody>{chapter.active&&<tfoot><tr><td colSpan={5}>סה״כ פרק {numbers!.chapters.get(chapter.id)} {total.partial?'(חלקי)':''}</td><td className="number">{money(total.value)}</td></tr></tfoot>}</table>}
      </section>;})}<p className="muted">גרסת פיתוח: תצוגת A4 והפקה לקבלן יתווספו בשלב הבא.</p></main></div>}
    {create&&<div className="overlay"><section role="dialog" aria-modal="true" aria-labelledby="new-title" className="dialog"><h2 id="new-title">פרויקט חדש מתבנית מסעדה</h2><form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);install(createProject({title:String(data.get('title')),client:String(data.get('client')),location:String(data.get('location')),date:String(data.get('date')),revision:String(data.get('revision')),vat:parseInput(String(data.get('vat')))}));setCreate(false);}}><div className="fields">{[['title','שם פרויקט'],['client','לקוח'],['location','מיקום / כתובת'],['date','תאריך'],['revision','מהדורה'],['vat','שיעור מע״מ (%)']].map(([name,label])=><label key={name}>{label}<input name={name} defaultValue={name==='date'?today():name==='vat'?DEFAULT_VAT:undefined} autoFocus={name==='title'} type={name==='date'?'date':name==='vat'?'number':'text'} min={name==='vat'?0:undefined} step={name==='vat'?'any':undefined}/></label>)}</div><p className="muted">אפשר להשאיר פרטים ריקים ולהשלים בהמשך. אין שמירה אוטומטית.</p><div className="dialog-actions"><button className="primary" type="submit">יצירת פרויקט</button><button type="button" onClick={()=>setCreate(false)}>ביטול</button></div></form></section></div>}
    {cover&&project&&<div className="overlay"><section role="dialog" aria-modal="true" aria-labelledby="cover-title" className="dialog"><h2 id="cover-title">שער ופרטי פרויקט</h2><div className="fields">{(['title','client','location','date','revision'] as const).map((field,i)=><label key={field}>{['שם פרויקט','לקוח','מיקום / כתובת','תאריך','מהדורה','פרטי משרד (לוגו קבוע בתיקיית branding)','פרטי קבלן'][i]}<input type={field==='date'?'date':'text'} value={project[field]} onChange={e=>patch({[field]:e.target.value})}/></label>)}<label>שיעור מע״מ (%)<NumberCell label="שיעור מע״מ" value={project.vat} onChange={vat=>patch({vat})}/></label></div><p className="muted">{OFFICE_DETAILS}</p><label>הנחיות כלליות<TextCell label="הנחיות כלליות" value={project.instructions} onChange={instructions=>patch({instructions})}/></label><button className="primary" onClick={()=>setCover(false)}>חזרה לעריכה</button></section></div>}
    {pending&&<div className="overlay"><section role="dialog" aria-modal="true" aria-labelledby="dirty-title" className="dialog compact"><h2 id="dirty-title">יש שינויים שלא נשמרו</h2><p>לשמור את המסמך לפני המעבר?</p><div className="dialog-actions"><button disabled={busy} className="primary" onClick={async()=>{if(await save()){const action=pending;setPending(null);void perform(action);}}}>שמירה והמשך</button><button disabled={busy} onClick={()=>{const action=pending;setPending(null);void perform(action);}}>המשך ללא שמירה</button><button disabled={busy} onClick={()=>setPending(null)}>ביטול</button></div>{error&&<p role="alert">{error}</p>}{notice&&<p>{notice}</p>}</section></div>}
    {recovery&&<div className="overlay"><section role="dialog" aria-modal="true" aria-labelledby="recovery-title" className="dialog compact"><h2 id="recovery-title">נדרש ייבוא או שחזור מונחה</h2><p>{recovery}</p><p>הקובץ לא הוחלף ולא שונה. מסלול הייבוא המונחה יתווסף בשלב הייבוא; אפשר לפתוח קובץ עבודה תקין אחר.</p><button onClick={()=>setRecovery('')}>חזרה</button></section></div>}
  </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);


