import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const [, ,sourcePath,copyPath,mode]=process.argv;
if(!sourcePath||!copyPath)throw new Error('Usage: node scripts/verify-browser-roundtrip.mjs source.xlsx copy.xlsx [contractor]');
const source=[...await readFile(sourcePath)],copy=[...await readFile(copyPath)];
const browser=await chromium.launch({channel:'chrome'});
try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:5174/');
  const result=await page.evaluate(async({source,copy,contractor})=>{
    const path='/src/workbook.ts';const {decodeProject}=await import(path);
    return {before:await decodeProject(new Uint8Array(source).buffer,contractor),after:await decodeProject(new Uint8Array(copy).buffer,contractor)};
  },{source,copy,contractor:mode==='contractor'});
  const {logo:beforeLogo,...before}=result.before.project,{logo:afterLogo,...after}=result.after.project;
  assert.deepEqual(after,before);assert.equal(!!afterLogo,!!beforeLogo);
  if(beforeLogo&&afterLogo)assert.deepEqual({width:afterLogo.width,height:afterLogo.height},{width:beforeLogo.width,height:beforeLogo.height});
  const mediaWarning=result.after.warnings.filter(w=>w.includes('תמונת הלוגו עובדה'));
  assert.deepEqual(result.after.warnings.filter(w=>!mediaWarning.includes(w)),[]);
  if(afterLogo?.data!==beforeLogo?.data)assert.equal(afterLogo?.reviewRequired,true,'Reencoded logo must be marked for review');
  console.log(JSON.stringify({preserved:true,chapters:after.chapters.length,rows:after.chapters.flatMap(c=>c.rows).length,warnings:result.after.warnings,logoReencoded:afterLogo?.data!==beforeLogo?.data}));
}finally{await browser.close();}
