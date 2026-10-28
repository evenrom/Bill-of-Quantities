import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/assistant/400.css';
import '@fontsource/assistant/600.css';
import '@fontsource/assistant/700.css';
import './style.css';
import { createProject, deriveDocument, numbering, rowTotal, chapterTotal, money, parseInput, isNumber, insertRow, convertRow, deleteRow, today, DEFAULT_VAT, OFFICE_DETAILS, type Project, type BoqRow, type Value } from './model';
import { openFile, saveFile, isCancelled, type FileBinding } from './files';
import { RecoveryRequired } from './workbook';
import { templates } from './templates';
import {RowTools} from './RowTools';
import {Production} from './Production';
import {ImportWizard} from './ImportWizard';
import {ProposalReview} from './ProposalReview';
import {InstallApp} from './InstallApp';
import {withOfficeLogo} from './branding';
import type {Issue} from './editor';
import {IconButton} from './IconButton';
import {splitMarkers} from './markers';

function TextCell({value,onChange,label}:{value:string;onChange:(v:string)=>void;label:string}) {
  const ref=useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(()=>{const el=ref.current;if(el){el.style.height='0px';el.style.height=`${el.scrollHeight}px`;}},[value]);
  return <div className="highlight-editor"><div className="text-mirror" aria-hidden="true">{splitMarkers(value).map((part,i)=>part.marked?<mark key={i} className="variable-token">{part.text}</mark>:part.text)}{'\n'}</div><textarea ref={ref} rows={1} aria-label={label} value={value} onChange={e=>onChange(e.target.value)}/></div>;
}
function NumberCell({value,onChange,label,price=false}:{value:Value;onChange:(v:Value)=>void;label:string;price?:boolean}) {
  const display=price&&isNumber(value)?money(value):String(value??'');
  const [draft,setDraft]=useState(display);
  const [invalid,setInvalid]=useState(false);
  const focused=useRef(false);
  useEffect(()=>{if(!focused.current)setDraft(display);},[display]);
  const valid=value===null || isNumber(value) || (price && (value==='כלול'||value==='לא רלוונטי'));
  return <input aria-label={label} className={invalid||!valid?'invalid':''} aria-invalid={invalid||!valid}
    title={price?'מספר לא שלילי, כלול או לא רלוונטי':'מספר לא שלילי; אפשר להשאיר ריק בטיוטה'}
    list={price?'prices':undefined} inputMode={price?'text':'decimal'} value={draft}
    onFocus={()=>{focused.current=true;setDraft(String(value??''));}}
    onChange={e=>{
      const text=e.target.value; const next=parseInput(text);
      const ok=next===null || isNumber(next) || (price && (next==='כלול'||next==='לא רלוונטי'));
      if(ok){setDraft(text);onChange(next);setInvalid(false);}else{setInvalid(true);}
    }}
    onBlur={()=>{focused.current=false;setDraft(display);setInvalid(false);}}/>;
}
type Action='new'|'open'|'newTemplate'|'fromTemplate'|'toTemplate'|'duplicate'|'copyTemplate'|'import'|'proposal'|'home'|'openTemplate'|'editTemplate';
function App() {
  const [home,setHome]=useState(true);
  const [manageTemplates,setManageTemplates]=useState(false);
  const [selectedChapter,setSelectedChapter]=useState<string|null>(null);
  const [rowMenu,setRowMenu]=useState<string|null>(null);
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [project,setProject]=useState<Project|null>(null);
  const current=useRef<Project|null>(null);
  const [saved,setSaved]=useState<Project|null>(null);
  const [binding,setBinding]=useState<FileBinding|null>(null);
  const [filename,setFilename]=useState('טרם נבחר קובץ');
  const [busy,setBusy]=useState(false);const busyRef=useRef(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [warnings,setWarnings]=useState<string[]>([]);
  const [importFile,setImportFile]=useState<File|null>(null);
  const [importPicker,setImportPicker]=useState(false);
  const [proposal,setProposal]=useState(false);
  const [recoveryFile,setRecoveryFile]=useState<File|null>(null);
  const [recovery,setRecovery]=useState('');
  const [creationAction,setCreationAction]=useState<Action>('new');
  const [templateId,setTemplateId]=useState('restaurant');
  const [create,setCreate]=useState(false);const [cover,setCover]=useState(false);
  const [pending,setPending]=useState<Action|null>(null);
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
  useEffect(()=>{if(!rowMenu)return;const close=(e:PointerEvent)=>{if(!(e.target as HTMLElement).closest('.row-inline-actions,.row-menu-toggle'))setRowMenu(null);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[rowMenu]);
  function patch(fields:Partial<Project>) {if(current.current)update({...current.current,...fields});}
  function rowEdit(chapterId:string,rowId:string,fields:Partial<BoqRow>) {
    if(current.current)patch({chapters:current.current.chapters.map(c=>c.id===chapterId?{...c,rows:c.rows.map(r=>r.id===rowId?{...r,...fields}:r)}:c)});
  }
  function jump(issue:Issue){
    if(!issue.chapterId){setCover(true);return;}
    setSelectedChapter(issue.chapterId);setExpanded(prev=>new Set([...prev,issue.chapterId!]));
    requestAnimationFrame(()=>{const row=issue.rowId?document.querySelector<HTMLElement>(`[data-row-id="${issue.rowId}"]`):document.getElementById(issue.chapterId!);row?.scrollIntoView({block:'center',behavior:'smooth'});row?.classList.add('jump-highlight');setTimeout(()=>row?.classList.remove('jump-highlight'),2200);const label=issue.field==='quantity'?'כמות':issue.field==='price'?'מחיר':issue.field==='unit'?'יחידה':'תיאור';row?.querySelector<HTMLElement>(`[aria-label^="${label} "]`)?.focus({preventScroll:true});});
  }
  function toggle(chapterId:string) {if(current.current)patch({chapters:current.current.chapters.map(c=>c.id===chapterId?{...c,active:!c.active}:c)});}
  function install(p:Project, name='טרם נבחר קובץ', file:FileBinding|null=null, clean=false) {
    setHome(false);setManageTemplates(false);setSelectedChapter(p.chapters.find(c=>c.active)?.id??null);
    const original=p;p={...p,office:OFFICE_DETAILS};update(p,false);setPast([]);setFuture([]);setSelected(new Set());setRowMenu(null);setInsertion(null);setSaved(clean&&original.office===OFFICE_DETAILS?p:null);setFilename(name);setBinding(file);setExpanded(new Set());setWarnings([]);setCover(false);
  }
  async function save():Promise<boolean> {
    if(!current.current || busyRef.current)return false;
    const snapshot=current.current;busyRef.current=true;setBusy(true);setSaving(true);setError('');setNotice('');
    try {
      const result=await saveFile(snapshot,binding);
      setBinding(result.binding);setFilename(result.name);setSaved(snapshot);
      return current.current===snapshot;
    } catch(e) {
      if(isCancelled(e))setNotice('השמירה בוטלה; השינויים נשארו בעורך.');
      else setError(`השמירה נכשלה: ${e instanceof Error?e.message:'שגיאה לא ידועה'}`);
      return false;
    } finally{busyRef.current=false;setBusy(false);setSaving(false);}
  }
  async function perform(action:Action) {
    if(busyRef.current)return;
    if(action==='home'){setHome(true);setCover(false);setManageTemplates(false);return;}
    if(action==='editTemplate'){install(deriveDocument(createProject({},templateId),'template',{title:templates.find(t=>t.id===templateId)!.name}));return;}
    if(action==='import'){setImportPicker(true);return;}
    if(action==='proposal'){setProposal(true);return;}
    if(action!=='open'&&action!=='openTemplate'){setCreationAction(action);setCreate(true);return;}
    busyRef.current=true;setBusy(true);setError('');setNotice('');
    try{const result=await openFile();if(action==='openTemplate'&&result.project.kind!=='template')throw new Error('יש לבחור קובץ תבנית');install(result.project,result.name,result.binding,true);setWarnings(result.warnings);}
    catch(e){if(e instanceof RecoveryRequired){setRecovery(e.message);setRecoveryFile(e.sourceFile??null);}else if(!isCancelled(e))setError(e instanceof Error?e.message:'הפתיחה נכשלה');}
    finally{busyRef.current=false;setBusy(false);}
  }
  function request(action:Action){if(busyRef.current)return;if(dirty&&!home)setPending(action);else void perform(action);}
  const editing=!!project&&!home;
  const templateMode=project?.kind==='template';
  const makingTemplate=['newTemplate','toTemplate','copyTemplate'].includes(creationAction);
  const usingSource=['fromTemplate','toTemplate','duplicate','copyTemplate'].includes(creationAction);
  const numbers=project?numbering(project):null;
  const status=saving?'שומר':busy?'פותח קובץ…':error.startsWith('השמירה נכשלה')?'השמירה נכשלה':dirty?'שינויים שלא נשמרו':'נשמר';
  return <div className={`app-shell ${editing?'is-editing':'is-home'}`}>
    <div className="app-rail"><div className="rail-brand" aria-hidden="true"><img src="/branding/app-icon.svg?v=2" width="32" height="32" alt=""/></div>{!editing&&<IconButton icon="home" label="בית" onClick={()=>request('home')} className="rail-active"/>}{editing&&<nav className="toolbar" aria-label="פעולות מסמך"><IconButton icon="home" label="תפריט ראשי" disabled={busy} onClick={()=>request('home')}/><span className="divider"/><IconButton icon="save" label="שמירה" disabled={busy} onClick={()=>void save()}/><IconButton icon="details" label={templateMode?'פרטי תבנית':'פרטי הפרויקט'} onClick={()=>setCover(true)}/><span className="divider"/><IconButton icon="undo" label="Undo" disabled={!past.length} onClick={undo}/><IconButton icon="redo" label="Redo" disabled={!future.length} onClick={redo}/>{!templateMode&&<><span className="divider"/><Production key={project.id} project={project} jump={jump}/></>}</nav>}<div className="rail-line"/></div>
    <header className="topbar"><div className="brand">כתבי כמויות</div>{editing&&<><div className="document-name"><strong>{project.title||'ללא שם'}</strong><small>{filename}</small></div>{templateMode&&<strong className="template-badge">מצב תבנית</strong>}<span role="status" className={`status ${dirty?'dirty':''}`}>{status}</span></>}</header>
    {error&&<div role="alert" className="message error">{error}</div>}{notice&&<div role="status" className="message">{notice}</div>}
    {warnings.length>0&&<details className="message warning" open><summary>הקובץ נפתח עם {warnings.length} אזהרות לבדיקה</summary><ul>{warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
    {!editing?<main className="welcome clean-home"><h1>פרויקט חדש</h1><section aria-label="תבניות בסיס" className="template-grid">{templates.map(t=><button className="template-choice" key={t.id} aria-label={`יצירה מתבנית ${t.name}`} onClick={()=>{setTemplateId(t.id);setCreationAction('new');setCreate(true);}}>{t.name}</button>)}</section><div className="home-actions"><button onClick={()=>request('open')}>המשך פרויקט קיים</button><button onClick={()=>request('import')}>ייבוא מ־Excel</button><button onClick={()=>setManageTemplates(true)}>עריכת תבניות</button><button onClick={()=>request('newTemplate')}>תבנית חדשה</button></div>{project&&<details className="home-document"><summary>{project.title||'מסמך פתוח'}</summary><button onClick={()=>setHome(false)}>חזרה לעריכה</button>{templateMode?<><button onClick={()=>request('fromTemplate')}>יצירת פרויקט מתבנית זו</button><button onClick={()=>request('copyTemplate')}>שכפול תבנית</button></>:<><button onClick={()=>request('duplicate')}>שכפול לפרויקט חדש</button><button onClick={()=>request('toTemplate')}>יצירת תבנית מהפרויקט</button></>}</details>}<button className="secondary-link" onClick={()=>request('proposal')}>בדיקת הצעה מוחזרת</button><InstallApp/></main>:
      <div className="workspace"><aside aria-label="רשימת פרקים"><h2>פרקי הפרויקט <small>{project.chapters.filter(c=>c.active).length} פעילים</small></h2>{project.chapters.map(c=><div className={`chapter-link ${!c.active?'inactive':''} ${selectedChapter===c.id?'current':''}`} key={c.id}><input aria-label={`הפעלת ${c.title}`} type="checkbox" checked={c.active} onChange={()=>toggle(c.id)}/><button onClick={()=>{setSelectedChapter(c.id);document.getElementById(c.id)?.scrollIntoView({block:'start',behavior:'smooth'});}}>{numbers!.chapters.get(c.id)?`${numbers!.chapters.get(c.id)}. `:''}{c.title}</button></div>)}</aside>
      <main className="editor"><div className="editor-heading"><h1>{templateMode?'עריכת תבנית':'כתב כמויות'}</h1></div><RowTools key={project.id} project={project} selected={selected} select={setSelected} update={update} jump={jump}/><datalist id="units">{['מ"ר','מ.א.',"יח'","נק'","קומפ'"].map(u=><option key={u} value={u}/>)}</datalist><datalist id="prices"><option value="כלול"/><option value="לא רלוונטי"/></datalist>
      {project.chapters.map(chapter=>{const visible=chapter.active||expanded.has(chapter.id);const total=chapterTotal(chapter);return <section id={chapter.id} key={chapter.id} className={`chapter ${chapter.active?'':'draft'}`}>
        <div className="chapter-heading"><h2>{chapter.active?`פרק ${numbers!.chapters.get(chapter.id)} — `:''}{chapter.title}</h2>{!chapter.active&&<><span>כבוי</span><button onClick={()=>setExpanded(prev=>{const next=new Set(prev);next.has(chapter.id)?next.delete(chapter.id):next.add(chapter.id);return next;})}>{visible?'כיווץ טיוטה':'פתח לעריכת טיוטה'}</button></>}</div>
        {visible&&<table><colgroup><col style={{width:'7%'}}/><col style={{width:'53%'}}/>{[1,2,3,4].map(i=><col key={i} style={{width:'10%'}}/>)}</colgroup><thead><tr>{['סעיף','תיאור עבודה','יח׳','כמות','מחיר יחידה','סה״כ'].map(t=><th key={t} scope="col">{t}</th>)}</tr></thead><tbody>
          {chapter.rows.map((r,i)=>{const label=`${chapter.title}, שורה ${i+1}`;return <React.Fragment key={r.id}><tr className="insert-row"><td colSpan={6}><div className="insert-line"><button aria-label={`הוספה לפני ${label}`} onClick={()=>setInsertion({chapter:chapter.id,index:i})}>+</button>{insertion?.chapter===chapter.id&&insertion.index===i&&<div className="insert-menu"><button onClick={()=>add(chapter.id,i,'item')}>סעיף חדש</button><button onClick={()=>add(chapter.id,i,'note')}>הערה חדשה</button><button onClick={()=>setInsertion(null)}>ביטול</button></div>}</div></td></tr><tr data-row-id={r.id} className={[r.kind==='note'?'note':'',r.frozen?'frozen':''].join(' ').trim()}>
            <td className="number"><input className="row-select" type="checkbox" aria-label={`בחירת ${label}`} checked={selected.has(r.id)} onChange={e=>setSelected(prev=>{const next=new Set(prev);e.target.checked?next.add(r.id):next.delete(r.id);return next;})}/>{r.frozen?'מוקפא':numbers!.rows.get(r.id)??(r.kind==='note'?'הערה':'—')}<button className="row-menu-toggle" aria-label={`פעולות ${label}`} title="פעולות שורה" onClick={()=>setRowMenu(rowMenu===r.id?null:r.id)}>⋯</button><span className="row-inline-actions" hidden={rowMenu!==r.id} onClick={()=>setRowMenu(null)}><button className="row-type" aria-label={`שינוי סוג ${label}`} title={r.kind==='item'?'המרה להערה':'המרה לסעיף'} onClick={()=>convert(chapter.id,r)}>{r.kind==='item'?'להערה':'לסעיף'}</button><button className="row-type" aria-label={`הקפאה ${label}`} onClick={()=>rowEdit(chapter.id,r.id,{frozen:r.frozen?undefined:true})}>{r.frozen?'הפעלה':'הקפאה'}</button><button className="row-type" aria-label={`מחיקה ${label}`} onClick={()=>{if(current.current){update(deleteRow(current.current,chapter.id,r.id));setNotice('השורה נמחקה. ניתן לשחזר באמצעות ביטול פעולה.');}}}>מחיקה</button></span></td>
            <td><TextCell label={`תיאור ${label}`} value={r.description} onChange={description=>rowEdit(chapter.id,r.id,{description})}/></td>
            <td>{r.kind==='item'&&<input aria-label={`יחידה ${label}`} list="units" value={r.unit} onChange={e=>rowEdit(chapter.id,r.id,{unit:e.target.value})}/>}</td>
            <td>{r.kind==='item'&&(templateMode?<span className="template-quantity" title="סימון תצוגה בלבד; כמויות מוזנות בפרויקט">XX</span>:<NumberCell label={`כמות ${label}`} value={r.quantity} onChange={quantity=>rowEdit(chapter.id,r.id,{quantity})}/>)}</td>
            <td>{r.kind==='item'&&!templateMode&&<NumberCell price label={`מחיר ${label}`} value={r.price} onChange={price=>rowEdit(chapter.id,r.id,{price})}/>}</td>
            <td className="number">{templateMode||rowTotal(r)===null?'':money(rowTotal(r)!)}</td></tr></React.Fragment>;})}
            <tr className="add-end"><td colSpan={6}><button onClick={()=>add(chapter.id,chapter.rows.length,'item')}>+ סעיף חדש</button><button onClick={()=>add(chapter.id,chapter.rows.length,'note')}>+ הערה חדשה</button></td></tr>
          </tbody>{chapter.active&&!templateMode&&<tfoot><tr><td colSpan={5}>סה״כ פרק {numbers!.chapters.get(chapter.id)} {total.partial?'(חלקי)':''}</td><td className="number">{money(total.value)}</td></tr></tfoot>}</table>}
      </section>;})}</main></div>}
    {manageTemplates&&<div className="overlay"><section role="dialog" aria-modal="true" aria-label="עריכת תבניות" className="dialog"><h2>עריכת תבניות</h2><div className="template-grid">{templates.map(t=><button key={t.id} onClick={()=>{install(deriveDocument(createProject({},t.id),'template',{title:t.name}));}}>{t.name}</button>)}</div><button onClick={()=>request('openTemplate')}>פתיחת תבנית מקובץ</button><button onClick={()=>setManageTemplates(false)}>סגירה</button></section></div>}
    {create&&<div className="overlay"><section role="dialog" aria-modal="true" aria-labelledby="new-title" className="dialog"><h2 id="new-title">{makingTemplate?'תבנית חדשה':creationAction==='duplicate'?'שכפול לפרויקט חדש':'פרויקט חדש'}</h2><form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);const fields={title:String(data.get('title')??''),client:String(data.get('client')??''),location:String(data.get('location')??''),date:makingTemplate?'':String(data.get('date')),revision:String(data.get('revision')??''),vat:parseInput(String(data.get('vat')))};const source=usingSource?current.current!:createProject({},templateId);install(deriveDocument(source,makingTemplate?'template':'project',fields));setCreate(false);}}>
      {!usingSource&&<label>תבנית בסיס<select aria-label="תבנית" value={templateId} onChange={e=>setTemplateId(e.target.value)}>{templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
      <div className="fields">{(makingTemplate?[['title','שם תבנית'],['vat','שיעור מע״מ (%)']]:[['title','שם פרויקט'],['client','לקוח'],['location','מיקום / כתובת'],['date','תאריך'],['vat','שיעור מע״מ (%)']]).map(([name,label])=><label key={name}>{label}<input name={name} required={makingTemplate&&name==='title'} defaultValue={name==='date'?today():name==='vat'?(usingSource?project?.vat??DEFAULT_VAT:DEFAULT_VAT):undefined} autoFocus={name==='title'} type={name==='date'?'date':name==='vat'?'number':'text'} min={name==='vat'?0:undefined} step={name==='vat'?'any':undefined}/></label>)}</div>
      <div className="dialog-actions"><button className="primary" type="submit">{makingTemplate?'יצירת תבנית':'יצירת פרויקט'}</button><button type="button" onClick={()=>setCreate(false)}>ביטול</button></div></form></section></div>}
    {cover&&project&&<div className="overlay"><section role="dialog" aria-modal="true" aria-labelledby="cover-title" className="dialog"><h2 id="cover-title">{templateMode?'פרטי תבנית':'פרטי הפרויקט'}</h2><div className="fields">{(templateMode?['title'] as const:['title','client','location','date'] as const).map((field)=><label key={field}>{({title:templateMode?'שם תבנית':'שם פרויקט',client:'לקוח',location:'מיקום / כתובת',date:'תאריך',revision:'מהדורה'})[field]}<input type={field==='date'?'date':'text'} value={project[field]} onChange={e=>patch({[field]:e.target.value})}/></label>)}<label>שיעור מע״מ (%)<NumberCell label="שיעור מע״מ" value={project.vat} onChange={vat=>patch({vat})}/></label></div><p className="muted">{OFFICE_DETAILS}</p>{project.logo?.reviewRequired&&<p className="message warning">תמונת הלוגו דורשת בדיקה לאחר עריכה חיצונית.</p>}<button onClick={async()=>{if(current.current){try{const next=await withOfficeLogo({...current.current,logo:undefined});if(next.logo){patch({logo:next.logo});setWarnings(prev=>prev.filter(w=>!w.includes('תמונת הלוגו עובדה')));setNotice('לוגו המשרד הקבוע נטען. יש לשמור את השינוי.');}}catch(e){setError((e as Error).message);}}}}>טעינת לוגו המשרד הקבוע</button><label>הנחיות כלליות<TextCell label="הנחיות כלליות" value={project.instructions} onChange={instructions=>patch({instructions})}/></label><button className="primary" onClick={()=>setCover(false)}>חזרה לעריכה</button></section></div>}
    {pending&&<div className="overlay"><section role="dialog" aria-modal="true" aria-labelledby="dirty-title" className="dialog compact"><h2 id="dirty-title">יש שינויים שלא נשמרו</h2><p>לשמור את המסמך לפני המעבר?</p><div className="dialog-actions"><button disabled={busy} className="primary" onClick={async()=>{if(await save()){const action=pending;setPending(null);void perform(action);}}}>שמירה והמשך</button><button disabled={busy} onClick={()=>{const action=pending;setPending(null);void perform(action);}}>המשך ללא שמירה</button><button disabled={busy} onClick={()=>setPending(null)}>ביטול</button></div>{error&&<p role="alert">{error}</p>}{notice&&<p>{notice}</p>}</section></div>}
    {importPicker&&<div className="overlay"><section className="dialog" role="dialog" aria-modal="true" aria-label="בחירת קובץ לייבוא"><h2>ייבוא Excel חיצוני</h2><input aria-label="קובץ לייבוא" type="file" accept=".xlsx" onChange={e=>{const f=e.target.files?.[0];if(f){if(f.size>15*1024*1024){setError('הקובץ גדול מ־15MB');return;}setImportFile(f);setImportPicker(false);}}}/><button onClick={()=>setImportPicker(false)}>ביטול</button></section></div>}
    {importFile&&<ImportWizard file={importFile} close={()=>setImportFile(null)} accept={(p,w)=>{install(p);setWarnings(w);setImportFile(null);}}/>}
    {proposal&&<ProposalReview source={project?.kind==='project'?project:null} close={()=>setProposal(false)} accept={p=>{install(p);setProposal(false);setNotice('ההצעה אומצה כעותק נפרד. יש לשמור בשם חדש.');}}/>}
    {recovery&&<div className="overlay"><section role="dialog" aria-modal="true" aria-labelledby="recovery-title" className="dialog compact"><h2 id="recovery-title">נדרש ייבוא או שחזור מונחה</h2><p>{recovery}</p><p>הקובץ לא הוחלף ולא שונה. ניתן לעבור לייבוא מונחה ולסקור את התוכן שניתן לקרוא.</p>{recoveryFile&&<button onClick={()=>{setImportFile(recoveryFile);setRecovery('');}}>מעבר לייבוא מונחה</button>}<button onClick={()=>setRecovery('')}>חזרה</button></section></div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
