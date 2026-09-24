const days=['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
const hours=Array.from({length:15},(_,i)=>i+8);
const storageKey='weekly-schedule-with-todos-v1';
const schoolCourses=[
['c1','10638','EF5042-S01｜LI 1614',3,9,12,'class'],
['c2','11555','EF5052-S03｜LI 1614',4,9,12,'class'],
['c3','15462','EF5063-S01｜YEUNG LT-1',5,10,12,'class'],
['c4','15450','EF5050-S03｜LI 2610',0,13,16,'class'],
['c5','14196','EF5560-S01｜YEUNG LT-17',3,15,18,'class'],
['c6','11147','EF5250-S61｜LI 1614',3,19,22,'class']
].map(([id,title,note,day,start,end,type])=>({id,title,note,day,start,end,type}));
const $=s=>document.querySelector(s);
const time=h=>String(h).padStart(2,'0')+':00';
const endTime=h=>String(h-1).padStart(2,'0')+':50';
const period=e=>days[e.day]+' '+time(e.start)+'–'+endTime(e.end);
let state, loadFailed=false;
try {
  const saved=localStorage.getItem(storageKey);
  state=saved?JSON.parse(saved):{events:JSON.parse(localStorage.getItem('my-weekly-schedule-v1')||'null')||structuredClone(schoolCourses),todos:[]};
  if(!Array.isArray(state.events)||!Array.isArray(state.todos))throw new Error('Invalid data');
} catch(error) {
  loadFailed=true;
  state={events:structuredClone(schoolCourses),todos:[]};
  alert('无法读取已保存的数据，暂时禁止编辑以保护原有记录。请不要清理浏览器数据，重新打开页面后重试。');
}
let editingTodoId=null;
const dialog=$('#editor');
function persist(next){
  if(loadFailed){alert('数据尚未成功读取，不能覆盖保存。请重新打开页面后重试。');return false;}
  try{localStorage.setItem(storageKey,JSON.stringify(next));}
  catch(error){alert('保存失败：手机存储空间不足或浏览器禁止保存，请释放空间后重试。');return false;}
  state=next;render();return true;
}
function element(tag,className,text){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined)el.textContent=text;
  return el;
}
function button(text,className,action){
  const el=element('button',className,text);el.type='button';el.onclick=action;return el;
}
function linkedEvent(todo){return state.events.find(e=>e.todoId===todo.id);}
function render(){
  const cal=$('#calendar');cal.replaceChildren();
  ['时间',...days.map(d=>d.replace('星期','周'))].forEach((d,i)=>{
    const head=element('div','head',d);head.style.gridColumn=i+1;head.style.gridRow=1;cal.append(head);
  });
  hours.forEach(h=>{
    const row=h-6,label=element('div','time');
    label.append(time(h),document.createElement('br'),endTime(h+1));
    label.style.gridColumn=1;label.style.gridRow=row;cal.append(label);
    for(let day=0;day<7;day++){
      const starts=state.events.filter(e=>e.day===day&&e.start===h);
      const covered=state.events.some(e=>e.day===day&&e.start<h&&e.end>h);
      if(!starts.length&&covered)continue;
      const cell=element('div','cell'+(starts.length?'':' empty'));
      cell.style.gridColumn=day+2;
      cell.style.gridRow=starts.length?row+' / span '+(Math.max(...starts.map(e=>e.end))-h):row;
      if(starts.length)starts.forEach(ev=>{
        const done=state.todos.some(t=>t.id===ev.todoId&&t.done);
        const type=['class','task','personal'].includes(ev.type)?ev.type:'task';
        const event=button('','event '+type+(done?' is-done':''),()=>openEvent(ev));
        event.append(element('strong','',(done?'✓ ':'')+ev.title),element('span','',ev.note||''));
        event.setAttribute('aria-label',ev.title+'，'+period(ev)+'，点击编辑');cell.append(event);
      });
      else{
        cell.tabIndex=0;cell.setAttribute('role','button');
        cell.setAttribute('aria-label',days[day]+' '+time(h)+'，新增安排');
        cell.onclick=()=>openSlot(day,h);
        cell.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cell.click();}};
      }
      cal.append(cell);
    }
  });
  renderTodos();
}
function renderTodos(){
  const pending=state.todos.filter(t=>!t.done),done=state.todos.filter(t=>t.done);
  $('#todoCount').textContent=pending.length+' 件未完成';
  $('#todoEmpty').hidden=state.todos.length>0;
  const groups=[['unscheduled',pending.filter(t=>!linkedEvent(t))],['scheduled',pending.filter(t=>linkedEvent(t))],['completed',done]];
  for(const [id,todos] of groups){
    $('#'+id+'List').replaceChildren(...todos.map(todoRow));
    $('#'+id+'Group').hidden=!todos.length;
  }
  $('#completedLabel').textContent='已完成（'+done.length+'）';
}
function todoRow(todo){
  const ev=linkedEvent(todo),row=element('div','todo-row'+(todo.done?' is-done':''));
  const label=element('label','todo-check'),check=element('input');
  check.type='checkbox';check.checked=todo.done;
  check.setAttribute('aria-label',(todo.done?'恢复未完成：':'完成：')+todo.title);
  check.onchange=()=>{if(!persist({...state,todos:state.todos.map(t=>t.id===todo.id?{...t,done:check.checked}:t)}))check.checked=todo.done;};
  label.append(check);
  const content=element('div','todo-content');
  const title=button(todo.title,'todo-title',()=>openTodo(todo));
  title.setAttribute('aria-label','编辑待办：'+todo.title);content.append(title);
  if(todo.note)content.append(element('p','todo-note',todo.note));
  if(ev)content.append(button(period(ev),'todo-time',()=>openEvent(ev)));
  else content.append(element('small','todo-status',todo.done?'已完成':'尚未安排时间'));
  row.append(label,content);
  if(!todo.done)row.append(button(ev?'改时间':'安排','secondary todo-plan',()=>{
    if(ev)openEvent(ev);else openEvent(null,(new Date().getDay()+6)%7,8,todo);
  }));
  return row;
}
function openSlot(day,start){
  const picker=$('#slotPicker');
  $('#slotHeading').textContent=period({day,start,end:start+1});
  const available=state.todos.filter(t=>!t.done&&!linkedEvent(t));
  $('#slotEmpty').hidden=available.length>0;
  $('#slotTodos').replaceChildren(...available.map(todo=>{
    const choice=button('','slot-choice secondary',()=>{
      // Recheck before saving so a stale selection cannot duplicate a task.
      const current=state.todos.find(t=>t.id===todo.id);
      if(!current||current.done||linkedEvent(current))return;
      if(state.events.some(e=>e.day===day&&start<e.end&&start+1>e.start)){
        alert('这个时间格已有安排，请重新选择。');picker.close();return;
      }
      const event={id:crypto.randomUUID(),todoId:current.id,title:current.title,note:current.note||'',day,start,end:start+1,type:'task'};
      if(persist({...state,events:[...state.events,event]}))picker.close();
    });
    choice.append(element('strong','',todo.title),element('small','','填入这个时间格'));
    return choice;
  }));
  $('#slotNew').onclick=()=>{picker.close();openEvent(null,day,start);};
  $('#slotCancel').onclick=()=>picker.close();
  picker.showModal();
}

function openEvent(ev,day=0,start=8,todo=null){
  editingTodoId=ev?.todoId||todo?.id||null;
  $('#form').reset();$('#eventId').value=ev?.id||'';
  $('#modalTitle').textContent=ev?'编辑安排':todo?'安排待办时间':'新增安排';
  $('#deleteBtn').classList.toggle('hidden',!ev);
  $('#deleteBtn').textContent=editingTodoId?'取消安排':'删除';
  $('#title').value=ev?.title||todo?.title||'';$('#note').value=ev?.note||todo?.note||'';
  $('#day').value=ev?.day??day;$('#start').value=ev?.start??start;
  $('#end').value=ev?.end??Math.min(start+1,23);$('#type').value=ev?.type||'task';
  $('#linkedHint').hidden=!editingTodoId;dialog.showModal();
}
function openTodo(todo){
  $('#todoEditForm').reset();$('#todoEditId').value=todo.id;
  $('#todoEditTitle').value=todo.title;$('#todoEditNote').value=todo.note||'';
  $('#todoEditor').showModal();
}
days.forEach((d,i)=>$('#day').add(new Option(d,i)));
hours.forEach(h=>{$('#start').add(new Option(time(h),h));$('#end').add(new Option(endTime(h+1),h+1));});
$('#start').onchange=()=>{if(+$('#end').value<=+$('#start').value)$('#end').value=+$('#start').value+1;};
$('#addBtn').onclick=()=>openEvent(null);
$('#cancelBtn').onclick=()=>dialog.close();
$('#deleteBtn').onclick=()=>{if(persist({...state,events:state.events.filter(e=>e.id!==$('#eventId').value)}))dialog.close();};
$('#form').onsubmit=e=>{
  e.preventDefault();
  const title=$('#title').value.trim();if(!title)return alert('请输入事项名称。');
  const data={id:$('#eventId').value||crypto.randomUUID(),title,note:$('#note').value.trim(),day:+$('#day').value,start:+$('#start').value,end:+$('#end').value,type:$('#type').value};
  if(editingTodoId)data.todoId=editingTodoId;
  if(data.end<=data.start)return alert('结束时间需要晚于开始时间。');
  const conflict=state.events.find(x=>x.id!==data.id&&x.day===data.day&&data.start<x.end&&data.end>x.start);
  if(conflict)return alert('与「'+conflict.title+'」（'+period(conflict)+'）重叠，请选择空闲时间。');
  const events=state.events.filter(x=>x.id!==data.id);events.push(data);
  const todos=state.todos.map(t=>t.id===editingTodoId?{...t,title,note:data.note}:t);
  if(persist({events,todos}))dialog.close();
};
$('#todoAddForm').onsubmit=e=>{
  e.preventDefault();const title=$('#todoInput').value.trim();if(!title)return;
  if(persist({...state,todos:[...state.todos,{id:crypto.randomUUID(),title,note:'',done:false}]}))$('#todoInput').value='';
};
$('#todoEditCancel').onclick=()=>$('#todoEditor').close();
$('#todoEditForm').onsubmit=e=>{
  e.preventDefault();const id=$('#todoEditId').value,title=$('#todoEditTitle').value.trim();
  if(!title)return alert('请输入待办名称。');const note=$('#todoEditNote').value.trim();
  const next={todos:state.todos.map(t=>t.id===id?{...t,title,note}:t),events:state.events.map(ev=>ev.todoId===id?{...ev,title,note}:ev)};
  if(persist(next))$('#todoEditor').close();
};
$('#todoDelete').onclick=()=>{
  if(!confirm('删除这条待办？它在日程里的安排也会一起删除。'))return;
  const id=$('#todoEditId').value;
  if(persist({todos:state.todos.filter(t=>t.id!==id),events:state.events.filter(e=>e.todoId!==id)}))$('#todoEditor').close();
};
$('#resetTop').onclick=()=>{
  if(!confirm('恢复为学校原始课程，并清除额外日程。未完成待办会保留并回到“未安排”，已完成记录也会保留。'))return;
  persist({events:structuredClone(schoolCourses),todos:state.todos});
};
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');
