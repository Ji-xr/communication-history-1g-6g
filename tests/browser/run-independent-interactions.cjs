/* Optional: npm install playwright outside production, then run against local HTTP. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium,firefox}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const engine=process.env.BROWSER==='firefox'?firefox:chromium;
const output=path.resolve(process.env.AUDIT_OUTPUT||'verification/independent-interactions');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 let browser;
 try{
  browser=await engine.launch({headless:true,timeout:15000,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL,chromiumSandbox:true}:{})});
  const context=await browser.newContext({viewport:{width:1500,height:950}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto((process.env.AUDIT_URL||'http://127.0.0.1:18765')+'/tests/browser/independent-interactions.html');
  await page.locator('#run').click();await page.waitForFunction(()=>['PASS','FAIL'].includes(document.body.dataset.result),{timeout:180000});
  const result=JSON.parse(await page.locator('#results').innerText());result.pageErrors=errors;
  await page.screenshot({path:path.join(output,'audit.png'),fullPage:true});
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));if(result.status!=='PASS'||errors.length)process.exitCode=1;
 }catch(error){fs.writeFileSync(path.join(output,'launch-or-run-error.txt'),String(error.stack||error));console.error(String(error));process.exitCode=1;}
 finally{await browser?.close();}
})().finally(()=>{setTimeout(()=>process.exit(process.exitCode||0),1000);});
