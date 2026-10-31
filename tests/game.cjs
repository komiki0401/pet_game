const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const {existsSync}=require('node:fs');
const path=require('node:path');
test('teaching, care, rest, persistence, keyboard dialog and mobile layout',async()=>{
 const server=spawn(process.execPath,[path.join(__dirname,'../server.js')],{env:{...process.env,PORT:'3137'},stdio:['ignore','pipe','inherit']});
 let browser;
 try{
 await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw new Error('Test server stopped');}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timeout')),10000);timer.unref();})]);
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3137');
 const tailBefore=await page.locator('.fluffy-tail').evaluate(el=>getComputedStyle(el).transform);
 await page.waitForTimeout(220);
 assert.notEqual(await page.locator('.fluffy-tail').evaluate(el=>getComputedStyle(el).transform),tailBefore);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.fluffy-tail').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('[data-action="teach"]').click();
 await page.getByLabel('教えたいことば').fill('プリン');
 await page.getByRole('button',{name:'しろに教える'}).click();
 assert.match(await page.locator('#speech').innerText(),/プリン/);
 assert.equal(await page.locator('#word-count').innerText(),'1 こ');
 await page.locator('#open-teach').click();await page.locator('#word').fill('プリン');await page.locator('.primary').click();
 assert.match(await page.locator('#form-message').innerText(),/もう覚えてる/);
 await page.keyboard.press('Escape');
 await page.evaluate(()=>{Math.random=()=>0.99;});
 await page.locator('[data-action="talk"]').click();
 assert.match(await page.locator('#speech').innerText(),/プリン/);
 await page.locator('[data-action="feed"]').click();
 assert.match(await page.locator('#speech').innerText(),/もぐもぐ/);
 assert.equal(await page.locator('.snack').isVisible(),true);
 for(let i=0;i<5;i++)await page.locator('[data-action="play"]').click();
 assert.match(await page.locator('#speech').innerText(),/ひと休み/);
 assert.equal(await page.locator('.sleep-marks').isVisible(),true);
 await page.getByRole('button',{name:'しろをなでる'}).click();assert.match(await page.locator('#speech').innerText(),/あったかい/);
 assert.equal(await page.locator('.closed-eyes').isVisible(),true);
 assert.equal(await page.locator('.eyes').isVisible(),false);
 await page.reload();assert.equal(await page.locator('#word-count').innerText(),'1 こ');assert.match(await page.locator('#memories').innerText(),/ひと休み/);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'/tmp/komorebi-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1100});await page.screenshot({path:'/tmp/komorebi-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);
 const response=await page.request.get('http://127.0.0.1:3137/missing');assert.equal(response.status(),404);
 }finally{if(browser)await browser.close();server.kill();await once(server,'exit');}
});

test('built game loads and plays under the GitHub Pages project path',async()=>{
 const http=require('node:http');
 const {readFile}=require('node:fs/promises');
 require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,'../scripts/build.mjs')]);
 const files={'/pet_game/':'index.html','/pet_game/style.css':'style.css','/pet_game/app.js':'app.js'};
 const types={'index.html':'text/html; charset=utf-8','style.css':'text/css','app.js':'text/javascript'};
 const server=http.createServer(async(req,res)=>{
  const file=files[req.url];
  if(!file){res.writeHead(404);res.end();return;}
  try{const data=await readFile(path.join(__dirname,'../dist',file));res.writeHead(200,{'Content-Type':types[file]});res.end(data);}catch{res.writeHead(500);res.end();}
 });
 let browser;
 try{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.url()+': '+r.status());});
  const url=`http://127.0.0.1:${server.address().port}/pet_game/`;
  await page.goto(url);
  assert.equal(await page.locator('#cat svg').count(),1);
  assert.notEqual(await page.locator('.fluffy-tail').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.locator('[data-action="teach"]').click();await page.locator('#word').fill('ひなた');await page.locator('.primary').click();
  assert.match(await page.locator('#speech').innerText(),/ひなた/);
  await page.locator('.brand').click();await page.waitForURL(url);
  assert.equal(await page.locator('#word-count').innerText(),'1 こ');
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
});
