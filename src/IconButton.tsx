import type {ButtonHTMLAttributes} from 'react';
const paths={
  home:'m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  save:'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2ZM7 3v6h10V3M7 21v-8h10v8',
  details:'M9 3H5v18h14V3h-4M9 2h6v4H9ZM7 10h10M7 14h10M7 18h6',
  undo:'M3 10h10a7 7 0 0 1 0 14M3 10l5-5M3 10l5 5',
  redo:'M21 10H11a7 7 0 0 0 0 14M21 10l-5-5M21 10l-5 5',
  preview:'M14 2H6v20h12V6l-4-4ZM14 2v5h5M9 11h6M9 15h6M9 18h4',
  export:'M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6',
} as const;
export function IconButton({icon,label,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{icon:keyof typeof paths;label:string}){
  return <button {...props} aria-label={label} title={label} className={`icon-button ${props.className??''}`}><svg viewBox="0 0 24 26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[icon]}/></svg></button>;
}
