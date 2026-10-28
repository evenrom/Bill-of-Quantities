import {test,expect} from '@playwright/test';
import ExcelJS from 'exceljs';
test('externally changed logo can explicitly be restored from office branding',async({page})=>{
  await page.goto('/');await page.evaluate(async()=>{
    const root=await navigator.storage.getDirectory(),native=await root.getFileHandle('media-review.xlsx',{create:true});
    const handle={name:native.name,getFile:()=>native.getFile(),createWritable:()=>native.createWritable(),requestPermission:async()=>'granted',isSameEntry:async()=>true};
    Object.assign(window,{mediaFile:native,showSaveFilePicker:async()=>handle,showOpenFilePicker:async()=>[handle]});
  });
  await page.getByRole('button',{name:'יצירה מתבנית עסק מסחרי',exact:true}).click();await page.getByRole('button',{name:'יצירת פרויקט',exact:true}).click();
  await page.getByRole('button',{name:'שמירה',exact:true}).click();await expect(page.getByRole('status')).toHaveText('נשמר');
  const bytes=await page.evaluate(async()=>[...new Uint8Array(await (await (window as unknown as {mediaFile:FileSystemFileHandle}).mediaFile.getFile()).arrayBuffer())]);
  const b=new ExcelJS.Workbook();await b.xlsx.load(new Uint8Array(bytes) as never);const meta=b.getWorksheet('_BOQ_META')!,logo=JSON.parse(String(meta.getCell('D2').value));logo.sha256='changed';meta.getCell('D2').value=JSON.stringify(logo);
  const changed=[...new Uint8Array(await b.xlsx.writeBuffer() as never)];
  await page.evaluate(async data=>{const stream=await (window as unknown as {mediaFile:FileSystemFileHandle}).mediaFile.createWritable();await stream.write(new Uint8Array(data));await stream.close();},changed);
  await page.getByRole('button',{name:'תפריט ראשי',exact:true}).click();await page.getByRole('button',{name:'המשך פרויקט קיים',exact:true}).click();await expect(page.getByRole('button',{name:'שמירה',exact:true})).toBeEnabled();
  await expect(page.getByText(/תמונת הלוגו עובדה או שונתה/)).toBeVisible();
  await page.getByRole('button',{name:'פרטי הפרויקט',exact:true}).click();await page.getByRole('button',{name:'טעינת לוגו המשרד הקבוע',exact:true}).click();
  await expect(page.getByText('תמונת הלוגו דורשת בדיקה לאחר עריכה חיצונית.',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'חזרה לעריכה',exact:true}).click();await expect(page.getByRole('status').first()).toHaveText('שינויים שלא נשמרו');
});
