import {useState} from 'react';
import type {Project} from './model';
import {checkProject,type Issue} from './editor';
import {renderDocument,printStyles,printWindowHtml} from './print';
import {encodeContractor,contractorSnapshot,downloadFile} from './export';
import {withOfficeLogo} from './branding';
import {IconButton} from './IconButton';

export function Production({project,jump}:{project:Project;jump:(issue:Issue)=>void}){
  const [snapshot,setSnapshot]=useState<Project|null>(null);const [mode,setMode]=useState<'preview'|'export'|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  async function prepare(next:'preview'|'export'){
    setError('');setMessage('');setBusy(true);
    try{await document.fonts.ready;const p=await withOfficeLogo(contractorSnapshot(project));renderDocument(p);setSnapshot(p);setMode(next);}catch(e){setError(e instanceof Error?e.message:'הכנת המסמך נכשלה');}finally{setBusy(false);}
  }
  async function produce(){
    if(!snapshot)return;
    // Open synchronously while the export click still has user activation.
    const win=window.open('','_blank');if(!win){setError('הדפדפן חסם את חלון ה־PDF. יש לאפשר חלונות קופצים לאתר ולנסות שוב.');return;}
    setBusy(true);setError('');
    try{
      win.document.write(printWindowHtml(snapshot));win.document.close();
      const bytes=await encodeContractor(snapshot);downloadFile(bytes,`${snapshot.title||'כתב כמויות'} - לקבלן.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      await win.document.fonts.ready;for(const img of [...win.document.images])await img.decode().catch(()=>{});
      win.focus();win.print();setMessage('Excel הועבר להורדה וחלון ההדפסה נפתח. בחרו „שמירה כ־PDF”. יש לוודא ששני הקבצים נשמרו; קובץ העבודה נשמר בנפרד.');setMode(null);
    }catch(e){win.close();setError(e instanceof Error?e.message:'ההפקה נכשלה');}finally{setBusy(false);}
  }
  const issues=snapshot?checkProject(snapshot,!!project.contractor):[];
  let html='';if(mode==='preview'&&snapshot)try{html=renderDocument(snapshot,true);}catch(e){html=`<p>לא ניתן להציג את המסמך</p>`;}
  return <><IconButton icon="preview" label="תצוגת A4" disabled={busy} onClick={()=>void prepare('preview')}/><IconButton icon="export" label="ייצוא" disabled={busy} onClick={()=>void prepare('export')}/>
    {error&&<p className="message error" role="alert">{error}</p>}{message&&<p className="message">{message}</p>}
    {mode==='export'&&snapshot&&<div className="overlay"><section className="dialog" role="dialog" aria-modal="true" aria-label="ייצוא"><h2>ייצוא</h2><p>Excel ו־PDF. שמירת PDF דרך חלון ההדפסה.</p><h3>{issues.length?`${issues.length} חוסרים לבדיקה`:'בדיקת החוסרים הסתיימה'}</h3><div className="issue-list">{issues.map((issue,i)=><p key={i}><button onClick={()=>{setMode(null);jump(issue);}}>מעבר לתיקון</button> {issue.message}</p>)}</div><div className="dialog-actions"><button className="primary" disabled={busy} onClick={()=>void produce()}>{issues.length?'ייצוא בכל זאת':'יצירת Excel ופתיחת PDF'}</button><button disabled={busy} onClick={()=>setMode(null)}>ביטול</button></div>{error&&<p role="alert">{error}</p>}</section></div>}
    {mode==='preview'&&snapshot&&<div className="preview-overlay" role="dialog" aria-modal="true" aria-label="תצוגת A4"><div className="preview-bar"><strong>תצוגת A4</strong><button onClick={()=>setMode('export')}>ייצוא</button><button onClick={()=>setMode(null)}>חזרה לעריכה</button></div><style>{printStyles}</style><div onClick={e=>{const target=(e.target as HTMLElement).closest<HTMLElement>('[data-jump]');if(target){setMode(null);jump({chapterId:target.dataset.chapter,rowId:target.dataset.jump,field:'description',message:''});}}} dangerouslySetInnerHTML={{__html:html}}/></div>}
  </>;
}
