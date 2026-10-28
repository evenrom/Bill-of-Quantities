import {useEffect,useState} from 'react';
interface InstallEvent extends Event {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
export function InstallApp(){
  const [event,setEvent]=useState<InstallEvent|null>(null),[message,setMessage]=useState('');
  const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches);
  useEffect(()=>{const ready=(e:Event)=>{e.preventDefault();setEvent(e as InstallEvent);};const done=()=>{setInstalled(true);setEvent(null);};window.addEventListener('beforeinstallprompt',ready);window.addEventListener('appinstalled',done);return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',done);};},[]);
  async function install(){if(!event){setMessage('להתקנה: פתחו בכרום את כתובת האתר הקבועה, ובתפריט Chrome בחרו בהתקנת הדף כאפליקציה. אם האפשרות אינה מופיעה, יש לבדוק את הרשאות המחשב והדפדפן.');return;}await event.prompt();await event.userChoice;setEvent(null);}
  return <div className="install-help">{!installed&&<button onClick={()=>void install()}>התקנה כאפליקציה</button>}{message&&<p>{message}</p>}</div>;
}
