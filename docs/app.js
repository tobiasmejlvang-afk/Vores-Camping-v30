(() => {
'use strict';

const APP_VERSION = '30.2';
const STATE_KEY = 'voresCamping.v30.state';
const API_KEY = 'voresCamping.orsApiKey';
const MAPTILER_KEY = 'voresCamping.mapTilerKey';
const IMG_DB = 'voresCamping.images';
const IMG_STORE = 'images';
const ORS = {
  routing: 'https://api.heigit.org/openrouteservice',
  geocoding: 'https://api.heigit.org/pelias/v1',
  poi: 'https://api.heigit.org/openpoiservice/v0/pois',
  elevation: 'https://api.heigit.org/openelevationservice/v0',
  optimization: 'https://api.heigit.org/vroom/v0'
};
const DEFAULT_RATINGS = [
  ['location','Beliggenhed','map-pin'],['value','Pris & kvalitet','badge-euro'],['clean','Renlighed','sparkles'],
  ['service','Service','hand-heart'],['facilities','Faciliteter','tent-tree'],['dog','Hundevenlighed','dog'],['cycling','Cykelmuligheder','bike']
];
const NAV = [
  ['overblik','Overblik','layout-dashboard'],['besoegte','Besøgte','map-pin-check'],['kort','Kort','map'],['bedste','Bedst bedømte','trophy'],
  ['vil-besoege','Vil besøge','bookmark'],['cykelruter','Cykelruter','bike'],['ferier','Ferier','palmtree'],['album','Ferie Albummet','book-image'],
  ['ferie-vagten','Ferie Vagten','shield-check'],['vejret','Vejrudsigten','cloud-sun'],['indstillinger','Indstillinger','settings']
];
const MAP_STYLES = {
  liberty:'https://tiles.openfreemap.org/styles/liberty',
  bright:'https://tiles.openfreemap.org/styles/bright',
  positron:'https://tiles.openfreemap.org/styles/positron',
  dark:'https://tiles.openfreemap.org/styles/dark',
  fiord:'https://tiles.openfreemap.org/styles/fiord'
};

const uid = (p='id') => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const esc = (s='') => String(s).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
const fmtDate = (d, opts={day:'2-digit',month:'short',year:'numeric'}) => d ? new Intl.DateTimeFormat('da-DK',opts).format(new Date(`${d}T12:00:00`)) : '—';
const fmtNum = (n,d=1) => new Intl.NumberFormat('da-DK',{maximumFractionDigits:d}).format(Number(n)||0);
const daysBetween = (a,b) => Math.ceil((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000);
const today = () => { const d=new Date(), y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; };
const avg = vals => { const v=vals.map(Number).filter(x=>x>0); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0; };
const debounce = (fn,ms=280) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

const emptyState = () => ({
  version: APP_VERSION,
  settings: {
    appName:'Vores Camping', nextTrip:'', showCountdown:true, homeLayout:'normal', mapStyle:'liberty', satelliteStyle:'',
    homeEyebrow:'Den personlige campingbog', homeTitle:'Find én gang. Gem én gang. Brug overalt.',
    homeText:'Campingpladser, ruter, ferier, billeder og minder hænger sammen i ét enkelt campingunivers.', coverPhotoId:'',
    homeSections:{quick:true,slideshow:true,stats:true,countdown:true,map:true,recent:true,best:true,wishes:true,routes:true,guard:true},
    homeOrder:['quick','slideshow','stats','countdown','map','recent','best','wishes','routes'],
    ratingCategories: DEFAULT_RATINGS.map(([id,label,icon])=>({id,label,icon})), autoVacationWatch:true, albumSlideshow:true,
    campDefaultStatus:'visited', campDefaultSort:'recent', visitedLabel:'Besøgt', wishLabel:'Ønskested',
    theme:'camp-light', accent:'#2f5d45', uiScale:1, density:'normal', boxRadius:22, buttonStyle:'soft', iconScale:1, mapHeight:430,
    compressImages:true, imageQuality:.82, imageMax:1800, hgv:{length:'',width:'',height:'',weight:'',axleload:''}
  },
  campgrounds:[], visits:[], vacations:[], routes:[], people:[], pets:[], notes:[], experiences:[], attractions:[], photos:[]
});
let state = loadState();
let routeContext = {};
let activeMaps = [];
let weatherCache = null;
let searchTimer = null;
let dashboardClockTimer = null;
let dashboardSlideTimer = null;

function loadState(){
  let s;
  try { s=JSON.parse(localStorage.getItem(STATE_KEY)); } catch(_){}
  if(!s || typeof s!=='object') s=emptyState();
  const base=emptyState();
  s={...base,...s,settings:{...base.settings,...(s.settings||{})}};
  for(const k of ['campgrounds','visits','vacations','routes','people','pets','notes','experiences','attractions','photos']) if(!Array.isArray(s[k])) s[k]=[];
  if(!Array.isArray(s.settings.ratingCategories) || !s.settings.ratingCategories.length) s.settings.ratingCategories=base.settings.ratingCategories;
  s.version=APP_VERSION;
  return s;
}
function saveState(){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
function getApiKey(){ return localStorage.getItem(API_KEY)||''; }
function setApiKey(v){ if(v) localStorage.setItem(API_KEY,v.trim()); else localStorage.removeItem(API_KEY); }
function getMapTilerKey(){ return localStorage.getItem(MAPTILER_KEY)||''; }
function setMapTilerKey(v){ if(v) localStorage.setItem(MAPTILER_KEY,v.trim()); else localStorage.removeItem(MAPTILER_KEY); }

function migrateLegacy(){
  if(state.campgrounds.length || localStorage.getItem('voresCamping.v30.migrated')) return;
  const keys=['voresCampingData','campingAppData','vc_data','vores-camping-data'];
  for(const key of keys){
    try{
      const old=JSON.parse(localStorage.getItem(key));
      const camps=old?.campgrounds||old?.campingpladser||old?.places;
      if(Array.isArray(camps) && camps.length){
        state.campgrounds=camps.map(c=>({
          id:c.id||uid('camp'),name:c.name||c.navn||'Ukendt campingplads',address:c.address||c.adresse||'',postal:c.postal||c.postnummer||'',city:c.city||c.by||'',
          region:c.region||'',country:c.country||c.land||'',lat:Number(c.lat||c.latitude)||null,lon:Number(c.lon||c.lng||c.longitude)||null,
          status:(c.status==='wish'||c.status==='wanted'||c.vilBesoege)?'wish':'visited',website:c.website||'',phone:c.phone||c.telefon||'',description:c.description||c.beskrivelse||'',
          notes:c.notes||c.noter||'',tags:Array.isArray(c.tags)?c.tags:[],ratings:c.ratings||{},photoIds:[],visitIds:[],vacationIds:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
        }));
        saveState(); toast(`${state.campgrounds.length} ældre campingpladser blev overført.`, 'success'); break;
      }
    }catch(_){}
  }
  localStorage.setItem('voresCamping.v30.migrated','1');
}

function db(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(IMG_DB,1);
    req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(IMG_STORE)) req.result.createObjectStore(IMG_STORE); };
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function putImage(id,blob){ const d=await db(); return new Promise((res,rej)=>{ const tx=d.transaction(IMG_STORE,'readwrite'); tx.objectStore(IMG_STORE).put(blob,id); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
async function getImage(id){ const d=await db(); return new Promise((res,rej)=>{ const r=d.transaction(IMG_STORE).objectStore(IMG_STORE).get(id); r.onsuccess=()=>res(r.result||null); r.onerror=()=>rej(r.error); }); }
async function delImage(id){ const d=await db(); return new Promise((res,rej)=>{ const tx=d.transaction(IMG_STORE,'readwrite'); tx.objectStore(IMG_STORE).delete(id); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
async function imageUrl(id){ const b=await getImage(id); return b?URL.createObjectURL(b):''; }
async function compressImage(file){
  if(!state.settings.compressImages || !file.type.startsWith('image/')) return file;
  const bmp=await createImageBitmap(file); const max=Number(state.settings.imageMax)||1800; const ratio=Math.min(1,max/Math.max(bmp.width,bmp.height));
  const w=Math.round(bmp.width*ratio), h=Math.round(bmp.height*ratio); const c=document.createElement('canvas'); c.width=w;c.height=h; c.getContext('2d').drawImage(bmp,0,0,w,h);
  return new Promise(res=>c.toBlob(b=>res(b||file),'image/jpeg',Number(state.settings.imageQuality)||.82));
}
async function addPhotos(files, link={}){
  const ids=[];
  for(const file of [...files]){
    const id=uid('photo'), blob=await compressImage(file);
    await putImage(id,blob);
    state.photos.push({id,name:file.name||'Billede',type:blob.type||file.type,createdAt:new Date().toISOString(),...link}); ids.push(id);
  }
  saveState(); return ids;
}

function icon(name,cls=''){ return `<i data-lucide="${name}"${cls?` class="${cls}"`:''}></i>`; }
function refreshIcons(){ try{ window.lucide?.createIcons(); }catch(_){} }
function toast(msg,type=''){ const el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=msg; document.getElementById('toastRoot').appendChild(el); setTimeout(()=>el.remove(),3400); }
function closeModal(){ document.getElementById('modalRoot').innerHTML=''; }
function modal(title,body,{size='',footer=''}={}){
  document.getElementById('modalRoot').innerHTML=`<div class="modal-wrap"><div class="modal-backdrop" data-close-modal></div><section class="modal ${size}" role="dialog" aria-modal="true"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close-modal>${icon('x')}</button></div>${body}${footer?`<div class="modal-foot">${footer}</div>`:''}</section></div>`;
  refreshIcons(); document.querySelector('.modal input:not([type=hidden]),.modal select,.modal textarea')?.focus();
}
function confirmBox(title,message,onYes){ modal(title,`<p>${esc(message)}</p>`,{size:'sm',footer:`<button class="btn btn-ghost" data-close-modal>Annuller</button><button class="btn btn-danger" id="confirmYes">${icon('trash-2')} Bekræft</button>`}); document.getElementById('confirmYes').onclick=()=>{closeModal();onYes();}; }
function setRoute(path,ctx={}){ routeContext=ctx; location.hash=`#/${path}`; if(location.hash===`#/${path}`) render(); }

function navHTML(mobile=false){
  const current=(location.hash.split('/')[1]||'overblik').split('?')[0];
  return NAV.map(([id,label,ico])=>`<a href="#/${id}" class="${current===id?'active':''}">${icon(ico)}<span>${label}</span></a>`).join('');
}
function renderNav(){ document.getElementById('topNav').innerHTML=navHTML(); document.getElementById('mobileNav').innerHTML=navHTML(true); refreshIcons(); }

function activeVacation(){ return state.vacations.find(v=>v.status==='active') || null; }
function autoVacationId(){ return state.settings.autoVacationWatch ? (activeVacation()?.id||'') : ''; }
function campgroundRating(c){ return avg(Object.values(c.ratings||{})); }
function latestVisit(campId){ return state.visits.filter(v=>v.campgroundId===campId).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]; }
function countryCount(){ return new Set(state.campgrounds.filter(c=>c.status==='visited'&&c.country).map(c=>c.country.trim().toLowerCase())).size; }
function countdown(){ if(!state.settings.nextTrip) return null; return daysBetween(today(),state.settings.nextTrip); }
function pageHead(title,subtitle='',action=''){ return `<div class="page-head"><div><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${action}</div>`; }
function empty(iconName,title,text,button=''){ return `<div class="empty">${icon(iconName)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${button}</div>`; }
function ratingStars(v){ const r=Math.round(Number(v)||0); return `<span class="rating">${icon('star')} ${v?fmtNum(v,1):'Ikke bedømt'}</span>`; }
function statusChip(status){ return status==='wish'?`<span class="chip wish">${icon('bookmark')} Vil besøge</span>`:`<span class="chip visited">${icon('map-pin-check')} Besøgt</span>`; }

function render(){
  if(dashboardClockTimer){ clearInterval(dashboardClockTimer); dashboardClockTimer=null; }
  activeMaps.forEach(m=>{try{m.remove();}catch(_){}}); activeMaps=[];
  renderNav();
  const hash=(location.hash||'#/overblik').replace(/^#\//,'');
  const [path,...rest]=hash.split('/');
  const main=document.getElementById('mainContent');
  const rail=document.getElementById('sideRail');
  const full=path==='kort'; const showRail=path==='overblik'; main.classList.toggle('full-workspace',full); rail.style.display=showRail?'':'none'; main.style.marginLeft=showRail?'':'0';
  if(path==='campingplads'&&rest[0]) return renderCampDetail(rest[0]);
  const pages={
    overblik:renderDashboard,'besoegte':()=>renderCampList('visited'),'vil-besoege':()=>renderCampList('wish'),kort:renderBigMap,bedste:renderBest,
    cykelruter:renderRoutes,ferier:renderVacations,album:renderAlbums,'ferie-vagten':renderVacationWatch,vejret:renderWeather,indstillinger:renderSettings
  };
  (pages[path]||pages.overblik)();
  main.scrollTop=0; refreshIcons();
}

function bindGlobal(){
  window.addEventListener('hashchange',render);
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-close-modal]')) closeModal();
    if(e.target.closest('[data-close-drawer]')) document.getElementById('mobileDrawer').setAttribute('aria-hidden','true');
    const act=e.target.closest('[data-action]')?.dataset.action; if(act) handleAction(act,e.target.closest('[data-action]'));
    const openCamp=e.target.closest('[data-open-camp]')?.dataset.openCamp; if(openCamp) setRoute(`campingplads/${openCamp}`);
    const photo=e.target.closest('[data-photo]')?.dataset.photo; if(photo) openPhotoViewer(photo);
  });
  document.getElementById('mobileMenuBtn').onclick=()=>{document.getElementById('mobileDrawer').setAttribute('aria-hidden','false');refreshIcons();};
  document.getElementById('globalSearchBtn').onclick=()=>openFindCamp();
  document.getElementById('quickAddBtn').onclick=()=>openQuickAdd();
  document.getElementById('hiddenImageInput').addEventListener('change',async e=>{
    if(!e.target.files.length)return;
    const link={...(routeContext.photoLink||{})};
    if(!link.vacationId && state.settings.autoVacationWatch && activeVacation()) link.vacationId=activeVacation().id;
    const ids=await addPhotos(e.target.files, link);
    if(link.campgroundId){const c=state.campgrounds.find(x=>x.id===link.campgroundId);if(c)c.photoIds=[...new Set([...(c.photoIds||[]),...ids])];}
    if(link.vacationId){const v=state.vacations.find(x=>x.id===link.vacationId);if(v)v.photoIds=[...new Set([...(v.photoIds||[]),...ids])];}
    if(link.routeId){const r=state.routes.find(x=>x.id===link.routeId);if(r){r.photoIds=[...new Set([...(r.photoIds||[]),...ids])];if(Number.isInteger(Number(link.stopIndex))){const si=Number(link.stopIndex);r.stops=r.stops||[];r.stops[si]=r.stops[si]||{index:si,lon:r.coordinates?.[si]?.[0],lat:r.coordinates?.[si]?.[1],note:'',photoIds:[]};r.stops[si].photoIds=[...new Set([...(r.stops[si].photoIds||[]),...ids])];}}}
    saveState(); routeContext.photoLink={}; toast(`${ids.length} billede(r) gemt.`, 'success'); e.target.value=''; render();
  });
  document.getElementById('hiddenImportInput').addEventListener('change',importBackupFile);
}
function handleAction(act,el){
  const map={
    'find-camp':openFindCamp,'add-camp':()=>openCampForm('visited'),'add-wish':()=>openCampForm('wish'),'add-visit':openVisitForm,
    'new-cycle':()=>openRouteForm('cycling'),'add-photo':()=>openPhotoPicker(), 'add-note':openNoteForm,'add-experience':()=>openExperienceForm(),'start-vacation':openVacationForm,'open-map':()=>setRoute('kort')
  }; if(map[act]) map[act]();
}
function openQuickAdd(){
  modal('Hurtig tilføj',`<div class="quick-grid" style="grid-template-columns:repeat(2,1fr)">
    ${[['add-camp','map-pin-plus','Campingplads'],['add-wish','bookmark-plus','Ønskested'],['add-visit','calendar-plus','Besøg'],['new-cycle','bike','Cykelrute'],['add-photo','image-plus','Billede'],['add-note','notebook-pen','Notat'],['add-experience','sparkles','Oplevelse'],['start-vacation','palmtree','Ferie'],['open-map','map','Stort kort']].map(([a,i,l])=>`<button class="quick-card" data-action="${a}">${icon(i)}<b>${l}</b></button>`).join('')}</div>`,{size:'sm'});
}

function renderDashboard(){
  const a=activeVacation(), cd=countdown(); const camps=state.campgrounds.filter(c=>c.status==='visited').length, wishes=state.campgrounds.filter(c=>c.status==='wish').length;
  document.getElementById('mainContent').innerHTML=`<div class="page">
    <section class="hero">
      <div class="hero-card"><div><div class="eyebrow">Den personlige campingbog</div><h1>Find én gang.<br>Gem én gang.<br>Brug overalt.</h1><p>Campingpladser, ruter, ferier, billeder og minder hænger sammen i ét enkelt campingunivers.</p></div>
        <div class="hero-bottom"><div><div id="dashClock" class="clock">--:--</div><div id="dashDate" class="date"></div></div><div id="dashWeather" class="weather-pill">${icon('cloud-sun')} Henter vejret…</div></div>
      </div>
      <div class="guard-card"><div class="guard-copy"><span class="guard-status">${icon(a?'shield-check':'shield')} ${a?'På vagt':'Klar til ferie'}</span><h3>Ferie Vagten</h3><p>${a?`Holder øje med <b>${esc(a.name)}</b> og samler nyt indhold.`:'Start en ferie, så samler Ferie Vagten minderne undervejs.'}</p></div><img src="./assets/ferie-vagten/${a?'clipboard':'ready'}.webp" alt="Ferie Vagten" /><div class="guard-actions">${a?`<button class="btn btn-primary" data-action="open-active-vacation">Åbn ferien</button>`:`<button class="btn btn-primary" data-action="start-vacation">${icon('play')} Start ferie</button>`}</div></div>
    </section>
    <section class="quick-grid">
      ${[['find-camp','search','Find campingplads'],['add-camp','map-pin-plus','Tilføj plads'],['add-visit','calendar-plus','Tilføj besøg'],['new-cycle','bike','Ny cykelrute'],['open-map','map','Åbn stort kort']].map(([a1,i,l])=>`<button class="quick-card" data-action="${a1}">${icon(i)}<b>${l}</b></button>`).join('')}
    </section>
    <section class="stats-grid">
      <div class="stat"><strong>${camps}</strong><span>Besøgte pladser</span></div><div class="stat"><strong>${wishes}</strong><span>På ønskelisten</span></div><div class="stat"><strong>${countryCount()}</strong><span>Besøgte lande</span></div><div class="stat"><strong>${state.routes.filter(r=>r.type==='cycling').length}</strong><span>Cykelruter</span></div><div class="stat"><strong>${state.vacations.length}</strong><span>Ferier</span></div>
    </section>
    ${cd!==null?`<section class="card" style="margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:15px"><div><span class="eyebrow" style="color:var(--green)">Næste campingtur</span><h2 style="margin:4px 0;color:var(--green)">${cd>=0?`${cd} dag${cd===1?'':'e'} tilbage`:'Turen er startet'}</h2><span style="color:var(--muted)">${fmtDate(state.settings.nextTrip)}</span></div>${icon('calendar-heart')}</section>`:''}
    <section class="dashboard-grid">
      <div class="card map-card"><div class="card-head"><h2>Oversigtskort</h2><a href="#/kort">Åbn stort kort →</a></div><div id="dashboardMap" class="map"></div></div>
      <div class="card"><div class="card-head"><h2>Seneste besøg</h2><button class="link" data-action="add-visit">+ Tilføj</button></div><div id="recentVisits">${recentVisitsHTML()}</div></div>
    </section>
    <div class="section-title"><h2>Bedst bedømte</h2><a href="#/bedste" class="btn btn-secondary">Se rangliste</a></div>
    <div class="camp-grid">${topCampsHTML(3)}</div>
  </div>`;
  bindDashboard(); initMap('dashboardMap',{compact:true,routes:[]}); loadCurrentWeather();
}
function bindDashboard(){
  const tick=()=>{const n=new Date(); const c=document.getElementById('dashClock'), d=document.getElementById('dashDate'); if(c)c.textContent=n.toLocaleTimeString('da-DK',{hour:'2-digit',minute:'2-digit'}); if(d)d.textContent=n.toLocaleDateString('da-DK',{weekday:'long',day:'numeric',month:'long'});}; tick(); dashboardClockTimer=setInterval(tick,30000);
  document.querySelector('[data-action="open-active-vacation"]')?.addEventListener('click',()=>{const a=activeVacation(); if(a) openVacationDetail(a.id);});
}
function recentVisitsHTML(){
  const vs=[...state.visits].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
  if(!vs.length) return empty('calendar','Ingen besøg endnu','Når I registrerer et besøg, dukker det op her.');
  return `<div class="list">${vs.map(v=>{const c=state.campgrounds.find(x=>x.id===v.campgroundId); return `<button class="item" style="width:100%;text-align:left" data-open-camp="${c?.id||''}"><div class="item-cover">${icon('tent-tree')}</div><div class="item-main"><div class="item-title">${esc(c?.name||'Campingplads')}</div><div class="item-sub">${fmtDate(v.date)} · ${esc(c?.city||c?.country||'')}</div></div></button>`}).join('')}</div>`;
}
function topCampsHTML(n=3){
  const top=state.campgrounds.filter(c=>c.status==='visited'&&campgroundRating(c)>0).sort((a,b)=>campgroundRating(b)-campgroundRating(a)).slice(0,n);
  if(!top.length) return empty('star','Ingen bedømmelser endnu','Bedøm en besøgt campingplads, så bygger appen automatisk ranglisten.');
  return top.map(c=>campCardHTML(c)).join('');
}

function renderCampList(status){
  const title=status==='visited'?'Besøgte campingpladser':'Campingpladser vi vil besøge';
  const sub=status==='visited'?'Jeres fælles bibliotek over campingpladser og tidligere besøg.':'Gem steder én gang og brug dem direkte i ferie- og ruteplanlægningen.';
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead(title,sub,`<button class="btn btn-primary" data-action="${status==='visited'?'add-camp':'add-wish'}">${icon('plus')} Tilføj</button>`)}
    <div class="toolbar"><div class="searchbox">${icon('search')}<input id="campFilter" placeholder="Søg navn, by, land eller tags…"></div><select id="campSort" class="btn btn-ghost"><option value="recent">Seneste</option><option value="rating">Bedste vurdering</option><option value="name">Navn A–Å</option></select></div>
    <div id="campList"></div></div>`;
  const update=()=>renderCampListBody(status); document.getElementById('campFilter').addEventListener('input',update); document.getElementById('campSort').addEventListener('change',update); update();
}
function renderCampListBody(status){
  const q=(document.getElementById('campFilter')?.value||'').trim().toLowerCase(); const sort=document.getElementById('campSort')?.value||'recent';
  let camps=state.campgrounds.filter(c=>c.status===status).filter(c=>!q||[c.name,c.city,c.region,c.country,...(c.tags||[])].join(' ').toLowerCase().includes(q));
  if(sort==='name') camps.sort((a,b)=>a.name.localeCompare(b.name,'da')); else if(sort==='rating') camps.sort((a,b)=>campgroundRating(b)-campgroundRating(a)); else camps.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  const target=document.getElementById('campList'); if(!camps.length){ target.innerHTML=empty(status==='visited'?'map-pin':'bookmark',status==='visited'?'Ingen besøgte campingpladser endnu':'Ønskelisten er tom',status==='visited'?'Tilføj den første campingplads og begynd jeres campingbog.':'Find et spændende sted og gem det til senere.',`<button class="btn btn-primary" data-action="${status==='visited'?'add-camp':'add-wish'}">${icon('plus')} Tilføj</button>`); refreshIcons(); return; }
  target.innerHTML=`<div class="camp-grid">${camps.map(c=>campCardHTML(c)).join('')}</div>`; bindCampCards(); refreshIcons(); hydrateCampImages(target);
}
function campCardHTML(c){ const v=latestVisit(c.id); return `<article class="camp-card" data-camp-card="${c.id}" tabindex="0"><div class="camp-cover" data-photo-slot="${c.photoIds?.[0]||''}"><div class="camp-status">${statusChip(c.status)}</div></div><div class="camp-body"><h3>${esc(c.name)}</h3><div class="item-sub">${esc([c.city,c.region,c.country].filter(Boolean).join(', '))||'Placering ikke angivet'}</div><div style="margin-top:9px">${ratingStars(campgroundRating(c))}</div><div class="chips">${(c.tags||[]).slice(0,3).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div><div class="camp-meta"><span>${v?`Senest ${fmtDate(v.date)}`:'Intet besøg registreret'}</span><span>${icon('chevron-right')}</span></div></div></article>`; }
function bindCampCards(){ document.querySelectorAll('[data-camp-card]').forEach(el=>{ const open=()=>setRoute(`campingplads/${el.dataset.campCard}`); el.onclick=open; el.onkeydown=e=>{if(e.key==='Enter')open();}; }); }
async function hydrateCampImages(root=document){ for(const el of root.querySelectorAll('[data-photo-slot]')){ const id=el.dataset.photoSlot; if(id){ const u=await imageUrl(id); if(u) el.insertAdjacentHTML('afterbegin',`<img src="${u}" alt="">`); } } }

function campFormHTML(c,status){
  const tags=(c?.tags||[]).join(', '); return `<form id="campForm"><div class="form-grid">
    <div class="field full"><label>Campingpladsens navn *</label><div style="display:flex;gap:8px"><input id="campName" name="name" required value="${esc(c?.name||'')}" placeholder="Søg eller skriv navn"><button class="btn btn-secondary" type="button" id="campLookup">${icon('search')} Find</button></div><div id="campLookupResults"></div></div>
    <div class="field"><label>Status</label><select name="status"><option value="visited" ${(c?.status||status)==='visited'?'selected':''}>Besøgt</option><option value="wish" ${(c?.status||status)==='wish'?'selected':''}>Vil besøge</option></select></div>
    <div class="field"><label>Besøgsdato / forventet dato</label><input type="date" name="date" value="${esc(c?.date||'')}"></div>
    <div class="field full"><label>Adresse</label><input name="address" value="${esc(c?.address||'')}"></div>
    <div class="field"><label>Postnummer</label><input name="postal" value="${esc(c?.postal||'')}"></div><div class="field"><label>By</label><input name="city" value="${esc(c?.city||'')}"></div>
    <div class="field"><label>Region / område</label><input name="region" value="${esc(c?.region||'')}"></div><div class="field"><label>Land</label><input name="country" value="${esc(c?.country||'')}"></div>
    <div class="field"><label>Latitude</label><input name="lat" inputmode="decimal" value="${c?.lat??''}"></div><div class="field"><label>Longitude</label><input name="lon" inputmode="decimal" value="${c?.lon??''}"></div>
    <div class="field"><label>Hjemmeside</label><input name="website" type="url" value="${esc(c?.website||'')}"></div><div class="field"><label>Telefon</label><input name="phone" value="${esc(c?.phone||'')}"></div><div class="field full"><label>Google Maps / eksternt kortlink</label><input name="googleMapsUrl" type="url" value="${esc(c?.googleMapsUrl||'')}" placeholder="https://maps.google.com/…"></div>
    <div class="field full"><label>Tags</label><input name="tags" value="${esc(tags)}" placeholder="Havudsigt, hundevenlig, rolig…"></div>
    <div class="field full"><label>Beskrivelse</label><textarea name="description">${esc(c?.description||'')}</textarea></div><div class="field full"><label>Private noter</label><textarea name="notes">${esc(c?.notes||'')}</textarea></div>
  </div><div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Annuller</button><button class="btn btn-primary" type="submit">${icon('save')} Gem campingplads</button></div></form>`;
}
function openCampForm(status='visited',id=null,prefill={}){
  const c=id?state.campgrounds.find(x=>x.id===id):{...prefill,status}; modal(id?'Redigér campingplads':'Tilføj campingplads',campFormHTML(c,status),{size:'lg'});
  document.getElementById('campForm').onsubmit=e=>{e.preventDefault(); saveCampForm(new FormData(e.currentTarget),id);};
  document.getElementById('campLookup').onclick=()=>lookupCamp(document.getElementById('campName').value,'campLookupResults',true); refreshIcons();
}
function parseCoord(v){ return Number(String(v||'').replace(',','.'))||null; }
function saveCampForm(fd,id){
  const now=new Date().toISOString(); let c=id?state.campgrounds.find(x=>x.id===id):null; const isNew=!c; if(!c){c={id:uid('camp'),ratings:{},photoIds:[],visitIds:[],vacationIds:[],createdAt:now};state.campgrounds.push(c);}
  Object.assign(c,{name:String(fd.get('name')||'').trim(),status:fd.get('status')||'visited',address:String(fd.get('address')||''),postal:String(fd.get('postal')||''),city:String(fd.get('city')||''),region:String(fd.get('region')||''),country:String(fd.get('country')||''),lat:parseCoord(fd.get('lat')),lon:parseCoord(fd.get('lon')),website:String(fd.get('website')||''),phone:String(fd.get('phone')||''),googleMapsUrl:String(fd.get('googleMapsUrl')||''),description:String(fd.get('description')||''),notes:String(fd.get('notes')||''),tags:String(fd.get('tags')||'').split(',').map(x=>x.trim()).filter(Boolean),updatedAt:now});
  const date=String(fd.get('date')||''); if(date && c.status==='visited' && !state.visits.some(v=>v.campgroundId===c.id&&v.date===date)){ const v={id:uid('visit'),campgroundId:c.id,date,vacationId:autoVacationId(),notes:'',photoIds:[],createdAt:now};state.visits.push(v);c.visitIds.push(v.id); if(v.vacationId){c.vacationIds=[...new Set([...(c.vacationIds||[]),v.vacationId])];}}
  saveState(); closeModal(); toast(isNew?'Campingpladsen er gemt.':'Ændringerne er gemt.','success'); setRoute(`campingplads/${c.id}`);
}
async function lookupCamp(q,targetId='campLookupResults',selectIntoForm=false){
  q=(q||'').trim(); if(q.length<2)return; const target=document.getElementById(targetId); if(target) target.innerHTML='<div class="item-sub" style="padding:8px">Søger…</div>';
  const key=getApiKey();
  try{
    let data;
    if(key){ const r=await fetch(`${ORS.geocoding}/autocomplete?text=${encodeURIComponent(q)}&size=8&lang=da`,{headers:{Authorization:key}}); if(!r.ok)throw new Error(`ORS ${r.status}`); data=await r.json(); }
    else { const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=da&format=json`); if(!r.ok)throw new Error('Søgning fejlede'); const j=await r.json(); data={features:(j.results||[]).map(x=>({geometry:{coordinates:[x.longitude,x.latitude]},properties:{name:x.name,locality:x.name,region:x.admin1,country:x.country,label:[x.name,x.admin1,x.country].filter(Boolean).join(', ')}}))}; }
    const feats=data.features||[]; if(!target)return;
    target.innerHTML=feats.length?`<div class="list" style="margin-top:8px">${feats.map((f,i)=>`<button type="button" class="item" style="width:100%;text-align:left" data-lookup-i="${i}"><div class="item-cover">${icon('map-pin')}</div><div class="item-main"><div class="item-title">${esc(f.properties?.name||f.properties?.label||'Resultat')}</div><div class="item-sub">${esc(f.properties?.label||[f.properties?.locality,f.properties?.region,f.properties?.country].filter(Boolean).join(', '))}</div></div></button>`).join('')}</div>`:empty('search-x','Ingen resultater','Prøv et andet navn eller en by.');
    target.querySelectorAll('[data-lookup-i]').forEach(btn=>btn.onclick=()=>{const f=feats[Number(btn.dataset.lookupI)], p=f.properties||{}, co=f.geometry?.coordinates||[]; if(selectIntoForm){const form=document.getElementById('campForm'); form.elements.name.value=p.name||p.label||q; form.elements.address.value=p.street?`${p.street} ${p.housenumber||''}`.trim():(p.label||''); form.elements.city.value=p.locality||p.localadmin||p.county||''; form.elements.region.value=p.region||''; form.elements.country.value=p.country||''; form.elements.postal.value=p.postalcode||''; form.elements.lon.value=co[0]??'';form.elements.lat.value=co[1]??''; target.innerHTML=''; toast('Stedet er udfyldt – ret det gerne til.','success'); } else { openCampForm('wish',null,{name:p.name||q,address:p.label||'',city:p.locality||'',region:p.region||'',country:p.country||'',lon:co[0],lat:co[1]}); }});
    refreshIcons();
  }catch(err){ if(target)target.innerHTML=`<div class="empty"><b>Søgningen kunne ikke gennemføres.</b><p>${esc(err.message)}. Du kan stadig indtaste stedet manuelt.</p></div>`; }
}
function openFindCamp(){ modal('Find campingplads',`<div class="searchbox">${icon('search')}<input id="findCampInput" placeholder="Navn, by, område eller destination"></div><div id="findCampResults" style="margin-top:12px">${empty('map-pin','Søg efter et sted','Har du en ORS-nøgle, bruges dens autocomplete. Ellers bruges en enkel stedssøgning som fallback.')}</div>`,{size:'lg'}); const inp=document.getElementById('findCampInput'); inp.addEventListener('input',debounce(()=>lookupCamp(inp.value,'findCampResults',false),350)); }

function renderCampDetail(id){
  const c=state.campgrounds.find(x=>x.id===id); if(!c){document.getElementById('mainContent').innerHTML=`<div class="page">${empty('map-pin-off','Campingpladsen findes ikke','Den kan være slettet eller være fra en ældre backup.')} </div>`;return;}
  const vs=state.visits.filter(v=>v.campgroundId===id).sort((a,b)=>String(b.date).localeCompare(String(a.date))); const relatedRoutes=state.routes.filter(r=>r.campgroundId===id); const relatedVac=state.vacations.filter(v=>c.vacationIds?.includes(v.id)||vs.some(x=>x.vacationId===v.id));
  document.getElementById('mainContent').innerHTML=`<div class="page">
    <div class="detail-hero" id="detailHero"><div class="detail-overlay"><div><div>${statusChip(c.status)}</div><h1>${esc(c.name)}</h1><div>${esc([c.city,c.region,c.country].filter(Boolean).join(' · '))}</div></div></div></div>
    <div class="toolbar"><button class="btn btn-primary" id="editCamp">${icon('pencil')} Redigér</button><button class="btn btn-secondary" id="campAddVisit">${icon('calendar-plus')} Tilføj besøg</button><button class="btn btn-secondary" id="campAddPhoto">${icon('image-plus')} Billede</button>${c.lat&&c.lon?`<button class="btn btn-secondary" id="nearbyCamp">${icon('scan-search')} Området omkring</button>`:''}${externalMapUrl302(c)?`<a class="btn btn-ghost" target="_blank" rel="noopener" href="${esc(externalMapUrl302(c))}">${icon('external-link')} Google Maps / kortlink</a>`:''}<button class="btn btn-danger" id="deleteCamp">${icon('trash-2')} Slet</button></div>
    <div class="detail-grid">
      <div>
        <section class="card"><div class="card-head"><h2>Oplevelsen</h2>${ratingStars(campgroundRating(c))}</div><p>${esc(c.description||'Ingen beskrivelse endnu.')}</p>${c.notes?`<div class="form-section"><h3>Private noter</h3><p>${esc(c.notes)}</p></div>`:''}<div class="chips">${(c.tags||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div></section>
        <section class="card" style="margin-top:16px"><div class="card-head"><h2>Bedømmelse</h2><span>${campgroundRating(c)?`${fmtNum(campgroundRating(c))} / 5`:'Ikke bedømt'}</span></div><div class="rating-grid">${state.settings.ratingCategories.map(cat=>ratingRowHTML(c,cat)).join('')}</div></section>
        <section class="card" style="margin-top:16px"><div class="card-head"><h2>Billeder og minder</h2><button class="link" id="galleryAdd">+ Tilføj</button></div><div id="campGallery" class="gallery"></div></section>
      </div>
      <div>
        <section class="card map-card"><div class="card-head"><h2>Placering</h2></div><div id="campDetailMap" class="map" style="height:300px"></div></section>
        <section class="card" style="margin-top:16px"><div class="card-head"><h2>Besøg</h2><button class="link" id="visitAdd2">+ Nyt</button></div>${vs.length?`<div class="list">${vs.map(v=>`<div class="item"><div class="item-cover">${icon('calendar-check')}</div><div class="item-main"><div class="item-title">${fmtDate(v.date)}</div><div class="item-sub">${esc(state.vacations.find(x=>x.id===v.vacationId)?.name||'Ikke knyttet til ferie')}</div></div><button class="icon-btn" data-delete-visit="${v.id}">${icon('trash-2')}</button></div>`).join('')}</div>`:empty('calendar','Intet besøg registreret','Tilføj besøgsdato, når stedet er besøgt.')}</section>
        <section class="card" style="margin-top:16px"><div class="card-head"><h2>Sammenhænge</h2></div><div class="list"><div class="item"><div class="item-main"><b>${relatedRoutes.length}</b><div class="item-sub">Ruter knyttet til stedet</div></div></div><div class="item"><div class="item-main"><b>${relatedVac.length}</b><div class="item-sub">Ferier knyttet til stedet</div></div></div></div></section>
      </div>
    </div>
  </div>`;
  document.getElementById('editCamp').onclick=()=>openCampForm(c.status,id); document.getElementById('campAddVisit').onclick=()=>openVisitForm(id); document.getElementById('visitAdd2').onclick=()=>openVisitForm(id); document.getElementById('campAddPhoto').onclick=()=>openPhotoPicker({campgroundId:id}); document.getElementById('galleryAdd').onclick=()=>openPhotoPicker({campgroundId:id}); document.getElementById('nearbyCamp')?.addEventListener('click',()=>openNearby(c));
  document.getElementById('deleteCamp').onclick=()=>confirmBox('Slet campingplads?',`“${c.name}” og dens direkte besøg fjernes. Billeder beholdes kun, hvis de bruges andre steder.`,()=>deleteCamp(id));
  document.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>{c.ratings=c.ratings||{};c.ratings[b.dataset.rate]=Number(b.dataset.value);c.updatedAt=new Date().toISOString();saveState();render();toast('Bedømmelsen er opdateret.','success');});
  document.querySelectorAll('[data-delete-visit]').forEach(b=>b.onclick=()=>confirmBox('Slet besøg?','Besøgsdatoen fjernes fra campingpladsen.',()=>{state.visits=state.visits.filter(v=>v.id!==b.dataset.deleteVisit);c.visitIds=(c.visitIds||[]).filter(x=>x!==b.dataset.deleteVisit);saveState();render();}));
  initMap('campDetailMap',{center:c.lon&&c.lat?[c.lon,c.lat]:null,zoom:13,camps:[c],routes:relatedRoutes}); hydrateDetailHero(c); renderCampGallery(c); refreshIcons();
}
function ratingRowHTML(c,cat){ const v=Number(c.ratings?.[cat.id])||0; return `<div class="rating-row"><span>${icon(cat.icon||'star')} ${esc(cat.label)}</span><span class="stars">${[1,2,3,4,5].map(n=>`<button title="${n} stjerner" class="${n<=v?'on':''}" data-rate="${esc(cat.id)}" data-value="${n}">${icon('star')}</button>`).join('')}</span></div>`; }
async function hydrateDetailHero(c){ if(c.photoIds?.[0]){const u=await imageUrl(c.photoIds[0]); if(u){const hero=document.getElementById('detailHero');hero.insertAdjacentHTML('afterbegin',`<img src="${u}" alt="${esc(c.name)}">`);}} }
async function renderCampGallery(c){ const g=document.getElementById('campGallery'); if(!g)return; const parts=[]; for(const id of c.photoIds||[]){const u=await imageUrl(id); if(u)parts.push(`<button style="border:0;background:none;padding:0" data-photo="${id}"><img src="${u}" alt="Campingminde"></button>`);} parts.push(`<button class="add-photo" id="galleryAddInner">${icon('image-plus')}<span>Tilføj</span></button>`); g.innerHTML=parts.join(''); document.getElementById('galleryAddInner')?.addEventListener('click',()=>openPhotoPicker({campgroundId:c.id})); refreshIcons(); }
function deleteCamp(id){ const c=state.campgrounds.find(x=>x.id===id); state.campgrounds=state.campgrounds.filter(x=>x.id!==id); state.visits=state.visits.filter(v=>v.campgroundId!==id); state.routes.forEach(r=>{if(r.campgroundId===id)r.campgroundId='';}); saveState();toast(`${c?.name||'Campingpladsen'} er slettet.`);setRoute('besoegte'); }
function openVisitForm(campId=''){
  const options=state.campgrounds.map(c=>`<option value="${c.id}" ${c.id===campId?'selected':''}>${esc(c.name)}</option>`).join(''); if(!state.campgrounds.length){toast('Tilføj først en campingplads.','error');openCampForm('visited');return;}
  modal('Tilføj besøg',`<form id="visitForm"><div class="form-grid"><div class="field full"><label>Campingplads *</label><select name="campgroundId" required>${options}</select></div><div class="field"><label>Dato *</label><input type="date" name="date" required value="${today()}"></div><div class="field"><label>Ferie</label><select name="vacationId"><option value="">Ingen</option>${state.vacations.map(v=>`<option value="${v.id}" ${autoVacationId()===v.id?'selected':''}>${esc(v.name)}</option>`).join('')}</select></div><div class="field full"><label>Noter</label><textarea name="notes"></textarea></div></div><div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Annuller</button><button class="btn btn-primary" type="submit">${icon('save')} Gem besøg</button></div></form>`,{size:'sm'});
  document.getElementById('visitForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget), cid=String(fd.get('campgroundId')), vid=String(fd.get('vacationId')||''), c=state.campgrounds.find(x=>x.id===cid); const v={id:uid('visit'),campgroundId:cid,date:String(fd.get('date')),vacationId:vid,notes:String(fd.get('notes')||''),photoIds:[],createdAt:new Date().toISOString()};state.visits.push(v);c.status='visited';c.visitIds=[...(c.visitIds||[]),v.id];if(vid)c.vacationIds=[...new Set([...(c.vacationIds||[]),vid])];c.updatedAt=new Date().toISOString();saveState();closeModal();toast('Besøget er gemt og genbruges automatisk i appen.','success');setRoute(`campingplads/${cid}`);};
}
function openPhotoPicker(link={}){ routeContext.photoLink=link; document.getElementById('hiddenImageInput').click(); }
function photoContextIds(photo){
  if(!photo)return [];
  const same=state.photos.filter(p=>(photo.campgroundId&&p.campgroundId===photo.campgroundId)||(photo.vacationId&&p.vacationId===photo.vacationId)||(photo.routeId&&p.routeId===photo.routeId));
  return (same.length?same:state.photos).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))).map(p=>p.id);
}
async function openPhotoViewer(id){
  const photo=state.photos.find(p=>p.id===id); if(!photo)return;
  const url=await imageUrl(id); if(!url){toast('Billedfilen kunne ikke findes.','error');return;}
  const ids=photoContextIds(photo),idx=ids.indexOf(id),camp=state.campgrounds.find(c=>c.id===photo.campgroundId),vac=state.vacations.find(v=>v.id===photo.vacationId),route=state.routes.find(r=>r.id===photo.routeId);
  modal('Billede',`<div class="photo-viewer"><img src="${url}" alt="${esc(photo.name||'Campingminde')}"><div class="photo-meta"><b>${esc(photo.name||'Campingminde')}</b><span>${[camp?.name,vac?.name,route?.name].filter(Boolean).map(esc).join(' · ')||'Ikke tilknyttet'}</span></div></div><div class="modal-foot"><button class="btn btn-danger" id="photoDelete">${icon('trash-2')} Fjern billede</button><span style="flex:1"></span>${ids.length>1?`<button class="btn btn-secondary" id="photoPrev" ${idx<=0?'disabled':''}>${icon('chevron-left')} Forrige</button><button class="btn btn-secondary" id="photoNext" ${idx>=ids.length-1?'disabled':''}>Næste ${icon('chevron-right')}</button>`:''}<button class="btn btn-ghost" data-close-modal>Luk</button></div>`,{size:'lg'});
  document.getElementById('photoPrev')?.addEventListener('click',()=>openPhotoViewer(ids[idx-1]));
  document.getElementById('photoNext')?.addEventListener('click',()=>openPhotoViewer(ids[idx+1]));
  document.getElementById('photoDelete').onclick=()=>confirmBox('Fjern billede?','Billedet fjernes fra alle steder i Vores Camping.',()=>removePhoto(id)); refreshIcons();
}
async function removePhoto(id){
  try{await delImage(id);}catch(_){}
  state.photos=state.photos.filter(p=>p.id!==id);
  for(const collection of [state.campgrounds,state.vacations,state.routes,state.visits]) for(const item of collection) if(Array.isArray(item.photoIds)) item.photoIds=item.photoIds.filter(x=>x!==id);
  for(const r of state.routes) for(const stop of r.stops||[]) if(Array.isArray(stop.photoIds)) stop.photoIds=stop.photoIds.filter(x=>x!==id);
  saveState();closeModal();toast('Billedet er fjernet.','success');render();
}
function openExperienceForm(vacationId=''){
  const a=state.settings.autoVacationWatch?activeVacation():null, selected=vacationId||a?.id||'';
  modal('Tilføj oplevelse',`<form id="experienceForm"><div class="form-grid"><div class="field full"><label>Oplevelse / titel *</label><input name="title" required placeholder="Fx Solnedgang ved Vesterhavet"></div><div class="field"><label>Dato</label><input type="date" name="date" value="${today()}"></div><div class="field"><label>Ferie</label><select name="vacationId"><option value="">Ingen</option>${state.vacations.map(v=>`<option value="${v.id}" ${selected===v.id?'selected':''}>${esc(v.name)}</option>`).join('')}</select></div><div class="field full"><label>Campingplads</label><select name="campgroundId"><option value="">Ingen</option>${state.campgrounds.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><div class="field full"><label>Noter</label><textarea name="notes"></textarea></div></div><div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Annuller</button><button class="btn btn-primary" type="submit">${icon('save')} Gem oplevelse</button></div></form>`,{size:'sm'});
  document.getElementById('experienceForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);state.experiences.push({id:uid('exp'),title:String(fd.get('title')),date:String(fd.get('date')||today()),vacationId:String(fd.get('vacationId')||''),campgroundId:String(fd.get('campgroundId')||''),notes:String(fd.get('notes')||''),photoIds:[],createdAt:new Date().toISOString()});saveState();closeModal();toast('Oplevelsen er gemt.','success');render();};
}
function openNoteForm(){
  const a=state.settings.autoVacationWatch?activeVacation():null; modal('Tilføj notat',`<form id="noteForm"><div class="field"><label>Notat</label><textarea name="text" required autofocus></textarea></div><div class="field" style="margin-top:10px"><label>Tilknyt ferie</label><select name="vacationId"><option value="">Ingen</option>${state.vacations.map(v=>`<option value="${v.id}" ${a?.id===v.id?'selected':''}>${esc(v.name)}</option>`).join('')}</select></div><div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Annuller</button><button class="btn btn-primary" type="submit">Gem</button></div></form>`,{size:'sm'}); document.getElementById('noteForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);state.notes.push({id:uid('note'),text:String(fd.get('text')),vacationId:String(fd.get('vacationId')||''),createdAt:new Date().toISOString()});saveState();closeModal();toast('Notatet er gemt.','success');render();}; }

function renderBest(){
  const camps=state.campgrounds.filter(c=>c.status==='visited'&&campgroundRating(c)>0).sort((a,b)=>campgroundRating(b)-campgroundRating(a));
  const winners=state.settings.ratingCategories.map(cat=>{const ranked=state.campgrounds.filter(c=>c.status==='visited'&&Number(c.ratings?.[cat.id])>0).sort((a,b)=>Number(b.ratings?.[cat.id])-Number(a.ratings?.[cat.id]));return {cat,camp:ranked[0]};}).filter(x=>x.camp);
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead('Bedst bedømte','Ranglisten opdateres automatisk, hver gang I bedømmer en campingplads.')}${camps.length?`<div class="rank-podium">${camps.slice(0,3).map((c,i)=>`<button class="podium ${i===0?'first':''}" data-camp-card="${c.id}"><div class="medal">${['🥇','🥈','🥉'][i]}</div><h3>${esc(c.name)}</h3><strong>${fmtNum(campgroundRating(c))}</strong><div class="item-sub">ud af 5</div></button>`).join('')}</div><div class="card"><div class="card-head"><h2>Hele ranglisten</h2></div><div class="list">${camps.map((c,i)=>`<button class="item" data-camp-card="${c.id}" style="width:100%;text-align:left"><span class="badge">${i+1}</span><div class="item-main"><div class="item-title">${esc(c.name)}</div><div class="item-sub">${esc([c.city,c.country].filter(Boolean).join(', '))}</div></div>${ratingStars(campgroundRating(c))}</button>`).join('')}</div></div>${winners.length?`<div class="section-title"><h2>Bedst i hver kategori</h2></div><div class="camp-grid">${winners.map(({cat,camp})=>`<button class="category-winner card" data-camp-card="${camp.id}"><div class="item-cover">${icon(cat.icon||'star')}</div><div><span class="eyebrow" style="color:var(--green)">${esc(cat.label)}</span><h3>${esc(camp.name)}</h3><strong>${fmtNum(camp.ratings?.[cat.id])} / 5</strong></div></button>`).join('')}</div>`:''}`:empty('trophy','Ranglisten er klar, men tom','Bedøm mindst én besøgt campingplads for at komme i gang.')}</div>`; bindCampCards(); refreshIcons();
}
function renderBigMap(){
  document.getElementById('mainContent').innerHTML=`<section class="map-page"><div id="bigMap" class="map large"></div><div class="map-ui"><div class="map-panel map-search"><input id="mapSearchInput" placeholder="Søg campingplads, by eller destination…"><div id="mapSearchResults"></div></div><div class="map-panel map-tools"><button id="mapLocate" title="Min placering">${icon('locate-fixed')}</button><button id="mapFit" title="Vis alle markører">${icon('scan')}</button><button id="mapStyleBtn" title="Kortstil">${icon('layers')}</button><button id="mapRangeBtn" title="Rækkeviddekort">${icon('radar')}</button><button id="mapRouteBtn" title="Planlæg rute">${icon('route')}</button></div></div><div class="map-legend"><span><i class="dot green"></i>Besøgt</span><span><i class="dot yellow"></i>Vil besøge</span><span><i class="dot blue"></i>Rute</span></div></section>`;
  const m=initMap('bigMap',{all:true,clickToAdd:true});
  document.getElementById('mapSearchInput').addEventListener('input',debounce(()=>mapSearch(document.getElementById('mapSearchInput').value,m),330));
  document.getElementById('mapLocate').onclick=()=>locateOnMap(m); document.getElementById('mapFit').onclick=()=>fitMapToCamps(m,state.campgrounds); document.getElementById('mapStyleBtn').onclick=()=>openMapStylePicker(m); document.getElementById('mapRangeBtn').onclick=()=>openIsochrone(m); document.getElementById('mapRouteBtn').onclick=()=>openRouteForm('route'); refreshIcons();
}
function getMapStyle(){
  const key=getMapTilerKey();
  if(state.settings.mapStyle==='satellite'&&key) return `https://api.maptiler.com/maps/satellite-v4/style.json?key=${encodeURIComponent(key)}`;
  if(state.settings.mapStyle==='hybrid'&&key) return `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${encodeURIComponent(key)}`;
  if(state.settings.mapStyle==='custom'&&state.settings.satelliteStyle) return state.settings.satelliteStyle;
  return MAP_STYLES[state.settings.mapStyle]||MAP_STYLES.liberty;
}
function initMap(containerId,opts={}){
  const el=document.getElementById(containerId); if(!el)return null;
  if(!window.maplibregl){el.innerHTML=`<div class="map-fallback">${icon('map-off')}<div><b>Kortbiblioteket kunne ikke indlæses.</b><br>Campingdata og resten af appen virker stadig.</div></div>`;refreshIcons();return null;}
  try{
    const center=opts.center||[9.5,56.1]; const m=new maplibregl.Map({container:containerId,style:getMapStyle(),center,zoom:opts.zoom||5.7,attributionControl:true}); activeMaps.push(m);
    m.addControl(new maplibregl.NavigationControl({showCompass:true}),'bottom-right');
    m.on('load',()=>{
      const camps=opts.camps||state.campgrounds; addCampMarkers(m,camps); addRouteLayers(m,opts.routes ?? state.routes);
      if(!opts.center && camps.filter(c=>c.lat&&c.lon).length) fitMapToCamps(m,camps,opts.compact?55:80);
    });
    if(opts.clickToAdd) m.on('click',e=>{ if(e.originalEvent?.target?.closest?.('.marker'))return; const {lng,lat}=e.lngLat; const token=uid('map'); new maplibregl.Popup({closeButton:true}).setLngLat([lng,lat]).setHTML(`<div><b>Nyt punkt</b><p style="font-size:12px">${lat.toFixed(5)}, ${lng.toFixed(5)}</p><button class="btn btn-primary" data-map-save="${token}">Gem som campingplads</button></div>`).addTo(m); setTimeout(()=>document.querySelector(`[data-map-save="${token}"]`)?.addEventListener('click',()=>openCampFromMapPoint(lng,lat)),0); });
    return m;
  }catch(err){el.innerHTML=`<div class="map-fallback"><div><b>Kortet kunne ikke startes.</b><br>${esc(err.message)}</div></div>`;return null;}
}

async function openCampFromMapPoint(lon,lat){
  const prefill={lon,lat};
  if(getApiKey()){
    try{const r=await fetch(`${ORS.geocoding}/reverse?point.lon=${encodeURIComponent(lon)}&point.lat=${encodeURIComponent(lat)}&size=1&lang=da`,{headers:{Authorization:getApiKey()}});if(r.ok){const j=await r.json(),f=j.features?.[0],p=f?.properties||{};Object.assign(prefill,{name:p.name||'',address:p.label||'',city:p.locality||p.localadmin||'',region:p.region||'',country:p.country||'',postal:p.postalcode||''});}}catch(_){}
  }
  openCampForm('wish',null,prefill);
}

function addCampMarkers(m,camps){
  camps.filter(c=>Number.isFinite(Number(c.lon))&&Number.isFinite(Number(c.lat))).forEach(c=>{
    const el=document.createElement('button');el.className=`marker ${c.status==='wish'?'wish':'visited'}`;el.innerHTML='<span>⌂</span>';el.title=c.name;el.setAttribute('aria-label',c.name);
    const pop=new maplibregl.Popup({offset:26}).setHTML(`<div><b>${esc(c.name)}</b><div style="font-size:11px;color:#6f7b74;margin:3px 0 9px">${esc([c.city,c.country].filter(Boolean).join(', '))}</div><button class="btn btn-secondary" data-popup-camp="${c.id}">Åbn detaljer</button></div>`);
    new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([Number(c.lon),Number(c.lat)]).setPopup(pop).addTo(m);
    el.addEventListener('click',()=>setTimeout(()=>document.querySelector(`[data-popup-camp="${c.id}"]`)?.addEventListener('click',()=>setRoute(`campingplads/${c.id}`)),0));
  });
}
function addRouteLayers(m,routes){
  routes.filter(r=>r.geojson?.geometry||r.geojson?.features).forEach((r,i)=>{
    try{const id=`route-${i}-${r.id}`;m.addSource(id,{type:'geojson',data:r.geojson});m.addLayer({id,type:'line',source:id,paint:{'line-width':5,'line-opacity':.78}});}catch(_){}
  });
}
function fitMapToCamps(m,camps,pad=70){
  if(!m)return; const pts=camps.filter(c=>c.lat&&c.lon).map(c=>[Number(c.lon),Number(c.lat)]); if(!pts.length)return; if(pts.length===1){m.flyTo({center:pts[0],zoom:12});return;} const b=new maplibregl.LngLatBounds();pts.forEach(p=>b.extend(p));m.fitBounds(b,{padding:pad,maxZoom:13,duration:650});
}
function locateOnMap(m){ if(!m)return; if(!navigator.geolocation){toast('Enheden understøtter ikke positionsdeling.','error');return;} navigator.geolocation.getCurrentPosition(p=>{m.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:13});new maplibregl.Marker().setLngLat([p.coords.longitude,p.coords.latitude]).setPopup(new maplibregl.Popup().setText('Din aktuelle placering')).addTo(m);},()=>toast('Placeringen kunne ikke hentes.','error'),{enableHighAccuracy:true,timeout:8000}); }
async function mapSearch(q,m){
  const box=document.getElementById('mapSearchResults'); if(!box||q.trim().length<2){if(box)box.innerHTML='';return;} const local=state.campgrounds.filter(c=>[c.name,c.city,c.region,c.country].join(' ').toLowerCase().includes(q.toLowerCase())).slice(0,5);
  box.innerHTML=local.map(c=>`<button class="item" style="width:100%;text-align:left;margin-top:5px" data-map-local="${c.id}"><div class="item-main"><div class="item-title">${esc(c.name)}</div><div class="item-sub">Gemt i Vores Camping</div></div></button>`).join('');
  box.querySelectorAll('[data-map-local]').forEach(b=>b.onclick=()=>{const c=state.campgrounds.find(x=>x.id===b.dataset.mapLocal);if(c?.lon&&c?.lat)m?.flyTo({center:[c.lon,c.lat],zoom:13});box.innerHTML='';});
  if(getApiKey()){
    try{const r=await fetch(`${ORS.geocoding}/autocomplete?text=${encodeURIComponent(q)}&size=5&lang=da`,{headers:{Authorization:getApiKey()}});if(r.ok){const j=await r.json();(j.features||[]).slice(0,5).forEach((f,i)=>{const btn=document.createElement('button');btn.className='item';btn.style.cssText='width:100%;text-align:left;margin-top:5px';btn.innerHTML=`<div class="item-main"><div class="item-title">${esc(f.properties?.name||f.properties?.label||q)}</div><div class="item-sub">${esc(f.properties?.label||'Søgeresultat')}</div></div>`;btn.onclick=()=>{m?.flyTo({center:f.geometry.coordinates,zoom:13});box.innerHTML='';};box.appendChild(btn);});}}
    catch(_){}
  }
}
function openMapStylePicker(m){
  const extra=[['satellite','Satellit','MapTiler Satellite v4'],['hybrid','Satellit + veje','MapTiler Hybrid v4'],['custom','Egen MapLibre-style','Bruger style-URL fra Indstillinger']];
  modal('Vælg kortstil',`<div class="list">${Object.keys(MAP_STYLES).map(k=>`<button class="item" style="width:100%;text-align:left" data-style="${k}"><div class="item-main"><div class="item-title">${k[0].toUpperCase()+k.slice(1)}</div><div class="item-sub">OpenFreeMap</div></div>${state.settings.mapStyle===k?icon('check'):''}</button>`).join('')}${extra.map(([k,l,sub])=>`<button class="item" style="width:100%;text-align:left" data-style="${k}"><div class="item-main"><div class="item-title">${l}</div><div class="item-sub">${sub}</div></div>${state.settings.mapStyle===k?icon('check'):''}</button>`).join('')}</div>`,{size:'sm'});
  document.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{const k=b.dataset.style;if((k==='satellite'||k==='hybrid')&&!getMapTilerKey()){closeModal();toast('Tilføj først MapTiler API-nøglen under Indstillinger → Kort.','error');setRoute('indstillinger');return;}if(k==='custom'&&!state.settings.satelliteStyle){closeModal();toast('Tilføj først en MapLibre style-URL under Indstillinger → Kort.','error');setRoute('indstillinger');return;}state.settings.mapStyle=k;saveState();closeModal();try{m?.setStyle(getMapStyle());m?.once('style.load',()=>{addCampMarkers(m,state.campgrounds);addRouteLayers(m,state.routes);});}catch(_){}toast('Kortstilen er skiftet.','success');});
}
function openRouteForm(type='route',id=null){
  const r=id?state.routes.find(x=>x.id===id):null; const a=state.settings.autoVacationWatch?activeVacation():null; const profileDefault=type==='cycling'?'cycling-regular':'driving-car';
  modal(id?(type==='cycling'?'Redigér cykelrute':'Redigér rute'):(type==='cycling'?'Ny cykelrute':'Planlæg rute'),`<form id="routeForm"><div class="route-builder"><div><div class="form-grid">
    <div class="field full"><label>Rutenavn *</label><input name="name" required value="${esc(r?.name||'')}"></div><div class="field"><label>Dato</label><input name="date" type="date" value="${esc(r?.date||today())}"></div><div class="field"><label>Profil</label><select name="profile">${routeProfiles(type).map(([v,l])=>`<option value="${v}" ${(r?.profile||profileDefault)===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="field full"><label>Campingplads</label><select name="campgroundId"><option value="">Ingen</option>${state.campgrounds.map(c=>`<option value="${c.id}" ${r?.campgroundId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field full"><label>Ferie</label><select name="vacationId"><option value="">Ingen</option>${state.vacations.map(v=>`<option value="${v.id}" ${(r?.vacationId||a?.id)===v.id?'selected':''}>${esc(v.name)}</option>`).join('')}</select></div>
    ${type==='cycling'?`<div class="field"><label>Sværhedsgrad</label><select name="difficulty">${['Let','Mellem','Svær'].map(x=>`<option ${String(r?.difficulty||'Let')===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field full"><label>Cykler på turen</label><div id="bikeList" class="bike-list"></div><button class="btn btn-secondary" type="button" id="addBike">${icon('plus')} Tilføj cykel</button></div>`:''}
    <div class="field full"><label>Rutevalg</label><div class="chips"><label class="chip"><input type="checkbox" name="avoidMotorways" ${r?.avoidFeatures?.includes('highways')?'checked':''}> Undgå motorveje</label><label class="chip"><input type="checkbox" name="avoidTolls" ${r?.avoidFeatures?.includes('tollways')?'checked':''}> Undgå betalingsveje</label><label class="chip"><input type="checkbox" name="avoidFerries" ${r?.avoidFeatures?.includes('ferries')?'checked':''}> Undgå færger</label></div></div>
    <div class="field full"><label>Beskrivelse / noter</label><textarea name="description">${esc(r?.description||'')}</textarea></div>
  </div><div class="form-section"><h3>Rutepunkter</h3><div id="waypointList" class="waypoint-list"></div><div style="display:flex;gap:8px;margin-top:9px"><button class="btn btn-secondary" type="button" id="addWaypoint">${icon('plus')} Tilføj punkt</button><button class="btn btn-ghost" type="button" id="useCampAsStart">${icon('tent-tree')} Start ved campingplads</button></div></div><div class="form-section"><div id="routeCalcState" class="empty" style="padding:16px">Klik på kortet eller tilføj mindst 2 punkter.</div></div></div><div id="routeBuilderMap" class="route-map"></div></div><div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Annuller</button><button class="btn btn-secondary" type="button" id="calculateRoute">${icon('route')} Beregn</button><button class="btn btn-primary" type="submit">${icon('save')} Gem rute</button></div></form>`,{size:'lg'});
  let points=(r?.coordinates||[]).map(p=>[Number(p[0]),Number(p[1])]);
  let bikes=type==='cycling' ? ((r?.bikes?.length?r.bikes:[{id:uid('bike'),type:'regular',rangeStart:null,rangeEnd:null}]).map(b=>({...b}))) : [];
  const rm=initRouteBuilderMap(points,p=>{points.push([p.lng,p.lat]);renderWaypoints();drawBuilderPoints(rm,points);});
  function renderBikes(){
    const box=document.getElementById('bikeList'); if(!box)return;
    box.innerHTML=bikes.map((b,i)=>`<div class="bike-row"><div class="field"><label>Cykel ${i+1}</label><select data-bike-type="${i}"><option value="regular" ${b.type==='regular'?'selected':''}>Almindelig cykel</option><option value="electric" ${b.type==='electric'?'selected':''}>Elcykel</option></select></div><div class="field"><label>Rækkevidde start (km)</label><input data-bike-start="${i}" type="number" min="0" value="${b.rangeStart??''}"></div><div class="field"><label>Rækkevidde slut (km)</label><input data-bike-end="${i}" type="number" min="0" value="${b.rangeEnd??''}"></div>${bikes.length>1?`<button class="icon-btn" type="button" data-del-bike="${i}" title="Fjern cykel">${icon('trash-2')}</button>`:''}</div>`).join('');
    box.querySelectorAll('[data-bike-type]').forEach(el=>el.onchange=()=>{bikes[Number(el.dataset.bikeType)].type=el.value;});
    box.querySelectorAll('[data-bike-start]').forEach(el=>el.onchange=()=>{bikes[Number(el.dataset.bikeStart)].rangeStart=el.value===''?null:Number(el.value);});
    box.querySelectorAll('[data-bike-end]').forEach(el=>el.onchange=()=>{bikes[Number(el.dataset.bikeEnd)].rangeEnd=el.value===''?null:Number(el.value);});
    box.querySelectorAll('[data-del-bike]').forEach(el=>el.onclick=()=>{bikes.splice(Number(el.dataset.delBike),1);renderBikes();}); refreshIcons();
  }
  if(type==='cycling'){renderBikes();document.getElementById('addBike').onclick=()=>{bikes.push({id:uid('bike'),type:'regular',rangeStart:null,rangeEnd:null});renderBikes();};}
  function renderWaypoints(){const list=document.getElementById('waypointList');list.innerHTML=points.map((p,i)=>`<div class="waypoint"><b>${i+1}</b><input class="field" style="flex:1;border:1px solid var(--line);border-radius:10px;padding:8px" value="${p[1].toFixed(5)}, ${p[0].toFixed(5)}" data-wp="${i}"><button class="icon-btn" type="button" data-del-wp="${i}">${icon('x')}</button></div>`).join('')||'<div class="item-sub">Ingen punkter endnu.</div>'; list.querySelectorAll('[data-del-wp]').forEach(b=>b.onclick=()=>{points.splice(Number(b.dataset.delWp),1);renderWaypoints();drawBuilderPoints(rm,points);}); list.querySelectorAll('[data-wp]').forEach(inp=>inp.onchange=()=>{const [la,lo]=inp.value.split(',').map(parseCoord);if(la&&lo){points[Number(inp.dataset.wp)]=[lo,la];drawBuilderPoints(rm,points);}});refreshIcons();}
  renderWaypoints(); document.getElementById('addWaypoint').onclick=()=>{points.push([9.5,56.1]);renderWaypoints();drawBuilderPoints(rm,points);}; document.getElementById('useCampAsStart').onclick=()=>{const cid=document.getElementById('routeForm').elements.campgroundId.value,c=state.campgrounds.find(x=>x.id===cid);if(c?.lon&&c?.lat){points.unshift([Number(c.lon),Number(c.lat)]);renderWaypoints();drawBuilderPoints(rm,points);}else toast('Vælg en campingplads med koordinater.','error');};
  document.getElementById('calculateRoute').onclick=()=>calculateRoute(points,document.getElementById('routeForm').elements.profile.value,rm);
  document.getElementById('routeForm').onsubmit=e=>{e.preventDefault();saveRouteForm(new FormData(e.currentTarget),points,type,id,rm?._lastRouteGeoJSON||r?.geojson||null,bikes);}; refreshIcons();
}
function routeProfiles(type){ return type==='cycling'?[['cycling-regular','Almindelig cykel'],['cycling-electric','Elcykel'],['cycling-road','Landevejscykel'],['cycling-mountain','Mountainbike'],['foot-walking','Gang'],['foot-hiking','Vandring']]:[['driving-car','Bil'],['driving-hgv','Bil + campingvogn / stort køretøj'],['cycling-regular','Cykel'],['cycling-electric','Elcykel'],['foot-walking','Gang'],['foot-hiking','Vandring'],['wheelchair','Kørestol']]; }
function initRouteBuilderMap(points,onClick){ const m=initMap('routeBuilderMap',{center:points[0]||null,zoom:points.length?11:6}); if(m){m.on('load',()=>drawBuilderPoints(m,points));m.on('click',e=>onClick(e.lngLat));} return m; }
function drawBuilderPoints(m,points){ if(!m||!m.loaded())return; const data={type:'FeatureCollection',features:points.map((p,i)=>({type:'Feature',geometry:{type:'Point',coordinates:p},properties:{n:i+1}}))}; try{if(m.getSource('builder-points'))m.getSource('builder-points').setData(data);else{m.addSource('builder-points',{type:'geojson',data});m.addLayer({id:'builder-points',type:'circle',source:'builder-points',paint:{'circle-radius':8,'circle-stroke-width':3,'circle-stroke-color':'#ffffff'}});}}catch(_){} if(points.length>1){const b=new maplibregl.LngLatBounds();points.forEach(p=>b.extend(p));m.fitBounds(b,{padding:60,maxZoom:13});}}
async function calculateRoute(points,profile,m){
  const box=document.getElementById('routeCalcState'); if(points.length<2){toast('Ruten skal have mindst start og destination.','error');return;} if(!getApiKey()){box.innerHTML=`<b>ORS API-nøgle mangler.</b><p>Rutepunkterne kan stadig gemmes. Tilføj nøglen under Indstillinger for beregnet distance, tid og rutelinje.</p>`;return;}
  box.innerHTML='Beregner ruten…'; try{const form=document.getElementById('routeForm'), avoid=[];if(form?.elements.avoidMotorways?.checked)avoid.push('highways');if(form?.elements.avoidTolls?.checked)avoid.push('tollways');if(form?.elements.avoidFerries?.checked)avoid.push('ferries');const body={coordinates:points,preference:'recommended',instructions:true,elevation:true,language:'da'};if(avoid.length)body.options={avoid_features:avoid};if(profile==='driving-hgv'){const h=state.settings.hgv||{};body.options=body.options||{};Object.assign(body.options,{vehicle_type:'goods',profile_params:{restrictions:{}}});for(const k of ['length','width','height','weight','axleload'])if(Number(h[k]))body.options.profile_params.restrictions[k]=Number(h[k]);} const res=await fetch(`${ORS.routing}/v2/directions/${encodeURIComponent(profile)}/geojson`,{method:'POST',headers:{Authorization:getApiKey(),'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok)throw new Error(`ORS svarede ${res.status}`);const geo=await res.json();m._lastRouteGeoJSON=geo;drawCalculatedRoute(m,geo);const s=geo.features?.[0]?.properties?.summary||{};box.innerHTML=`<div class="route-summary"><div><strong>${fmtNum((s.distance||0)/1000)} km</strong><span>Distance</span></div><div><strong>${formatDuration(s.duration||0)}</strong><span>Beregnet tid</span></div></div>`;}
  catch(err){box.innerHTML=`<b>Ruten kunne ikke beregnes.</b><p>${esc(err.message)}</p>`;toast('ORS-ruteberegningen fejlede, men resten af appen virker.','error');}
}
function drawCalculatedRoute(m,geo){ if(!m)return;try{if(m.getLayer('calculated-route'))m.removeLayer('calculated-route');if(m.getSource('calculated-route'))m.removeSource('calculated-route');m.addSource('calculated-route',{type:'geojson',data:geo});m.addLayer({id:'calculated-route',type:'line',source:'calculated-route',paint:{'line-width':6,'line-opacity':.9}});const coords=geo.features?.[0]?.geometry?.coordinates||[];if(coords.length){const b=new maplibregl.LngLatBounds();coords.forEach(p=>b.extend(p));m.fitBounds(b,{padding:55});}}catch(_){} }
function formatDuration(sec){sec=Number(sec)||0;const h=Math.floor(sec/3600),m=Math.round((sec%3600)/60);return h?`${h} t ${m} min`:`${m} min`;}
function saveRouteForm(fd,points,type,id,geo,bikes=[]){
  let r=id?state.routes.find(x=>x.id===id):null;
  if(!r){r={id:uid('route'),type,photoIds:[],stops:[],createdAt:new Date().toISOString()};state.routes.push(r);}
  const summary=geo?.features?.[0]?.properties?.summary||{};
  const existingStops=Array.isArray(r.stops)?r.stops:[];
  const stops=points.map((p,i)=>({...existingStops[i],index:i,lon:Number(p[0]),lat:Number(p[1]),note:existingStops[i]?.note||'',photoIds:Array.isArray(existingStops[i]?.photoIds)?existingStops[i].photoIds:[]}));
  Object.assign(r,{name:String(fd.get('name')),date:String(fd.get('date')||today()),profile:String(fd.get('profile')),campgroundId:String(fd.get('campgroundId')||''),vacationId:String(fd.get('vacationId')||''),difficulty:type==='cycling'?String(fd.get('difficulty')||'Let'):'',description:String(fd.get('description')||''),avoidFeatures:[fd.get('avoidMotorways')==='on'?'highways':'',fd.get('avoidTolls')==='on'?'tollways':'',fd.get('avoidFerries')==='on'?'ferries':''].filter(Boolean),coordinates:points,stops,geojson:geo,distance:Number(summary.distance)||r.distance||0,duration:Number(summary.duration)||r.duration||0,bikes:type==='cycling'?bikes.map(b=>({id:b.id||uid('bike'),type:b.type||'regular',rangeStart:b.rangeStart==null?null:Number(b.rangeStart),rangeEnd:b.rangeEnd==null?null:Number(b.rangeEnd)})):[],updatedAt:new Date().toISOString()});
  saveState();closeModal();toast('Ruten er gemt og kan bruges på tværs af appen.','success');setRoute('cykelruter');
}
function renderRoutes(){
  const routes=[...state.routes].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead('Cykelruter & ture','Planlæg på kortet, gem turen én gang og knyt den til campingplads og ferie.',`<div style="display:flex;gap:8px"><button class="btn btn-secondary" id="newDriveRoute">${icon('route')} Ny rute</button><button class="btn btn-primary" data-action="new-cycle">${icon('bike')} Ny cykelrute</button></div>`)}
    ${routes.length?`<div class="list">${routes.map(r=>{const c=state.campgrounds.find(x=>x.id===r.campgroundId),v=state.vacations.find(x=>x.id===r.vacationId);return `<div class="item"><div class="item-cover">${icon(r.type==='cycling'?'bike':'route')}</div><div class="item-main"><div class="item-title">${esc(r.name)}</div><div class="item-sub">${fmtDate(r.date)} · ${r.distance?`${fmtNum(r.distance/1000)} km · ${formatDuration(r.duration)}`:'Rutepunkter gemt'}${c?` · ${esc(c.name)}`:''}${v?` · ${esc(v.name)}`:''}</div><div class="chips"><span class="chip">${esc(r.profile||'')}</span>${r.difficulty?`<span class="chip">${esc(r.difficulty)}</span>`:''}</div></div><div class="item-actions"><button class="icon-btn" data-view-route="${r.id}" title="Åbn">${icon('eye')}</button><button class="icon-btn" data-share-route="${r.id}" title="Del">${icon('share-2')}</button><button class="icon-btn" data-edit-route="${r.id}" title="Redigér">${icon('pencil')}</button><button class="icon-btn" data-route-photo="${r.id}" title="Tilføj billede">${icon('image-plus')}</button><button class="icon-btn" data-delete-route="${r.id}" title="Slet">${icon('trash-2')}</button></div></div>`}).join('')}</div>`:empty('bike','Ingen ruter endnu','Opret jeres første cykelrute eller køretur direkte på kortet.',`<button class="btn btn-primary" data-action="new-cycle">${icon('plus')} Ny cykelrute</button>`)}</div>`;
  document.getElementById('newDriveRoute')?.addEventListener('click',()=>openRouteForm('route'));
  document.querySelectorAll('[data-view-route]').forEach(b=>b.onclick=()=>openRouteDetail(b.dataset.viewRoute));
  document.querySelectorAll('[data-share-route]').forEach(b=>b.onclick=()=>shareRoute(b.dataset.shareRoute));
  document.querySelectorAll('[data-edit-route]').forEach(b=>b.onclick=()=>{const r=state.routes.find(x=>x.id===b.dataset.editRoute);openRouteForm(r?.type||'route',r?.id)});
  document.querySelectorAll('[data-route-photo]').forEach(b=>b.onclick=()=>openPhotoPicker({routeId:b.dataset.routePhoto}));
  document.querySelectorAll('[data-delete-route]').forEach(b=>b.onclick=()=>confirmBox('Slet rute?','Ruten fjernes, men campingpladser og ferie bevares.',()=>{state.routes=state.routes.filter(r=>r.id!==b.dataset.deleteRoute);saveState();render();toast('Ruten er slettet.');}));refreshIcons();
}

async function shareRoute(id){
  const r=state.routes.find(x=>x.id===id);if(!r)return;const text=`${r.name} – ${fmtDate(r.date)}${r.distance?` – ${fmtNum(r.distance/1000)} km`:''}${r.duration?` – ${formatDuration(r.duration)}`:''}`;
  try{if(navigator.share)await navigator.share({title:r.name,text});else if(navigator.clipboard){await navigator.clipboard.writeText(text);toast('Ruteoplysninger kopieret til udklipsholderen.','success');}else toast(text,'success');}catch(err){if(err?.name!=='AbortError')toast('Ruten kunne ikke deles.','error');}
}
function openRouteDetail(id){
  const r=state.routes.find(x=>x.id===id);if(!r)return;const camp=state.campgrounds.find(c=>c.id===r.campgroundId),vac=state.vacations.find(v=>v.id===r.vacationId),stops=(r.stops?.length?r.stops:(r.coordinates||[]).map((p,i)=>({index:i,lon:p[0],lat:p[1],note:'',photoIds:[]})));
  modal(r.name,`<div class="route-summary"><div><strong>${r.distance?`${fmtNum(r.distance/1000)} km`:'—'}</strong><span>Distance</span></div><div><strong>${r.duration?formatDuration(r.duration):'—'}</strong><span>Beregnet tid</span></div></div><div class="chips" style="margin:12px 0"><span class="chip">${esc(r.profile||'')}</span>${r.difficulty?`<span class="chip">${esc(r.difficulty)}</span>`:''}${camp?`<span class="chip">${esc(camp.name)}</span>`:''}${vac?`<span class="chip">${esc(vac.name)}</span>`:''}</div>${r.bikes?.length?`<div class="form-section"><h3>Cykler</h3><div class="chips">${r.bikes.map((b,i)=>`<span class="chip">Cykel ${i+1}: ${b.type==='electric'?'Elcykel':'Almindelig'}${b.type==='electric'&&b.rangeStart!=null?` · ${b.rangeStart}→${b.rangeEnd??'?'} km`:''}</span>`).join('')}</div></div>`:''}<div class="form-section"><div class="card-head"><h3>Rutestop & minder</h3><button class="btn btn-secondary" id="routeShare">${icon('share-2')} Del rute</button></div><div class="list">${stops.map((st,i)=>`<div class="item route-stop"><div class="item-cover">${i+1}</div><div class="item-main"><div class="item-title">${i===0?'Start':i===stops.length-1?'Destination':`Stop ${i+1}`}</div><div class="item-sub">${Number(st.lat).toFixed(5)}, ${Number(st.lon).toFixed(5)}</div><input data-stop-note="${i}" value="${esc(st.note||'')}" placeholder="Notat ved stoppet…" style="width:100%;margin-top:7px;border:1px solid var(--line);border-radius:9px;padding:7px"><div class="stop-photos gallery" data-stop-photos="${i}"></div></div><button class="icon-btn" data-stop-add-photo="${i}" title="Billede ved stop">${icon('image-plus')}</button></div>`).join('')}</div></div><div class="modal-foot"><button class="btn btn-secondary" id="routeEdit">${icon('pencil')} Redigér</button><button class="btn btn-ghost" data-close-modal>Luk</button></div>`,{size:'lg'});
  r.stops=stops;saveState();
  document.getElementById('routeShare').onclick=()=>shareRoute(id);document.getElementById('routeEdit').onclick=()=>{closeModal();openRouteForm(r.type||'route',id);};
  document.querySelectorAll('[data-stop-note]').forEach(el=>el.onchange=()=>{r.stops[Number(el.dataset.stopNote)].note=el.value;saveState();});
  document.querySelectorAll('[data-stop-add-photo]').forEach(el=>el.onclick=()=>{const si=Number(el.dataset.stopAddPhoto);closeModal();openPhotoPicker({routeId:id,stopIndex:si});});
  hydrateRouteStopPhotos(r);refreshIcons();
}
async function hydrateRouteStopPhotos(r){
  for(const box of document.querySelectorAll('[data-stop-photos]')){const stop=r.stops?.[Number(box.dataset.stopPhotos)];const parts=[];for(const pid of stop?.photoIds||[]){const u=await imageUrl(pid);if(u)parts.push(`<button data-photo="${pid}" class="mini-photo"><img src="${u}" alt="Ruteminde"></button>`);}box.innerHTML=parts.join('');}refreshIcons();
}

function openVacationForm(id=null){
  const v=id?state.vacations.find(x=>x.id===id):null;
  modal(id?'Redigér ferie':'Start / opret ferie',`<form id="vacationForm"><div class="form-grid"><div class="field full"><label>Ferie-/turnavn *</label><input name="name" required value="${esc(v?.name||'')}"></div><div class="field"><label>Startdato *</label><input type="date" name="startDate" required value="${esc(v?.startDate||today())}"></div><div class="field"><label>Slutdato</label><input type="date" name="endDate" value="${esc(v?.endDate||'')}"></div><div class="field full"><label>Destination</label><input name="destination" value="${esc(v?.destination||'')}"></div><div class="field full"><label>Deltagere</label><select name="participantIds" multiple size="4">${state.people.map(p=>`<option value="${p.id}" ${v?.participantIds?.includes(p.id)?'selected':''}>${esc(p.name)}</option>`).join('')}</select><small>Personer oprettes under Indstillinger.</small></div><div class="field full"><label>Kæledyr</label><select name="petIds" multiple size="3">${state.pets.map(p=>`<option value="${p.id}" ${v?.petIds?.includes(p.id)?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field full"><label>Noter</label><textarea name="notes">${esc(v?.notes||'')}</textarea></div><div class="field full"><label><input type="checkbox" name="activate" ${v?.status==='active'||!id?'checked':''}> Aktivér Ferie Vagten for denne ferie</label></div></div><div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Annuller</button><button class="btn btn-primary" type="submit">${icon('save')} Gem ferie</button></div></form>`,{size:'lg'});
  document.getElementById('vacationForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);let x=v;if(!x){x={id:uid('vac'),photoIds:[],createdAt:new Date().toISOString()};state.vacations.push(x);} const activate=fd.get('activate')==='on';if(activate)state.vacations.forEach(z=>{if(z.id!==x.id&&z.status==='active')z.status='done';});Object.assign(x,{name:String(fd.get('name')),startDate:String(fd.get('startDate')),endDate:String(fd.get('endDate')||''),destination:String(fd.get('destination')||''),participantIds:fd.getAll('participantIds').map(String),petIds:fd.getAll('petIds').map(String),notes:String(fd.get('notes')||''),status:activate?'active':(x.status||'planned'),updatedAt:new Date().toISOString()});saveState();closeModal();toast(activate?'Ferien er startet – Ferie Vagten er på vagt.':'Ferien er gemt.','success');setRoute('ferier');};
}
function renderVacations(){
  const vs=[...state.vacations].sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate)));
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead('Vores Ferier','Ferien er beholderen, der binder campingpladser, ruter, billeder, noter og minder sammen.',`<button class="btn btn-primary" data-action="start-vacation">${icon('plus')} Opret ferie</button>`)}${vs.length?`<div class="camp-grid">${vs.map(v=>vacationCardHTML(v)).join('')}</div>`:empty('palmtree','Ingen ferier endnu','Opret næste campingtur. Ferie Vagten kan derefter samle nyt indhold automatisk.',`<button class="btn btn-primary" data-action="start-vacation">${icon('play')} Start første ferie</button>`)}</div>`;
  document.querySelectorAll('[data-vac]').forEach(el=>el.onclick=()=>openVacationDetail(el.dataset.vac));refreshIcons();hydrateVacationImages();
}
function vacationCardHTML(v){
  const visits=state.visits.filter(x=>x.vacationId===v.id),routes=state.routes.filter(x=>x.vacationId===v.id),notes=state.notes.filter(x=>x.vacationId===v.id),photos=state.photos.filter(x=>x.vacationId===v.id),experiences=state.experiences.filter(x=>x.vacationId===v.id);
  const statusLabel=v.status==='active'?'Aktiv ferie':v.status==='done'?'Afsluttet':'Planlagt',statusIcon=v.status==='active'?'shield-check':v.status==='done'?'book-check':'calendar-clock';
  return `<article class="camp-card" data-vac="${v.id}" tabindex="0"><div class="camp-cover" data-vac-photo="${v.photoIds?.[0]||photos[0]?.id||''}"><div class="camp-status"><span class="chip ${v.status==='active'?'active':v.status==='done'?'done':'wish'}">${icon(statusIcon)} ${statusLabel}</span></div></div><div class="camp-body"><h3>${esc(v.name)}</h3><div class="item-sub">${fmtDate(v.startDate)}${v.endDate?` – ${fmtDate(v.endDate)}`:''} · ${esc(v.destination||'Destination ikke angivet')}</div><div class="chips"><span class="chip">${visits.length} besøg</span><span class="chip">${routes.length} ruter</span><span class="chip">${photos.length} billeder</span><span class="chip">${experiences.length} oplevelser</span><span class="chip">${notes.length} noter</span></div></div></article>`;
}
async function hydrateVacationImages(){for(const el of document.querySelectorAll('[data-vac-photo]')){if(el.dataset.vacPhoto){const u=await imageUrl(el.dataset.vacPhoto);if(u)el.insertAdjacentHTML('afterbegin',`<img src="${u}" alt="">`);}}}
function openVacationDetail(id){
  const v=state.vacations.find(x=>x.id===id); if(!v)return; const visits=state.visits.filter(x=>x.vacationId===id).sort((a,b)=>String(a.date).localeCompare(String(b.date))),routes=state.routes.filter(x=>x.vacationId===id),notes=state.notes.filter(x=>x.vacationId===id),photos=state.photos.filter(x=>x.vacationId===id),experiences=state.experiences.filter(x=>x.vacationId===id),camps=[...new Set(visits.map(x=>x.campgroundId))].map(cid=>state.campgrounds.find(c=>c.id===cid)).filter(Boolean);
  modal(v.name,`<div class="vacation-banner" style="position:relative"><div><span class="guard-status">${v.status==='active'?icon('shield-check')+ ' Ferie Vagten er aktiv':icon('book-open')+' Gemt ferie'}</span><h1>${esc(v.name)}</h1><p>${fmtDate(v.startDate)}${v.endDate?` – ${fmtDate(v.endDate)}`:''} · ${esc(v.destination||'')}</p><div class="chips"><span class="chip">${camps.length} campingpladser</span><span class="chip">${routes.length} ruter</span><span class="chip">${photos.length} billeder</span><span class="chip">${experiences.length} oplevelser</span></div></div><img src="./assets/ferie-vagten/${v.status==='active'?'patrol':'relax'}.webp" alt="Ferie Vagten"></div>
    <div class="toolbar" style="margin-top:14px"><button class="btn btn-primary" id="vacPhoto">${icon('image-plus')} Billede</button><button class="btn btn-secondary" id="vacExperience">${icon('sparkles')} Oplevelse</button><button class="btn btn-secondary" id="vacEdit">${icon('pencil')} Redigér</button>${v.status==='active'?`<button class="btn btn-warning" id="vacEnd">${icon('flag')} Afslut ferie</button>`:`<button class="btn btn-secondary" id="vacActivate">${icon('play')} Aktivér igen</button>`}</div>
    ${photos.length?`<div class="section-title"><h2>Feriens billeder</h2></div><div id="vacPhotoGallery" class="gallery"></div>`:''}<div class="section-title"><h2>Feriens historie</h2></div><div class="timeline">${vacationTimeline(v,visits,routes,notes)}</div>`,{size:'lg'});
  document.getElementById('vacPhoto').onclick=()=>{closeModal();openPhotoPicker({vacationId:id});}; document.getElementById('vacExperience').onclick=()=>{closeModal();openExperienceForm(id);};document.getElementById('vacEdit').onclick=()=>{closeModal();openVacationForm(id);};
  document.getElementById('vacEnd')?.addEventListener('click',()=>{v.status='done';if(!v.endDate)v.endDate=today();saveState();closeModal();toast('Ferien er afsluttet. Albummet er klar.','success');render();}); document.getElementById('vacActivate')?.addEventListener('click',()=>{state.vacations.forEach(x=>{if(x.status==='active')x.status='done';});v.status='active';saveState();closeModal();toast('Ferie Vagten er på vagt igen.','success');render();});if(photos.length)hydrateSimpleGallery('vacPhotoGallery',photos.map(p=>p.id));refreshIcons();
}
async function hydrateSimpleGallery(containerId,ids){const g=document.getElementById(containerId);if(!g)return;const parts=[];for(const id of ids){const u=await imageUrl(id);if(u)parts.push(`<button data-photo="${id}"><img src="${u}" alt="Ferieminde"></button>`);}g.innerHTML=parts.join('');refreshIcons();}
function vacationTimeline(v,visits,routes,notes){
  const items=[];
  visits.forEach(x=>{const c=state.campgrounds.find(z=>z.id===x.campgroundId);items.push({date:x.date,html:`<b>${icon('tent-tree')} ${esc(c?.name||'Campingbesøg')}</b><div class="item-sub">${fmtDate(x.date)} · ${esc(x.notes||'')}</div>`});});
  routes.forEach(r=>items.push({date:r.date,html:`<b>${icon(r.type==='cycling'?'bike':'route')} ${esc(r.name)}</b><div class="item-sub">${fmtDate(r.date)}${r.distance?` · ${fmtNum(r.distance/1000)} km`:''}</div>`}));
  notes.forEach(n=>items.push({date:(n.createdAt||'').slice(0,10),html:`<b>${icon('notebook-pen')} Notat</b><div>${esc(n.text)}</div>`}));
  state.experiences.filter(x=>x.vacationId===v.id).forEach(x=>items.push({date:x.date||(x.createdAt||'').slice(0,10),html:`<b>${icon('sparkles')} ${esc(x.title||'Oplevelse')}</b><div class="item-sub">${fmtDate(x.date)} · ${esc(x.notes||'')}</div>`}));
  state.photos.filter(x=>x.vacationId===v.id).forEach(x=>items.push({date:(x.createdAt||'').slice(0,10),html:`<button class="timeline-photo" data-photo="${x.id}">${icon('image')} <span><b>${esc(x.name||'Ferieminde')}</b><small>${fmtDate((x.createdAt||'').slice(0,10))}</small></span></button>`}));
  items.sort((a,b)=>String(a.date).localeCompare(String(b.date)));return items.length?items.map(i=>`<div class="timeline-item">${i.html}</div>`).join(''):`<div class="empty">Ferien har ikke samlet indhold endnu.</div>`;
}

function renderVacationWatch(){
  const a=activeVacation();
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead('Ferie Vagten','Den personlige ferieassistent sorterer, samler og binder feriens indhold sammen.')}${a?`<section class="vacation-banner" style="position:relative"><div><span class="guard-status">${icon('radio')} På vagt nu</span><h1>${esc(a.name)}</h1><p>${state.settings.autoVacationWatch?'Automatisk opsamling er aktiv – nyt indhold foreslås knyttet til ferien.':'Automatisk opsamling er sat på pause. Du kan stadig knytte indhold manuelt.'}</p><div class="guard-actions"><button class="btn btn-warning" id="watchOpen">Åbn ferie</button><button class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.4)" id="watchExperience">${icon('sparkles')} Oplevelse</button><button class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.4)" id="watchEnd">Afslut ferie</button></div></div><img src="./assets/ferie-vagten/clipboard.webp" alt="Ferie Vagten"></section>`:`<section class="vacation-banner" style="position:relative;background:linear-gradient(130deg,#6c766f,#87918b)"><div><span class="guard-status">${icon('shield')} Ikke på vagt</span><h1>Klar til næste ferie</h1><p>Start en ferie, så får Ferie Vagten noget at lave i stedet for bare at ligge i hængekøjen.</p><button class="btn btn-warning" data-action="start-vacation">${icon('play')} Start ferie</button></div><img src="./assets/ferie-vagten/hammock.webp" alt="Ferie Vagten"></section>`}
    <div class="stats-grid"><div class="stat"><strong>${a?state.visits.filter(x=>x.vacationId===a.id).length:0}</strong><span>Besøg samlet</span></div><div class="stat"><strong>${a?state.routes.filter(x=>x.vacationId===a.id).length:0}</strong><span>Ruter samlet</span></div><div class="stat"><strong>${a?state.photos.filter(x=>x.vacationId===a.id).length:0}</strong><span>Billeder samlet</span></div><div class="stat"><strong>${a?state.notes.filter(x=>x.vacationId===a.id).length:0}</strong><span>Noter samlet</span></div><div class="stat"><strong>${a?Math.max(1,daysBetween(a.startDate,today())+1):0}</strong><span>Dage på vagt</span></div></div>
    <section class="card"><div class="card-head"><h2>Sådan arbejder Ferie Vagten</h2></div><div class="camp-grid"><div class="item"><div class="item-cover">${icon('link')}</div><div class="item-main"><b>Binder data sammen</b><div class="item-sub">Campingplads, besøg, rute, billede og ferie refererer til samme data.</div></div></div><div class="item"><div class="item-cover">${icon('wand-sparkles')}</div><div class="item-main"><b>Automatisk opsamling</b><div class="item-sub">Nye besøg, billeder, noter og ruter kan lande på den aktive ferie.</div></div></div><div class="item"><div class="item-cover">${icon('book-image')}</div><div class="item-main"><b>Bygger albummet</b><div class="item-sub">Når ferien er slut, ligger historien klar i Ferie Albummet.</div></div></div></div></section></div>`;
  document.getElementById('watchOpen')?.addEventListener('click',()=>openVacationDetail(a.id));document.getElementById('watchExperience')?.addEventListener('click',()=>openExperienceForm(a.id));document.getElementById('watchEnd')?.addEventListener('click',()=>{a.status='done';a.endDate=a.endDate||today();saveState();toast('Ferie Vagten har stemplet ud.','success');render();});refreshIcons();
}

function renderAlbums(){
  const vs=[...state.vacations].filter(v=>v.status==='done').sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate)));
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead('Ferie Albummet','Gamle ferier som samlede historier – ikke som en tilfældig bunke billeder.')}${vs.length?`<div class="camp-grid">${vs.map(v=>vacationCardHTML(v)).join('')}</div>`:empty('book-image','Albummet venter på første ferie','Når en ferie afsluttes, kan hele turen genopleves her.')}</div>`; document.querySelectorAll('[data-vac]').forEach(el=>el.onclick=()=>openVacationDetail(el.dataset.vac));hydrateVacationImages();refreshIcons();
}

async function getWeatherPosition(){
  return new Promise(resolve=>{
    if(!navigator.geolocation) return resolve({lat:56.36,lon:8.62,label:'Danmark'});
    navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude,label:'Aktuel placering'}),()=>resolve({lat:56.36,lon:8.62,label:'Danmark'}),{timeout:4500,maximumAge:600000});
  });
}
async function fetchWeather(){
  if(weatherCache && Date.now()-weatherCache.ts<10*60*1000) return weatherCache.data;
  const p=await getWeatherPosition(); const url=`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
  const r=await fetch(url); if(!r.ok)throw new Error(`Vejrtjenesten svarede ${r.status}`); const data=await r.json(); data._label=p.label; weatherCache={ts:Date.now(),data};return data;
}
function weatherText(code){ code=Number(code); if(code===0)return'Klart';if([1,2].includes(code))return'Let skyet';if(code===3)return'Overskyet';if([45,48].includes(code))return'Tåge';if(code>=51&&code<=67)return'Regn';if(code>=71&&code<=77)return'Sne';if(code>=80&&code<=82)return'Byger';if(code>=95)return'Torden';return'Vejr'; }
function weatherIcon(code){code=Number(code);if(code===0)return'sun';if(code<=3)return'cloud-sun';if(code<=48)return'cloud-fog';if(code<=67)return'cloud-rain';if(code<=77)return'cloud-snow';if(code<=82)return'cloud-rain-wind';return'cloud-lightning';}
async function loadCurrentWeather(){ const el=document.getElementById('dashWeather');if(!el)return;try{const w=await fetchWeather(),c=w.current;el.innerHTML=`${icon(weatherIcon(c.weather_code))} ${Math.round(c.temperature_2m)}° · ${weatherText(c.weather_code)}`;refreshIcons();}catch(_){el.innerHTML=`${icon('cloud-off')} Vejr utilgængeligt`;refreshIcons();} }
async function renderWeather(){
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead('Vejrudsigten','Vejret er en hjælpefunktion – campingbogen virker videre, selv hvis vejrtjenesten holder kaffepause.')}<div id="weatherBody">${empty('cloud-sun','Henter vejret','Bruger enhedens placering, hvis du giver tilladelse.')}</div></div>`;refreshIcons();
  try{const w=await fetchWeather(),c=w.current,d=w.daily;document.getElementById('weatherBody').innerHTML=`<div class="weather-hero"><section class="weather-current"><div class="eyebrow">${esc(w._label||'Aktuel placering')}</div><div class="temp">${Math.round(c.temperature_2m)}°</div><h2>${weatherText(c.weather_code)}</h2><p>Føles som ${Math.round(c.apparent_temperature)}° · Vind ${Math.round(c.wind_speed_10m)} km/t</p></section><section class="card"><div class="card-head"><h2>Campingblik</h2></div><p>Brug vejret sammen med kortet, ferieplanlægningen og cykelruterne. Vejrfunktionen er bevidst adskilt fra resten af appens data.</p><button class="btn btn-secondary" id="weatherRefresh">${icon('refresh-cw')} Opdatér</button></section></div><div class="section-title"><h2>7 dage</h2></div><div class="forecast">${d.time.map((day,i)=>`<div class="forecast-day">${icon(weatherIcon(d.weather_code[i]))}<strong>${new Date(`${day}T12:00:00`).toLocaleDateString('da-DK',{weekday:'short'})}</strong><div>${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°</div><div class="item-sub">${d.precipitation_probability_max[i]??0}% regn</div></div>`).join('')}</div>`;document.getElementById('weatherRefresh').onclick=()=>{weatherCache=null;renderWeather();};refreshIcons();}catch(err){document.getElementById('weatherBody').innerHTML=empty('cloud-off','Vejret kunne ikke hentes',`${err.message}. Resten af appen er upåvirket.`);refreshIcons();}
}

function renderSettings(){
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead('Indstillinger','Tilpas appen ét sted – uden at gøre campingferien til et IT-projekt.')}<div class="settings-layout"><aside class="card settings-nav">${[['general','Generelt'],['map','Kort & ORS'],['ratings','Bedømmelser'],['people','Personer & dyr'],['images','Billeder'],['system','Backup & system']].map(([id,l],i)=>`<button data-settab="${id}" class="${i===0?'active':''}">${l}</button>`).join('')}</aside><section class="card">
    <div class="settings-section active" data-section="general"><h2>Generelt</h2>${settingDateRow()}<div class="setting-row"><div><h4>Automatisk Ferie Vagt</h4><p>Nyt indhold foreslås knyttet til den aktive ferie.</p></div><button class="toggle ${state.settings.autoVacationWatch?'on':''}" id="autoWatch" aria-label="Automatisk Ferie Vagt"></button></div></div>
    <div class="settings-section" data-section="map"><h2>Kort & OpenRouteService</h2><div class="setting-row"><div><h4>Kortstil</h4><p>OpenFreeMap-stil til MapLibre.</p></div><select class="setting-control" id="settingMapStyle">${Object.keys(MAP_STYLES).map(k=>`<option value="${k}" ${state.settings.mapStyle===k?'selected':''}>${k[0].toUpperCase()+k.slice(1)}</option>`).join('')}<option value="satellite" ${state.settings.mapStyle==='satellite'?'selected':''}>MapTiler Satellit</option><option value="hybrid" ${state.settings.mapStyle==='hybrid'?'selected':''}>MapTiler Satellit + veje</option><option value="custom" ${state.settings.mapStyle==='custom'?'selected':''}>Egen MapLibre-style</option></select></div><div class="setting-row"><div><h4>MapTiler API-nøgle</h4><p>Bruges kun til Satellit/Hybrid og gemmes separat fra backup.</p></div><input class="setting-control" id="mapTilerKey" type="password" value="${esc(getMapTilerKey())}" placeholder="Indsæt MapTiler-nøgle"></div><div class="setting-row"><div><h4>Egen MapLibre style-URL</h4><p>Valgfri style.json til andre kortudbydere.</p></div><input class="setting-control" id="satelliteStyle" value="${esc(state.settings.satelliteStyle||'')}" placeholder="https://…/style.json"></div><div class="setting-row"><div><h4>OpenRouteService API-nøgle</h4><p>Gemmes separat fra campingdata og udelades fra almindelig backup.</p></div><input class="setting-control" id="orsKey" type="password" value="${esc(getApiKey())}" placeholder="Indsæt API-nøgle"></div><div class="setting-row"><div><h4>Test ORS-forbindelse</h4><p>Tester geocoding på det nye HeiGIT-endpoint.</p></div><button class="btn btn-secondary" id="testOrs">${icon('plug-zap')} Test forbindelse</button></div><div id="orsTestState"></div><div class="form-section"><h3>Bil + campingvogn / HGV</h3><div class="form-grid">${['length:Længde (m)','width:Bredde (m)','height:Højde (m)','weight:Vægt (t)','axleload:Akseltryk (t)'].map(x=>{const[k,l]=x.split(':');return `<div class="field"><label>${l}</label><input data-hgv="${k}" inputmode="decimal" value="${esc(state.settings.hgv?.[k]||'')}"></div>`}).join('')}</div><p class="item-sub">ORS har ikke en særskilt campingvognsprofil; appen bruger derfor <b>driving-hgv</b> konservativt, når I vælger bil + campingvogn.</p></div></div>
    <div class="settings-section" data-section="ratings"><h2>Vurderingskategorier</h2><div id="ratingSettings" class="list">${state.settings.ratingCategories.map(c=>`<div class="item"><div class="item-cover">${icon(c.icon||'star')}</div><div class="item-main"><input style="width:100%;border:0;background:transparent;font-weight:800" data-rating-label="${c.id}" value="${esc(c.label)}"><select data-rating-icon="${c.id}" style="margin-top:6px;border:1px solid var(--line);border-radius:9px;padding:5px;background:#fff"><option value="star" ${c.icon==='star'?'selected':''}>Stjerne</option><option value="map-pin" ${c.icon==='map-pin'?'selected':''}>Placering</option><option value="badge-euro" ${c.icon==='badge-euro'?'selected':''}>Pris</option><option value="sparkles" ${c.icon==='sparkles'?'selected':''}>Renlighed</option><option value="hand-heart" ${c.icon==='hand-heart'?'selected':''}>Service</option><option value="tent-tree" ${c.icon==='tent-tree'?'selected':''}>Faciliteter</option><option value="dog" ${c.icon==='dog'?'selected':''}>Hund</option><option value="bike" ${c.icon==='bike'?'selected':''}>Cykel</option></select></div>${state.settings.ratingCategories.length>1?`<button class="icon-btn" data-del-rating="${c.id}">${icon('trash-2')}</button>`:''}</div>`).join('')}</div><button class="btn btn-secondary" style="margin-top:10px" id="addRatingCat">${icon('plus')} Tilføj kategori</button></div>
    <div class="settings-section" data-section="people"><h2>Personer & kæledyr</h2><div class="form-grid"><div><div class="card-head"><h3>Personer</h3><button class="btn btn-secondary" id="addPerson">+ Person</button></div><div class="list">${state.people.map(p=>`<div class="item"><div class="item-main"><b>${esc(p.name)}</b><div class="item-sub">${esc(p.role||'')}</div></div><button class="icon-btn" data-del-person="${p.id}">${icon('trash-2')}</button></div>`).join('')||'<div class="item-sub">Ingen personer oprettet.</div>'}</div></div><div><div class="card-head"><h3>Kæledyr</h3><button class="btn btn-secondary" id="addPet">+ Kæledyr</button></div><div class="list">${state.pets.map(p=>`<div class="item"><div class="item-main"><b>${esc(p.name)}</b><div class="item-sub">${esc(p.type||'Kæledyr')}</div></div><button class="icon-btn" data-del-pet="${p.id}">${icon('trash-2')}</button></div>`).join('')||'<div class="item-sub">Ingen kæledyr oprettet.</div>'}</div></div></div></div>
    <div class="settings-section" data-section="images"><h2>Billeder</h2><div class="setting-row"><div><h4>Automatisk komprimering</h4><p>Reducerer lagerforbruget uden at ændre originalerne på enheden.</p></div><button class="toggle ${state.settings.compressImages?'on':''}" id="compressToggle"></button></div><div class="setting-row"><div><h4>Maksimal billedside</h4><p>Længste side i pixels ved nye uploads.</p></div><input class="setting-control" id="imageMax" type="number" min="800" max="4000" value="${state.settings.imageMax}"></div></div>
    <div class="settings-section" data-section="system"><h2>Backup & system</h2><div class="setting-row"><div><h4>Eksportér backup</h4><p>Samler campingdata og billeder i én JSON-fil. ORS API-nøglen medtages ikke.</p></div><button class="btn btn-primary" id="exportBackup">${icon('download')} Eksportér</button></div><div class="setting-row"><div><h4>Importér backup</h4><p>Gendanner data fra en tidligere Vores Camping-backup.</p></div><button class="btn btn-secondary" id="importBackup">${icon('upload')} Importér</button></div><div class="setting-row"><div><h4>Ryd alle campingdata</h4><p>Kan ikke fortrydes uden en backup.</p></div><button class="btn btn-danger" id="clearData">${icon('trash-2')} Ryd data</button></div><div class="setting-row"><div><h4>Appversion</h4><p>Statisk PWA, GitHub Pages-klar.</p></div><strong>v${APP_VERSION}</strong></div></div>
  </section></div></div>`;
  bindSettings();refreshIcons();
}
function settingDateRow(){return `<div class="setting-row"><div><h4>Næste campingtur</h4><p>Bruges til nedtællingen på forsiden.</p></div><input class="setting-control" type="date" id="nextTrip" value="${esc(state.settings.nextTrip||'')}"></div>`;}
function bindSettings(){
  document.querySelectorAll('[data-settab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-settab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-section]').forEach(s=>s.classList.toggle('active',s.dataset.section===b.dataset.settab));});
  document.getElementById('nextTrip').onchange=e=>{state.settings.nextTrip=e.target.value;saveState();toast('Nedtællingen er opdateret.','success');};
  document.getElementById('autoWatch').onclick=e=>{state.settings.autoVacationWatch=!state.settings.autoVacationWatch;e.currentTarget.classList.toggle('on',state.settings.autoVacationWatch);saveState();};
  document.getElementById('settingMapStyle').onchange=e=>{state.settings.mapStyle=e.target.value;saveState();};document.getElementById('mapTilerKey').onchange=e=>{setMapTilerKey(e.target.value);toast('MapTiler-nøglen er gemt separat.','success');};document.getElementById('satelliteStyle').onchange=e=>{state.settings.satelliteStyle=e.target.value.trim();saveState();};document.getElementById('orsKey').onchange=e=>{setApiKey(e.target.value);toast('API-nøglen er gemt separat.','success');};
  document.getElementById('testOrs').onclick=testOrs;document.querySelectorAll('[data-hgv]').forEach(i=>i.onchange=()=>{state.settings.hgv=state.settings.hgv||{};state.settings.hgv[i.dataset.hgv]=i.value.replace(',','.');saveState();});
  document.querySelectorAll('[data-rating-label]').forEach(i=>i.onchange=()=>{const c=state.settings.ratingCategories.find(x=>x.id===i.dataset.ratingLabel);if(c)c.label=i.value.trim()||c.label;saveState();});document.querySelectorAll('[data-rating-icon]').forEach(i=>i.onchange=()=>{const c=state.settings.ratingCategories.find(x=>x.id===i.dataset.ratingIcon);if(c)c.icon=i.value;saveState();render();});document.querySelectorAll('[data-del-rating]').forEach(b=>b.onclick=()=>{state.settings.ratingCategories=state.settings.ratingCategories.filter(c=>c.id!==b.dataset.delRating);saveState();render();});document.getElementById('addRatingCat').onclick=()=>{state.settings.ratingCategories.push({id:uid('rating'),label:'Ny kategori',icon:'star'});saveState();render();};
  document.getElementById('addPerson').onclick=()=>simpleEntityModal('person');document.getElementById('addPet').onclick=()=>simpleEntityModal('pet');document.querySelectorAll('[data-del-person]').forEach(b=>b.onclick=()=>{state.people=state.people.filter(p=>p.id!==b.dataset.delPerson);saveState();render();});document.querySelectorAll('[data-del-pet]').forEach(b=>b.onclick=()=>{state.pets=state.pets.filter(p=>p.id!==b.dataset.delPet);saveState();render();});
  document.getElementById('compressToggle').onclick=e=>{state.settings.compressImages=!state.settings.compressImages;e.currentTarget.classList.toggle('on',state.settings.compressImages);saveState();};document.getElementById('imageMax').onchange=e=>{state.settings.imageMax=Math.max(800,Math.min(4000,Number(e.target.value)||1800));saveState();};
  document.getElementById('exportBackup').onclick=exportBackup;document.getElementById('importBackup').onclick=()=>document.getElementById('hiddenImportInput').click();document.getElementById('clearData').onclick=()=>confirmBox('Ryd alle campingdata?','Lav gerne en backup først. API-nøglen slettes ikke automatisk.',async()=>{state=emptyState();saveState();const d=await db();await new Promise(res=>{const tx=d.transaction(IMG_STORE,'readwrite');tx.objectStore(IMG_STORE).clear();tx.oncomplete=res;});toast('Campingdata er ryddet.');render();});
}
async function testOrs(){ const box=document.getElementById('orsTestState');if(!getApiKey()){box.innerHTML='<div class="api-state bad">API-nøgle mangler.</div>';return;}box.innerHTML='Tester…';try{const r=await fetch(`${ORS.geocoding}/search?text=${encodeURIComponent('Holstebro')}&size=1&lang=da`,{headers:{Authorization:getApiKey()}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const j=await r.json();box.innerHTML=`<div class="api-state ok">${icon('circle-check')} Forbindelsen virker. ${j.features?.length?'Geocoding gav resultat.':''}</div>`;refreshIcons();}catch(err){box.innerHTML=`<div class="api-state bad">${icon('circle-x')} ${esc(err.message)}</div>`;refreshIcons();}}
function simpleEntityModal(type){const isPet=type==='pet';modal(isPet?'Tilføj kæledyr':'Tilføj person',`<form id="entityForm"><div class="field"><label>Navn *</label><input name="name" required></div><div class="field" style="margin-top:10px"><label>${isPet?'Type / race':'Rolle'}</label><input name="role"></div><div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Annuller</button><button class="btn btn-primary" type="submit">Gem</button></div></form>`,{size:'sm'});document.getElementById('entityForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),obj={id:uid(type),name:String(fd.get('name')),createdAt:new Date().toISOString()};if(isPet)obj.type=String(fd.get('role')||'Kæledyr');else obj.role=String(fd.get('role')||'');state[isPet?'pets':'people'].push(obj);saveState();closeModal();render();toast('Gemt.','success');};}

function blobToDataURL(blob){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error);fr.readAsDataURL(blob);});}
function dataURLToBlob(data){const [h,b64]=data.split(',');const mime=(h.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';const bin=atob(b64);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime});}
async function exportBackup(){
  toast('Samler backup…'); const imgs={};for(const p of state.photos){const b=await getImage(p.id);if(b)imgs[p.id]=await blobToDataURL(b);}const pack={format:'Vores Camping backup',version:APP_VERSION,exportedAt:new Date().toISOString(),state,images:imgs};const blob=new Blob([JSON.stringify(pack)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Vores-Camping-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);toast('Backup er klar.','success');
}
async function importBackupFile(e){ const f=e.target.files?.[0];e.target.value='';if(!f)return;try{const j=JSON.parse(await f.text());if(!j.state||!Array.isArray(j.state.campgrounds))throw new Error('Filen ligner ikke en Vores Camping-backup');state={...emptyState(),...j.state,settings:{...emptyState().settings,...(j.state.settings||{})}};for(const [id,data] of Object.entries(j.images||{}))await putImage(id,dataURLToBlob(data));saveState();toast('Backup er importeret.','success');render();}catch(err){toast(`Import fejlede: ${err.message}`,'error');}}


async function openNearby(c){
  if(!c?.lat||!c?.lon){toast('Campingpladsen mangler koordinater.','error');return;}
  modal(`Området omkring ${c.name}`,`<div id="nearbyGeoInfo" class="chips" style="margin-bottom:12px"><span class="chip">${icon('map-pin')} ${Number(c.lat).toFixed(5)}, ${Number(c.lon).toFixed(5)}</span><span class="chip" id="elevationChip">${icon('mountain')} Højde: henter…</span></div><div class="toolbar"><select id="nearbyType" class="btn btn-ghost"><option value="experiences">Oplevelser</option><option value="food">Mad & indkøb</option><option value="camping">Camping & service</option><option value="cycling">Cykel</option><option value="dog">Hund</option></select><select id="nearbyRadius" class="btn btn-ghost"><option value="1000">1 km</option><option value="1500" selected>1,5 km</option><option value="2000">2 km</option></select><button class="btn btn-primary" id="nearbySearch">${icon('search')} Søg</button></div><div id="nearbyResults">${empty('scan-search','Klar til områdesøgning','Med ORS-nøgle kan appen hente relevante interessepunkter omkring campingpladsen.')}</div>`,{size:'lg'});
  const run=async()=>{
    const box=document.getElementById('nearbyResults'); if(!getApiKey()){box.innerHTML=empty('key-round','ORS-nøgle mangler','Tilføj nøglen under Indstillinger → Kort & ORS.');refreshIcons();return;}
    const groups={experiences:[622,624,625,627,279],food:[518,451,564,568,570],camping:[103,104,166,174,179],cycling:[429,583,584,585],dog:[123,124,268]};
    const ids=groups[document.getElementById('nearbyType').value]||groups.experiences, buffer=Number(document.getElementById('nearbyRadius').value)||1500;box.innerHTML='<div class="item-sub">Søger i området…</div>';
    try{
      const res=await fetch(ORS.poi,{method:'POST',headers:{Authorization:getApiKey(),'Content-Type':'application/json'},body:JSON.stringify({request:'pois',geometry:{geojson:{type:'Point',coordinates:[Number(c.lon),Number(c.lat)]},buffer},filters:{category_ids:ids},limit:50,sortby:'distance'})});
      if(!res.ok)throw new Error(`ORS POI svarede ${res.status}`);const j=await res.json();const feats=(j.features||[]).slice(0,25);
      if(!feats.length){box.innerHTML=empty('search-x','Ingen fund i denne radius','Prøv en anden kategori eller større radius.');refreshIcons();return;}
      box.innerHTML=`<div class="list">${feats.map((f,i)=>{const p=f.properties||{}, cats=Object.values(p.category_ids||{}),name=p.osm_tags?.name||p.name||cats[0]?.category_name?.replaceAll('_',' ')||`Interessepunkt ${i+1}`,dist=p.distance?`${Math.round(p.distance)} m`:'';return `<button class="item" data-nearby-i="${i}" style="width:100%;text-align:left"><div class="item-cover">${icon('map-pin')}</div><div class="item-main"><div class="item-title">${esc(name)}</div><div class="item-sub">${esc(cats.map(x=>x.category_name?.replaceAll('_',' ')).filter(Boolean).join(' · '))}${dist?` · ${dist}`:''}</div></div></button>`}).join('')}</div>`;
      box.querySelectorAll('[data-nearby-i]').forEach(b=>b.onclick=()=>{const f=feats[Number(b.dataset.nearbyI)],co=f.geometry?.coordinates;if(co){closeModal();setRoute('kort');setTimeout(()=>{const m=activeMaps[0];if(m){m.flyTo({center:co,zoom:15});new maplibregl.Marker().setLngLat(co).addTo(m);}},300);}});refreshIcons();
    }catch(err){box.innerHTML=empty('triangle-alert','Områdesøgningen fejlede',err.message);refreshIcons();}
  };
  document.getElementById('nearbySearch').onclick=run; refreshIcons();
  if(getApiKey()) fetch(`${ORS.elevation}/point?geometry=${encodeURIComponent(`${c.lon},${c.lat}`)}&format_out=point`,{headers:{Authorization:getApiKey()}}).then(r=>r.ok?r.json():Promise.reject()).then(j=>{const z=j.geometry?.coordinates?.[2]??j.geometry?.coordinates?.[2];const chip=document.getElementById('elevationChip');if(chip)chip.innerHTML=`${icon('mountain')} Højde: ${Number.isFinite(Number(z))?`${Math.round(Number(z))} m`:'ukendt'}`;refreshIcons();}).catch(()=>{const chip=document.getElementById('elevationChip');if(chip)chip.innerHTML=`${icon('mountain')} Højde: utilgængelig`;refreshIcons();}); else {const chip=document.getElementById('elevationChip');if(chip)chip.innerHTML=`${icon('mountain')} Højde kræver ORS`;refreshIcons();}
}

function openIsochrone(m){
  if(!m){toast('Kortet er ikke klar endnu.','error');return;}
  const ctr=m.getCenter();
  modal('Rækkeviddekort',`<form id="isoForm"><div class="form-grid"><div class="field"><label>Transport</label><select name="profile"><option value="cycling-regular">Cykel</option><option value="cycling-electric">Elcykel</option><option value="driving-car">Bil</option><option value="foot-walking">Gang</option></select></div><div class="field"><label>Rejsetid</label><select name="minutes"><option>10</option><option>15</option><option selected>30</option><option>45</option></select></div><div class="field full"><label>Udgangspunkt</label><input name="center" value="${ctr.lat.toFixed(5)}, ${ctr.lng.toFixed(5)}"><small>Kortets nuværende centrum bruges som udgangspunkt.</small></div></div><div id="isoState" style="margin-top:12px"></div><div class="modal-foot"><button type="button" class="btn btn-ghost" data-close-modal>Annuller</button><button class="btn btn-primary" type="submit">${icon('radar')} Vis rækkevidde</button></div></form>`,{size:'sm'});
  document.getElementById('isoForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),[lat,lon]=String(fd.get('center')).split(',').map(parseCoord),profile=String(fd.get('profile')),minutes=Number(fd.get('minutes'));const box=document.getElementById('isoState');if(!lat||!lon){box.innerHTML='<div class="api-state bad">Ugyldige koordinater.</div>';return;}if(!getApiKey()){box.innerHTML='<div class="api-state bad">ORS API-nøgle mangler.</div>';return;}box.textContent='Beregner rækkevidde…';try{const r=await fetch(`${ORS.routing}/v2/isochrones/${profile}`,{method:'POST',headers:{Authorization:getApiKey(),'Content-Type':'application/json'},body:JSON.stringify({locations:[[lon,lat]],range:[minutes*60],range_type:'time',attributes:['area','reachfactor'],smoothing:5})});if(!r.ok)throw new Error(`ORS svarede ${r.status}`);const geo=await r.json();closeModal();drawIsochrone(m,geo,[lon,lat]);toast(`${minutes} minutters rækkevidde vises på kortet.`,'success');}catch(err){box.innerHTML=`<div class="api-state bad">${esc(err.message)}</div>`;}};refreshIcons();
}
function drawIsochrone(m,geo,center){try{if(m.getLayer('range-fill'))m.removeLayer('range-fill');if(m.getLayer('range-line'))m.removeLayer('range-line');if(m.getSource('range'))m.removeSource('range');m.addSource('range',{type:'geojson',data:geo});m.addLayer({id:'range-fill',type:'fill',source:'range',paint:{'fill-opacity':.24}});m.addLayer({id:'range-line',type:'line',source:'range',paint:{'line-width':3}});const coords=geo.features?.[0]?.geometry?.coordinates?.[0]||[];if(coords.length){const b=new maplibregl.LngLatBounds();coords.forEach(p=>b.extend(p));m.fitBounds(b,{padding:55});}else m.flyTo({center,zoom:11});}catch(err){toast('Rækkeviddelaget kunne ikke tegnes.','error');}}

function registerServiceWorker(){ if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
function bootstrap(){
  if(!location.hash) location.hash='#/overblik';
  bindGlobal();migrateLegacy();render();registerServiceWorker();
}

/* v30.2 – ændringer fra vedhæftet specifikation */
function externalMapUrl302(c){const raw=String(c?.googleMapsUrl||'').trim();if(/^https?:\/\//i.test(raw))return raw;if(c?.lat&&c?.lon)return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.lat},${c.lon}`)}`;return '';}

const NAV_GROUPS_302 = [
  {id:'overblik',label:'Overblik',icon:'layout-dashboard',href:'#/overblik'},
  {id:'kort',label:'Kort',icon:'map',href:'#/kort'},
  {id:'camping',label:'Campingpladser',icon:'tent-tree',children:[['besoegte','Er besøgt','map-pin-check'],['vil-besoege','Ønskested','bookmark']]},
  {id:'cykelruter',label:'Cykelruter',icon:'bike',href:'#/cykelruter'},
  {id:'sevaerdigheder',label:'Seværdigheder',icon:'landmark',children:[['sevaerdigheder-besoegte','Er besøgt','map-pin-check'],['sevaerdigheder-oensker','Ønskested','bookmark']]},
  {id:'oplevelser',label:'Oplevelser',icon:'sparkles',children:[['oplevelser-besoegte','Er besøgt','map-pin-check'],['oplevelser-oensker','Ønskested','bookmark']]},
  {id:'ferier',label:'Vores Ferier',icon:'palmtree',href:'#/ferier'},
  {id:'album',label:'Ferie Albummet',icon:'book-image',href:'#/album'},
  {id:'ferie-vagten',label:'Ferie Vagten',icon:'shield-check',href:'#/ferie-vagten'},
  {id:'notater',label:'Notater',icon:'notebook-pen',href:'#/notater'},
  {id:'vejret',label:'Vejrudsigten',icon:'cloud-sun',href:'#/vejret'},
  {id:'indstillinger',label:'Indstillinger',icon:'settings',href:'#/indstillinger'}
];
const DASH_SECTION_LABELS_302 = {
  quick:'Hurtige handlinger',slideshow:'Feriealbum-dias',stats:'Statistik',countdown:'Nedtælling',map:'Oversigtskort',recent:'Seneste campingbesøg',best:'Bedst bedømte',wishes:'Ønskesteder',routes:'Cykelruter'
};

function normalize302(){
  state.attractions=Array.isArray(state.attractions)?state.attractions:[];
  state.experiences=Array.isArray(state.experiences)?state.experiences:[];
  state.notes=Array.isArray(state.notes)?state.notes:[];
  state.experiences.forEach(x=>{if(!x.status)x.status='visited';if(!x.photoIds)x.photoIds=[];});
  state.attractions.forEach(x=>{if(!x.status)x.status='visited';if(!x.photoIds)x.photoIds=[];});
  state.notes.forEach(x=>{if(!x.date)x.date=(x.createdAt||today()).slice(0,10);});
  const base=emptyState().settings;
  state.settings={...base,...state.settings,homeSections:{...base.homeSections,...(state.settings.homeSections||{})}};
  if(!Array.isArray(state.settings.homeOrder))state.settings.homeOrder=[...base.homeOrder];
  const allowed=base.homeOrder;
  state.settings.homeOrder=[...state.settings.homeOrder.filter(x=>allowed.includes(x)),...allowed.filter(x=>!state.settings.homeOrder.includes(x))];
  saveState();
}

function applyAppearance(){
  const s=state.settings||{};
  const root=document.documentElement;
  root.style.setProperty('--green',s.accent||'#2f5d45');
  root.style.setProperty('--radius',`${Number(s.boxRadius)||22}px`);
  root.style.setProperty('--ui-scale',String(Number(s.uiScale)||1));
  root.style.setProperty('--icon-scale',String(Number(s.iconScale)||1));
  root.style.setProperty('--map-height',`${Number(s.mapHeight)||430}px`);
  document.body.dataset.theme=s.theme||'camp-light';
  document.body.dataset.density=s.density||'normal';
  document.body.dataset.buttonStyle=s.buttonStyle||'soft';
}

function statusChip(status){
  const visited=state.settings.visitedLabel||'Besøgt', wish=state.settings.wishLabel||'Ønskested';
  return status==='wish'?`<span class="chip wish">${icon('bookmark')} ${esc(wish)}</span>`:`<span class="chip visited">${icon('map-pin-check')} ${esc(visited)}</span>`;
}

function navHTML(mobile=false){
  const current=(location.hash.split('/')[1]||'overblik').split('?')[0];
  if(mobile){
    return NAV_GROUPS_302.map(g=>g.children?`<div class="mobile-nav-group"><div class="mobile-nav-label">${icon(g.icon)} ${esc(g.label)}</div>${g.children.map(([id,l,ico])=>`<a href="#/${id}" class="${current===id?'active':''}">${icon(ico)}<span>${esc(l)}</span></a>`).join('')}</div>`:`<a href="${g.href}" class="${current===g.id?'active':''}">${icon(g.icon)}<span>${esc(g.label)}</span></a>`).join('');
  }
  return NAV_GROUPS_302.map(g=>{
    if(!g.children)return `<a href="${g.href}" class="${current===g.id?'active':''}">${icon(g.icon)}<span>${esc(g.label)}</span></a>`;
    const active=g.children.some(([id])=>id===current);
    return `<div class="nav-group ${active?'active':''}"><button type="button" class="nav-group-button" data-nav-group="${g.id}">${icon(g.icon)}<span>${esc(g.label)}</span>${icon('chevron-down')}</button><div class="nav-submenu">${g.children.map(([id,l,ico])=>`<a href="#/${id}" class="${current===id?'active':''}">${icon(ico)}<span>${esc(l)}</span></a>`).join('')}</div></div>`;
  }).join('');
}
function renderNav(){
  document.getElementById('topNav').innerHTML=navHTML();
  document.getElementById('mobileNav').innerHTML=navHTML(true);
  const brand=document.querySelector('.brand strong'); if(brand)brand.textContent=state.settings.appName||'Vores Camping';
  document.querySelectorAll('[data-nav-group]').forEach(b=>b.onclick=e=>{e.stopPropagation();const g=b.closest('.nav-group');document.querySelectorAll('.nav-group.open').forEach(x=>{if(x!==g)x.classList.remove('open');});g.classList.toggle('open');});
  refreshIcons();
}

function render(){
  if(dashboardClockTimer){clearInterval(dashboardClockTimer);dashboardClockTimer=null;}
  if(dashboardSlideTimer){clearInterval(dashboardSlideTimer);dashboardSlideTimer=null;}
  activeMaps.forEach(m=>{try{m.remove();}catch(_){}}); activeMaps=[];
  applyAppearance(); renderNav();
  const hash=(location.hash||'#/overblik').replace(/^#\//,'');
  const [path,...rest]=hash.split('/');
  const main=document.getElementById('mainContent'),rail=document.getElementById('sideRail');
  const full=path==='kort',showRail=path==='overblik'; main.classList.toggle('full-workspace',full);rail.style.display=showRail?'':'none';main.style.marginLeft=showRail?'':'0';
  if(path==='campingplads'&&rest[0])return renderCampDetail(rest[0]);
  const pages={
    overblik:renderDashboard,kort:renderBigMap,besoegte:()=>renderCampList('visited'),'vil-besoege':()=>renderCampList('wish'),bedste:renderBest,cykelruter:renderRoutes,
    'sevaerdigheder-besoegte':()=>renderMemoryList('attraction','visited'),'sevaerdigheder-oensker':()=>renderMemoryList('attraction','wish'),
    'oplevelser-besoegte':()=>renderMemoryList('experience','visited'),'oplevelser-oensker':()=>renderMemoryList('experience','wish'),
    ferier:renderVacations,album:renderAlbums,'ferie-vagten':renderVacationWatch,notater:renderNotesPage,vejret:renderWeather,indstillinger:renderSettings
  };
  (pages[path]||pages.overblik)(); main.scrollTop=0;refreshIcons();
}

function bindGlobal(){
  window.addEventListener('hashchange',render);
  document.addEventListener('click',e=>{
    if(!e.target.closest('.nav-group'))document.querySelectorAll('.nav-group.open').forEach(x=>x.classList.remove('open'));
    if(e.target.closest('[data-close-modal]'))closeModal();
    if(e.target.closest('[data-close-drawer]'))document.getElementById('mobileDrawer').setAttribute('aria-hidden','true');
    const act=e.target.closest('[data-action]')?.dataset.action;if(act)handleAction(act,e.target.closest('[data-action]'));
    const openCamp=e.target.closest('[data-open-camp]')?.dataset.openCamp;if(openCamp)setRoute(`campingplads/${openCamp}`);
    const photo=e.target.closest('[data-photo]')?.dataset.photo;if(photo)openPhotoViewer(photo);
  });
  document.getElementById('mobileMenuBtn').onclick=()=>{document.getElementById('mobileDrawer').setAttribute('aria-hidden','false');refreshIcons();};
  document.getElementById('globalSearchBtn').onclick=()=>openFindCamp();
  document.getElementById('quickAddBtn').onclick=()=>openQuickAdd();
  document.getElementById('hiddenImageInput').addEventListener('change',async e=>{
    if(!e.target.files.length)return;const link={...(routeContext.photoLink||{})};if(!link.vacationId&&state.settings.autoVacationWatch&&activeVacation())link.vacationId=activeVacation().id;
    const ids=await addPhotos(e.target.files,link);
    if(link.campgroundId){const c=state.campgrounds.find(x=>x.id===link.campgroundId);if(c)c.photoIds=[...new Set([...(c.photoIds||[]),...ids])];}
    if(link.vacationId){const v=state.vacations.find(x=>x.id===link.vacationId);if(v)v.photoIds=[...new Set([...(v.photoIds||[]),...ids])];}
    if(link.routeId){const r=state.routes.find(x=>x.id===link.routeId);if(r){r.photoIds=[...new Set([...(r.photoIds||[]),...ids])];if(Number.isInteger(Number(link.stopIndex))){const si=Number(link.stopIndex);r.stops=r.stops||[];r.stops[si]=r.stops[si]||{index:si,lon:r.coordinates?.[si]?.[0],lat:r.coordinates?.[si]?.[1],note:'',photoIds:[]};r.stops[si].photoIds=[...new Set([...(r.stops[si].photoIds||[]),...ids])];}}}
    if(link.experienceId){const x=state.experiences.find(v=>v.id===link.experienceId);if(x)x.photoIds=[...new Set([...(x.photoIds||[]),...ids])];}
    if(link.attractionId){const x=state.attractions.find(v=>v.id===link.attractionId);if(x)x.photoIds=[...new Set([...(x.photoIds||[]),...ids])];}
    saveState();routeContext.photoLink={};toast(`${ids.length} billede(r) gemt.`,'success');e.target.value='';render();
  });
  document.getElementById('hiddenImportInput').addEventListener('change',importBackupFile);
}

function openCampAddMenu(){
  modal('Tilføj campingplads',`<div class="quick-grid add-choice-grid"><button class="quick-card" data-add-camp-choice="visited">${icon('map-pin-check')}<b>Er besøgt</b><span>Gem pladsen som besøgt.</span></button><button class="quick-card" data-add-camp-choice="wish">${icon('bookmark-plus')}<b>Vil besøge / Ønskested</b><span>Gem den til en kommende tur.</span></button><button class="quick-card" data-add-camp-choice="generic">${icon('save')}<b>Gem campingplads</b><span>Åbn den fælles formular og vælg status selv.</span></button></div>`,{size:'sm'});
  document.querySelectorAll('[data-add-camp-choice]').forEach(b=>b.onclick=()=>{const c=b.dataset.addCampChoice;closeModal();openCampForm(c==='wish'?'wish':c==='visited'?'visited':(state.settings.campDefaultStatus||'visited'));});refreshIcons();
}
function handleAction(act,el){
  const map={
    'find-camp':openFindCamp,'add-camp-menu':openCampAddMenu,'add-camp':()=>openCampForm('visited'),'add-wish':()=>openCampForm('wish'),'add-visit':openVisitForm,
    'new-route':()=>openRouteForm('route'),'new-cycle':()=>openRouteForm('cycling'),'add-attraction':()=>openMemoryForm('attraction','visited'),'add-photo':()=>openPhotoPicker(),
    'add-note':()=>openNoteForm(),'add-experience':()=>openExperienceForm('visited'),'start-vacation':openVacationForm,'open-map':()=>setRoute('kort')
  };if(map[act])map[act]();
}
function openQuickAdd(){
  modal('Hurtige handlinger',`<div class="quick-grid quick-modal-grid">${[
    ['find-camp','search','Find campingplads'],['add-camp-menu','map-pin-plus','Tilføj campingplads'],['new-route','route','Tilføj ny rute'],['add-experience','sparkles','Tilføj oplevelse'],['add-attraction','landmark','Tilføj seværdighed'],['add-photo','image-plus','Upload billeder'],['add-note','notebook-pen','Tilføj notat'],['start-vacation','palmtree','Start ferie'],['open-map','map','Åbn stort kort']
  ].map(([a,i,l])=>`<button class="quick-card" data-action="${a}">${icon(i)}<b>${l}</b></button>`).join('')}</div>`,{size:'lg'});
}

function dashboardSectionHTML302(key){
  const cd=countdown();
  if(key==='quick')return `<section class="quick-grid dashboard-actions">${[['find-camp','search','Find campingplads'],['add-camp-menu','map-pin-plus','Tilføj campingplads'],['new-route','route','Tilføj ny rute'],['add-experience','sparkles','Tilføj oplevelse'],['add-attraction','landmark','Tilføj seværdighed'],['add-photo','image-plus','Upload billeder'],['add-note','notebook-pen','Tilføj notat'],['start-vacation','palmtree','Start ferie'],['open-map','map','Åbn stort kort']].map(([a,i,l])=>`<button class="quick-card" data-action="${a}">${icon(i)}<b>${l}</b></button>`).join('')}</section>`;
  if(key==='slideshow')return albumSlideshowHTML302();
  if(key==='stats'){const camps=state.campgrounds.filter(c=>c.status==='visited').length,wishes=state.campgrounds.filter(c=>c.status==='wish').length;return `<section class="stats-grid"><div class="stat"><strong>${camps}</strong><span>Besøgte campingpladser</span></div><div class="stat"><strong>${wishes}</strong><span>Ønskesteder</span></div><div class="stat"><strong>${countryCount()}</strong><span>Besøgte lande</span></div><div class="stat"><strong>${state.routes.filter(r=>r.type==='cycling').length}</strong><span>Gemte cykelruter</span></div><div class="stat"><strong>${state.vacations.length}</strong><span>Ferier</span></div></section>`;}
  if(key==='countdown')return state.settings.showCountdown&&cd!==null?`<section class="card countdown-card"><div><span class="eyebrow">Næste campingtur</span><h2>${cd>=0?`${cd} dag${cd===1?'':'e'} tilbage`:'Turen er startet'}</h2><span>${fmtDate(state.settings.nextTrip)}</span></div>${icon('calendar-heart')}</section>`:'';
  if(key==='map')return `<section class="card map-card dashboard-map-card"><div class="card-head"><h2>Oversigtskort</h2><a href="#/kort">Åbn stort kort →</a></div><div id="dashboardMap" class="map"></div></section>`;
  if(key==='recent')return `<section class="card"><div class="card-head"><h2>Seneste campingbesøg</h2><button class="link" data-action="add-visit">+ Tilføj</button></div>${recentVisitsHTML()}</section>`;
  if(key==='best')return `<section><div class="section-title"><h2>Bedst bedømte campingpladser</h2><a href="#/bedste" class="btn btn-secondary">Se rangliste</a></div><div class="camp-grid">${topCampsHTML(3)}</div></section>`;
  if(key==='wishes')return `<section><div class="section-title"><h2>Udvalgte steder fra ønskelisten</h2><a href="#/vil-besoege" class="btn btn-secondary">Se alle</a></div>${dashboardWishesHTML302()}</section>`;
  if(key==='routes')return `<section><div class="section-title"><h2>Seneste cykelruter</h2><a href="#/cykelruter" class="btn btn-secondary">Se alle</a></div>${dashboardRoutesHTML302()}</section>`;
  return '';
}
function albumSlideshowHTML302(){
  if(!state.settings.albumSlideshow)return '';
  const done=[...state.vacations].filter(v=>v.status==='done').sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate))).slice(0,8);
  if(!done.length)return `<section class="card album-slideshow empty-slide"><div>${icon('book-image')}<h3>Ferie Albummet er klar til minder</h3><p>Når en ferie afsluttes, kan dens billeder blive vist som skiftende dias her på forsiden.</p></div></section>`;
  return `<section class="album-slideshow" id="albumSlideshow">${done.map((v,i)=>{const photo=v.photoIds?.[0]||state.photos.find(p=>p.vacationId===v.id)?.id||'';return `<button class="album-slide ${i===0?'active':''}" data-slide-vac="${v.id}" data-slide-photo="${photo}"><div class="album-slide-overlay"><span class="eyebrow">Fra Ferie Albummet</span><h2>${esc(v.name)}</h2><p>${fmtDate(v.startDate)}${v.destination?` · ${esc(v.destination)}`:''}</p></div></button>`;}).join('')}<div class="slide-dots">${done.map((_,i)=>`<button data-slide-dot="${i}" class="${i===0?'active':''}" aria-label="Dias ${i+1}"></button>`).join('')}</div></section>`;
}
function dashboardWishesHTML302(){const xs=[...state.campgrounds].filter(c=>c.status==='wish').sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,3);return xs.length?`<div class="camp-grid">${xs.map(c=>campCardHTML(c)).join('')}</div>`:empty('bookmark','Ingen ønskesteder endnu','Gem en campingplads som ønskested, så dukker den op her.');}
function dashboardRoutesHTML302(){const rs=[...state.routes].filter(r=>r.type==='cycling').sort((a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||''))).slice(0,4);return rs.length?`<div class="list">${rs.map(r=>`<button class="item" data-dash-route="${r.id}" style="width:100%;text-align:left"><div class="item-cover">${icon('bike')}</div><div class="item-main"><div class="item-title">${esc(r.name||'Cykelrute')}</div><div class="item-sub">${fmtDate(r.date)}${r.distance?` · ${fmtNum(r.distance/1000)} km`:''}</div></div>${icon('chevron-right')}</button>`).join('')}</div>`:empty('bike','Ingen cykelruter endnu','Når en cykelrute gemmes, kan den vises her.');}

function renderDashboard(){
  const a=activeVacation(),showGuard=state.settings.homeSections.guard!==false;
  const order=state.settings.homeOrder||emptyState().settings.homeOrder;
  const sections=order.filter(k=>state.settings.homeSections?.[k]!==false).map(dashboardSectionHTML302).join('');
  document.getElementById('mainContent').innerHTML=`<div class="page dashboard-page ${state.settings.homeLayout==='compact'?'compact-home':state.settings.homeLayout==='airy'?'airy-home':''}"><section class="hero ${showGuard?'':'hero-single'}"><div class="hero-card" id="dashboardHero"><div class="hero-logo-row"><img src="./assets/app-icon.webp" class="hero-logo" alt=""><div><div class="eyebrow">${esc(state.settings.homeEyebrow||'Den personlige campingbog')}</div><h1>${esc(state.settings.homeTitle||'Find én gang. Gem én gang. Brug overalt.')}</h1><p>${esc(state.settings.homeText||'')}</p></div></div><div class="hero-bottom"><div><div id="dashClock" class="clock">--:--</div><div id="dashDate" class="date"></div></div><div id="dashWeather" class="weather-pill">${icon('cloud-sun')} Henter vejret…</div></div></div>${showGuard?`<div class="guard-card"><div class="guard-copy"><span class="guard-status">${icon(a?'shield-check':'shield')} ${a?'På vagt':'Klar til ferie'}</span><h3>Ferie Vagten</h3><p>${a?`Holder øje med <b>${esc(a.name)}</b> og samler nyt indhold.`:'Start en ferie, så samler Ferie Vagten minderne undervejs.'}</p></div><img src="./assets/ferie-vagten/${a?'clipboard':'ready'}.webp" alt="Ferie Vagten"><div class="guard-actions">${a?`<button class="btn btn-primary" data-action="open-active-vacation">Åbn ferien</button>`:`<button class="btn btn-primary" data-action="start-vacation">${icon('play')} Start ferie</button>`}</div></div>`:''}</section><div class="dashboard-flow">${sections}</div></div>`;
  bindDashboard(); if(document.getElementById('dashboardMap'))initMap('dashboardMap',{compact:true,routes:[]});loadCurrentWeather();hydrateDashboard302();
}
function bindDashboard(){
  const tick=()=>{const n=new Date(),c=document.getElementById('dashClock'),d=document.getElementById('dashDate');if(c)c.textContent=n.toLocaleTimeString('da-DK',{hour:'2-digit',minute:'2-digit'});if(d)d.textContent=n.toLocaleDateString('da-DK',{weekday:'long',day:'numeric',month:'long',year:'numeric'});};tick();dashboardClockTimer=setInterval(tick,30000);
  document.querySelector('[data-action="open-active-vacation"]')?.addEventListener('click',()=>{const a=activeVacation();if(a)openVacationDetail(a.id);});
  document.querySelectorAll('[data-dash-route]').forEach(b=>b.onclick=()=>openRouteDetail(b.dataset.dashRoute));
  bindCampCards(); bindAlbumSlideshow302();
}
async function hydrateDashboard302(){
  if(state.settings.coverPhotoId){const u=await imageUrl(state.settings.coverPhotoId);const hero=document.getElementById('dashboardHero');if(u&&hero)hero.style.backgroundImage=`linear-gradient(135deg,rgba(47,93,69,.91),rgba(63,115,89,.76)),url("${u}")`;}
  for(const el of document.querySelectorAll('[data-slide-photo]')){if(el.dataset.slidePhoto){const u=await imageUrl(el.dataset.slidePhoto);if(u)el.style.backgroundImage=`linear-gradient(to top,rgba(20,31,24,.72),rgba(20,31,24,.05)),url("${u}")`;}}
  hydrateCampImages(document.getElementById('mainContent'));
}
function bindAlbumSlideshow302(){
  const root=document.getElementById('albumSlideshow');if(!root)return;const slides=[...root.querySelectorAll('.album-slide')],dots=[...root.querySelectorAll('[data-slide-dot]')];if(!slides.length)return;let i=0;
  const show=n=>{i=(n+slides.length)%slides.length;slides.forEach((s,j)=>s.classList.toggle('active',j===i));dots.forEach((d,j)=>d.classList.toggle('active',j===i));};
  dots.forEach((d,j)=>d.onclick=e=>{e.stopPropagation();show(j);});slides.forEach(s=>s.onclick=()=>openVacationDetail(s.dataset.slideVac));if(slides.length>1)dashboardSlideTimer=setInterval(()=>show(i+1),6500);
}

function memoryMeta302(kind){return kind==='attraction'?{collection:'attractions',singular:'seværdighed',plural:'Seværdigheder',icon:'landmark',action:'add-attraction'}:{collection:'experiences',singular:'oplevelse',plural:'Oplevelser',icon:'sparkles',action:'add-experience'};}
function renderMemoryList(kind,status){
  const m=memoryMeta302(kind),label=status==='wish'?'Ønskested':'Er besøgt';
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead(`${m.plural} · ${label}`,status==='wish'?`Gem ${m.singular}er I gerne vil opleve senere.`:`Gem de ${m.singular}er I allerede har oplevet.`,`<button class="btn btn-primary" id="memoryAdd">${icon('plus')} Tilføj ${m.singular}</button>`)}<div class="toolbar"><div class="searchbox">${icon('search')}<input id="memorySearch" placeholder="Søg navn, sted eller tags…"></div><select id="memorySort" class="btn btn-ghost"><option value="recent">Seneste</option><option value="name">Navn A–Å</option></select></div><div id="memoryList"></div></div>`;
  document.getElementById('memoryAdd').onclick=()=>openMemoryForm(kind,status);const update=()=>renderMemoryListBody302(kind,status);document.getElementById('memorySearch').oninput=update;document.getElementById('memorySort').onchange=update;update();
}
function renderMemoryListBody302(kind,status){
  const m=memoryMeta302(kind),q=(document.getElementById('memorySearch')?.value||'').trim().toLowerCase(),sort=document.getElementById('memorySort')?.value||'recent';
  let xs=(state[m.collection]||[]).filter(x=>(x.status||'visited')===status).filter(x=>!q||[x.title,x.location,x.city,x.country,...(x.tags||[])].join(' ').toLowerCase().includes(q));
  if(sort==='name')xs.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'da'));else xs.sort((a,b)=>String(b.date||b.updatedAt||b.createdAt||'').localeCompare(String(a.date||a.updatedAt||a.createdAt||'')));
  const box=document.getElementById('memoryList');if(!xs.length){box.innerHTML=empty(m.icon,`Ingen ${m.plural.toLowerCase()} endnu`,status==='wish'?'Tilføj det første ønskested.':'Tilføj den første oplevelse fra turen.',`<button class="btn btn-primary" id="memoryEmptyAdd">${icon('plus')} Tilføj</button>`);document.getElementById('memoryEmptyAdd')?.addEventListener('click',()=>openMemoryForm(kind,status));refreshIcons();return;}
  box.innerHTML=`<div class="memory-grid">${xs.map(x=>memoryCard302(kind,x)).join('')}</div>`;document.querySelectorAll('[data-memory-open]').forEach(b=>b.onclick=()=>openMemoryDetail302(kind,b.dataset.memoryOpen));refreshIcons();hydrateMemoryImages302(box,kind);
}
function memoryCard302(kind,x){const m=memoryMeta302(kind);return `<article class="memory-card" data-memory-open="${x.id}" tabindex="0"><div class="memory-cover" data-memory-photo="${x.photoIds?.[0]||''}">${icon(m.icon)}<div class="memory-status">${statusChip(x.status||'visited')}</div></div><div class="memory-body"><h3>${esc(x.title||m.singular)}</h3><div class="item-sub">${esc([x.location||x.city,x.country].filter(Boolean).join(', '))||'Placering ikke angivet'}</div><div class="chips">${(x.tags||[]).slice(0,3).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div><div class="camp-meta"><span>${x.date?fmtDate(x.date):'Ingen dato'}</span>${icon('chevron-right')}</div></div></article>`;}
async function hydrateMemoryImages302(root,kind){for(const el of root.querySelectorAll('[data-memory-photo]')){const id=el.dataset.memoryPhoto;if(id){const u=await imageUrl(id);if(u)el.insertAdjacentHTML('afterbegin',`<img src="${u}" alt="">`);}}}
function openMemoryForm(kind,status='visited',id=null,prefill={}){
  const m=memoryMeta302(kind),arr=state[m.collection],x=id?arr.find(v=>v.id===id):{...prefill,status},selectedVac=x?.vacationId||autoVacationId();
  modal(id?`Redigér ${m.singular}`:`Tilføj ${m.singular}`,`<form id="memoryForm"><div class="form-grid"><div class="field full"><label>Titel *</label><input name="title" required value="${esc(x?.title||'')}"></div><div class="field"><label>Status</label><select name="status"><option value="visited" ${(x?.status||status)==='visited'?'selected':''}>${esc(state.settings.visitedLabel||'Besøgt')}</option><option value="wish" ${(x?.status||status)==='wish'?'selected':''}>${esc(state.settings.wishLabel||'Ønskested')}</option></select></div><div class="field"><label>Dato / forventet dato</label><input type="date" name="date" value="${esc(x?.date||today())}"></div><div class="field full"><label>Sted / område</label><input name="location" value="${esc(x?.location||'')}"></div><div class="field full"><label>Adresse</label><input name="address" value="${esc(x?.address||'')}"></div><div class="field"><label>By</label><input name="city" value="${esc(x?.city||'')}"></div><div class="field"><label>Land</label><input name="country" value="${esc(x?.country||'')}"></div><div class="field"><label>Latitude</label><input name="lat" inputmode="decimal" value="${x?.lat??''}"></div><div class="field"><label>Longitude</label><input name="lon" inputmode="decimal" value="${x?.lon??''}"></div><div class="field"><label>Ferie</label><select name="vacationId"><option value="">Ingen</option>${state.vacations.map(v=>`<option value="${v.id}" ${selectedVac===v.id?'selected':''}>${esc(v.name)}</option>`).join('')}</select></div><div class="field"><label>Campingplads</label><select name="campgroundId"><option value="">Ingen</option>${state.campgrounds.map(c=>`<option value="${c.id}" ${x?.campgroundId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field full"><label>Tags</label><input name="tags" value="${esc((x?.tags||[]).join(', '))}" placeholder="Natur, familie, udsigt…"></div><div class="field full"><label>Noter</label><textarea name="notes">${esc(x?.notes||'')}</textarea></div></div><div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Annuller</button><button class="btn btn-primary" type="submit">${icon('save')} Gem</button></div></form>`,{size:'lg'});
  document.getElementById('memoryForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),now=new Date().toISOString();let obj=x;if(!id){obj={id:uid(kind==='attraction'?'attr':'exp'),photoIds:[],createdAt:now};arr.push(obj);}Object.assign(obj,{title:String(fd.get('title')||'').trim(),status:String(fd.get('status')||status),date:String(fd.get('date')||''),location:String(fd.get('location')||''),address:String(fd.get('address')||''),city:String(fd.get('city')||''),country:String(fd.get('country')||''),lat:parseCoord(fd.get('lat')),lon:parseCoord(fd.get('lon')),vacationId:String(fd.get('vacationId')||''),campgroundId:String(fd.get('campgroundId')||''),tags:String(fd.get('tags')||'').split(',').map(v=>v.trim()).filter(Boolean),notes:String(fd.get('notes')||''),updatedAt:now});saveState();closeModal();toast(`${m.singular[0].toUpperCase()+m.singular.slice(1)}en er gemt.`,'success');setRoute(kind==='attraction'?(obj.status==='wish'?'sevaerdigheder-oensker':'sevaerdigheder-besoegte'):(obj.status==='wish'?'oplevelser-oensker':'oplevelser-besoegte'));};refreshIcons();
}
function openExperienceForm(statusOrVacation='visited',id=null,prefill={}){if(statusOrVacation&&statusOrVacation!=='visited'&&statusOrVacation!=='wish'&&state.vacations.some(v=>v.id===statusOrVacation))return openMemoryForm('experience','visited',id,{...prefill,vacationId:statusOrVacation});return openMemoryForm('experience',statusOrVacation||'visited',id,prefill);}
function openMemoryDetail302(kind,id){
  const m=memoryMeta302(kind),x=state[m.collection].find(v=>v.id===id);if(!x)return;const vacation=state.vacations.find(v=>v.id===x.vacationId),camp=state.campgrounds.find(c=>c.id===x.campgroundId);
  modal(x.title||m.singular,`<div class="memory-detail"><div class="chips">${statusChip(x.status||'visited')}${x.date?`<span class="chip">${icon('calendar')} ${fmtDate(x.date)}</span>`:''}${vacation?`<span class="chip">${icon('palmtree')} ${esc(vacation.name)}</span>`:''}</div><p>${esc([x.address,x.location,x.city,x.country].filter(Boolean).join(' · '))}</p>${x.notes?`<div class="card"><b>Noter</b><p>${esc(x.notes)}</p></div>`:''}${camp?`<p><b>Campingplads:</b> ${esc(camp.name)}</p>`:''}<div id="memoryGallery" class="gallery"></div><div class="toolbar" style="margin-top:14px"><button class="btn btn-primary" id="memoryPhoto">${icon('image-plus')} Billede</button><button class="btn btn-secondary" id="memoryEdit">${icon('pencil')} Redigér</button>${x.lat&&x.lon?`<a class="btn btn-secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${x.lat},${x.lon}`)}">${icon('map')} Google Maps</a>`:''}<button class="btn btn-danger" id="memoryDelete">${icon('trash-2')} Slet</button></div></div>`,{size:'lg'});
  document.getElementById('memoryPhoto').onclick=()=>{closeModal();openPhotoPicker({[kind==='attraction'?'attractionId':'experienceId']:id,vacationId:x.vacationId||''});};document.getElementById('memoryEdit').onclick=()=>{closeModal();openMemoryForm(kind,x.status||'visited',id);};document.getElementById('memoryDelete').onclick=()=>confirmBox(`Slet ${m.singular}?`,'Handlingen kan ikke fortrydes.',()=>{state[m.collection]=state[m.collection].filter(v=>v.id!==id);saveState();toast('Slettet.','success');render();});hydrateSimpleGallery('memoryGallery',x.photoIds||[]);refreshIcons();
}

function openNoteForm(id=null){
  const n=id?state.notes.find(x=>x.id===id):null,a=state.settings.autoVacationWatch?activeVacation():null,selected=n?.vacationId||a?.id||'';
  modal(id?'Redigér notat':'Tilføj notat',`<form id="noteForm"><div class="form-grid"><div class="field"><label>Dato</label><input type="date" name="date" value="${esc(n?.date||today())}"></div><div class="field"><label>Ferie</label><select name="vacationId"><option value="">Ingen</option>${state.vacations.map(v=>`<option value="${v.id}" ${selected===v.id?'selected':''}>${esc(v.name)}</option>`).join('')}</select></div><div class="field full"><label>Campingplads</label><select name="campgroundId"><option value="">Ingen</option>${state.campgrounds.map(c=>`<option value="${c.id}" ${n?.campgroundId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field full"><label>Notat *</label><textarea name="text" required>${esc(n?.text||'')}</textarea></div></div><div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Annuller</button><button class="btn btn-primary" type="submit">${icon('save')} Gem notat</button></div></form>`,{size:'sm'});
  document.getElementById('noteForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);let x=n;if(!x){x={id:uid('note'),createdAt:new Date().toISOString()};state.notes.push(x);}Object.assign(x,{date:String(fd.get('date')||today()),text:String(fd.get('text')||''),vacationId:String(fd.get('vacationId')||''),campgroundId:String(fd.get('campgroundId')||''),updatedAt:new Date().toISOString()});saveState();closeModal();toast('Notatet er gemt.','success');if(location.hash==='#/notater')render();};refreshIcons();
}
function renderNotesPage(){
  const xs=[...state.notes].sort((a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||'')));
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead('Notater','Alle ferienoter samlet ét sted.',`<button class="btn btn-primary" id="noteAdd">${icon('plus')} Tilføj notat</button>`)}${xs.length?`<div class="list">${xs.map(n=>{const v=state.vacations.find(x=>x.id===n.vacationId),c=state.campgrounds.find(x=>x.id===n.campgroundId);return `<article class="item note-card"><div class="item-cover">${icon('notebook-pen')}</div><div class="item-main"><div class="item-title">${esc(n.text)}</div><div class="item-sub">${fmtDate(n.date||(n.createdAt||'').slice(0,10))}${v?` · ${esc(v.name)}`:''}${c?` · ${esc(c.name)}`:''}</div></div><div class="item-actions"><button class="icon-btn" data-note-edit="${n.id}">${icon('pencil')}</button><button class="icon-btn" data-note-delete="${n.id}">${icon('trash-2')}</button></div></article>`;}).join('')}</div>`:empty('notebook-pen','Ingen notater endnu','Tilføj små noter undervejs – de kan knyttes til en ferie og campingplads.')}</div>`;
  document.getElementById('noteAdd').onclick=()=>openNoteForm();document.querySelectorAll('[data-note-edit]').forEach(b=>b.onclick=()=>openNoteForm(b.dataset.noteEdit));document.querySelectorAll('[data-note-delete]').forEach(b=>b.onclick=()=>confirmBox('Slet notat?','Handlingen kan ikke fortrydes.',()=>{state.notes=state.notes.filter(n=>n.id!==b.dataset.noteDelete);saveState();render();}));refreshIcons();
}

function vacationCardHTML(v){
  const visits=state.visits.filter(x=>x.vacationId===v.id),routes=state.routes.filter(x=>x.vacationId===v.id),notes=state.notes.filter(x=>x.vacationId===v.id),photos=state.photos.filter(x=>x.vacationId===v.id),experiences=state.experiences.filter(x=>x.vacationId===v.id),attractions=state.attractions.filter(x=>x.vacationId===v.id);
  const statusLabel=v.status==='active'?'Aktiv ferie':v.status==='done'?'Afsluttet':'Planlagt',statusIcon=v.status==='active'?'shield-check':v.status==='done'?'book-check':'calendar-clock';
  return `<article class="camp-card" data-vac="${v.id}" tabindex="0"><div class="camp-cover" data-vac-photo="${v.photoIds?.[0]||photos[0]?.id||''}"><div class="camp-status"><span class="chip ${v.status==='active'?'active':v.status==='done'?'done':'wish'}">${icon(statusIcon)} ${statusLabel}</span></div></div><div class="camp-body"><h3>${esc(v.name)}</h3><div class="item-sub">${fmtDate(v.startDate)}${v.endDate?` – ${fmtDate(v.endDate)}`:''} · ${esc(v.destination||'Destination ikke angivet')}</div><div class="chips"><span class="chip">${visits.length} besøg</span><span class="chip">${routes.length} ruter</span><span class="chip">${photos.length} billeder</span><span class="chip">${experiences.length} oplevelser</span><span class="chip">${attractions.length} seværdigheder</span><span class="chip">${notes.length} noter</span></div></div></article>`;
}
function vacationTimeline(v,visits,routes,notes){
  const items=[];visits.forEach(x=>{const c=state.campgrounds.find(z=>z.id===x.campgroundId);items.push({date:x.date,html:`<b>${icon('tent-tree')} ${esc(c?.name||'Campingbesøg')}</b><div class="item-sub">${fmtDate(x.date)} · ${esc(x.notes||'')}</div>`});});routes.forEach(r=>items.push({date:r.date,html:`<b>${icon(r.type==='cycling'?'bike':'route')} ${esc(r.name)}</b><div class="item-sub">${fmtDate(r.date)}${r.distance?` · ${fmtNum(r.distance/1000)} km`:''}</div>`}));notes.forEach(n=>items.push({date:n.date||(n.createdAt||'').slice(0,10),html:`<b>${icon('notebook-pen')} Notat</b><div>${esc(n.text)}</div>`}));
  state.experiences.filter(x=>x.vacationId===v.id).forEach(x=>items.push({date:x.date||(x.createdAt||'').slice(0,10),html:`<b>${icon('sparkles')} ${esc(x.title||'Oplevelse')}</b><div class="item-sub">${fmtDate(x.date)} · ${esc(x.notes||'')}</div>`}));
  state.attractions.filter(x=>x.vacationId===v.id).forEach(x=>items.push({date:x.date||(x.createdAt||'').slice(0,10),html:`<b>${icon('landmark')} ${esc(x.title||'Seværdighed')}</b><div class="item-sub">${fmtDate(x.date)} · ${esc(x.notes||'')}</div>`}));
  state.photos.filter(x=>x.vacationId===v.id).forEach(x=>items.push({date:(x.createdAt||'').slice(0,10),html:`<button class="timeline-photo" data-photo="${x.id}">${icon('image')} <span><b>${esc(x.name||'Ferieminde')}</b><small>${fmtDate((x.createdAt||'').slice(0,10))}</small></span></button>`}));items.sort((a,b)=>String(a.date).localeCompare(String(b.date)));return items.length?items.map(i=>`<div class="timeline-item">${i.html}</div>`).join(''):`<div class="empty">Ferien har ikke samlet indhold endnu.</div>`;
}

async function removePhoto(id){
  try{await delImage(id);}catch(_){}state.photos=state.photos.filter(p=>p.id!==id);for(const collection of [state.campgrounds,state.vacations,state.routes,state.visits,state.experiences,state.attractions])for(const item of collection)if(Array.isArray(item.photoIds))item.photoIds=item.photoIds.filter(x=>x!==id);for(const r of state.routes)for(const stop of r.stops||[])if(Array.isArray(stop.photoIds))stop.photoIds=stop.photoIds.filter(x=>x!==id);if(state.settings.coverPhotoId===id)state.settings.coverPhotoId='';saveState();closeModal();toast('Billedet er fjernet.','success');render();
}

function renderSettings(){
  const order=state.settings.homeOrder||emptyState().settings.homeOrder;
  const sectionRows=order.map((id,i)=>`<div class="setting-row home-section-row"><div><h4>${esc(DASH_SECTION_LABELS_302[id]||id)}</h4><p>Vis/skjul og flyt sektionen på forsiden.</p></div><div class="setting-inline"><button class="toggle ${state.settings.homeSections?.[id]!==false?'on':''}" data-home-toggle="${id}" aria-label="Vis ${esc(DASH_SECTION_LABELS_302[id]||id)}"></button><button class="icon-btn" data-home-move="${id}" data-dir="-1" ${i===0?'disabled':''}>${icon('arrow-up')}</button><button class="icon-btn" data-home-move="${id}" data-dir="1" ${i===order.length-1?'disabled':''}>${icon('arrow-down')}</button></div></div>`).join('');
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead('Indstillinger','Tilpas appen ét sted – forsiden, udseendet, kortet, campingdata, ferie og backup.')}<div class="settings-layout"><aside class="card settings-nav">${[['general','Generelt'],['home','Forside'],['appearance','Udseende'],['map','Kort'],['camp','Campingpladser'],['vacation','Ferie'],['system','System']].map(([id,l],i)=>`<button data-settab="${id}" class="${i===0?'active':''}">${l}</button>`).join('')}</aside><section class="card">
    <div class="settings-section active" data-section="general"><h2>Generelt</h2><div class="setting-row"><div><h4>Appnavn</h4><p>Vises i appens topbjælke.</p></div><input class="setting-control" id="appNameSetting" value="${esc(state.settings.appName||'Vores Camping')}"></div><div class="setting-row"><div><h4>Forsidens overskrift</h4><p>Den personlige tekst i coverområdet.</p></div><input class="setting-control" id="homeEyebrowSetting" value="${esc(state.settings.homeEyebrow||'')}"></div><div class="setting-row"><div><h4>Forsidens hovedtekst</h4><p>Kort og tydelig titel.</p></div><input class="setting-control" id="homeTitleSetting" value="${esc(state.settings.homeTitle||'')}"></div><div class="setting-row"><div><h4>Forsidens beskrivelse</h4><p>Den lille forklarende tekst under titlen.</p></div><textarea class="setting-control setting-textarea" id="homeTextSetting">${esc(state.settings.homeText||'')}</textarea></div>${settingDateRow()}<div class="setting-row"><div><h4>Vis nedtælling</h4><p>Vis tiden til næste campingtur på Overblik.</p></div><button class="toggle ${state.settings.showCountdown?'on':''}" id="countdownToggle"></button></div></div>
    <div class="settings-section" data-section="home"><h2>Forside</h2><div class="setting-row"><div><h4>Coverbillede</h4><p>Personligt billede i toppen af Overblik.</p></div><div class="setting-inline"><input type="file" id="coverInput" accept="image/*" hidden><button class="btn btn-secondary" id="coverChoose">${icon('image-plus')} Vælg billede</button>${state.settings.coverPhotoId?`<button class="btn btn-danger" id="coverRemove">Fjern</button>`:''}</div></div><div id="coverPreview" class="cover-preview"></div><div class="setting-row"><div><h4>Visning</h4><p>Kompakt, normal eller luftig forside.</p></div><select class="setting-control" id="homeLayoutSetting"><option value="compact" ${state.settings.homeLayout==='compact'?'selected':''}>Kompakt</option><option value="normal" ${state.settings.homeLayout==='normal'?'selected':''}>Normal</option><option value="airy" ${state.settings.homeLayout==='airy'?'selected':''}>Luftig</option></select></div><h3>Synlige sektioner og rækkefølge</h3>${sectionRows}<div class="setting-row"><div><h4>Feriealbum-dias</h4><p>Lad afsluttede ferier skifte automatisk på Overblik.</p></div><button class="toggle ${state.settings.albumSlideshow?'on':''}" id="albumSlideToggle"></button></div></div>
    <div class="settings-section" data-section="appearance"><h2>Udseende</h2><div class="setting-row"><div><h4>Tema</h4><p>Lys campingstil med forskellige varmegrader.</p></div><select class="setting-control" id="themeSetting"><option value="camp-light" ${state.settings.theme==='camp-light'?'selected':''}>Lys camping</option><option value="warm" ${state.settings.theme==='warm'?'selected':''}>Varm & sand</option><option value="clean" ${state.settings.theme==='clean'?'selected':''}>Ren lys</option></select></div><div class="setting-row"><div><h4>Primær farve</h4><p>Bruges på knapper, ikoner og aktive elementer.</p></div><input class="setting-control" type="color" id="accentSetting" value="${esc(state.settings.accent||'#2f5d45')}"></div><div class="setting-row"><div><h4>Skalering</h4><p>Skalerer tekst og UI let op eller ned.</p></div><input class="setting-control" type="range" min="0.9" max="1.15" step="0.05" id="scaleSetting" value="${Number(state.settings.uiScale)||1}"></div><div class="setting-row"><div><h4>Elementstørrelse</h4><p>Kompakt, normal eller stor touch-visning.</p></div><select class="setting-control" id="densitySetting"><option value="compact" ${state.settings.density==='compact'?'selected':''}>Kompakt</option><option value="normal" ${state.settings.density==='normal'?'selected':''}>Normal</option><option value="large" ${state.settings.density==='large'?'selected':''}>Stor</option></select></div><div class="setting-row"><div><h4>Korthøjde</h4><p>Højden på kortbokse på siderne.</p></div><input class="setting-control" type="number" min="280" max="700" step="10" id="mapHeightSetting" value="${Number(state.settings.mapHeight)||430}"></div><div class="setting-row"><div><h4>Bokse</h4><p>Afrunding på kort og paneler.</p></div><input class="setting-control" type="range" min="10" max="34" step="2" id="radiusSetting" value="${Number(state.settings.boxRadius)||22}"></div><div class="setting-row"><div><h4>Knapper</h4><p>Bløde eller mere tydeligt kantede knapper.</p></div><select class="setting-control" id="buttonStyleSetting"><option value="soft" ${state.settings.buttonStyle==='soft'?'selected':''}>Bløde</option><option value="solid" ${state.settings.buttonStyle==='solid'?'selected':''}>Tydelige</option></select></div><div class="setting-row"><div><h4>Ikoner</h4><p>Skalering af standardikoner.</p></div><input class="setting-control" type="range" min="0.9" max="1.25" step="0.05" id="iconScaleSetting" value="${Number(state.settings.iconScale)||1}"></div></div>
    <div class="settings-section" data-section="map"><h2>Kort & API</h2><div class="setting-row"><div><h4>Kortstil</h4><p>MapLibre/OpenFreeMap eller MapTiler satellit.</p></div><select class="setting-control" id="settingMapStyle">${Object.keys(MAP_STYLES).map(k=>`<option value="${k}" ${state.settings.mapStyle===k?'selected':''}>${k[0].toUpperCase()+k.slice(1)}</option>`).join('')}<option value="satellite" ${state.settings.mapStyle==='satellite'?'selected':''}>MapTiler Satellit</option><option value="hybrid" ${state.settings.mapStyle==='hybrid'?'selected':''}>MapTiler Satellit + veje</option><option value="custom" ${state.settings.mapStyle==='custom'?'selected':''}>Egen MapLibre-style</option></select></div><div class="setting-row"><div><h4>MapTiler API-nøgle</h4><p>Kun til Satellit/Hybrid og udelades fra backup.</p></div><input class="setting-control" id="mapTilerKey" type="password" value="${esc(getMapTilerKey())}" placeholder="Indsæt MapTiler-nøgle"></div><div class="setting-row"><div><h4>Egen MapLibre style-URL</h4><p>Valgfri style.json til andre kortudbydere.</p></div><input class="setting-control" id="satelliteStyle" value="${esc(state.settings.satelliteStyle||'')}" placeholder="https://…/style.json"></div><div class="setting-row"><div><h4>OpenRouteService API-nøgle</h4><p>Gemmes separat fra campingdata.</p></div><input class="setting-control" id="orsKey" type="password" value="${esc(getApiKey())}" placeholder="Indsæt API-nøgle"></div><div class="setting-row"><div><h4>Test forbindelse</h4><p>Tester ORS-geocoding.</p></div><button class="btn btn-secondary" id="testOrs">${icon('plug-zap')} Test forbindelse</button></div><div id="orsTestState"></div><div class="form-section"><h3>Bil + campingvogn / HGV</h3><div class="form-grid">${['length:Længde (m)','width:Bredde (m)','height:Højde (m)','weight:Vægt (t)','axleload:Akseltryk (t)'].map(x=>{const[k,l]=x.split(':');return `<div class="field"><label>${l}</label><input data-hgv="${k}" inputmode="decimal" value="${esc(state.settings.hgv?.[k]||'')}"></div>`}).join('')}</div></div></div>
    <div class="settings-section" data-section="camp"><h2>Campingpladser</h2><div class="setting-row"><div><h4>Standardstatus</h4><p>For nye campingpladser fra den generelle Gem-funktion.</p></div><select class="setting-control" id="campDefaultStatus"><option value="visited" ${state.settings.campDefaultStatus==='visited'?'selected':''}>Besøgt</option><option value="wish" ${state.settings.campDefaultStatus==='wish'?'selected':''}>Ønskested</option></select></div><div class="setting-row"><div><h4>Standardsortering</h4><p>På campingpladslisterne.</p></div><select class="setting-control" id="campDefaultSort"><option value="recent" ${state.settings.campDefaultSort==='recent'?'selected':''}>Seneste</option><option value="rating" ${state.settings.campDefaultSort==='rating'?'selected':''}>Bedste vurdering</option><option value="name" ${state.settings.campDefaultSort==='name'?'selected':''}>Navn A–Å</option></select></div><div class="setting-row"><div><h4>Tekst for besøgt</h4><p>Statusnavn i chips og kort.</p></div><input class="setting-control" id="visitedLabelSetting" value="${esc(state.settings.visitedLabel||'Besøgt')}"></div><div class="setting-row"><div><h4>Tekst for ønskested</h4><p>Statusnavn i chips og kort.</p></div><input class="setting-control" id="wishLabelSetting" value="${esc(state.settings.wishLabel||'Ønskested')}"></div><h3>Vurderingskategorier</h3><div id="ratingSettings" class="list">${state.settings.ratingCategories.map(c=>`<div class="item"><div class="item-cover">${icon(c.icon||'star')}</div><div class="item-main"><input style="width:100%;border:0;background:transparent;font-weight:800" data-rating-label="${c.id}" value="${esc(c.label)}"><select data-rating-icon="${c.id}" style="margin-top:6px;border:1px solid var(--line);border-radius:9px;padding:5px;background:#fff"><option value="star" ${c.icon==='star'?'selected':''}>Stjerne</option><option value="map-pin" ${c.icon==='map-pin'?'selected':''}>Placering</option><option value="badge-euro" ${c.icon==='badge-euro'?'selected':''}>Pris</option><option value="sparkles" ${c.icon==='sparkles'?'selected':''}>Renlighed</option><option value="hand-heart" ${c.icon==='hand-heart'?'selected':''}>Service</option><option value="tent-tree" ${c.icon==='tent-tree'?'selected':''}>Faciliteter</option><option value="dog" ${c.icon==='dog'?'selected':''}>Hund</option><option value="bike" ${c.icon==='bike'?'selected':''}>Cykel</option></select></div>${state.settings.ratingCategories.length>1?`<button class="icon-btn" data-del-rating="${c.id}">${icon('trash-2')}</button>`:''}</div>`).join('')}</div><button class="btn btn-secondary" style="margin-top:10px" id="addRatingCat">${icon('plus')} Tilføj kategori</button><div class="section-title"><h2>Rangliste</h2><a href="#/bedste" class="btn btn-secondary">Åbn Bedst bedømte</a></div></div>
    <div class="settings-section" data-section="vacation"><h2>Ferie</h2><div class="setting-row"><div><h4>Ferie Vagten</h4><p>Automatisk opsamling til aktiv ferie.</p></div><button class="toggle ${state.settings.autoVacationWatch?'on':''}" id="autoWatch"></button></div><div class="setting-row"><div><h4>Feriealbum på forsiden</h4><p>Brug afsluttede ferier som skiftende dias.</p></div><button class="toggle ${state.settings.albumSlideshow?'on':''}" id="albumSlideToggleVacation"></button></div><div class="form-grid"><div><div class="card-head"><h3>Personer</h3><button class="btn btn-secondary" id="addPerson">+ Person</button></div><div class="list">${state.people.map(p=>`<div class="item"><div class="item-main"><b>${esc(p.name)}</b><div class="item-sub">${esc(p.role||'')}</div></div><button class="icon-btn" data-del-person="${p.id}">${icon('trash-2')}</button></div>`).join('')||'<div class="item-sub">Ingen personer oprettet.</div>'}</div></div><div><div class="card-head"><h3>Kæledyr</h3><button class="btn btn-secondary" id="addPet">+ Kæledyr</button></div><div class="list">${state.pets.map(p=>`<div class="item"><div class="item-main"><b>${esc(p.name)}</b><div class="item-sub">${esc(p.type||'Kæledyr')}</div></div><button class="icon-btn" data-del-pet="${p.id}">${icon('trash-2')}</button></div>`).join('')||'<div class="item-sub">Ingen kæledyr oprettet.</div>'}</div></div></div></div>
    <div class="settings-section" data-section="system"><h2>System</h2><div class="setting-row"><div><h4>Automatisk billedkomprimering</h4><p>Begrænser lagerforbruget.</p></div><button class="toggle ${state.settings.compressImages?'on':''}" id="compressToggle"></button></div><div class="setting-row"><div><h4>Maksimal billedside</h4><p>Længste side ved nye uploads.</p></div><input class="setting-control" id="imageMax" type="number" min="800" max="4000" value="${state.settings.imageMax}"></div><div class="setting-row"><div><h4>Eksport / sikkerhedskopi</h4><p>Samler campingdata og billeder. API-nøgler udelades.</p></div><button class="btn btn-primary" id="exportBackup">${icon('download')} Eksportér backup</button></div><div class="setting-row"><div><h4>Import</h4><p>Gendan fra en tidligere Vores Camping-backup.</p></div><button class="btn btn-secondary" id="importBackup">${icon('upload')} Importér</button></div><div class="setting-row"><div><h4>Ryd data</h4><p>Sletter campingdata og billeder.</p></div><button class="btn btn-danger" id="clearData">${icon('trash-2')} Ryd data</button></div><div class="setting-row"><div><h4>Nulstil indstillinger</h4><p>Beholder campingdata og billeder, men nulstiller tilpasningen.</p></div><button class="btn btn-secondary" id="resetSettings">${icon('rotate-ccw')} Nulstil</button></div><div class="setting-row"><div><h4>Appversion</h4><p>Statisk PWA, GitHub Pages-klar.</p></div><strong>v${APP_VERSION}</strong></div></div>
  </section></div></div>`;bindSettings();hydrateSettingsCover302();refreshIcons();
}
async function hydrateSettingsCover302(){const box=document.getElementById('coverPreview');if(!box)return;if(!state.settings.coverPhotoId){box.innerHTML='<div class="item-sub">Intet personligt coverbillede valgt.</div>';return;}const u=await imageUrl(state.settings.coverPhotoId);box.innerHTML=u?`<img src="${u}" alt="Forsidecover">`:'<div class="item-sub">Coverbilledet kunne ikke indlæses.</div>';}
function bindSettings(){
  document.querySelectorAll('[data-settab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-settab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-section]').forEach(s=>s.classList.toggle('active',s.dataset.section===b.dataset.settab));});
  const saveSetting=(id,key,transform=v=>v)=>document.getElementById(id)?.addEventListener('change',e=>{state.settings[key]=transform(e.target.value);saveState();applyAppearance();toast('Indstillingen er gemt.','success');renderNav();});
  saveSetting('appNameSetting','appName',v=>v.trim()||'Vores Camping');saveSetting('homeEyebrowSetting','homeEyebrow');saveSetting('homeTitleSetting','homeTitle');saveSetting('homeTextSetting','homeText');saveSetting('homeLayoutSetting','homeLayout');
  document.getElementById('nextTrip')?.addEventListener('change',e=>{state.settings.nextTrip=e.target.value;saveState();toast('Nedtællingen er opdateret.','success');});document.getElementById('countdownToggle')?.addEventListener('click',e=>{state.settings.showCountdown=!state.settings.showCountdown;e.currentTarget.classList.toggle('on',state.settings.showCountdown);saveState();});
  document.querySelectorAll('[data-home-toggle]').forEach(b=>b.onclick=()=>{const id=b.dataset.homeToggle;state.settings.homeSections[id]=state.settings.homeSections[id]===false?true:false;b.classList.toggle('on',state.settings.homeSections[id]);saveState();});document.querySelectorAll('[data-home-move]').forEach(b=>b.onclick=()=>{const arr=state.settings.homeOrder,id=b.dataset.homeMove,i=arr.indexOf(id),j=i+Number(b.dataset.dir);if(i<0||j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];saveState();renderSettings();});
  const albumToggle=btn=>btn&&btn.addEventListener('click',()=>{state.settings.albumSlideshow=!state.settings.albumSlideshow;saveState();renderSettings();});albumToggle(document.getElementById('albumSlideToggle'));albumToggle(document.getElementById('albumSlideToggleVacation'));
  document.getElementById('coverChoose')?.addEventListener('click',()=>document.getElementById('coverInput').click());document.getElementById('coverInput')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;const id=uid('photo'),blob=await compressImage(f);await putImage(id,blob);state.photos.push({id,name:f.name||'Forsidecover',type:blob.type,role:'cover',createdAt:new Date().toISOString()});state.settings.coverPhotoId=id;saveState();toast('Coverbilledet er gemt.','success');renderSettings();});document.getElementById('coverRemove')?.addEventListener('click',()=>{state.settings.coverPhotoId='';saveState();renderSettings();});
  saveSetting('themeSetting','theme');saveSetting('accentSetting','accent');saveSetting('scaleSetting','uiScale',Number);saveSetting('densitySetting','density');saveSetting('mapHeightSetting','mapHeight',v=>Math.max(280,Math.min(700,Number(v)||430)));saveSetting('radiusSetting','boxRadius',Number);saveSetting('buttonStyleSetting','buttonStyle');saveSetting('iconScaleSetting','iconScale',Number);
  document.getElementById('settingMapStyle')?.addEventListener('change',e=>{state.settings.mapStyle=e.target.value;saveState();});document.getElementById('mapTilerKey')?.addEventListener('change',e=>{setMapTilerKey(e.target.value);toast('MapTiler-nøglen er gemt separat.','success');});document.getElementById('satelliteStyle')?.addEventListener('change',e=>{state.settings.satelliteStyle=e.target.value.trim();saveState();});document.getElementById('orsKey')?.addEventListener('change',e=>{setApiKey(e.target.value);toast('ORS-nøglen er gemt separat.','success');});document.getElementById('testOrs')?.addEventListener('click',testOrs);document.querySelectorAll('[data-hgv]').forEach(i=>i.onchange=()=>{state.settings.hgv=state.settings.hgv||{};state.settings.hgv[i.dataset.hgv]=i.value.replace(',','.');saveState();});
  saveSetting('campDefaultStatus','campDefaultStatus');saveSetting('campDefaultSort','campDefaultSort');saveSetting('visitedLabelSetting','visitedLabel',v=>v.trim()||'Besøgt');saveSetting('wishLabelSetting','wishLabel',v=>v.trim()||'Ønskested');
  document.querySelectorAll('[data-rating-label]').forEach(i=>i.onchange=()=>{const c=state.settings.ratingCategories.find(x=>x.id===i.dataset.ratingLabel);if(c)c.label=i.value.trim()||c.label;saveState();});document.querySelectorAll('[data-rating-icon]').forEach(i=>i.onchange=()=>{const c=state.settings.ratingCategories.find(x=>x.id===i.dataset.ratingIcon);if(c)c.icon=i.value;saveState();renderSettings();});document.querySelectorAll('[data-del-rating]').forEach(b=>b.onclick=()=>{state.settings.ratingCategories=state.settings.ratingCategories.filter(c=>c.id!==b.dataset.delRating);saveState();renderSettings();});document.getElementById('addRatingCat')?.addEventListener('click',()=>{state.settings.ratingCategories.push({id:uid('rating'),label:'Ny kategori',icon:'star'});saveState();renderSettings();});
  document.getElementById('autoWatch')?.addEventListener('click',e=>{state.settings.autoVacationWatch=!state.settings.autoVacationWatch;e.currentTarget.classList.toggle('on',state.settings.autoVacationWatch);saveState();});document.getElementById('addPerson')?.addEventListener('click',()=>simpleEntityModal('person'));document.getElementById('addPet')?.addEventListener('click',()=>simpleEntityModal('pet'));document.querySelectorAll('[data-del-person]').forEach(b=>b.onclick=()=>{state.people=state.people.filter(p=>p.id!==b.dataset.delPerson);saveState();renderSettings();});document.querySelectorAll('[data-del-pet]').forEach(b=>b.onclick=()=>{state.pets=state.pets.filter(p=>p.id!==b.dataset.delPet);saveState();renderSettings();});
  document.getElementById('compressToggle')?.addEventListener('click',e=>{state.settings.compressImages=!state.settings.compressImages;e.currentTarget.classList.toggle('on',state.settings.compressImages);saveState();});document.getElementById('imageMax')?.addEventListener('change',e=>{state.settings.imageMax=Math.max(800,Math.min(4000,Number(e.target.value)||1800));saveState();});document.getElementById('exportBackup')?.addEventListener('click',exportBackup);document.getElementById('importBackup')?.addEventListener('click',()=>document.getElementById('hiddenImportInput').click());document.getElementById('clearData')?.addEventListener('click',()=>confirmBox('Ryd alle campingdata?','Lav gerne en backup først. API-nøgler slettes ikke automatisk.',async()=>{state=emptyState();saveState();const d=await db();await new Promise(res=>{const tx=d.transaction(IMG_STORE,'readwrite');tx.objectStore(IMG_STORE).clear();tx.oncomplete=res;});normalize302();applyAppearance();toast('Campingdata er ryddet.');render();}));document.getElementById('resetSettings')?.addEventListener('click',()=>confirmBox('Nulstil indstillinger?','Campingdata og billeder bevares. Kun appens tilpasning nulstilles.',()=>{state.settings=emptyState().settings;saveState();applyAppearance();toast('Indstillingerne er nulstillet.','success');renderSettings();}));
}

function renderCampList(status){
  const title=status==='visited'?'Campingpladser · Er besøgt':`Campingpladser · ${state.settings.wishLabel||'Ønskested'}`;const sub=status==='visited'?'Jeres fælles bibliotek over campingpladser og tidligere besøg.':'Gem steder én gang og brug dem direkte i ferie- og ruteplanlægningen.';
  document.getElementById('mainContent').innerHTML=`<div class="page">${pageHead(title,sub,`<button class="btn btn-primary" data-action="${status==='visited'?'add-camp':'add-wish'}">${icon('plus')} Tilføj</button>`)}<div class="toolbar"><div class="searchbox">${icon('search')}<input id="campFilter" placeholder="Søg navn, by, land eller tags…"></div><select id="campSort" class="btn btn-ghost"><option value="recent">Seneste</option><option value="rating">Bedste vurdering</option><option value="name">Navn A–Å</option></select><a href="#/bedste" class="btn btn-secondary">${icon('trophy')} Bedst bedømte</a></div><div id="campList"></div></div>`;
  document.getElementById('campSort').value=state.settings.campDefaultSort||'recent';const update=()=>renderCampListBody(status);document.getElementById('campFilter').addEventListener('input',update);document.getElementById('campSort').addEventListener('change',update);update();
}

function bootstrap(){
  normalize302();applyAppearance();if(!location.hash)location.hash='#/overblik';bindGlobal();migrateLegacy();render();registerServiceWorker();
}


function openVacationDetail(id){
  const v=state.vacations.find(x=>x.id===id);if(!v)return;
  const visits=state.visits.filter(x=>x.vacationId===id).sort((a,b)=>String(a.date).localeCompare(String(b.date))),routes=state.routes.filter(x=>x.vacationId===id),notes=state.notes.filter(x=>x.vacationId===id),photos=state.photos.filter(x=>x.vacationId===id),experiences=state.experiences.filter(x=>x.vacationId===id),attractions=state.attractions.filter(x=>x.vacationId===id),camps=[...new Set(visits.map(x=>x.campgroundId))].map(cid=>state.campgrounds.find(c=>c.id===cid)).filter(Boolean);
  modal(v.name,`<div class="vacation-banner" style="position:relative"><div><span class="guard-status">${v.status==='active'?icon('shield-check')+' Ferie Vagten er aktiv':icon('book-open')+' Gemt ferie'}</span><h1>${esc(v.name)}</h1><p>${fmtDate(v.startDate)}${v.endDate?` – ${fmtDate(v.endDate)}`:''} · ${esc(v.destination||'')}</p><div class="chips"><span class="chip">${camps.length} campingpladser</span><span class="chip">${routes.length} ruter</span><span class="chip">${photos.length} billeder</span><span class="chip">${experiences.length} oplevelser</span><span class="chip">${attractions.length} seværdigheder</span><span class="chip">${notes.length} noter</span></div></div><img src="./assets/ferie-vagten/${v.status==='active'?'patrol':'relax'}.webp" alt="Ferie Vagten"></div><div class="toolbar" style="margin-top:14px"><button class="btn btn-primary" id="vacPhoto">${icon('image-plus')} Billede</button><button class="btn btn-secondary" id="vacExperience">${icon('sparkles')} Oplevelse</button><button class="btn btn-secondary" id="vacAttraction">${icon('landmark')} Seværdighed</button><button class="btn btn-secondary" id="vacNote">${icon('notebook-pen')} Notat</button><button class="btn btn-secondary" id="vacEdit">${icon('pencil')} Redigér</button>${v.status==='active'?`<button class="btn btn-warning" id="vacEnd">${icon('flag')} Afslut ferie</button>`:`<button class="btn btn-secondary" id="vacActivate">${icon('play')} Aktivér igen</button>`}</div>${photos.length?`<div class="section-title"><h2>Feriens billeder</h2></div><div id="vacPhotoGallery" class="gallery"></div>`:''}<div class="section-title"><h2>Feriens historie</h2></div><div class="timeline">${vacationTimeline(v,visits,routes,notes)}</div>`,{size:'lg'});
  document.getElementById('vacPhoto').onclick=()=>{closeModal();openPhotoPicker({vacationId:id});};document.getElementById('vacExperience').onclick=()=>{closeModal();openMemoryForm('experience','visited',null,{vacationId:id});};document.getElementById('vacAttraction').onclick=()=>{closeModal();openMemoryForm('attraction','visited',null,{vacationId:id});};document.getElementById('vacNote').onclick=()=>{closeModal();openNoteForm();setTimeout(()=>{const sel=document.querySelector('#noteForm select[name="vacationId"]');if(sel)sel.value=id;},0);};document.getElementById('vacEdit').onclick=()=>{closeModal();openVacationForm(id);};
  document.getElementById('vacEnd')?.addEventListener('click',()=>{v.status='done';if(!v.endDate)v.endDate=today();saveState();closeModal();toast('Ferien er afsluttet. Albummet er klar.','success');render();});document.getElementById('vacActivate')?.addEventListener('click',()=>{state.vacations.forEach(x=>{if(x.status==='active')x.status='done';});v.status='active';saveState();closeModal();toast('Ferie Vagten er på vagt igen.','success');render();});if(photos.length)hydrateSimpleGallery('vacPhotoGallery',photos.map(p=>p.id));refreshIcons();
}

bootstrap();

})();
