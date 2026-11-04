const DF=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const $=s=>document.querySelector(s),uid=()=>Math.random().toString(36).slice(2,10),mk=text=>({id:uid(),text,done:false});
const S={goals:[],cfg:{hrs:2,remind:''}};
try{const r=JSON.parse(localStorage.getItem('wkgoals')||'null');if(r&&Array.isArray(r.goals)){S.goals=r.goals;S.dead=r.dead||{};Object.assign(S.cfg,r.cfg||{})}}catch{}
S.dead=S.dead||{};S.goals.forEach(g=>{g.mod=g.mod||1});
const save=()=>{try{localStorage.setItem('wkgoals',JSON.stringify(S))}catch{}queueSync()};
const mon=d=>{d=new Date(d);d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tIdx=()=>(new Date().getDay()+6)%7;
let view=mon(new Date());
const isCur=()=>iso(view)===iso(mon(new Date()));
const tasksOf=g=>g.days.flatMap(d=>d.tasks);
const pct=g=>{const t=tasksOf(g);return t.length?Math.round(t.filter(x=>x.done).length/t.length*100):0};
const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;
const weekGoals=(w=view)=>S.goals.filter(g=>g.week===iso(w));

/* Goal-type knowledge: phases, a closing task, and whether spaced recall helps */
const KINDS=[
[/exam|test|revis|study|past paper/i,'Full mock run under time, then fix weak spots',['Map the topics and weak spots','Study the core topics','Practice past questions','Review mistakes'],1],
[/course|lesson|module|tutorial|learn/i,'Revise notes and take a final quiz',['Skim the outline and set up','Work through the core material','Do exercises or a quiz','Fill the gaps you found'],1],
[/read|book|chapter|page/i,'Write a short summary of the key ideas',['Skim the contents','Read the main sections','Note key ideas'],0],
[/write|essay|report|assignment|thesis/i,'Edit and proofread',['Outline the structure','Draft the main sections','Revise the draft'],0],
[/build|project|app|code|develop|lab/i,'Test, fix and polish',['Plan and set up','Build the core features','Test and fix bugs'],0],
[/./,'Review and finish line',['Plan the work','Do the main work','Check the result'],0]];
const kindOf=s=>KINDS.find(k=>k[0].test(s));

function build(p){
 const [,closer,phases,rec]=kindOf(p.title+' '+p.unit),buf=p.buf&&p.e-p.s+1>=3,wd=[];
 for(let d=p.s;d<=p.e-(buf?1:0);d++)wd.push(d);
 const items=p.n>0?Array.from({length:p.n},(_,i)=>i+1):p.lines.length?p.lines:phases;
 const m=wd.length,w=wd.map((d,i)=>(d>4?.7:1)*(p.diff==='hard'?1.35-.6*i/Math.max(m-1,1):p.diff==='easy'?1:1.15-.3*i/Math.max(m-1,1)));
 const sw=w.reduce((a,b)=>a+b,0),T=items.length,raw=w.map(x=>x/sw*T),cnt=raw.map(Math.floor);
 raw.map((r,i)=>[r-cnt[i],i]).sort((a,b)=>b[0]-a[0]).slice(0,T-cnt.reduce((a,b)=>a+b,0)).forEach(([,i])=>cnt[i]++);
 let pos=0;const out=[];
 wd.forEach((d,i)=>{if(!cnt[i])return;const ch=items.slice(pos,pos+cnt[i]);pos+=cnt[i];
  const tag=p.n>0&&p.mpu?` · ~${cnt[i]*p.mpu} min`:'';
  const tasks=p.n>0?[mk(`${p.unit} ${ch.length>1?ch[0]+'–'+ch[ch.length-1]:ch[0]}${tag}`)]:ch.map(mk);
  if(rec&&out.length)tasks.push(mk('Recall: quiz yourself on yesterday’s material · ~10 min'));
  out.push({day:d,tasks})});
 if(buf)out.push({day:p.e,tasks:[mk(closer)]});
 return {days:out,work:out.length-(buf?1:0),buf};
}

/* Rollover: unfinished tasks from earlier days move to the lightest remaining days */
function roll(g){
 const ti=tIdx(),late=[];
 g.days.forEach(d=>{if(d.day<ti){d.tasks=d.tasks.filter(t=>t.done||late.push(t)&&false)}});
 if(!late.length)return;
 g.days=g.days.filter(d=>d.tasks.length||d.day>=ti);
 const last=Math.max(g.end??6,ti),tg=[];
 for(let d=ti;d<=last;d++){let x=g.days.find(y=>y.day===d);if(!x)g.days.push(x={day:d,tasks:[]});tg.push(x)}
 const load=x=>x.tasks.filter(z=>!z.done).length;
 late.forEach(t=>{t.carried=true;tg.sort((a,b)=>load(a)-load(b)||a.day-b.day)[0].tasks.push(t)});
 g.mod=Date.now();save();
}

/* Habits and insights */
const allT=()=>S.goals.flatMap(tasksOf);
function streak(){const set=new Set(allT().filter(t=>t.doneAt).map(t=>t.doneAt));let d=new Date();d.setHours(0,0,0,0);if(!set.has(iso(d)))d.setDate(d.getDate()-1);let n=0;while(set.has(iso(d))){n++;d.setDate(d.getDate()-1)}return n}
function bestDay(){const c=Array(7).fill(0);let n=0;allT().forEach(t=>{if(t.doneAt){c[(new Date(t.doneAt+'T00:00').getDay()+6)%7]++;n++}});return n>=5?c.indexOf(Math.max(...c)):-1}
function history(){return Array.from({length:6},(_,i)=>{const w=mon(new Date());w.setDate(w.getDate()-7*(5-i));const g=weekGoals(w);return{l:w.toLocaleDateString(undefined,{day:'numeric',month:'short'}),v:g.length?avg(g.map(pct)):null}})}

let anim=true,mode='week',tpv=null;const prev={};
function syncSeg(){$('#seg').dataset.m=mode;document.querySelectorAll('#seg button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode))}
function todayHTML(gs,ti){
 const rows=gs.map(g=>({g,t:g.days.filter(d=>d.day===ti).flatMap(d=>d.tasks)})).filter(r=>r.t.length);
 const all=rows.flatMap(r=>r.t),dn=all.filter(t=>t.done).length,q=all.length?Math.round(dn/all.length*100):0,pv=prev.today??0;tpv=q;
 if(!all.length)return `<div class="card empty">Nothing planned for today.<br>Rest up, or add a goal with “+ Goal”.</div>`;
 const e=anim?' enter':'';
 return `<div class="card g${e}${q===100?' win':''}" style="--h:${(new Date().getDate()*37)%360};--i:0"><div class="row nav"><b class="gt">Today · ${DF[ti]}</b><span class="big" data-v="${pv}" data-to="${q}">${pv}%</span></div><div class="mute">${dn} of ${all.length} tasks done</div><div class="bar"><i style="width:${pv}%" data-to="${q}"></i></div></div>`
 +rows.map((r,i)=>`<div class="card g${e}" style="--h:${(gs.indexOf(r.g)*57+150)%360};--i:${i+1}"><div class="row nav"><b class="gt">${esc(r.g.title)}</b><span class="mute">${r.t.filter(t=>t.done).length}/${r.t.length}</span></div>${r.t.map(t=>`<label class="task${t.done?' done':''}"><input type="checkbox" data-g="${r.g.id}" data-t="${t.id}"${t.done?' checked':''}><span>${esc(t.text)}${t.min?` <small class="mute">· ~${t.min} min</small>`:''}${t.carried&&!t.done?' <small class="mute">↩ carried over</small>':''}</span></label>`).join('')}</div>`).join('')}
function setNum(el,v){const f=+el.dataset.v||0;el.dataset.v=v;if(f===v||matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=v+'%';return}const t0=performance.now();(function s(t){const k=Math.min(1,(t-t0)/800),e=1-Math.pow(1-k,3);el.textContent=Math.round(f+(v-f)*e)+'%';if(k<1)requestAnimationFrame(s)})(t0)}
function tail(gs,cur,ti){
 document.querySelectorAll('.dl span').forEach((s,i)=>s.classList.toggle('on',cur&&i===ti));
 requestAnimationFrame(()=>requestAnimationFrame(()=>{document.querySelectorAll('#list .bar i').forEach(i=>i.style.width=i.dataset.to+'%');document.querySelectorAll('#list .big').forEach(n=>setNum(n,+n.dataset.to));gs.forEach(g=>prev[g.id]=pct(g));if(tpv!=null){prev.today=tpv;tpv=null}}));
 anim=false}
function render(){
 const cur=isCur(),ti=tIdx();
 if(cur)weekGoals().forEach(roll);
 const end=new Date(view);end.setDate(end.getDate()+6);
 const f=d=>d.toLocaleDateString(undefined,{day:'numeric',month:'short'}),now=mon(new Date());
 $('#wk').textContent=`${f(view)} – ${f(end)}`;
 $('#wkn').textContent=cur?'This week':view<now?'Past week':'Upcoming week';
 const gs=weekGoals(),op=avg(gs.map(pct));
 const el=cur?Math.min(100,Math.round((Date.now()-view)/(7*864e5)*100)):view<now?100:0;
 setNum($('#op'),op);$('#rf').style.strokeDashoffset=326.7*(1-op/100);setNum($('#tp'),el);$('#tb').style.width=el+'%';$('#dt').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
 const p=$('#pace');let msg='',col='var(--mute)';
 if(gs.length){
  if(op===100){msg='All targets hit. Nice work.';col='var(--ok)'}
  else if(!cur)msg=view<now?`Week finished at ${op}%.`:'Not started yet.';
  else if(op>=el){msg=`On pace: progress is ahead of the clock by ${op-el} points.`;col='var(--ok)'}
  else{const left=gs.flatMap(tasksOf).filter(t=>!t.done).length,dl=7-ti;msg=`Behind pace by ${el-op} points. Catch-up plan: about ${Math.ceil(left/dl)} task${Math.ceil(left/dl)>1?'s':''} a day for the next ${dl} day${dl>1?'s':''}.`;col='var(--bad)'}}
 p.textContent=msg;p.style.color=col;
 $('#list').innerHTML=(mode==='today'&&cur)?todayHTML(gs,ti):gs.length?gs.map((g,gi)=>{const q=pct(g),pv=prev[g.id]??0;
  const days=editId===g.id?editHTML(g):g.days.slice().sort((a,b)=>a.day-b.day).map(d=>`<div class="day${cur&&d.day===ti?' today':''}"><h4>${DF[d.day]}${cur&&d.day===ti?' · today':''}</h4>${d.tasks.map(t=>`<label class="task${t.done?' done':''}"><input type="checkbox" data-g="${g.id}" data-t="${t.id}"${t.done?' checked':''}><span>${esc(t.text)}${t.min?` <small class="mute">· ~${t.min} min</small>`:''}${t.carried&&!t.done?' <small class="mute">↩ carried over</small>':''}</span></label>`).join('')}</div>`).join('');
  return `<div class="card g${anim?' enter':''}${q===100?' win':''}" style="--h:${(gi*57+150)%360};--i:${gi}"><div class="row nav"><b class="gt">${esc(g.title)}</b><span class="big" data-v="${pv}" data-to="${q}">${pv}%</span></div><div class="bar"><i style="width:${pv}%" data-to="${q}"></i></div>${g.warn?`<div class="warn">${esc(g.warn)}</div>`:''}${g.notes?`<div class="notes">${esc(g.notes)}</div>`:''}<div class="days">${days}</div><div class="row" style="margin-top:8px"><button class="ghost" data-edit="${g.id}">${editId===g.id?'Done editing':'Edit'}</button><button class="ghost" data-del="${g.id}">Delete goal</button></div></div>`}).join('')
  :`<div class="card empty">No goals for this week yet.<br>Tap “+ Goal” and describe something big. I’ll split it into daily steps.</div>`;
 const h=history(),mx=Math.max(1,...h.map(x=>x.v||0)),b=bestDay(),s=streak();
 $('#ins').innerHTML=`<b>Insights</b><p>Streak: <b>${s}</b> day${s===1?'':'s'} in a row with at least one task done.</p>${b>=0?`<p>You finish the most on <b>${DF[b]}s</b>. Put your hardest tasks there.</p>`:'<p class="mute">Finish a few tasks and I’ll learn which day you work best.</p>'}<div class="hist${anim?' go':''}">${h.map(x=>`<div><i style="height:${x.v==null?3:Math.max(3,x.v/mx*48)}px;${x.v==null?'opacity:.25':''}"></i>${x.v==null?'–':x.v+'%'}</div>`).join('')}</div><div class="hist" style="height:auto;margin:0">${h.map(x=>`<div>${x.l}</div>`).join('')}</div>`;
 tail(gs,cur,ti);
}

/* Events */
$('#list').addEventListener('change',e=>{const c=e.target;if(!c.dataset.g)return;
 const g=S.goals.find(x=>x.id===c.dataset.g),t=g&&tasksOf(g).find(x=>x.id===c.dataset.t);
 if(t){g.mod=Date.now();t.done=c.checked;t.doneAt=c.checked?iso(new Date()):null;save();c.closest('.task').classList.toggle('done',c.checked);setTimeout(render,340)}});
$('#list').addEventListener('click',e=>{const id=e.target.dataset?.del;if(id&&confirm('Delete this goal?')){S.dead[id]=Date.now();S.goals=S.goals.filter(g=>g.id!==id);save();render()}});
$('#prev').onclick=()=>{view.setDate(view.getDate()-7);mode='week';syncSeg();anim=true;render()};
$('#next').onclick=()=>{view.setDate(view.getDate()+7);mode='week';syncSeg();anim=true;render()};
const opts=DF.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
$('#gs').innerHTML=$('#ge').innerHTML=opts;$('#ge').value=6;
$('#addb').onclick=()=>{$('#ai').classList.remove('open');$('#f').classList.toggle('open');$('#gs').value=isCur()?tIdx():0;$('#ge').value=6};
$('#cancel').onclick=()=>$('#f').classList.remove('open');
$('#f').addEventListener('submit',e=>{
 e.preventDefault();
 const s=+$('#gs').value,en=+$('#ge').value;
 if(en<s){alert('The deadline can’t be before the start day.');return}
 const p={title:$('#gt').value.trim(),n:parseInt($('#gn').value,10)||0,unit:$('#gu').value.trim()||'Part',mpu:parseInt($('#gm').value,10)||0,diff:$('#gh').value,s,e:en,buf:$('#gb').checked,
  lines:$('#gd').value.split('\n').map(x=>x.trim()).filter(Boolean)};
 const r=build(p),g={id:uid(),week:iso(view),title:p.title,notes:p.n>0?p.lines.join('\n'):'',end:en,days:r.days,warn:'',mod:Date.now()};
 if(p.n>0&&p.mpu&&r.work){const need=p.n*p.mpu/60/r.work;
  if(need>S.cfg.hrs)g.warn=`Heads up: this needs about ${need.toFixed(1)} h a day but your limit is ${S.cfg.hrs} h. Try a later deadline, fewer units, or more daily time.`}
 S.goals.push(g);save();anim=true;$('#f').reset();$('#f').classList.remove('open');render();
});

/* Settings, reminders, backup */
$('#ch').value=S.cfg.hrs;$('#cr').value=S.cfg.remind;
$('#ch').onchange=()=>{S.cfg.hrs=Math.max(.5,+$('#ch').value||2);save()};
$('#cr').onchange=()=>{S.cfg.remind=$('#cr').value;save()};
const rs=()=>$('#rs').textContent=!('Notification' in window)?'Not supported here':Notification.permission==='granted'?'Reminders on':Notification.permission==='denied'?'Blocked in browser settings':'';
$('#rem').onclick=async()=>{try{await Notification.requestPermission()}catch{}rs()};rs();
let fired='';
setInterval(()=>{if(!S.cfg.remind||!('Notification' in window)||Notification.permission!=='granted')return;
 const n=new Date(),hm=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0'),k=iso(n)+hm;
 if(hm===S.cfg.remind&&fired!==k){fired=k;const left=weekGoals(mon(n)).flatMap(g=>g.days.filter(d=>d.day===tIdx()).flatMap(d=>d.tasks)).filter(t=>!t.done).length;
  try{new Notification('Week Goals',{body:left?`${left} task${left>1?'s':''} left today. Keep your streak alive.`:'Nothing left today. Nice.'})}catch{}}},20000);
$('#cp').onclick=async()=>{const t=JSON.stringify(S);$('#bk').value=t;try{await navigator.clipboard.writeText(t)}catch{$('#bk').select()}};
$('#rs2').onclick=()=>{try{const r=JSON.parse($('#bk').value);if(!Array.isArray(r.goals))throw 0;
 if(!confirm('Replace everything on this device with the backup?'))return;
 S.goals=r.goals.map(g=>({...g,mod:Date.now()}));Object.assign(S.cfg,r.cfg||{});save();$('#ch').value=S.cfg.hrs;$('#cr').value=S.cfg.remind;render()}catch{alert('That doesn’t look like a valid backup.')}};

/* Install */
let dp=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e});
$('#inst').onclick=()=>{if(dp){dp.prompt();dp=null;return}
 const h=$('#hint');h.innerHTML=/iphone|ipad|ipod/i.test(navigator.userAgent)?'<b>On iPhone/iPad:</b> tap the Share button, then “Add to Home Screen”.':'<b>On Android/Chrome:</b> open the browser menu (⋮), then “Add to Home screen” or “Install app”. On desktop Chrome, use the install icon in the address bar.';h.style.display='block'};
$('#seg').onclick=e=>{const m=e.target.dataset?.m;if(!m)return;mode=m;if(m==='today')view=mon(new Date());syncSeg();anim=true;render()};
const root=document.documentElement,mq=matchMedia('(prefers-color-scheme: dark)'),SUN='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',MOON='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';
const isDark=()=>root.dataset.theme?root.dataset.theme==='dark':mq.matches;
function theme(fade){if(fade){root.classList.add('tt');setTimeout(()=>root.classList.remove('tt'),500)}
 document.querySelector('meta[name=theme-color]').content=isDark()?'#0d1210':'#f3eee4';
 $('#th').innerHTML=`<span class="ico">${isDark()?SUN:MOON}</span>`;$('#th').title=isDark()?'Switch to light mode':'Switch to dark mode'}
$('#th').onclick=()=>{const t=isDark()?'light':'dark';root.dataset.theme=t;try{localStorage.setItem('wkTheme',t)}catch{}theme(true)};
mq.addEventListener?.('change',()=>theme(false));theme(false);
/* Editing, AI import, calendar reminders */
let editId=null,pending=null;
const gById=id=>S.goals.find(g=>g.id===id);
const DOPT=sel=>DF.map((n,i)=>`<option value="${i}"${i===sel?' selected':''}>${n}</option>`).join('');
const touch=g=>{g.mod=Date.now();save()};
const prune=g=>{g.days=g.days.filter(d=>d.tasks.length)};
function putTask(g,day,t){let d=g.days.find(x=>x.day===day);if(!d)g.days.push(d={day,tasks:[]});d.tasks.push(t);g.end=Math.max(g.end??0,day)}
function editHTML(g){
 const ti=isCur()?tIdx():0;
 const rows=g.days.slice().sort((a,b)=>a.day-b.day).map(d=>`<div class="day"><h4>${DF[d.day]}</h4>${d.tasks.map(t=>`<div class="erow"><input type="text" data-eg="${g.id}" data-et="${t.id}" value="${esc(t.text)}" aria-label="Task"><select data-eg="${g.id}" data-mv="${t.id}" aria-label="Move to day">${DOPT(d.day)}</select><button class="ghost" data-dt="${t.id}" data-eg="${g.id}" aria-label="Delete task">✕</button></div>`).join('')}</div>`).join('');
 return `<div class="editbox" style="grid-column:1/-1"><label class="f">Goal name</label><input type="text" data-eg="${g.id}" data-f="title" value="${esc(g.title)}"><label class="f">Notes</label><textarea data-eg="${g.id}" data-f="notes">${esc(g.notes||'')}</textarea><div class="days" style="margin-top:12px">${rows}</div><div class="erow add"><input type="text" id="nt-${g.id}" placeholder="Add a task"><select id="nd-${g.id}">${DOPT(ti)}</select><button class="p" data-add="${g.id}">Add</button></div></div>`}
$('#list').addEventListener('change',e=>{const c=e.target,g=gById(c.dataset.eg);if(!g)return;
 if(c.dataset.f){g[c.dataset.f]=c.value.trim()||(c.dataset.f==='title'?g.title:'');touch(g);return}
 if(c.dataset.et){const t=tasksOf(g).find(x=>x.id===c.dataset.et);if(t&&c.value.trim()){t.text=c.value.trim();touch(g)}return}
 if(c.dataset.mv){let t,from;g.days.forEach(d=>d.tasks.forEach(x=>{if(x.id===c.dataset.mv){t=x;from=d}}));
  if(t){from.tasks=from.tasks.filter(x=>x!==t);putTask(g,+c.value,t);prune(g);touch(g);render()}}});
$('#list').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.edit){editId=editId===d.edit?null:d.edit;render();return}
 if(d.dt){const g=gById(d.eg);g.days.forEach(x=>x.tasks=x.tasks.filter(t=>t.id!==d.dt));prune(g);touch(g);render();return}
 if(d.add){const g=gById(d.add),i=$('#nt-'+d.add),v=i.value.trim();if(!v){i.focus();return}putTask(g,+$('#nd-'+d.add).value,mk(v));touch(g);render()}});

function aiPrompt(){
 const wk=iso(view),ti=isCur()?tIdx():0,hrs=S.cfg.hrs;
 const today=isCur()?`Today is ${DF[ti]} ${iso(new Date())}. Only schedule tasks from ${DF[ti]} onward (day number ${ti} or higher).`:'Plan the whole week, Monday to Sunday.';
 return `You are a planning assistant for my weekly goals app. Help me turn my goals into a realistic day-by-day plan.

HOW TO WORK
1. Ask me what my goals for the week are. If you need more detail, ask at most 5 short questions (deadlines, total amount of work, how hard it is, days I can't work).
2. When you have enough, reply with ONLY one JSON code block in the exact format below. No text before it and no text after it.

MY CONSTRAINTS
- The week starts on Monday ${wk}. ${today}
- I can work about ${hrs} hours per day in total across ALL goals. Never plan more than that on any single day.
- Day numbers: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday.

PLANNING RULES
- Break each big goal into small tasks of 15 to 90 minutes. Start each task with a verb and keep it under 80 characters.
- Put harder work earlier in the week and keep weekends lighter unless I say otherwise.
- Spread the work evenly instead of cramming. End each goal with a short review or finish-line task on its last day.
- When it helps memory, add a quick recap task the day after learning something new.
- Give every task a realistic "minutes" number.
- "difficulty" must be exactly one of: easy, medium, hard.

OUTPUT FORMAT (valid JSON: double quotes, no comments, no trailing commas)
\`\`\`json
{
  "app": "weekgoals",
  "version": 1,
  "week_start": "${wk}",
  "goals": [
    {
      "title": "Short goal name",
      "notes": "One or two lines of tips or context",
      "difficulty": "medium",
      "days": [
        { "day": ${ti}, "tasks": [ { "text": "Do something specific", "minutes": 45 } ] }
      ]
    }
  ]
}
\`\`\`

Now ask me about my goals for the week.`}
function parseAI(txt){
 let s=txt.replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
 const a=s.indexOf('{'),b=s.lastIndexOf('}');
 if(a<0||b<=a)throw new Error('I couldn’t find any JSON in that text. Paste the AI’s code block.');
 s=s.slice(a,b+1);let o;
 try{o=JSON.parse(s)}catch{try{o=JSON.parse(s.replace(/,(\s*[}\]])/g,'$1'))}catch(e){throw new Error('That JSON has a typo ('+e.message+'). Tell the AI: "Fix your JSON and reply with only the code block."')}}
 if(!o||!Array.isArray(o.goals)||!o.goals.length)throw new Error('The JSON has no "goals" list.');
 const warns=[],goals=[];
 o.goals.forEach((g,i)=>{
  const title=String(g&&g.title||'').trim();
  if(!title){warns.push(`Goal ${i+1} has no title and was skipped.`);return}
  const days=[];
  (Array.isArray(g.days)?g.days:[]).forEach(d=>{
   const day=Math.round(Number(d&&d.day));
   if(!(day>=0&&day<=6)){warns.push(`“${title}”: a day number outside 0 to 6 was skipped.`);return}
   const tasks=(Array.isArray(d.tasks)?d.tasks:[]).map(t=>typeof t==='string'?{text:t}:t).filter(t=>t&&String(t.text||'').trim()).map(t=>{const x=mk(String(t.text).trim().slice(0,140)),m=Math.round(Number(t.minutes));if(m>0&&m<1000)x.min=m;return x});
   if(!tasks.length)return;
   let e=days.find(x=>x.day===day);if(!e)days.push(e={day,tasks:[]});e.tasks.push(...tasks)});
  if(!days.length){warns.push(`“${title}” had no usable tasks and was skipped.`);return}
  days.sort((x,y)=>x.day-y.day);
  goals.push({id:uid(),title:title.slice(0,100),notes:String(g.notes||'').trim().slice(0,400),end:days[days.length-1].day,days,warn:'',mod:Date.now()});
 });
 if(!goals.length)throw new Error('No usable goals found in that JSON.');
 const load=Array(7).fill(0);goals.forEach(g=>g.days.forEach(d=>d.tasks.forEach(t=>load[d.day]+=t.min||0)));
 load.forEach((m,i)=>{if(m>S.cfg.hrs*60)warns.push(`${DF[i]} adds up to ${(m/60).toFixed(1)} h, more than your ${S.cfg.hrs} h limit. You can move tasks with Edit after adding.`)});
 let week=iso(view);
 if(typeof o.week_start==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(o.week_start)){const w=mon(new Date(o.week_start+'T00:00'));week=iso(w);if(week!==o.week_start)warns.push('week_start wasn’t a Monday, so I used the Monday of that week.')}
 goals.forEach(g=>g.week=week);
 return{goals,warns,week};
}
$('#aib').onclick=()=>{$('#ai').classList.toggle('open');$('#f').classList.remove('open')};
$('#aicl').onclick=()=>$('#ai').classList.remove('open');
$('#aicp').onclick=async()=>{const t=aiPrompt(),pr=$('#aipr');pr.value=t;
 try{await navigator.clipboard.writeText(t);pr.style.display='none';$('#aist').textContent='Copied. Paste it into your AI chat.'}
 catch{pr.style.display='block';pr.select();$('#aist').textContent='Copy it from the box below.'}};
$('#aipv').onclick=()=>{const out=$('#aiout');
 try{pending=parseAI($('#aiin').value);
  const n=pending.goals.reduce((a,g)=>a+tasksOf(g).length,0);
  out.innerHTML=`<p><b>${pending.goals.length} goal${pending.goals.length>1?'s':''}, ${n} tasks</b> for the week starting ${pending.week}</p><ul>${pending.goals.map(g=>`<li><b>${esc(g.title)}</b>: ${tasksOf(g).length} tasks over ${g.days.length} day${g.days.length>1?'s':''}</li>`).join('')}</ul>${pending.warns.map(w=>`<p class="warn">${esc(w)}</p>`).join('')}`;
  $('#aiadd').style.display='';
 }catch(e){pending=null;$('#aiadd').style.display='none';out.innerHTML=`<p class="warn">${esc(e.message)}</p>`}};
$('#aiadd').onclick=()=>{if(!pending)return;
 S.goals.push(...pending.goals);save();view=mon(new Date(pending.week+'T00:00'));mode='week';syncSeg();anim=true;
 $('#ai').classList.remove('open');$('#aiin').value='';$('#aiout').innerHTML='';$('#aiadd').style.display='none';pending=null;render()};

const ics2=s=>String(s).replace(/[\\;,]/g,'\\$&').replace(/\r?\n/g,'\\n');
const fold=l=>l.length<=74?l:l.match(/.{1,73}/g).join('\r\n ');
function buildICS(){
 const pad=n=>String(n).padStart(2,'0'),[h,m]=(S.cfg.remind||'08:00').split(':').map(Number);
 const fm=x=>`${x.getFullYear()}${pad(x.getMonth()+1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,''),L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Week Goals//EN','CALSCALE:GREGORIAN'];let n=0;
 for(let i=0;i<7;i++){
  if(isCur()&&i<tIdx())continue;
  const d=new Date(view);d.setDate(d.getDate()+i);d.setHours(h,m,0,0);
  const items=[];weekGoals().forEach(g=>g.days.filter(x=>x.day===i).forEach(x=>x.tasks.filter(t=>!t.done).forEach(t=>items.push(g.title+': '+t.text))));
  if(!items.length)continue;n++;
  const e=new Date(d);e.setMinutes(e.getMinutes()+30);
  L.push('BEGIN:VEVENT',`UID:wg-${fm(d).slice(0,8)}@weekgoals`,`DTSTAMP:${stamp}`,`DTSTART:${fm(d)}`,`DTEND:${fm(e)}`,`SUMMARY:${ics2('Week Goals: '+items.length+' task'+(items.length>1?'s':'')+' today')}`,`DESCRIPTION:${ics2(items.map(x=>'- '+x).join('\n'))}`,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Week Goals','TRIGGER:PT0S','END:VALARM','END:VEVENT');
 }
 L.push('END:VCALENDAR');return{text:L.map(fold).join('\r\n')+'\r\n',n};
}
$('#ics').onclick=()=>{const r=buildICS();if(!r.n){alert('Nothing to remind you about in the week you are viewing.');return}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([r.text],{type:'text/calendar'}));a.download='week-goals.ics';document.body.appendChild(a);a.click();a.remove()};

/* Cloud sync (Supabase). Last edit wins, per goal. */
var CFG=window.WG_CONFIG||{},sb=null,sess=null,syncT=null,syncing=false;
var syncOn=!!(CFG.url&&CFG.key&&window.supabase);
function mergeData(a,b){
 const dead={...(b.dead||{}),...(a.dead||{})},m=new Map();
 [...(b.goals||[]),...(a.goals||[])].forEach(g=>{const o=m.get(g.id);if(!o||(g.mod||0)>(o.mod||0))m.set(g.id,g)});
 return{goals:[...m.values()].filter(g=>!dead[g.id]),dead};
}
const say=t=>{$('#sm').textContent=t};
function ui(){
 $('#syncIn').style.display=sess?'none':'block';$('#syncUser').style.display=sess?'block':'none';
 $('#syncOut').textContent=!syncOn?'Cloud sync isn’t set up yet. Add your Supabase details to config.js (see README).':sess?'':'Sign in to link your devices.';
 if(sess)say('Signed in as '+sess.user.email);
}
async function sync(){
 if(!sb||!sess||syncing)return;syncing=true;
 try{
  const {data,error}=await sb.from('goals_state').select('data').eq('user_id',sess.user.id).maybeSingle();
  if(error)throw error;
  const m=data?mergeData(S,data.data||{}):{goals:S.goals,dead:S.dead};
  S.goals=m.goals;S.dead=m.dead;
  try{localStorage.setItem('wkgoals',JSON.stringify(S))}catch{}
  const r2=await sb.from('goals_state').upsert({user_id:sess.user.id,data:{goals:S.goals,dead:S.dead},updated_at:new Date().toISOString()});
  if(r2.error)throw r2.error;
  say('Synced at '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));if(!editId)render();
 }catch(e){say('Sync problem: '+(e.message||e))}finally{syncing=false}
}
function queueSync(){if(!sess)return;clearTimeout(syncT);syncT=setTimeout(sync,1200)}
if(syncOn){
 sb=supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true}});
 sb.auth.getSession().then(({data})=>{sess=data.session;ui();sync()});
 sb.auth.onAuthStateChange((_e,s)=>{sess=s;ui()});
}
ui();
const cred=()=>({email:$('#se').value.trim(),password:$('#sp').value});
$('#sin').onclick=async()=>{if(!sb)return;const {error}=await sb.auth.signInWithPassword(cred());if(error)$('#syncOut').textContent=error.message;else{$('#sp').value='';await sync()}};
$('#sup').onclick=async()=>{if(!sb)return;const {data,error}=await sb.auth.signUp(cred());if(error){$('#syncOut').textContent=error.message;return}
 if(!data.session)$('#syncOut').textContent='Check your email to confirm your account, then press Sign in.';else{$('#sp').value='';await sync()}};
$('#snow').onclick=sync;
$('#sout').onclick=async()=>{await sb.auth.signOut();sess=null;ui()};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
render();

if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
