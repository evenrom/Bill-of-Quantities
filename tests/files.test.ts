import { beforeEach,it,expect,vi } from 'vitest';
import { createProject } from '../src/model';
import { fingerprint,saveFile,isCancelled } from '../src/files';
const encode=vi.hoisted(()=>vi.fn(async()=>new Uint8Array([1,2,3])));
vi.mock('../src/workbook',()=>({encodeProject:encode}));
vi.mock('../src/branding',()=>({withOfficeLogo:async(p:unknown)=>p}));
function fake() {
  const stream={write:vi.fn(async()=>{}),close:vi.fn(async()=>{}),abort:vi.fn(async()=>{})};
  const file=new File(['original'],'test.xlsx');
  const handle={name:'test.xlsx',requestPermission:vi.fn(async()=>'granted'),isSameEntry:vi.fn(async()=>true),getFile:vi.fn(async()=>file),createWritable:vi.fn(async()=>stream)};
  return {handle:handle as unknown as FileSystemFileHandle,stream,file,raw:handle};
}
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('window',{showSaveFilePicker:vi.fn()});});
it('does not encode or report success when the picker is cancelled',async()=>{
  vi.mocked(window.showSaveFilePicker).mockRejectedValue(new DOMException('Cancelled','AbortError'));
  let error;try{await saveFile(createProject(),null);}catch(e){error=e;}
  expect(isCancelled(error)).toBe(true);expect(encode).not.toHaveBeenCalled();
});
it('closes the stream before reporting success',async()=>{
  const f=fake();vi.mocked(window.showSaveFilePicker).mockResolvedValue(f.handle);
  const saved=await saveFile(createProject(),null);
  expect(f.stream.write).toHaveBeenCalledOnce();expect(f.stream.close).toHaveBeenCalledOnce();expect(saved.name).toBe('test.xlsx');
});
it('keeps failures as failures and aborts the stream',async()=>{
  const f=fake();vi.mocked(window.showSaveFilePicker).mockResolvedValue(f.handle);
  f.stream.close.mockRejectedValue(new Error('locked'));
  await expect(saveFile(createProject(),null)).rejects.toThrow('locked');expect(f.stream.abort).toHaveBeenCalledOnce();
});
it('prevents overwrite after an external edit, including Save As to the original',async()=>{
  const f=fake();vi.mocked(window.showSaveFilePicker).mockResolvedValue(f.handle);
  await expect(saveFile(createProject(),{handle:f.handle,fingerprint:'old'})).rejects.toThrow('השתנה');
  expect(f.raw.createWritable).not.toHaveBeenCalled();
});
it('always opens Save As even for a bound document and suggests its existing name',async()=>{
  const f=fake();vi.mocked(window.showSaveFilePicker).mockResolvedValue(f.handle);
  await saveFile(createProject(),{handle:f.handle,fingerprint:await fingerprint(f.file)});
  expect(window.showSaveFilePicker).toHaveBeenCalledOnce();expect(window.showSaveFilePicker).toHaveBeenCalledWith(expect.objectContaining({suggestedName:'test.xlsx'}));
  expect(f.raw.requestPermission).not.toHaveBeenCalled();expect(f.raw.createWritable).toHaveBeenCalledOnce();
});
