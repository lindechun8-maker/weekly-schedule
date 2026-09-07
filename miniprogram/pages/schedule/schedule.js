const days = ['周一','周二','周三','周四','周五','周六','周日'];
const slots = Array.from({ length: 15 }, (_, i) => i + 8);
const schoolCourses = [
  { id:'c1', title:'10638', note:'EF5042-S01｜LI 1614', day:3, start:9, end:12, type:'class' },
  { id:'c2', title:'11555', note:'EF5052-S03｜LI 1614', day:4, start:9, end:12, type:'class' },
  { id:'c3', title:'15462', note:'EF5063-S01｜YEUNG LT-1', day:5, start:10, end:12, type:'class' },
  { id:'c4', title:'15450', note:'EF5050-S03｜LI 2610', day:0, start:13, end:16, type:'class' },
  { id:'c5', title:'14196', note:'EF5560-S01｜YEUNG LT-17', day:3, start:15, end:18, type:'class' },
  { id:'c6', title:'11147', note:'EF5250-S61｜LI 1614', day:3, start:19, end:22, type:'class' }
];
const clone = value => JSON.parse(JSON.stringify(value));
Page({
  data: { days, slots, events: [], form: {}, showEditor: false, isEditing: false, dayOptions: days, hourOptions: slots.map(h => String(h).padStart(2,'0') + ':00'), typeIndex: 0 },
  onLoad() { this.loadEvents(); },
  loadEvents() { this.setData({ events: wx.getStorageSync('weekly-schedule-events') || clone(schoolCourses) }); },
  persist(events) { wx.setStorageSync('weekly-schedule-events', events); this.setData({ events }); },
  eventAt(day, hour) { return this.data.events.find(e => e.day === day && e.start === hour); },
  openNew(e) { const { day, hour } = e.currentTarget.dataset; this.setData({ showEditor:true, isEditing:false, form:{ id:'', title:'', note:'', day:Number(day || 0), start:Number(hour || 8), end:Math.min(Number(hour || 8) + 1, 23), type:'task' }, typeIndex:0 }); },
  openEdit(e) { const event = this.data.events.find(item => item.id === e.currentTarget.dataset.id); if (event) this.setData({ showEditor:true, isEditing:true, form:clone(event), typeIndex:['task','personal','class'].indexOf(event.type) }); },
  closeEditor() { this.setData({ showEditor:false }); },
  input(e) { const field = e.currentTarget.dataset.field; this.setData({ ['form.' + field]: e.detail.value }); },
  chooseDay(e) { this.setData({ 'form.day': Number(e.detail.value) }); },
  chooseStart(e) { this.setData({ 'form.start': Number(slots[e.detail.value]) }); },
  chooseEnd(e) { this.setData({ 'form.end': Number(slots[e.detail.value]) + 1 }); },
  chooseType(e) { this.setData({ 'form.type': ['task','personal','class'][e.detail.value], typeIndex:Number(e.detail.value) }); },
  saveEvent() { const form = this.data.form; if (!form.title.trim()) return wx.showToast({ title:'请输入事项名称', icon:'none' }); if (form.end <= form.start) return wx.showToast({ title:'结束时间必须晚于开始时间', icon:'none' }); const event = { ...form, id:form.id || Date.now().toString(), title:form.title.trim(), note:(form.note || '').trim() }; const events = clone(this.data.events); const index = events.findIndex(item => item.id === event.id); index < 0 ? events.push(event) : events[index] = event; this.persist(events); this.closeEditor(); },
  deleteEvent() { const id = this.data.form.id; wx.showModal({ title:'删除安排', content:'确定删除此安排吗？', success:res => { if (res.confirm) { this.persist(this.data.events.filter(e => e.id !== id)); this.closeEditor(); } } }); },
  resetSchoolCourses() { wx.showModal({ title:'恢复学校原始课程', content:'这会删除新增任务及课程编辑，只保留学校原始课程。', success:res => { if (res.confirm) this.persist(clone(schoolCourses)); } }); },
  typeIndex() { return ['task','personal','class'].indexOf(this.data.form.type); }
});