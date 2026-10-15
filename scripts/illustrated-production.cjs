const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const output=path.resolve('artifacts/character-revision/qa/production');fs.mkdirSync(output,{recursive:true});
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const paths=['dist/index.html',...fs.readdirSync('dist/assets').filter(n=>/\.(js|css)$/.test(n)).map(n=>'dist/assets/'+n)];
const images=['lantern','lantern-motion','lantern-fx','character-revision','ironfang','sanctuary-ui'].flatMap(d=>fs.readdirSync('dist/'+d).filter(n=>n.endsWith('.png')).map(n=>'/'+d+'/'+n));
const fonts=fs.readdirSync('dist/fonts').filter(n=>n.endsWith('.ttf')).map(n=>'/fonts/'+n);
const report={kind:'Production Vite preview Chromium smoke with real UI inputs',physicalDevice:false,campaignCompletion:false,viewport:{width:740,height:360},started:new Date().toISOString(),distHashes:Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))])),sourceHashes:Object.fromEntries(['src/main.js','src/ui.js','src/style.css','src/lantern-art.js','src/lantern-fx.js'].map(p=>[p,digest(fs.readFileSync(p))])),checks:[],screenshots:[],runtimeErrors:[],failedResources:[]};
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:report.viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage();page.setDefaultTimeout(10000);
 page.on('pageerror',e=>report.runtimeErrors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.runtimeErrors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)report.failedResources.push({status:r.status(),url:r.url()});});
 page.on('requestfailed',r=>report.failedResources.push({url:r.url(),error:r.failure()?.errorText}));
 const capture=async name=>{await page.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');};
 const mode=async value=>page.waitForFunction(v=>document.getElementById('stage').dataset.mode===v,value);
 try{
  const response=await page.goto('http://127.0.0.1:4173');
  assert.equal(digest(await response.body()),report.distHashes['dist/index.html'],'served HTML is the exact current dist');
  await page.waitForFunction(()=>!document.getElementById('start').disabled&&document.querySelector('#game canvas'));
  assert.equal(await page.evaluate(()=>typeof window.__ASH),'undefined');
  report.checks.push('Production omits window.__ASH debug hook; served index SHA-256 matches current dist');
  report.servedBundles=[];
  for(const file of paths.filter(p=>p!=='dist/index.html')){
   const r=await context.request.get('http://127.0.0.1:4173/'+file.slice(5));
   assert.equal(r.status(),200);assert.equal(digest(await r.body()),report.distHashes[file]);
   report.servedBundles.push(file);
  }
  report.images=await page.evaluate(async urls=>Promise.all(urls.map(async url=>{const im=new Image();im.src=url;await im.decode();return{url,width:im.naturalWidth,height:im.naturalHeight,decoded:true};})),images);
  report.fonts=await page.evaluate(async urls=>Promise.all(urls.map(async(url,i)=>{const face=new FontFace('qa-font-'+i,`url(${url})`);await face.load();return{url,status:face.status};})),fonts);
  await page.evaluate(()=>document.fonts.ready);
  report.checks.push(`${report.images.length} Lantern/motion/FX PNGs decoded; all ${report.fonts.length} bundled fonts loaded`);
  await capture('01-home');
  await page.locator('#menu-settings').click();await page.waitForFunction(()=>document.getElementById('settings-panel').open);
  await capture('02-home-settings');await page.locator('#settings-close').click();
  await page.locator('#start').click();await mode('playing');await page.waitForTimeout(250);
  await capture('03-play');
  await page.keyboard.down('KeyD');await page.waitForTimeout(180);await page.keyboard.up('KeyD');await page.keyboard.press('Space');await page.waitForTimeout(150);
  await page.locator('#touch-pause').click();await mode('paused');await capture('04-pause');
  await page.locator('#menu-settings').click();await page.waitForFunction(()=>document.getElementById('settings-panel').open);
  await capture('05-paused-settings');await page.locator('#settings-close').click();await mode('paused');
  await page.locator('#menu-equipment').click();await page.waitForFunction(()=>document.getElementById('catalogue').open);
  report.equipmentTabs=[];
  for(const category of ['engine','sword','gun','armor','spell','relic']){
   const tab=page.locator('#catalogue-tab-'+category);await tab.click();assert.equal(await tab.getAttribute('aria-selected'),'true');
   const count=await page.locator('#catalogue-grid .catalogue-item').count();assert.ok(count>0);report.equipmentTabs.push({category,count});
   const broken=await page.locator('#catalogue-grid img:not([hidden])').evaluateAll(ims=>ims.filter(im=>!im.complete||im.naturalWidth===0).map(im=>im.src));assert.deepEqual(broken,[]);
   if(['engine','armor','spell'].includes(category))await capture('06-equipment-'+category);
  }
  await page.locator('#catalogue-close').click();await mode('paused');
  await page.locator('#start').click();await mode('playing');await capture('07-resumed');
  report.checks.push('Home settings, start, keyboard movement/jump inputs, pause, paused settings, all six equipment tabs, close-to-pause and resume');
  assert.equal(await page.evaluate(()=>typeof window.__ASH),'undefined');
  assert.deepEqual(report.runtimeErrors,[]);assert.deepEqual(report.failedResources,[]);
  report.status='pass';
 }catch(error){report.status='fail';report.error=error.stack;await capture('failure').catch(()=>{});}
 report.finished=new Date().toISOString();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();
 console.log(JSON.stringify({status:report.status,images:report.images?.length,fonts:report.fonts?.length,errors:report.runtimeErrors,failed:report.failedResources,error:report.error}));if(report.status!=='pass')process.exitCode=1;
})();
