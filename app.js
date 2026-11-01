'use strict';
const KEY='cal:v1',$=s=>document.querySelector(s),rnd=Math.round;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const isToday=t=>new Date(t).toDateString()===new Date().toDateString();
const TYPES=[['breakfast','Завтрак'],['lunch','Обед'],['dinner','Ужин'],['snack','Перекус']];
const hourType=()=>{const h=new Date().getHours();return h<11?'breakfast':h<16?'lunch':h<21?'dinner':'snack'};
const ic=(p,s=22)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC={
  cam:ic('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'),
  trash:ic('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',20),
  x:ic('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',20),
  img:ic('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',24),
  gear:ic('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',20),
  mode:ic('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',20),
  cl:ic('<path d="m15 18-6-6 6-6"/>',22),
  cr:ic('<path d="m9 18 6-6-6-6"/>',22),
  search:ic('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',24)
};
/* название, ккал, белки, жиры, углеводы — на 100 г (приблизительно) */

 
/* ---------- состояние ---------- */
const defaults=()=>({meals:[],goals:{cal:2000,p:150,f:70,c:200,water:8},settings:{provider:'yandex',proxyUrl:'',theme:'system'},water:{},weights:[],custom:[],profile:{sex:'m',age:30,h:175,w:70,act:1.375,goal:'keep',configured:false},hintHidden:false});
function load(){try{const d=JSON.parse(localStorage.getItem(KEY))||{},b=defaults(),o=d.settings||{};
  const st={...b.settings,...o,provider:'yandex',proxyUrl:o.proxyUrl||''};
  delete st.apiKey;delete st.model;delete st.keys;delete st.models;delete st.folderId;
  return {...b,...d,goals:{...b.goals,...d.goals},settings:st}}catch(e){return defaults()}}
let S=load(),tab='home',stream=null,sc={},mf={};
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Не удалось сохранить: память переполнена')}}
let tt,tfn=null;function toast(m,ms=2800,fn){tfn=fn||null;const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>{t.classList.remove('show');tfn=null},ms)}
const mq=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){const t=S.settings.theme,d=t==='dark'||(t==='system'&&mq.matches);document.documentElement.dataset.theme=d?'dark':'light';$('meta[name=theme-color]').content=d?'#0a1a14':'#eef3ea'}
mq.addEventListener('change',applyTheme);
const dateOf=t=>{const d=new Date(t);return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const addDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return dateOf(d.getTime())};
let day=today();
const dayMeals=dd=>S.meals.filter(m=>dateOf(m.timestamp)===(dd||day));
const kcalOf=m=>m.items.reduce((s,i)=>s+i.calories,0);
function totals(dd){const t={cal:0,p:0,f:0,c:0};dayMeals(dd).forEach(m=>m.items.forEach(i=>{t.cal+=i.calories;t.p+=i.protein;t.f+=i.fat;t.c+=i.carbs}));return t}
const dayLabel=dd=>{const t=today();return dd===t?'Сегодня':dd===addDays(t,-1)?'Вчера':new Date(dd+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'})};
const fmtD=d=>d.slice(8)+'.'+d.slice(5,7);
const weightsSorted=()=>[...S.weights].sort((a,b)=>a.date.localeCompare(b.date));

/* ---------- экраны ---------- */
const standalone=()=>navigator.standalone||matchMedia('(display-mode: standalone)').matches;
const macro=(l,v,g)=>`<div class="m"><span>${l}</span><span class="num">${rnd(v)} / ${g} г</span></div><div class="bar"><i data-w="${Math.min(v/Math.max(g,1),1)*100}"></i></div>`;
function weekCard(){
  const days=Array.from({length:7},(_,i)=>addDays(today(),i-6)),vals=days.map(d=>totals(d).cal),g=S.goals.cal,mx=Math.max(g,...vals,1)*1.1,
    fl=vals.filter(v=>v>0),avg=fl.length?rnd(fl.reduce((a,b)=>a+b,0)/fl.length):0,wd=d=>new Date(d+'T12:00:00').toLocaleDateString('ru-RU',{weekday:'short'}).slice(0,2);
  return `<div class="card"><div class="m"><span>Неделя</span><span class="num">${avg?'в среднем '+avg+' ккал':'пока нет данных'}</span></div><div class="week"><div class="bars">${days.map((d,i)=>`<button class="wd${d===day?' on':''}${vals[i]>g?' over':''}" data-act="goto" data-d="${d}" aria-label="${fmtD(d)}: ${rnd(vals[i])} ккал"><i style="height:0" data-h="${vals[i]/mx*100}"></i></button>`).join('')}<u style="bottom:${g/mx*100}%"></u></div><div class="lbl">${days.map(d=>`<span class="${d===day?'on':''}">${wd(d)}</span>`).join('')}</div></div></div>`;
}
function viewHome(){
  const t=totals(),g=S.goals,left=g.cal-t.cal,C=2*Math.PI*88,p=Math.min(t.cal/Math.max(g.cal,1),1);
  const hint=!standalone()&&!S.hintHidden?`<div class="card hint"><span>Добавь на экран «Домой»: <b>Поделиться → На экран «Домой»</b>. Так данные не сотрутся, а приложение откроется на весь экран.</span><button data-act="hint">Понятно</button></div>`:'';
  const goals={loss:'Похудение',keep:'Поддержание веса',gain:'Набор массы'},pr=S.profile||{};
  const goalCard=`<div class="card goalcard"><div class="m"><b>Моя цель: ${goals[pr.goal]||'Не выбрана'}</b><span class="num">${pr.configured?'Персональная норма':'Настроить'}</span></div>${pr.configured?`<p class="mu">${pr.age} лет · ${pr.h} см · ${pr.w} кг</p>`:'<p class="mu">Рассчитай дневную норму калорий и КБЖУ по своим параметрам.</p>'}<button class="btn wide" data-act="norm">${pr.configured?'Изменить цель и параметры':'Рассчитать мои цели'}</button></div>`;
  return `${hint}${goalCard}<div class="ringwrap"><svg viewBox="0 0 200 200"><circle class="trk" cx="100" cy="100" r="88"/><circle class="arc${left<0?' over':''}" cx="100" cy="100" r="88" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-to="${C*(1-p)}"/></svg><div class="ctr"><small>${left>=0?'Осталось калорий':'Превышение'}</small><b class="num">${Math.abs(rnd(left))}</b><small>съедено ${rnd(t.cal)} из ${g.cal}</small></div></div><div class="card"><h3>КБЖУ за день</h3>${macro('Белки',t.p,g.p)}${macro('Жиры',t.f,g.f)}${macro('Углеводы',t.c,g.c)}</div>${weekCard()}`;
}
function viewDiary(){
  const ms=dayMeals();
  if(!ms.length)return `<div class="empty">${day===today()?'Сегодня':'В этот день'} записей пока нет.<br>Нажми «Добавить еду».</div>`;
  return TYPES.map(([k,l])=>{const list=ms.filter(m=>m.type===k);if(!list.length)return '';
    return `<h3>${l}</h3>`+list.map(m=>{const th=(m.items.find(i=>i.imageUrl)||{}).imageUrl;
      return `<div class="sw"><div class="swbg">${IC.trash}</div><div class="meal" data-act="edit" data-id="${m.id}">${th?`<img src="${esc(th)}" alt="">`:''}<div class="mt"><b>${esc(m.items.map(i=>i.name).join(', '))}</b><small>${new Date(m.timestamp).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</small></div><b class="num">${rnd(kcalOf(m))} ккал</b><button class="ix" data-act="del" data-id="${m.id}" aria-label="Удалить">${IC.trash}</button></div></div>`}).join('')}).join('');
}
function weightChart(a){
  a=a.slice(-30);
  if(a.length<2)return `<p class="mu">${a.length?'Добавь ещё одно взвешивание, и появится график.':'Запиши вес, чтобы появился график.'}</p>`;
  const ks=a.map(x=>x.kg),lo=Math.min(...ks),sp=Math.max(Math.max(...ks)-lo,.5),X=i=>10+i*(280/(a.length-1)),Y=k=>10+(1-(k-lo)/sp)*80,
    d=rnd((a[a.length-1].kg-a[0].kg)*10)/10;
  return `<svg class="wchart" viewBox="0 0 300 100" role="img" aria-label="График веса"><polyline points="${a.map((x,i)=>rnd(X(i))+','+rnd(Y(x.kg))).join(' ')}" fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${a.map((x,i)=>`<circle cx="${rnd(X(i))}" cy="${rnd(Y(x.kg))}" r="3.5" fill="var(--acc)"/>`).join('')}</svg><div class="m"><span>${fmtD(a[0].date)} — ${fmtD(a[a.length-1].date)}</span><span class="num">${d>0?'+':''}${d} кг</span></div>`;
}
function viewHealth(){
  const g=S.goals,w=S.water[day]||0,wl=g.water||8,ws=weightsSorted(),cur=ws[ws.length-1],td=ws.find(x=>x.date===day);
  return `<div class="card"><div class="m"><span>Вода</span><span class="num">${+(w*.25).toFixed(2)} из ${+(wl*.25).toFixed(2)} л</span></div><div class="glasses">${Array.from({length:Math.max(wl,w)},(_,i)=>`<i class="gl${i<w?' on':''}"></i>`).join('')}</div><div class="two"><button class="btn" data-act="wminus"${w?'':' disabled'}>− Стакан</button><button class="btn pri" data-act="wplus">+ Стакан</button></div></div><div class="card"><div class="m"><span>Вес</span><span class="num">${cur?cur.kg+' кг':'нет данных'}</span></div>${weightChart(ws)}<div class="two"><input id="wkg" type="number" inputmode="decimal" step="0.1" min="20" max="400" placeholder="Вес, кг" value="${td?td.kg:''}" aria-label="Вес в килограммах"><button class="btn pri" data-act="wsave">Записать</button></div>${td?`<button class="ix lnk" data-act="wdel">Удалить запись за этот день</button>`:''}</div>`;
}
function render(){
  const t0=today();
  $('#date').textContent=new Date(day+'T12:00:00').toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
  $('#ttl').textContent=dayLabel(day);
  $('#nextbtn').style.visibility=day>=t0?'hidden':'visible';
  document.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
  $('#view').innerHTML=tab==='home'?viewHome():tab==='diary'?viewDiary():viewHealth();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.querySelectorAll('[data-to]').forEach(e=>e.style.strokeDashoffset=e.dataset.to);
    document.querySelectorAll('[data-w]').forEach(e=>e.style.width=e.dataset.w+'%');
    document.querySelectorAll('[data-h]').forEach(e=>e.style.height=e.dataset.h+'%');
  }));
}
function addMeal(items,type){const ts=day===today()?Date.now():new Date(day+'T12:00:00').getTime();S.meals.push({id:uid(),type,items,timestamp:ts});save();closeSheet();tab='diary';render();toast('Добавлено в дневник')}
const chips=(act,sel)=>TYPES.map(([k,l])=>`<button class="chip${k===sel?' on':''}" data-act="${act}" data-k="${k}">${l}</button>`).join('');
 
/* ---------- распознавание ---------- */
const MOCK=[[{name:'Куриная грудка',weight:150,calories:248,protein:46,fat:5,carbs:0},{name:'Рис варёный',weight:100,calories:130,protein:3,fat:0,carbs:28}],[{name:'Овсянка с бананом',weight:250,calories:220,protein:7,fat:4,carbs:40}],[{name:'Пицца',weight:120,calories:319,protein:13,fat:12,carbs:40},{name:'Салат из овощей',weight:100,calories:45,protein:1,fat:3,carbs:4}]];
const PROMPT=`Ты нутрициолог. По фото определи еду и оцени вес порции.
Верни ТОЛЬКО JSON без пояснений и без markdown:
{"items":[{"name":"Название по-русски","weight":150,"calories":248,"protein":46,"fat":5,"carbs":0}]}
weight — граммы, calories — ккал, protein/fat/carbs — граммы; всё для указанного веса порции.
Если на фото нет еды, верни {"items":[]}.`;
const num=v=>Math.max(0,rnd(Number(v)||0));
const curProxy=()=>(S.settings.proxyUrl||'').trim();
function parseItems(text){
  const a=text.indexOf('{'),z=text.lastIndexOf('}'),bad='Не удалось разобрать ответ. Попробуй ещё раз.';
  if(a<0||z<0)throw new Error(bad);
  let j;try{j=JSON.parse(text.slice(a,z+1))}catch(e){throw new Error(bad)}
  return (j.items||[]).map(i=>({name:String(i.name||'Блюдо'),weight:num(i.weight),calories:num(i.calories),protein:num(i.protein),fat:num(i.fat),carbs:num(i.carbs)}));
}
async function recognize(img){
  const proxy=curProxy();
  if(!proxy){await new Promise(r=>setTimeout(r,1200));return JSON.parse(JSON.stringify(MOCK[Math.floor(Math.random()*MOCK.length)]))}
  let res;
  try{res=await fetch(proxy,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:img})})}
  catch(e){throw new Error('Не удалось связаться с сервером-посредником. Проверь URL функции и интернет.')}
  let data={};try{data=await res.json()}catch(e){}
  if(!res.ok)throw new Error(data.error||`Ошибка сервера (${res.status}).`);
  if(!data.items||!Array.isArray(data.items))throw new Error('Сервер вернул ответ в неизвестном формате.');
  return data.items.map(i=>({name:String(i.name||'Блюдо'),weight:num(i.weight),calories:num(i.calories),protein:num(i.protein),fat:num(i.fat),carbs:num(i.carbs)}));
}

/* ---------- сканер ---------- */
function shrink(src,w,h,max,q){const k=Math.min(1,max/Math.max(w,h)),c=document.createElement('canvas');c.width=rnd(w*k);c.height=rnd(h*k);c.getContext('2d').drawImage(src,0,0,c.width,c.height);return c.toDataURL('image/jpeg',q)}
function stopCam(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('#vid').srcObject=null}
function closeScan(){stopCam();$('#scan').hidden=true}
async function openScan(){
  sc={phase:'live',type:hourType(),items:[]};$('#scan').hidden=false;paintScan();
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Камера в браузере недоступна.');
    const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    if($('#scan').hidden){s.getTracks().forEach(t=>t.stop());return}
    stream=s;const v=$('#vid');v.srcObject=s;await v.play().catch(()=>{});
  }catch(e){sc.camErr=(e&&e.name==='NotAllowedError')?'Нет доступа к камере. Разреши его в настройках Safari или выбери фото кнопкой слева.':'Камера недоступна. Выбери или сними фото кнопкой слева.';paintScan()}
}
function paintScan(){
  const s=sc;$('#shot').hidden=s.phase==='live';
  let h=`<button class="rb close" data-act="sclose" aria-label="Закрыть">${IC.x}</button>${curProxy()?'':'<span class="demo">Демо-режим: адрес сервера не задан</span>'}`;
  if(s.phase==='live')h+=(s.camErr?`<p class="camerr">${esc(s.camErr)}</p>`:'<div class="frame"></div>')+`<div class="shutter-row"><label class="rb pick" aria-label="Снять или выбрать фото">${IC.img}<input type="file" accept="image/*" id="pick" style="display:none"></label>${s.camErr?'':'<button class="shutter" data-act="snap" aria-label="Сделать снимок"></button>'}</div>`;
  else if(s.phase==='analyzing')h+='<div class="analyzing"><p class="pulse">Анализируем…</p></div>';
  else if(s.phase==='result')h+=`<div class="panel"><h2>Распознано</h2><ul>${s.items.map((d,i)=>`<li><span>${esc(d.name)} (${d.weight} г) — <b>${d.calories} ккал</b></span><button class="ix" data-act="sfix" data-i="${i}" aria-label="Уточнить по базе продуктов">${IC.search}</button><button class="ix" data-act="sdrop" data-i="${i}" aria-label="Убрать">${IC.x}</button></li>`).join('')}</ul><div class="chips">${chips('stype',s.type)}</div><div class="two"><button class="btn" data-act="smanual">Изменить вручную</button><button class="btn pri" data-act="sok"${s.items.length?'':' disabled'}>Подтвердить</button></div></div>`;
  else h+=`<div class="panel"><p>${esc(s.err)}</p><div class="two"><button class="btn" data-act="smanual">Ввести вручную</button><button class="btn pri" data-act="retry">Повторить</button></div></div>`;
  $('#ui').innerHTML=h;
}
async function analyze(full,small){
  sc.thumb=small;$('#shot').src=full;sc.phase='analyzing';paintScan();
  try{const r=await recognize(full);if($('#scan').hidden)return;if(r.length){sc.items=r;sc.phase='result'}else{sc.err='Еда на фото не найдена. Попробуй ещё раз или введи вручную.';sc.phase='error'}}
  catch(e){if($('#scan').hidden)return;sc.err=e.message||'Не удалось распознать.';sc.phase='error'}
  paintScan();
}
function snap(){const v=$('#vid');if(!v.videoWidth)return;analyze(shrink(v,v.videoWidth,v.videoHeight,1024,.8),shrink(v,v.videoWidth,v.videoHeight,96,.6))}
async function fromFile(f){
  const url=URL.createObjectURL(f),im=new Image();
  try{im.src=url;await im.decode();analyze(shrink(im,im.naturalWidth,im.naturalHeight,1024,.8),shrink(im,im.naturalWidth,im.naturalHeight,96,.6))}
  catch(e){toast('Не удалось открыть фото')}finally{URL.revokeObjectURL(url)}
}
 
/* ---------- шторка: ручной ввод и настройки ---------- */
function showSheet(h){$('#sheetbody').innerHTML=h;$('#sheet').hidden=false}
function closeSheet(){$('#sheet').hidden=true}
/* ---------- поиск продуктов (база foods.js + «Мои продукты») ---------- */
const norm=s=>String(s).toLowerCase().replace(/ё/g,'е');
const stemOf=w=>w.length>5?w.slice(0,-2):w.length>3?w.slice(0,-1):w;
const SYN={мясо:'говядина свинина баранина индейка курица',рыба:'лосось форель треска минтай хек тунец сельдь скумбрия',каша:'гречка овсянка перловка пшено рис булгур кускус',крупа:'гречка рис овсянка перловка пшено булгур кускус',овощи:'огурец помидор перец капуста морковь свёкла кабачок баклажан',фрукты:'яблоко груша банан апельсин мандарин киви виноград персик',ягоды:'клубника малина черника',орехи:'миндаль орех фундук кешью фисташки арахис',сладкое:'шоколад зефир мармелад варенье печенье торт мёд',напитки:'кофе чай сок кола пиво вино',суп:'борщ щи солянка суп',молочка:'молоко кефир творог йогурт сыр сметана',хлеб:'хлеб багет лаваш булочка'};
const DB=typeof FOODDB!=='undefined'?FOODDB:[];
const allFoods=()=>S.custom.map(x=>({...x,own:1})).concat(DB.map(([name,kcal,p,f,c,g,l])=>({name,kcal,p,f,c,g,l})));
function searchFoods(q,limit=8){
  const toks=norm(q).split(/[^а-яa-z0-9%]+/).filter(Boolean).map(t=>SYN[t]?norm(SYN[t]).split(' ').map(stemOf):[stemOf(t)]);
  if(!toks.length)return [];
  const out=[];
  for(const it of allFoods()){
    const n=norm(it.name);let sc=0;
    for(const alts of toks){let best=-1;for(const a of alts){const i=n.indexOf(a);if(i>=0){const v=i===0?3:n[i-1]===' '?2:1;if(v>best)best=v}}if(best<0){sc=-1;break}sc+=best}
    if(sc>=0)out.push([sc+(it.own?2:0)-n.length/100,it]);
  }
  return out.sort((a,b)=>b[0]-a[0]).slice(0,limit).map(x=>x[1]);
}
function recentFoods(){
  const seen=new Set(),out=[];
  for(const m of [...S.meals].reverse())for(const i of m.items){
    const key=norm(i.name);if(seen.has(key)||!(i.weight>0))continue;seen.add(key);
    const k=100/i.weight,r1=v=>rnd(v*k*10)/10;
    out.push({name:i.name,kcal:rnd(i.calories*k),p:r1(i.protein),f:r1(i.fat),c:r1(i.carbs),g:i.weight,l:'порция'});
    if(out.length>=6)return out;
  }
  return out;
}
function paintFound(q){
  const has=q.trim(),list=has?searchFoods(q):recentFoods();mf.list=list;
  $('#found').innerHTML=(!has&&list.length?'<h3>Недавние</h3>':'')+list.map((f,i)=>`<div class="fr"><button data-i="${i}"><span>${f.own?'★ ':''}${esc(f.name)}</span><small>${f.kcal} ккал</small></button>${f.own?`<button class="ix" data-act="cdel" data-i="${i}" aria-label="Убрать из моих продуктов">${IC.x}</button>`:''}</div>`).join('')
    +(has&&!list.length?'<p class="mu">Ничего не найдено. Попробуй другое слово или введи продукт сам.</p>':'')
    +(!has&&!list.length?'<p class="mu">Начни вводить название: гречка, сыр, банан. Можно искать группами: «мясо», «рыба», «фрукты».</p>':'');
}
function openSearch(mode,idx){
  mf={mode:mode||'add',idx,t:hourType(),list:[]};
  const rep=mf.mode==='replace';
  showSheet(`<div class="sh"><h2>${rep?'Уточнить продукт':'Найти продукт'}</h2><button class="ix" data-act="shclose" aria-label="Закрыть">${IC.x}</button></div><input id="q" type="search" enterkeyhint="search" placeholder="Например: гречка, сыр, банан" autocomplete="off" autocapitalize="off"><div class="found" id="found"></div><div id="sel"></div><button class="btn wide" data-act="mcustom">Ввести свой продукт</button>`);
  paintFound('');
  setTimeout(()=>{const q=$('#q');if(q)q.focus()},60);
}
const openManual=()=>openSearch('add');
function pickFood(f){if(f)paintSel(f,mf.mode==='replace'?sc.items[mf.idx].weight:(f.g||100))}
function paintSel(f,w){
  const rep=mf.mode==='replace',num1=(id,l,v)=>`<label>${l}<input id="${id}" type="number" inputmode="decimal" min="0" step="any" value="${v}"></label>`;
  $('#found').innerHTML='';
  $('#sel').innerHTML=`<div class="card res"><input id="mn" value="${esc(f.name)}" maxlength="60" aria-label="Название" placeholder="Название"><div class="two">${num1('mw','Вес, г',w)}${num1('mk','Ккал на 100 г',f.kcal)}</div><div class="three">${num1('mp','Белки',f.p)}${num1('mf2','Жиры',f.f)}${num1('mc','Углеводы',f.c)}</div><small>Белки, жиры и углеводы указаны на 100 г.</small><div class="chips">${[50,100,150,200].map(g=>`<button class="chip" data-act="mw" data-g="${g}">${g} г</button>`).join('')}${f.g&&f.l?`<button class="chip" data-act="mw" data-g="${f.g}">1 ${esc(f.l)} · ${f.g} г</button>`:''}</div><p class="mu" id="mmac"></p>${rep?'':`<div class="chips" id="mchips">${chips('mtype',mf.t)}</div>`}<label class="chk"><input type="checkbox" id="msave"> Запомнить в «Мои продукты»</label><button class="btn pri wide" id="madd" data-act="madd" disabled>Добавить</button></div>`;
  calc();
}
function calc(){
  if(!$('#mw'))return;
  const w=+$('#mw').value||0,k=+$('#mk').value||0,x=w/100,ok=$('#mn').value.trim()&&w>0&&k>=0;
  $('#madd').disabled=!ok;
  $('#madd').textContent=`${mf.mode==='replace'?'Заменить':'Добавить'} · ${rnd(k*x)} ккал`;
  $('#mmac').textContent=`На эту порцию: белки ${rnd((+$('#mp').value||0)*x)} г · жиры ${rnd((+$('#mf2').value||0)*x)} г · углеводы ${rnd((+$('#mc').value||0)*x)} г`;
}
function provHTML(){
  const st=S.settings;
  return `<div class="chips"><span class="chip on">Yandex AI Studio (Qwen)</span></div><label>URL серверной функции Yandex Cloud<input type="url" autocomplete="off" autocapitalize="off" placeholder="https://functions.yandexcloud.net/..." data-s="proxy" value="${esc(st.proxyUrl||'')}"></label><p class="mu">Вставь HTTPS URL функции из Yandex Cloud. API-ключ и Folder ID хранятся только в настройках серверной функции, а не в браузере.</p>`;
}
function openSettings(){
  const g=S.goals,gi=(k,l)=>`<label>${l}<input type="number" inputmode="numeric" min="0" data-g="${k}" value="${g[k]}"></label>`;
  showSheet(`<div class="sh"><h2>Настройки</h2><button class="ix" data-act="shclose" aria-label="Закрыть">${IC.x}</button></div><div class="two">${gi('cal','Калории в день')}${gi('p','Белки, г')}${gi('f','Жиры, г')}${gi('c','Углеводы, г')}${gi('water','Вода, стаканов')}</div><button class="btn wide" data-act="norm">Рассчитать норму по росту и весу</button><h3>Распознавание еды</h3><div id="provbox">${provHTML()}</div><p class="mu">Без URL функции работает демо-режим со случайными блюдами. API-ключ хранится на сервере и не публикуется в GitHub Pages. Оценка калорий по фото приблизительная.</p><div class="two"><button class="btn" data-act="exp">Экспорт</button><button class="btn" data-act="imp">Импорт</button></div><input type="file" id="imp" accept=".json,application/json" style="display:none"><p></p><button class="btn bad wide" data-act="reset">Сбросить выбранный день</button>`);
}
function setSetting(t){if(t.dataset.s==='proxy')S.settings.proxyUrl=t.value.trim();save()}
async function exportData(){
  const data=JSON.stringify({meals:S.meals,goals:S.goals,water:S.water,weights:S.weights,profile:S.profile,custom:S.custom},null,2),name=`calories_${today()}.json`;
  try{const f=new File([data],name,{type:'application/json'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});return}}catch(e){if(e&&e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3);
}
function importData(f){
  const r=new FileReader();
  r.onload=()=>{try{
    const d=JSON.parse(r.result);if(!d||!Array.isArray(d.meals))throw new Error('bad');
    if(!confirm('Заменить текущие данные импортированными?'))return;
    S.meals=d.meals.filter(m=>m&&Array.isArray(m.items)&&TYPES.some(t=>t[0]===m.type)).map(m=>({id:String(m.id||uid()),type:m.type,timestamp:+m.timestamp||Date.now(),items:m.items.map(i=>({id:String(i.id||uid()),name:String(i.name||'Блюдо'),weight:num(i.weight),calories:num(i.calories),protein:num(i.protein),fat:num(i.fat),carbs:num(i.carbs),imageUrl:typeof i.imageUrl==='string'&&i.imageUrl.startsWith('data:image/')?i.imageUrl:undefined}))}));
    if(d.goals&&typeof d.goals==='object')['cal','p','f','c','water'].forEach(k=>{if(d.goals[k]!=null)S.goals[k]=num(d.goals[k])});
    const dt=/^\d{4}-\d{2}-\d{2}$/;
    if(d.water&&typeof d.water==='object'){S.water={};Object.keys(d.water).forEach(k=>{if(dt.test(k))S.water[k]=Math.min(30,num(d.water[k]))})}
    if(Array.isArray(d.weights))S.weights=d.weights.filter(w=>w&&dt.test(String(w.date))&&+w.kg>0).map(w=>({date:w.date,kg:rnd(+w.kg*10)/10}));
    if(d.profile&&typeof d.profile==='object')S.profile={...S.profile,...d.profile};
    if(Array.isArray(d.custom))S.custom=d.custom.filter(x=>x&&x.name).slice(0,200).map(x=>({name:String(x.name).slice(0,60),kcal:num(x.kcal),p:+x.p||0,f:+x.f||0,c:+x.c||0}));
    save();closeSheet();render();toast('Импорт выполнен');
  }catch(e){toast('Не удалось импортировать файл')}};
  r.readAsText(f);
}
 
/* ---------- события ---------- */
const THEME_NAMES={system:'как в системе',light:'светлая',dark:'тёмная'};
const ACT={
  tab(d){tab=d.t;render()},
  theme(){const o=['system','light','dark'];S.settings.theme=o[(o.indexOf(S.settings.theme)+1)%3];save();applyTheme();toast('Тема: '+THEME_NAMES[S.settings.theme])},
  settings:openSettings,scan:openScan,shclose:closeSheet,sclose:closeScan,snap,exp:exportData,
  imp(){$('#imp').click()},
  hint(){S.hintHidden=true;save();render()},
  prev(){day=addDays(day,-1);render()},
  next(){if(day<today()){day=addDays(day,1);render()}},
  gotoday(){day=today();render()},
  goto(d){day=d.d;render()},
  wplus(){S.water[day]=Math.min(30,(S.water[day]||0)+1);save();render()},
  wminus(){S.water[day]=Math.max(0,(S.water[day]||0)-1);save();render()},
  wsave(){const kg=parseFloat(String($('#wkg').value).replace(',','.'));if(!(kg>=20&&kg<=400)){toast('Введи вес от 20 до 400 кг');return}S.weights=S.weights.filter(w=>w.date!==day);S.weights.push({date:day,kg:rnd(kg*10)/10});if(S.profile&&S.profile.configured){S.profile.w=rnd(kg*10)/10;const nr=calcNorm();if(nr)Object.assign(S.goals,{cal:nr.cal,p:nr.p,f:nr.f,c:nr.c})}save();render();toast(S.profile&&S.profile.configured?'Вес записан · цели обновлены':'Вес записан')},
  wdel(){S.weights=S.weights.filter(w=>w.date!==day);save();render()},
  del(d){delMeal(d.id)},
  edit(d){if(!swiped)openEdit(d.id)},
  etype(d){ed.type=d.k;$('#echips').innerHTML=chips('etype',ed.type)},
  edrop(d){ed.items.splice(+d.i,1);paintEdit()},
  edel2(){const id=ed.id;closeSheet();delMeal(id)},
  esave(){const items=ed.items.filter(i=>i.name.trim()).map(({b,...i})=>({...i,name:i.name.trim(),weight:num(i.weight)}));if(!items.length){toast('Добавь название блюда');return}const m=S.meals.find(x=>x.id===ed.id);if(m){m.type=ed.type;m.items=items}save();closeSheet();render();toast('Сохранено')},
  norm:openNorm,
  csex(d){cf.sex=d.k;paintNorm()},
  cact(d){cf.act=+d.k;paintNorm()},
  cgoal(d){cf.goal=d.k;paintNorm()},
  capply(){const r=calcNorm();if(!r){toast('Заполни возраст (от 18), рост и вес');return}Object.assign(S.goals,{cal:r.cal,p:r.p,f:r.f,c:r.c});S.profile={...cf,configured:true};save();closeSheet();render();toast('Цель и нормы КБЖУ обновлены')},
  sdrop(d){sc.items.splice(+d.i,1);paintScan()},
  stype(d){sc.type=d.k;paintScan()},
  retry(){sc.phase='live';paintScan()},
  smanual(){closeScan();openSearch('add')},
  find(){openSearch('add')},
  sfix(d){openSearch('replace',+d.i)},
  mw(d){$('#mw').value=d.g;calc()},
  mcustom(){pickFood({name:($('#q').value||'').trim(),kcal:0,p:0,f:0,c:0})},
  cdel(d){const f=mf.list[+d.i];if(!f)return;S.custom=S.custom.filter(y=>norm(y.name)!==norm(f.name));save();paintFound($('#q').value)},
  sok(){const items=sc.items.map((x,i)=>({...x,id:uid(),imageUrl:i===0?sc.thumb:undefined}));closeScan();addMeal(items,sc.type)},
  mtype(d){mf.t=d.k;$('#mchips').innerHTML=chips('mtype',mf.t)},
  madd(){
    const w=+$('#mw').value,x=w/100,name=$('#mn').value.trim(),k=+$('#mk').value||0,p=+$('#mp').value||0,f=+$('#mf2').value||0,c=+$('#mc').value||0;
    if(!name||!(w>0))return;
    const sv=$('#msave');
    if(sv&&sv.checked){const n=norm(name);S.custom=S.custom.filter(y=>norm(y.name)!==n);S.custom.unshift({name,kcal:k,p,f,c});S.custom=S.custom.slice(0,200)}
    const it={name,weight:w,calories:rnd(k*x),protein:rnd(p*x),fat:rnd(f*x),carbs:rnd(c*x)};
    if(mf.mode==='replace'){sc.items[mf.idx]=it;save();closeSheet();paintScan();toast('Продукт уточнён');return}
    save();addMeal([{...it,id:uid()}],mf.t);
  },
  reset(){if(confirm('Удалить все записи за выбранный день?')){S.meals=S.meals.filter(m=>dateOf(m.timestamp)!==day);save();closeSheet();render();toast('День сброшен')}}
};
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');
  if(b&&ACT[b.dataset.act])ACT[b.dataset.act](b.dataset);
  else if(e.target.id==='sheet')closeSheet();
});
document.addEventListener('input',e=>{
  const id=e.target.id;
  if(id==='q'){$('#sel').innerHTML='';paintFound(e.target.value)}else if(['mn','mw','mk','mp','mf2','mc'].includes(id))calc();
  else if(e.target.dataset&&e.target.dataset.ei!==undefined)editInput(+e.target.dataset.ei,e.target.dataset.ef,e.target.value,e.target);
  else if(e.target.dataset&&e.target.dataset.cf)calcInput(e.target.dataset.cf,e.target.value);
  else if(e.target.dataset&&e.target.dataset.s)setSetting(e.target);
});
document.addEventListener('click',e=>{
  const b=e.target.closest('#found button');if(!b||b.dataset.act||b.dataset.i===undefined)return;pickFood(mf.list[+b.dataset.i]);
});
document.addEventListener('change',e=>{
  const t=e.target,f=t.files&&t.files[0];
  if(t.id==='pick'&&f){t.value='';fromFile(f)}
  else if(t.id==='imp'&&f){t.value='';importData(f)}
  else if(t.dataset.g){S.goals[t.dataset.g]=Math.max(0,+t.value||0);save();render()}
  else if(t.dataset.s)setSetting(t)
});
 
/* ---------- удаление, правка, свайп ---------- */
let undo=null,swiped=false,ed={},cf={},sw=null;
function delMeal(id){
  const i=S.meals.findIndex(m=>m.id===id);if(i<0)return;
  undo=S.meals.splice(i,1)[0];save();render();
  toast('Запись удалена. Нажми, чтобы вернуть',5000,()=>{if(undo){S.meals.push(undo);undo=null;save();render()}});
}
$('#toast').addEventListener('click',()=>{if(tfn){const f=tfn;tfn=null;$('#toast').classList.remove('show');f()}});
function openEdit(id){
  const m=S.meals.find(x=>x.id===id);if(!m)return;
  ed={id,type:m.type,items:m.items.map(i=>({...i,b:{w:i.weight,calories:i.calories,protein:i.protein,fat:i.fat,carbs:i.carbs}}))};paintEdit();
}
function paintEdit(){
  showSheet(`<div class="sh"><h2>Изменить запись</h2><button class="ix" data-act="shclose" aria-label="Закрыть">${IC.x}</button></div>${ed.items.map((it,i)=>`<div class="eit"><input data-ei="${i}" data-ef="n" value="${esc(it.name)}" maxlength="60" aria-label="Название"><div class="two"><label>Вес, г<input data-ei="${i}" data-ef="w" type="number" inputmode="decimal" min="1" value="${it.weight}"></label><label>Ккал<input data-ei="${i}" data-ef="k" type="number" inputmode="decimal" min="0" value="${it.calories}"></label></div>${ed.items.length>1?`<button class="ix lnk" data-act="edrop" data-i="${i}">Убрать позицию</button>`:''}</div>`).join('')}<div class="chips" id="echips">${chips('etype',ed.type)}</div><div class="two"><button class="btn bad" data-act="edel2">Удалить</button><button class="btn pri" data-act="esave">Сохранить</button></div>`);
}
function editInput(i,f,v,inp){
  const it=ed.items[i];if(!it)return;
  if(f==='n')it.name=v;
  else if(f==='k'){it.calories=Math.max(0,rnd(+v||0));it.b={w:it.weight,calories:it.calories,protein:it.protein,fat:it.fat,carbs:it.carbs}}
  else if(f==='w'){const nw=Math.max(0,+v||0);
    if(it.b.w>0&&nw>0){const r=nw/it.b.w;['calories','protein','fat','carbs'].forEach(k=>it[k]=rnd(it.b[k]*r));inp.closest('.eit').querySelector('[data-ef=k]').value=it.calories}
    it.weight=nw}
}
document.addEventListener('pointerdown',e=>{const el=e.target.closest('.meal');if(!el||e.target.closest('button'))return;sw={el,x:e.clientX,y:e.clientY,dx:0,on:false,id:el.dataset.id}});
document.addEventListener('pointermove',e=>{
  if(!sw)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;
  if(!sw.on){if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.5){sw.on=true;sw.el.style.transition='none';try{sw.el.setPointerCapture(e.pointerId)}catch(x){}}else if(Math.abs(dy)>10){sw=null;return}}
  if(sw.on){sw.dx=Math.min(0,dx);sw.el.style.transform=`translateX(${sw.dx}px)`}
});
const swEnd=()=>{
  if(!sw)return;const s=sw;sw=null;if(!s.on)return;
  swiped=true;setTimeout(()=>swiped=false,60);s.el.style.transition='transform .2s ease';
  if(s.dx<-90){s.el.style.transform='translateX(-110%)';setTimeout(()=>delMeal(s.id),180)}else s.el.style.transform='';
};
document.addEventListener('pointerup',swEnd);document.addEventListener('pointercancel',swEnd);

/* ---------- расчёт нормы (формула Миффлина — Сан-Жеора) ---------- */
const SEX=[['m','Мужчина'],['f','Женщина']],ACTV=[[1.2,'Сидячая'],[1.375,'Лёгкая'],[1.55,'Средняя'],[1.725,'Высокая']],GOALS=[['loss','Похудение'],['keep','Поддержание'],['gain','Набор']];
const chipRow=(act,list,sel)=>list.map(([k,l])=>`<button class="chip${String(k)===String(sel)?' on':''}" data-act="${act}" data-k="${k}">${l}</button>`).join('');
function calcNorm(){
  const {sex,age,h,w,act,goal}=cf;
  if(!(age>=18&&age<=100&&h>=100&&h<=250&&w>=30&&w<=300))return null;
  const tdee=(10*w+6.25*h-5*age+(sex==='m'?5:-161))*act,k=goal==='loss'?.85:goal==='gain'?1.1:1,
    cal=Math.max(sex==='m'?1500:1200,rnd(tdee*k/10)*10),p=rnd(w*(goal==='loss'?2:1.8)),f=rnd(cal*.27/9);
  return {cal,p,f,c:Math.max(0,rnd((cal-p*4-f*9)/4))};
}
function normHTML(){
  if(cf.age>0&&cf.age<18)return '<small>Расчёт подходит только для взрослых (от 18 лет).</small>';
  const r=calcNorm();
  return r?`<b class="num">${r.cal} ккал</b><br><small>Белки ${r.p} г · Жиры ${r.f} г · Углеводы ${r.c} г</small><p class="mu">${cf.goal==='loss'?'Умеренный дефицит для снижения веса':cf.goal==='gain'?'Небольшой профицит для набора массы':'Оценка калорий для поддержания веса'}</p>`:'<small>Заполни возраст, рост и вес.</small>';
}
function openNorm(){const ws=weightsSorted();cf={...S.profile,w:ws.length?ws[ws.length-1].kg:S.profile.w};paintNorm()}
function paintNorm(){
  showSheet(`<div class="sh"><h2>Расчёт нормы</h2><button class="ix" data-act="shclose" aria-label="Закрыть">${IC.x}</button></div><h3>Пол</h3><div class="chips">${chipRow('csex',SEX,cf.sex)}</div><div class="two"><label>Возраст<input type="number" inputmode="numeric" data-cf="age" value="${cf.age}"></label><label>Рост, см<input type="number" inputmode="numeric" data-cf="h" value="${cf.h}"></label></div><label>Вес, кг<input type="number" inputmode="decimal" data-cf="w" value="${cf.w}"></label><h3>Активность</h3><div class="chips">${chipRow('cact',ACTV,cf.act)}</div><h3>Цель</h3><div class="chips">${chipRow('cgoal',GOALS,cf.goal)}</div><div class="card res" id="cres">${normHTML()}</div><p class="mu">Расчёт ориентировочный для взрослых по формуле Миффлина — Сан-Жеора. При изменении записанного веса калории и БЖУ будут пересчитаны. Не предназначен для несовершеннолетних, беременности и лечебного питания.</p><button class="btn pri wide" data-act="capply">Применить</button>`);
}
function calcInput(k,v){cf[k]=parseFloat(String(v).replace(',','.'))||0;$('#cres').innerHTML=normHTML()}

/* ---------- запуск ---------- */
$('#prevbtn').innerHTML=IC.cl;$('#nextbtn').innerHTML=IC.cr;$('#findbtn').innerHTML=IC.search;$('#themebtn').innerHTML=IC.mode;$('#setbtn').innerHTML=IC.gear;$('#fabbtn').innerHTML=IC.cam+' Добавить еду';
applyTheme();render();
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
 
