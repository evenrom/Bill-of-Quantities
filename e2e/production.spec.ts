import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import ExcelJS from 'exceljs';

test('preview, missing-data navigation, separate contractor export and PDF print output',async({page,context})=>{
  test.setTimeout(60000);
  await context.addInitScript(()=>{window.print=()=>{};});
  await page.goto('/');await page.getByRole('button',{name:'יצירה מתבנית עסק מסחרי',exact:true}).click();
  await page.getByRole('textbox',{name:'שם פרויקט',exact:true}).fill('בדיקת הפקה');
  await page.getByRole('button',{name:'יצירת פרויקט',exact:true}).click();
  await page.getByLabel('כמות בנייה ומחיצות פנים, שורה 2',{exact:true}).fill('0.5');
  await page.getByLabel('מחיר בנייה ומחיצות פנים, שורה 2',{exact:true}).fill('2469135.78');
  await page.getByRole('button',{name:'תצוגת A4',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'תצוגת A4',exact:true})).toBeVisible();
  const pages=page.locator('.boq-page');await expect(pages).toHaveCount(13);
  await expect(page.locator('.summary-total')).toContainText('1,234,568');
  const overflowing=await pages.evaluateAll(items=>items.flatMap((page,i)=>{const content=page.querySelector('.boq-content')!;return content.scrollHeight>content.clientHeight+3?[i+1]:[];}));
  expect(overflowing).toEqual([]);
  await page.getByRole('button',{name:'חזרה לעריכה',exact:true}).click();
  await page.getByRole('button',{name:'ייצוא',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'ייצוא',exact:true});await expect(dialog).toContainText('חוסרים לבדיקה');
  await dialog.getByRole('button',{name:'מעבר לתיקון',exact:true}).first().click();
  await expect(page.getByRole('dialog',{name:'פרטי הפרויקט'})).toBeVisible();
  await page.getByRole('button',{name:'חזרה לעריכה',exact:true}).click();
  await page.getByRole('button',{name:'ייצוא',exact:true}).click();
  const popupPromise=page.waitForEvent('popup'),downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'ייצוא בכל זאת',exact:true}).click();
  const [popup,download]=await Promise.all([popupPromise,downloadPromise]);
  await mkdir('outputs/production-20261028',{recursive:true});
  await download.saveAs('outputs/production-20261028/contractor.xlsx');
  await popup.waitForSelector('.boq-page');await popup.evaluate(()=>document.fonts.ready);
  await popup.pdf({path:'outputs/production-20261028/contractor.pdf',preferCSSPageSize:true,printBackground:true});
  await popup.screenshot({path:'outputs/production-20261028/preview.png',fullPage:false});
  expect((await popup.locator('.boq-page').count())).toBe(13);
  const book=new ExcelJS.Workbook();await book.xlsx.readFile('outputs/production-20261028/contractor.xlsx');
  expect(book.getWorksheet('פירוק והריסה')).toBeUndefined();expect(book.getWorksheet('_BOQ_META')!.getCell('C1').value).toBe('contractor');
});

test('guided external import maps rows and only replaces the editor after review',async({page})=>{
  const b=new ExcelJS.Workbook(),s=b.addWorksheet('פרק חיצוני');s.addRow(['title']);s.addRow(['סעיף','תיאור','יחידה','כמות','מחיר']);s.addRow([1,'בדיקת ייבוא',"יח'",2,25]);
  const bytes=Buffer.from(await b.xlsx.writeBuffer());await page.goto('/');
  await page.getByRole('button',{name:'ייבוא מ־Excel',exact:true}).click();
  await page.getByLabel('קובץ לייבוא',{exact:true}).setInputFiles({name:'external.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bytes});
  await page.getByRole('button',{name:'תצוגת תוצאה לפני אישור',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'ייבוא מונחה'})).toContainText('בדיקת ייבוא');
  await page.getByRole('button',{name:'אישור יצירת פרויקט חדש',exact:true}).click();
  await expect(page.getByLabel('תיאור פרק חיצוני, שורה 1',{exact:true})).toHaveValue('בדיקת ייבוא');
  await expect(page.getByLabel('כמות פרק חיצוני, שורה 1',{exact:true})).toHaveValue('2');
});

test('all chapters enabled still fit A4 including the summary',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'יצירה מתבנית עסק מסחרי',exact:true}).click();await page.getByRole('button',{name:'יצירת פרויקט',exact:true}).click();
  for(const box of await page.locator('aside input[type=checkbox]').all())await box.check();
  await page.getByRole('button',{name:'תצוגת A4',exact:true}).click();await expect(page.getByRole('dialog',{name:'תצוגת A4',exact:true})).toBeVisible();
  const overflow=await page.locator('.boq-content').evaluateAll(items=>items.flatMap((c,i)=>c.scrollHeight>c.clientHeight+3?[i+1]:[]));
  expect(overflow).toEqual([]);
});

test('returned proposal requires review and contractor identity before separate adoption',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'יצירה מתבנית עסק מסחרי',exact:true}).click();await page.getByRole('button',{name:'יצירת פרויקט',exact:true}).click();
  await page.getByRole('button',{name:'תפריט ראשי',exact:true}).click();await page.getByRole('button',{name:'המשך ללא שמירה',exact:true}).click();await page.getByRole('button',{name:'בדיקת הצעה מוחזרת',exact:true}).click();
  await page.getByLabel('קובץ קבלן מוחזר',{exact:true}).setInputFiles('tests/fixtures/legacy-v1.xlsx');
  const adopt=page.getByRole('button',{name:'אימוץ ההצעה לעותק חדש',exact:true});await expect(adopt).toBeDisabled();
  await expect(page.getByRole('dialog',{name:'בדיקת הצעה מוחזרת',exact:true})).toContainText('מזהה הפרויקט שונה');
  await page.getByLabel('שם הקבלן',{exact:true}).fill('קבלן בדיקה');
  await page.getByRole('checkbox',{name:/עברתי על ההבדלים/}).check();await adopt.click();
  await expect(page.getByText('ההצעה אומצה כעותק נפרד. יש לשמור בשם חדש.',{exact:true})).toBeVisible();await expect(page.locator('.document-name')).toContainText('טרם נבחר קובץ');
});
