import {test,expect} from '@playwright/test';

test('custom template file, independent project and project duplication',async({page})=>{
  await page.goto('/');
  await page.evaluate(async()=>{
    const root=await navigator.storage.getDirectory();let last:FileSystemFileHandle;let count=0;
    Object.assign(window,{showSaveFilePicker:async()=>{
      last=await root.getFileHandle(`custom-${++count}.xlsx`,{create:true});
      return {name:last.name,getFile:()=>last.getFile(),createWritable:()=>last.createWritable(),requestPermission:async()=>'granted',isSameEntry:async()=>false};
    },showOpenFilePicker:async()=>[last]});
  });
  await page.getByRole('button',{name:'תבנית חדשה',exact:true}).click();
  await page.getByRole('textbox',{name:'שם תבנית',exact:true}).fill('תבנית המשרד');
  await page.getByRole('button',{name:'יצירת תבנית',exact:true}).click();
  await expect(page.getByText('מצב תבנית',{exact:true})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'כמות בנייה ומחיצות פנים, שורה 2',exact:true})).toHaveCount(0);
  const description=page.getByRole('textbox',{name:'תיאור בנייה ומחיצות פנים, שורה 2',exact:true});
  await description.fill('סעיף תבנית מותאם');
  await page.getByRole('button',{name:'שמירה',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('נשמר');
  await page.getByRole('button',{name:'תפריט ראשי',exact:true}).click();await page.getByRole('button',{name:'המשך פרויקט קיים',exact:true}).click();
  await expect(page.getByRole('button',{name:'שמירה',exact:true})).toBeEnabled();
  await expect(description).toHaveValue('סעיף תבנית מותאם');
  await expect(page.getByText('מצב תבנית',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'תפריט ראשי',exact:true}).click();if(await page.getByRole('button',{name:'המשך ללא שמירה',exact:true}).isVisible())await page.getByRole('button',{name:'המשך ללא שמירה',exact:true}).click();await page.locator('.home-document summary').click();
  await page.getByRole('button',{name:'יצירת פרויקט מתבנית זו',exact:true}).click();
  await page.getByRole('textbox',{name:'שם פרויקט',exact:true}).fill('פרויקט מהתבנית');
  await page.getByRole('button',{name:'יצירת פרויקט',exact:true}).click();
  await expect(page.getByText('מצב תבנית',{exact:true})).toHaveCount(0);
  const quantity=page.getByRole('textbox',{name:'כמות בנייה ומחיצות פנים, שורה 2',exact:true});
  const price=page.getByLabel('מחיר בנייה ומחיצות פנים, שורה 2',{exact:true});
  await expect(quantity).toHaveValue('');await quantity.fill('3');await price.fill('20');
  await page.getByRole('button',{name:'שמירה',exact:true}).click();await expect(page.getByRole('status')).toHaveText('נשמר');
  await page.getByRole('button',{name:'תפריט ראשי',exact:true}).click();if(await page.getByRole('button',{name:'המשך ללא שמירה',exact:true}).isVisible())await page.getByRole('button',{name:'המשך ללא שמירה',exact:true}).click();await page.locator('.home-document summary').click();
  await page.getByRole('button',{name:'שכפול לפרויקט חדש',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'שם פרויקט',exact:true})).toHaveValue('');
  await page.getByRole('button',{name:'יצירת פרויקט',exact:true}).click();
  await expect(quantity).toHaveValue('3');await expect(price).toHaveValue('');
  await page.getByRole('button',{name:'תפריט ראשי',exact:true}).click();if(await page.getByRole('button',{name:'המשך ללא שמירה',exact:true}).isVisible())await page.getByRole('button',{name:'המשך ללא שמירה',exact:true}).click();await page.locator('.home-document summary').click();
  await page.getByRole('button',{name:'יצירת תבנית מהפרויקט',exact:true}).click();
  await page.getByRole('textbox',{name:'שם תבנית',exact:true}).fill('תבנית נוספת');
  await page.getByRole('button',{name:'יצירת תבנית',exact:true}).click();
  await expect(quantity).toHaveCount(0);await expect(description).toHaveValue('סעיף תבנית מותאם');
});
