import {chromium,request,expect} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const baseURL=process.env.BOQ_DEPLOYMENT_URL;
const jar=process.env.BOQ_TEST_COOKIE_JAR;
if(!baseURL||!jar)throw new Error('Set BOQ_DEPLOYMENT_URL and BOQ_TEST_COOKIE_JAR');
const hostname=new URL(baseURL).hostname;
const cookies=readFileSync(jar,'utf8').split(/\r?\n/)
  .filter(line=>line.trim()&&(!line.startsWith('#')||line.startsWith('#HttpOnly_')))
  .map(line=>{
    const [domain,,path,secure,expires,name,value]=line.replace(/^#HttpOnly_/,'').split('\t');
    if(domain.replace(/^\./,'')!==hostname)throw new Error('Cookie origin mismatch');
    return {domain,path,secure:secure==='TRUE',expires:Number(expires)||-1,name,value,httpOnly:line.startsWith('#HttpOnly_'),sameSite:'Lax'};
  });
const anonymous=await request.newContext();
const blocked=await anonymous.get(baseURL,{maxRedirects:0});
expect([401,403,302,307]).toContain(blocked.status());
await anonymous.dispose();
const profile=mkdtempSync(join(tmpdir(),'boq-deployment-chrome-'));
const context=await chromium.launchPersistentContext(profile,{channel:'chrome',viewport:{width:1440,height:1000}});
try{
  await context.addCookies(cookies);
  const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(baseURL);
  expect(response.status()).toBe(200);
  await expect(page.locator('.template-choice')).toHaveCount(5);
  const headers=response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['cache-control']).toContain('no-cache');
  const manifestResponse=await context.request.get(`${baseURL}/manifest.webmanifest`);
  expect(manifestResponse.status()).toBe(200);
  const manifest=await manifestResponse.json();expect(manifest.display).toBe('standalone');expect(manifest.dir).toBe('rtl');
  for(const icon of manifest.icons)expect((await context.request.get(new URL(icon.src,baseURL).href)).status()).toBe(200);
  for(const path of ['/src/main.tsx','/docs/BOQ_TEMPLATE_SPEC.md','/outputs/implementation-20261027/browser-roundtrip.xlsx','/.env.local']){
    expect((await context.request.get(`${baseURL}${path}`)).status(),path).toBe(404);
  }
  const cdp=await context.newCDPSession(page);
  const appManifest=await cdp.send('Page.getAppManifest');expect(appManifest.errors).toEqual([]);
  const installability=await cdp.send('Page.getInstallabilityErrors');
  expect(installability.installabilityErrors).toEqual([]);
  const fileAccess=await page.evaluate(()=>({secure:isSecureContext,save:typeof window.showSaveFilePicker,open:typeof window.showOpenFilePicker}));
  expect(fileAccess).toEqual({secure:true,save:'function',open:'function'});
  expect(errors).toEqual([]);
  mkdirSync('outputs/deployment-20261028',{recursive:true});
  await page.screenshot({path:'outputs/deployment-20261028/live-home.png'});
  const result={url:baseURL,anonymousStatus:blocked.status(),authenticatedStatus:response.status(),templates:5,manifest:{name:manifest.name,display:manifest.display,dir:manifest.dir},installabilityErrors:installability.installabilityErrors,fileAccess,consoleErrors:errors};
  writeFileSync('outputs/deployment-20261028/live-check.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}finally{
  await context.close();
  if(!profile.startsWith(join(tmpdir(),'boq-deployment-chrome-')))throw new Error('Unexpected temporary profile path');
  rmSync(profile,{recursive:true,force:true});
}
