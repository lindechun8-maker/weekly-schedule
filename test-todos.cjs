const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const server=http.createServer((req,res)=>{
   const file=path.join(process.cwd(),req.url==='/'?'index.html':req.url.split('?')[0]);
   try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  const url='http://127.0.0.1:'+server.address().port;
  await page.goto(url);
  // Migration must preserve legacy events without changing the original key.
  await page.evaluate(()=>localStorage.setItem('my-weekly-schedule-v1',JSON.stringify([{id:'legacy',title:'已有日程',note:'保留',day:1,start:9,end:10,type:'task'}])));
  await page.reload();
  assert.equal(await page.locator('.event').count(),1);
  const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('weekly-schedule-with-todos-v1')));
  await page.locator('#todoInput').fill('完成英语作业');
  await page.locator('#todoAddForm button').click();
  assert.equal((await snapshot()).events[0].id,'legacy');
  await page.locator('#unscheduledList .todo-plan').click();
  await page.locator('#day').selectOption('1');
  await page.locator('#start').selectOption('14');
  await page.locator('#end').selectOption('16');
  await page.locator('#form button[type=submit]').click();
  assert.match(await page.locator('.todo-time').innerText(),/14:00–15:50/);
  assert.equal((await snapshot()).events.length,2);
  // Event edits update the linked todo.
  await page.getByRole('button',{name:'完成英语作业，星期二 14:00–15:50，点击编辑',exact:true}).click();
  await page.locator('#title').fill('完成英语报告');
  await page.locator('#form button[type=submit]').click();
  assert.equal((await snapshot()).todos[0].title,'完成英语报告');
  // Todo edits update the event; HTML-like titles must remain literal text.
  await page.locator('.todo-title').click();
  await page.locator('#todoEditTitle').fill('报告 <img src=x onerror=alert(1)>');
  await page.locator('#todoEditForm button[type=submit]').click();
  assert.equal(await page.locator('#calendar img').count(),0);
  assert.equal((await snapshot()).events.find(e=>e.todoId).title,'报告 <img src=x onerror=alert(1)>');
  await page.locator('.todo-time').click();
  await page.locator('#deleteBtn').click();
  assert.equal((await snapshot()).todos.length,1);
  assert.equal(await page.locator('#unscheduledList .todo-row').count(),1);
  // Reset retains pending and completed todos and restores exactly six school courses.
  await page.locator('#todoInput').fill('已完成事项');
  await page.locator('#todoAddForm button').click();
  await page.getByRole('checkbox',{name:'完成：已完成事项',exact:true}).click();
  assert.equal(await page.locator('#completedGroup').getAttribute('open'),null);
  await page.locator('#resetTop').click();
  assert.equal((await snapshot()).events.length,6);
  assert.equal((await snapshot()).todos.length,2);
  await page.locator('#unscheduledList .todo-plan').click();
  await page.locator('#day').selectOption('0');
  await page.locator('#start').selectOption('13');
  await page.locator('#end').selectOption('14');
  await page.locator('#form button[type=submit]').click();
  assert.equal(await page.locator('#editor').evaluate(e=>e.open),true);
  assert.equal((await snapshot()).events.length,6);
  await page.locator('#day').selectOption('1');
  await page.locator('#form button[type=submit]').click();
  await page.reload();
  assert.equal(await page.locator('#scheduledList .todo-row').count(),1);
  await page.locator('#resetTop').click();
  assert.equal(await page.locator('#unscheduledList .todo-row').count(),1);
  assert.equal(await page.locator('#scheduledList .todo-row').count(),0);
  // Single device persistence and linked deletion.
  await page.locator('#unscheduledList .todo-plan').click();
  await page.locator('#day').selectOption('1');
  await page.locator('#form button[type=submit]').click();
  await page.locator('#scheduledList .todo-title').click();
  await page.locator('#todoDelete').click();
  assert.equal((await snapshot()).events.length,6);
  assert.equal((await snapshot()).todos.length,1);
  await page.locator('#todoInput').fill('阅读本周论文');
  await page.locator('#todoAddForm button').click();
  for(const width of [320,390,430]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow at '+width);
    await page.locator('.todos').screenshot({path:path.join(process.env.TEMP,'schedule-todos-'+width+'.png')});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: migration, add, schedule, two-way edits, literal text, unschedule, completion, reset, conflict, reload, delete, mobile widths 320/390/430.');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
