import {test,expect} from '@playwright/test';
test('minimal home, icon toolbar and live placeholder highlighting without export markup',async({page,context})=>{
  await context.addInitScript(()=>{window.print=()=>{};});await page.goto('/');
  await expect(page.locator('.template-choice')).toHaveCount(6);await expect(page.locator('.clean-home')).not.toContainText('סעיפים');
  await expect(page.getByRole('button',{name:'התקנה כאפליקציה',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'יצירה מתבנית מסעדה',exact:true}).click();await page.getByRole('button',{name:'יצירת פרויקט',exact:true}).click();
  await expect(page.getByRole('button',{name:'התקנה כאפליקציה',exact:true})).toHaveCount(0);
  await expect(page.getByText('פרק יעד להדבקה',{exact:true})).toHaveCount(0);await expect(page.getByText('פעולות בשורות',{exact:true})).toHaveCount(0);
  expect((await page.locator('nav.toolbar').innerText()).trim()).toBe('');
  const input=page.getByLabel('תיאור בנייה ומחיצות פנים, שורה 2',{exact:true}),mirror=input.locator('..').locator('.text-mirror');
  await input.fill('תיאור {כיור או ציוד} ו{טיפוס}');await expect(mirror.locator('mark')).toHaveCount(2);
  await input.fill('תיאור כיור רגיל');await expect(mirror.locator('mark')).toHaveCount(0);
  await input.fill('תיאור {גוון} רגיל');
  await page.getByRole('button',{name:'פרטי הפרויקט',exact:true}).click();await expect(page.getByLabel('מהדורה',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'חזרה לעריכה',exact:true}).click();
  await page.getByRole('button',{name:'תצוגת A4',exact:true}).click();await expect(page.locator('.preview-overlay mark').first()).toBeVisible();
  await page.getByRole('button',{name:'חזרה לעריכה',exact:true}).click();await page.getByRole('button',{name:'ייצוא',exact:true}).click();
  const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'ייצוא בכל זאת',exact:true}).click();const popup=await popupPromise;
  await popup.waitForSelector('.boq-page');await expect(popup.locator('mark')).toHaveCount(0);
});
test('base templates are edited from home without changing their built-in source',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'עריכת תבניות',exact:true}).click();
  await page.getByRole('dialog',{name:'עריכת תבניות',exact:true}).getByRole('button',{name:'דירה',exact:true}).click();
  await expect(page.getByText('מצב תבנית',{exact:true})).toBeVisible();await expect(page.locator('.chapter')).toHaveCount(16);
  await page.getByRole('button',{name:'תפריט ראשי',exact:true}).click();await page.getByRole('button',{name:'המשך ללא שמירה',exact:true}).click();
  await expect(page.locator('.clean-home')).toBeVisible();
});
