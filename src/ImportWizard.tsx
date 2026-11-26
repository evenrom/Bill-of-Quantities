import {useEffect,useRef,useState} from 'react';
import {inspectWorkbook,importPlans,buildImport} from './importer';
import type {Project} from './model';

export function ImportWizard({file,close,accept}:{file:File;close:()=>void;accept:(p:Project,warnings:string[])=>void}){
  const [error,setError]=useState('');
  const acceptRef=useRef(accept);acceptRef.current=accept;
  useEffect(()=>{
    let live=true;
    void file.arrayBuffer().then(inspectWorkbook).then(sheets=>{
      const result=buildImport(importPlans(sheets),file.name.replace(/\.xlsx$/i,''));
      if(live)acceptRef.current(result.project,result.warnings);
    }).catch(e=>{if(live)setError(e instanceof Error?e.message:String(e));});
    return()=>{live=false;};
  },[file]);
  return <div className="overlay"><section className="dialog compact" role="dialog" aria-modal="true" aria-label="ייבוא Excel">
    <h2>ייבוא Excel</h2>
    {error?<p role="alert">{error}</p>:<p role="status">קורא את הקובץ ופותח לעריכה…</p>}
    <button onClick={close}>{error?'סגירה':'ביטול'}</button>
  </section></div>;
}
