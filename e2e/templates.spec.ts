import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const templates=['restaurant','kiosk','apartment','private_house','bfresh','oshi_oshi'].map(id=>JSON.parse(readFileSync(`src/data/${id}.json`,'utf8')) as {id:string;name:string;instructions:string;chapters:{active:boolean;title:string}[]});

test('choose each template, edit, save and reopen its complete project',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  for(const template of templates){
    await page.goto('/');
    await page.evaluate(async()=>{
      const root=await navigator.storage.getDirectory();const native=await root.getFileHandle('template-test.xlsx',{create:true});
      const handle={name:native.name,getFile:()=>native.getFile(),createWritable:()=>native.createWritable(),requestPermission:async()=>'granted',isSameEntry:async()=>true};
      Object.assign(window,{showSaveFilePicker:async()=>handle,showOpenFilePicker:async()=>[handle]});
    });
    await page.getByRole('button',{name:`יצירה מתבנית ${template.name}`,exact:true}).click();
    await expect(page.getByRole('combobox',{name:'תבנית'})).toHaveValue(template.id);
    await page.getByRole('textbox',{name:'שם פרויקט',exact:true}).fill(`בדיקת ${template.name}`);
    await page.getByRole('button',{name:'יצירת פרויקט',exact:true}).click();
    await expect(page.locator('.chapter')).toHaveCount(template.chapters.length);
    const firstActive=template.chapters.find(c=>c.active)!;
    const description=page.getByRole('textbox',{name:`תיאור ${firstActive.title}, שורה 1`,exact:true});
    await description.fill(`עריכה ${template.name}`);
    await page.getByRole('button',{name:'שמירה',exact:true}).click();
    await expect(page.getByRole('status')).toHaveText('נשמר');
    await page.getByRole('button',{name:'תפריט ראשי',exact:true}).click();await page.getByRole('button',{name:'המשך פרויקט קיים',exact:true}).click();
    await expect(description).toHaveValue(`עריכה ${template.name}`);
    await expect(page.locator('.chapter')).toHaveCount(template.chapters.length);
    await expect(page.locator('.chapter.draft')).toHaveCount(template.chapters.filter(c=>!c.active).length);
    await page.getByRole('button',{name:'פרטי הפרויקט'}).click();
    await expect(page.getByRole('textbox',{name:'הנחיות כלליות',exact:true})).toHaveValue(template.instructions);
    await page.getByRole('button',{name:'חזרה לעריכה'}).click();
  }
  expect(errors).toEqual([]);
});

test('switch template in the new project dialog',async({page})=>{
  await page.goto('/');
  await page.screenshot({path:'outputs/implementation-20261028/templates.png',fullPage:true});
  await page.getByRole('button',{name:'יצירה מתבנית מסעדה',exact:true}).click();
  await page.getByRole('combobox',{name:'תבנית'}).selectOption('apartment');
  await page.getByRole('button',{name:'יצירת פרויקט',exact:true}).click();
  await expect(page.locator('.chapter')).toHaveCount(16);
});
