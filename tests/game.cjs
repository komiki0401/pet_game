const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const {existsSync}=require('node:fs');
const path=require('node:path');
async function answerQuestions(page,preference='大好き',relation='関係ある'){
 const before=await page.locator('#word-count').innerText();
 assert.equal(await page.locator('#teach-question').isVisible(),true);
 assert.equal(await page.locator('#question-text').innerText(),'それって好き？');
 assert.deepEqual(await page.locator('#answer-choices button').allTextContents(),['大好き','好き','ふつう','嫌い']);
 await page.getByRole('button',{name:preference,exact:true}).click();
 assert.match(await page.locator('#question-text').innerText(),/と関係ある？/);
 const bounds=await page.locator('#teach-dialog').boundingBox();
 assert.ok(bounds.x>=0&&bounds.x+bounds.width<=page.viewportSize().width);
 assert.ok(bounds.y>=0&&bounds.y+bounds.height<=page.viewportSize().height);
 assert.equal(await page.locator('#word-count').innerText(),before);
 await page.getByRole('button',{name:relation,exact:true}).click();
}
test('teaching, care, rest, persistence, keyboard dialog and mobile layout',async()=>{
 const server=spawn(process.execPath,[path.join(__dirname,'../server.js')],{env:{...process.env,PORT:'3137'},stdio:['ignore','pipe','inherit']});
 let browser;
 try{
 await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw new Error('Test server stopped');}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timeout')),10000);timer.unref();})]);
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Array.prototype.findLast=undefined;});
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
 assert.equal(await page.locator('#word-count').innerText(),'0 こ');
 await answerQuestions(page);
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
 // Closing either question cancels learning and gives no rewards.
 const beforeCancel=await page.evaluate(()=>JSON.parse(localStorage.getItem('komorebi-shiro-v1')));
 for(const step of [1,2]){
  await page.locator('#open-teach').click();await page.locator('#word').fill('とちゅう');await page.locator('.primary').click();
  if(step===2)await page.getByRole('button',{name:'好き',exact:true}).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#word-count').innerText(),'1 こ');
 }
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('komorebi-shiro-v1')).bond),beforeCancel.bond);
 await page.setViewportSize({width:390,height:844});
 for(const [preference,relation] of [['好き','関係ない'],['ふつう','わからない'],['嫌い','関係ある']]){
  await page.locator('#open-teach').click();await page.locator('#word').fill('ことば'+preference);await page.locator('.primary').click();
  await answerQuestions(page,preference,relation);
  const learned=await page.evaluate(()=>JSON.parse(localStorage.getItem('komorebi-shiro-v1')).words.at(-1));
  assert.equal(learned.preference,preference);assert.equal(learned.relation.answer,relation);
  assert.equal(learned.relation.word,preference==='好き'?'プリン':'ことば'+(preference==='ふつう'?'好き':'ふつう'));
 }
 await page.reload();assert.equal(await page.locator('#word-count').innerText(),'4 こ');
 await page.evaluate(()=>{Math.random=()=>.99;});await page.locator('[data-action="talk"]').click();
 assert.match(await page.locator('#speech').innerText(),/苦手/);
 // A pre-update save with words lacking question metadata remains usable.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('komorebi-shiro-v1'));s.words=[{text:'むかしのことば',category:'食べもの'}];localStorage.setItem('komorebi-shiro-v1',JSON.stringify(s));});
 await page.reload();assert.equal(await page.locator('#word-count').innerText(),'1 こ');
 await page.evaluate(()=>{Math.random=()=>.99;});await page.locator('[data-action="talk"]').click();assert.match(await page.locator('#speech').innerText(),/むかしのことば/);
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
  const file=files[new URL(req.url,'http://localhost').pathname];
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
  assert.match(await page.locator('script[src]').getAttribute('src'),/app\.js\?v=[a-f0-9]{12}/);
  assert.match(await page.locator('link[rel=stylesheet]').getAttribute('href'),/style\.css\?v=[a-f0-9]{12}/);
  assert.equal(await page.locator('#cat svg').count(),1);
  assert.notEqual(await page.locator('.fluffy-tail').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.locator('[data-action="teach"]').click();await page.locator('#word').fill('ひなた');await page.locator('.primary').click();
  await answerQuestions(page);
  assert.match(await page.locator('#speech').innerText(),/ひなた/);
  await page.locator('.brand').click();await page.waitForURL(url);
  assert.equal(await page.locator('#word-count').innerText(),'1 こ');
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
});
