import type {Project} from './model';
export async function withOfficeLogo(project: Project): Promise<Project> {
  if(project.logo || typeof window==='undefined') return project;
  const response=await fetch('/branding/office-logo.png');
  if(response.status===404 || !response.headers.get('content-type')?.startsWith('image/png')) return project;
  if(!response.ok) throw new Error('לא ניתן לטעון את לוגו המשרד');
  const blob=await response.blob();
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
  const image=new Image(); image.src=data; await image.decode();
  return {...project,logo:{data,width:image.naturalWidth,height:image.naturalHeight}};
}
