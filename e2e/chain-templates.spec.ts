import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import ExcelJS from 'exceljs';

for(const id of ['bfresh','oshi_oshi']){
  const template=JSON.parse(readFileSync(`src/data/${id}.json`,'utf8'));
  test(`${id}: approved specifications survive save, reopen, A4 and contractor export`,async({page,context})=>{
    test.setTimeout(90000);
    await context.addInitScript(()=>{window.print=()=>{};});
    await page.goto('/');
    await page.evaluate(async()=>{
      const root=await navigator.storage.getDirectory();
      const native=await root.getFileHandle('chain-template.xlsx',{create:true});
      const handle={name:native.name,getFile:()=>native.getFile(),createWritable:()=>native.createWritable(),requestPermission:async()=>'granted',isSameEntry:async()=>true};
      Object.assign(window,{showSaveFilePicker:async()=>handle,showOpenFilePicker:async()=>[handle]});
    });
    await page.getByRole('button',{name:`יצירה מתבנית ${template.name}`,exact:true}).click();
    await page.getByRole('button',{name:'יצירת פרויקט',exact:true}).click();
    await expect(page.locator('.chapter.draft')).toHaveCount(template.chapters.filter((c:{active:boolean})=>!c.active).length);
    // Enable optional chapters for this inspection so every revised specification is rendered.
    for(const box of await page.locator('aside input[type=checkbox]').all())await box.check();
    await page.getByRole('button',{name:'שמירה',exact:true}).click();
    await expect(page.getByRole('status')).toHaveText('נשמר');
    await page.getByRole('button',{name:'תפריט ראשי',exact:true}).click();
    await page.getByRole('button',{name:'המשך פרויקט קיים',exact:true}).click();
    await expect(page.locator('.chapter.draft')).toHaveCount(0);
    for(const chapter of template.chapters){
      for(let i=0;i<chapter.rows.length;i++){
        await expect(page.getByRole('textbox',{name:`תיאור ${chapter.title}, שורה ${i+1}`,exact:true})).toHaveValue(chapter.rows[i].description);
      }
    }
    await page.getByRole('button',{name:'תצוגת A4',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'תצוגת A4',exact:true})).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    const overflow=await page.locator('.boq-content').evaluateAll(items=>items.flatMap((c,i)=>c.scrollHeight>c.clientHeight+3?[i+1]:[]));
    expect(overflow).toEqual([]);
    const codes=id==='bfresh'?['DE6374','D2178','Glacier White']:['1537T','1067 GV','RAL 1036'];
    for(const code of codes)await expect(page.locator('.boq-page').filter({hasText:code}).first()).toBeVisible();
    await page.getByRole('button',{name:'חזרה לעריכה',exact:true}).click();
    await page.getByRole('button',{name:'ייצוא',exact:true}).click();
    const popupPromise=page.waitForEvent('popup'),downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'ייצוא בכל זאת',exact:true}).click();
    const [popup,download]=await Promise.all([popupPromise,downloadPromise]);
    await mkdir('outputs/chain-update-20261028',{recursive:true});
    const output=`outputs/chain-update-20261028/${id}`;
    await download.saveAs(`${output}.xlsx`);
    await popup.waitForSelector('.boq-page');await popup.evaluate(()=>document.fonts.ready);
    await popup.pdf({path:`${output}.pdf`,preferCSSPageSize:true,printBackground:true});
    expect(await popup.locator('mark').count()).toBe(0);
    const book=new ExcelJS.Workbook();await book.xlsx.readFile(`${output}.xlsx`);
    for(const chapter of template.chapters){
      const sheet=book.worksheets.find(s=>s.getCell('B1').text.includes(chapter.title));
      expect(sheet,chapter.title).toBeDefined();
      const descriptions:string[]=[];
      sheet!.eachRow(row=>{if(['item','note'].includes(row.getCell('H').text))descriptions.push(row.getCell('B').text);});
      expect(descriptions).toEqual(chapter.rows.map((r:{description:string})=>r.description));
    }
    for(const code of codes){
      const printedPage=popup.locator('.boq-page').filter({hasText:code}).first();
      await expect(printedPage).toBeVisible();
      await printedPage.screenshot({path:`${output}-${code.replace(/[^a-z0-9]/gi,'_')}.png`});
    }
  });
}
