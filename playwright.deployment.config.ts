import {defineConfig} from '@playwright/test';
import {readFileSync} from 'node:fs';

// Credentials stay in a temporary curl cookie jar, outside the repository.
const baseURL=process.env.BOQ_DEPLOYMENT_URL;
const jar=process.env.BOQ_TEST_COOKIE_JAR;
if(!baseURL||!jar)throw new Error('Set BOQ_DEPLOYMENT_URL and BOQ_TEST_COOKIE_JAR');
const hostname=new URL(baseURL).hostname;
const cookies=readFileSync(jar,'utf8').split(/\r?\n/)
  .filter(line=>line.trim()&&(!line.startsWith('#')||line.startsWith('#HttpOnly_')))
  .map(line=>{
    const httpOnly=line.startsWith('#HttpOnly_');
    const [domain,,path,secure,expires,name,value]=line.replace(/^#HttpOnly_/,'').split('\t');
    if(domain.replace(/^\./,'')!==hostname)throw new Error('Cookie origin does not match deployment');
    return {domain,path,secure:secure==='TRUE',expires:Number(expires)||-1,name,value,httpOnly,sameSite:'Lax' as const};
  });
if(!cookies.length)throw new Error('Authenticated deployment cookie missing');

export default defineConfig({
  testDir:'./e2e',fullyParallel:false,workers:1,timeout:60000,
  expect:{timeout:10000},
  use:{baseURL,channel:'chrome',headless:true,viewport:{width:1440,height:1000},storageState:{cookies,origins:[]}},
  // No development server: these tests must exercise the deployed build.
});
