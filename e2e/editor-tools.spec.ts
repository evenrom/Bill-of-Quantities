import {test,expect} from '@playwright/test';
test('group copy, paste without prices, undo, context actions and search navigation',async({page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);await page.goto('/');
  await page.getByRole('button',{name:'יצירה מתבנית מסעדה',exact:true}).click();await page.getByRole('button',{name:'יצירת פרויקט',exact:true}).click();
  await page.getByLabel('כמות בנייה ומחיצות פנים, שורה 2',{exact:true}).fill('3');await page.getByLabel('מחיר בנייה ומחיצות פנים, שורה 2',{exact:true}).fill('40');
  await page.getByLabel('בחירת בנייה ומחיצות פנים, שורה 2',{exact:true}).check();
  await page.getByLabel('תיאור בנייה ומחיצות פנים, שורה 2',{exact:true}).click({button:'right'});
  await page.getByRole('button',{name:'העתקת שורות',exact:true}).click();
  const payload=await page.evaluate(()=>navigator.clipboard.readText());expect(payload).not.toContain('price');
  await page.getByLabel('תיאור אינסטלציה ותברואה, שורה 1',{exact:true}).click({button:'right'});
  await page.getByRole('button',{name:'הדבקת שורות',exact:true}).click();
  const rows=page.locator('.chapter').filter({has:page.getByRole('heading',{name:'פרק 2 — אינסטלציה ותברואה',exact:true})}).locator('tr[data-row-id]');
  const last=rows.nth(1);await expect(last.getByLabel(/^כמות/)).toHaveValue('3');await expect(last.getByLabel(/^מחיר/)).toHaveValue('');
  const count=await rows.count();await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(rows).toHaveCount(count-1);
  await page.getByLabel('חיפוש בתיאורים').fill('עמדת');await expect(page.locator('.search-results button').first()).toBeVisible();
  await page.locator('.search-results button').first().click();
  await expect(page.locator('.jump-highlight')).toBeVisible();
});
