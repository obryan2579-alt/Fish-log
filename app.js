const LAKE_CENTER=[38.00665,-85.26772];
const STORE='fishlog_v1_catches';
const LURE_STORE='fishlog_v1_lures';
let map, markersLayer, zoneLayer, manualLayer, currentLatLng=[...LAKE_CENTER];
let editMode=false;
let currentPhotoData='';
let selectedLure='Rage Craw - Green Pumpkin';
let selectedLureType='Soft Plastics';
const lureDB={
  'Soft Plastics':['Rage Craw','Speed Craw','Brush Hog','Senko','D Bomb','Bronco Bug','Trick Worm','Creature Bait','Other / Custom'],
  'Jigs':['Flipping Jig','Football Jig','Swim Jig','Finesse Jig','Casting Jig','Other / Custom'],
  'Crankbaits':['Bandit 100','Bandit 200','Bandit 300','Rapala DT-6','Rapala DT-10','Strike King 3XD','Strike King 5XD','Squarebill','Other / Custom'],
  'Chatterbaits':['Z-Man ChatterBait','Thunder Cricket','JackHammer','Original ChatterBait','Other / Custom'],
  'Spinnerbaits':['Double Willow Spinnerbait','Colorado Spinnerbait','Tandem Spinnerbait','Booyah Spinnerbait','Other / Custom'],
  'Topwater':['Popper','Walking Bait','Buzzbait','Frog','Whopper Plopper','Other / Custom'],
  'Swimbaits':['Keitech Swing Impact','Paddle Tail Swimbait','Glide Bait','A-Rig','Other / Custom'],
  'Other':['Other / Custom']
};
const lureColors=['Green Pumpkin','Black/Blue','Junebug','Watermelon Red','Chartreuse/Black Back','Sexy Shad','Bone','White','PB&J','Crawfish','Other / Custom'];
let catches=load(STORE, seedCatches());
let lures=load(LURE_STORE,['Rage Craw - Green Pumpkin','Bandit 200 - Chart/Black','Flipping Jig - PB&J','Ned Rig - Green Pumpkin']);

function load(k,fallback){try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}}
function save(){localStorage.setItem(STORE,JSON.stringify(catches));localStorage.setItem(LURE_STORE,JSON.stringify(lures));}
function seedCatches(){return[{id:crypto.randomUUID(),species:'Largemouth Bass',length:18.5,weight:3.2,lure:'Rage Craw - Green Pumpkin',depth:8,waterTemp:68,lat:38.00665,lng:-85.26772,notes:'Sample catch. Tap pin for details. New catches can include a fish photo.',photo:'',date:new Date().toISOString()}]}

function initMap(){
  map=L.map('map',{zoomControl:false,tap:true}).setView(LAKE_CENTER,15);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'}).addTo(map);
  markersLayer=L.layerGroup().addTo(map); zoneLayer=L.layerGroup().addTo(map); manualLayer=L.layerGroup().addTo(map);
  map.on('click',e=>{setManualLocation(e.latlng.lat,e.latlng.lng,true);});
  renderMap();
  setTimeout(()=>map.invalidateSize(),300);
}

function markerIcon(c,isBig=false){return L.divIcon({className:'',html:`<div class="fishMarker ${isBig?'trophyPulse':''}"><span>🐟</span></div>`,iconSize:[42,42],iconAnchor:[21,42]});}
function clusterIcon(n){return L.divIcon({className:'',html:`<div class="clusterMarker">${n}</div>`,iconSize:[58,58],iconAnchor:[29,29]});}
function renderMap(){
  if(!markersLayer)return; markersLayer.clearLayers(); zoneLayer.clearLayers();
  const groups=clusterCatches(catches,70);
  groups.forEach(g=>{
    if(g.items.length>1 && map.getZoom()<17){
      const m=L.marker(g.center,{icon:clusterIcon(g.items.length)}).addTo(markersLayer);
      m.on('click touchstart',()=>{map.setView(g.center,18,{animate:true}); setTimeout(renderMap,350);});
    } else {
      const biggest=g.items.reduce((a,b)=>(+b.length||0)>(+a.length||0)?b:a,g.items[0]);
      g.items.forEach(c=>{
        const isBig=g.items.length>1 && c.id===biggest.id;
        const m=L.marker([c.lat,c.lng],{icon:markerIcon(c,isBig)}).addTo(markersLayer);
        const open=()=>{map.closePopup();showCatchDetail(c.id);};
        m.on('click',open); m.on('touchstart',open);
      });
    }
  });
  renderBigFishZones(groups);
}
function renderBigFishZones(groups){
  groups.forEach(g=>{
    const q=g.items.filter(c=>/bass/i.test(c.species||'') && (+c.length>=15));
    if(q.length>=3){
      const avg=q.reduce((s,c)=>s+(+c.length||0),0)/q.length;
      const circle=L.circle(g.center,{radius:70,color:'#f2b23b',fillColor:'#f2b23b',fillOpacity:Math.min(.35,.13+q.length*.03),weight:2}).addTo(zoneLayer);
      circle.on('click touchstart',()=>showZoneDetail(q,avg));
    }
  });
}
function clusterCatches(items,radiusMeters){
  const groups=[];
  for(const c of items){
    let placed=false;
    for(const g of groups){
      if(distanceMeters([c.lat,c.lng],g.center)<radiusMeters){g.items.push(c);g.center=[g.items.reduce((s,x)=>s+x.lat,0)/g.items.length,g.items.reduce((s,x)=>s+x.lng,0)/g.items.length];placed=true;break;}
    }
    if(!placed)groups.push({center:[c.lat,c.lng],items:[c]});
  }
  return groups;
}
function distanceMeters(a,b){const R=6371000,rad=x=>x*Math.PI/180;const dLat=rad(b[0]-a[0]),dLng=rad(b[1]-a[1]);const s=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(s));}

function bassHero(c){
  if(c.photo) return `<img class="detailPhoto" src="${c.photo}" alt="Fish photo">`;
  return `<div class="bassHero" role="img" aria-label="Cartoon largemouth bass"><svg viewBox="0 0 820 360" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0c7f74"/><stop offset="1" stop-color="#062c36"/></linearGradient><linearGradient id="bass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d7e2a4"/><stop offset=".45" stop-color="#6f8b42"/><stop offset="1" stop-color="#24391f"/></linearGradient></defs><rect width="820" height="360" rx="30" fill="url(#water)"/><path d="M590 176c74-55 148-48 188-9-33 34-99 50-188 9z" fill="#56733a" stroke="#172817" stroke-width="10"/><ellipse cx="390" cy="178" rx="286" ry="112" fill="url(#bass)" stroke="#172817" stroke-width="10"/><path d="M165 132c-52 4-83 31-103 70 42-18 76-16 111 0" fill="#f7f4d5" stroke="#172817" stroke-width="9"/><path d="M190 112c-48-40-97-37-126-8 43 10 66 35 86 73" fill="#e8e6bd" stroke="#172817" stroke-width="8"/><circle cx="207" cy="136" r="19" fill="#0b130d"/><circle cx="212" cy="130" r="6" fill="#fff"/><path d="M268 92c111-60 251-56 375 2-91-5-177 10-258 41" fill="#80934f" stroke="#172817" stroke-width="9"/><path d="M342 265c50 21 116 25 174 10-49 61-111 77-174-10z" fill="#6e7f3e" stroke="#172817" stroke-width="8"/><path d="M250 179c66-21 146 23 211 9s135-48 207-5" fill="none" stroke="#182415" stroke-width="25" stroke-linecap="round" opacity=".8"/><g fill="#253319" opacity=".65"><circle cx="310" cy="149" r="10"/><circle cx="356" cy="205" r="12"/><circle cx="427" cy="150" r="9"/><circle cx="493" cy="215" r="11"/><circle cx="558" cy="151" r="9"/></g></svg><h2>Largemouth Bass</h2></div>`;
}
function showCatchDetail(id){const c=catches.find(x=>x.id===id); if(!c)return; const hero=/largemouth bass/i.test(c.species||'')?bassHero(c):(c.photo?`<img class="detailPhoto" src="${c.photo}" alt="Fish photo">`:`<h2 class="detailTitle">${escapeHtml(c.species)}</h2>`); document.getElementById('sheetContent').innerHTML=`${hero}${!/largemouth bass/i.test(c.species||'')?'': ''}<div class="detailGrid"><div><b>${fmt(c.length)} in</b><small>Length</small></div><div><b>${fmt(c.weight)} lb</b><small>Weight</small></div><div><b>${escapeHtml(c.lure||'—')}</b><small>Lure</small></div><div><b>${fmt(c.depth)} ft</b><small>Depth</small></div><div><b>${fmt(c.waterTemp)}°F</b><small>Water temp</small></div><div><b>${new Date(c.date).toLocaleDateString()}</b><small>Date</small></div></div><p>${escapeHtml(c.notes||'')}</p><p class="muted">${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}</p>`; openSheet();}
function showZoneDetail(q,avg){const big=q.reduce((a,b)=>(+b.length||0)>(+a.length||0)?b:a,q[0]); document.getElementById('sheetContent').innerHTML=`<h2 class="detailTitle">Big Fish Zone</h2><p>${q.length} qualifying bass 15 inches or larger.</p><div class="detailGrid"><div><b>${avg.toFixed(1)} in</b><small>Average length</small></div><div><b>${big.length} in</b><small>Largest bass</small></div><div><b>${escapeHtml(bestLure(q))}</b><small>Best lure</small></div><div><b>${q.length}</b><small>Qualifying catches</small></div></div>`; openSheet();}
function bestLure(arr){const m={};arr.forEach(c=>m[c.lure]=(m[c.lure]||0)+1);return Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'}
function openSheet(){document.getElementById('detailSheet').classList.remove('hidden')}function closeSheet(){document.getElementById('detailSheet').classList.add('hidden')}

function switchView(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('.bottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id)); if(id==='mapView')setTimeout(()=>{map.invalidateSize();renderMap();},150); if(id==='historyView')renderHistory(); if(id==='statsView')renderStats(); if(id==='luresView')renderLures();}
function updateLocationField(){const el=document.getElementById('locationText'); if(el) el.value=`${currentLatLng[0].toFixed(5)}, ${currentLatLng[1].toFixed(5)}`;}
function setManualLocation(lat,lng,showToast=false){currentLatLng=[lat,lng]; updateLocationField(); if(manualLayer){manualLayer.clearLayers(); L.circleMarker(currentLatLng,{radius:10,color:'#168cff',fillColor:'#168cff',fillOpacity:.35,weight:3}).addTo(manualLayer); L.marker(currentLatLng,{icon:L.divIcon({className:'',html:'<div class=\"dropPin\">＋</div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(manualLayer);} if(showToast) flashMessage('Catch location set. Tap Log Catch to save fish here.');}
function numVal(id){const el=document.getElementById(id); const raw=(el?.value||el?.placeholder||'').trim(); return raw===''?'':Number(raw);}
function saveCatch(){const c={id:crypto.randomUUID(),species:val('species')||'Largemouth Bass',length:numVal('length'),weight:numVal('weight'),lure:getSelectedLure()||'No lure selected',depth:numVal('depth'),waterTemp:numVal('waterTemp'),lat:currentLatLng[0],lng:currentLatLng[1],notes:val('notes'),photo:currentPhotoData||'',date:new Date().toISOString()}; catches.push(c); save(); resetPhotoInput(); if(manualLayer)manualLayer.clearLayers(); renderMap(); switchView('mapView'); flashMessage('Catch saved. Tap the pin to view details.');}
function val(id){return document.getElementById(id).value}
function renderHistory(){const list=document.getElementById('historyList'); if(!catches.length){list.innerHTML='<div class="catchRow"><p>No catches yet.</p></div>';return;} list.innerHTML=catches.slice().reverse().map(c=>`<div class="catchRow" data-id="${c.id}">${editMode?`<input type="checkbox" class="catchCheck" value="${c.id}">`:''}${c.photo?`<img class="thumbMini" src="${c.photo}" alt="Fish photo">`:`<div class="pinMini">🐟</div>`}<div><h3>${escapeHtml(c.species)} — ${fmt(c.length)} in</h3><p>${new Date(c.date).toLocaleString()} · ${escapeHtml(c.lure||'No lure')}</p></div><button class="rowOpen" data-id="${c.id}">›</button></div>`).join(''); document.querySelectorAll('.rowOpen').forEach(b=>b.onclick=()=>showCatchDetail(b.dataset.id)); document.querySelectorAll('.catchRow').forEach(r=>{r.onclick=e=>{if(e.target.type==='checkbox'||e.target.className==='rowOpen')return; if(editMode){const cb=r.querySelector('.catchCheck'); if(cb)cb.checked=!cb.checked;}else showCatchDetail(r.dataset.id)}});}
function toggleEdit(){editMode=!editMode;document.getElementById('bulkBar').classList.toggle('hidden',!editMode);document.getElementById('editHistoryBtn').textContent=editMode?'Done':'Select';renderHistory();}
function deleteSelected(){const ids=[...document.querySelectorAll('.catchCheck:checked')].map(x=>x.value); if(!ids.length){alert('Select at least one catch.');return;} if(!confirm(`Delete ${ids.length} selected catch(es)?`))return; catches=catches.filter(c=>!ids.includes(c.id)); save(); renderHistory(); renderMap();}
function resetAll(){if(confirm('Delete ALL catches and pins?')){catches=[];save();renderHistory();renderMap();}}
function renderStats(){document.getElementById('statsBox').innerHTML=`<h3>Total catches: ${catches.length}</h3><p>Biggest fish: ${Math.max(0,...catches.map(c=>+c.length||0))} in</p><p>Best lure: ${escapeHtml(bestLure(catches))}</p>`}
function renderLures(){document.getElementById('lureList').innerHTML=Object.entries(lureDB).map(([type,items])=>`<div class="catchRow"><div class="pinMini">🪱</div><div><h3>${escapeHtml(type)}</h3><p>${items.filter(x=>x!=='Other / Custom').map(escapeHtml).join(', ')}</p></div></div>`).join('')}
function addLure(){const type=prompt('Lure type/category','Soft Plastics'); if(!type)return; const name=prompt('Exact lure name'); if(!name)return; if(!lureDB[type]) lureDB[type]=[]; if(!lureDB[type].includes(name)) lureDB[type].splice(Math.max(0,lureDB[type].length-1),0,name); populateLureTypes(type,name); renderLures();}
function populateLureTypes(type='Soft Plastics', exact='Rage Craw'){
  const t=document.getElementById('lureType'), e=document.getElementById('lureExact'), c=document.getElementById('lureColor'); if(!t||!e||!c)return;
  t.innerHTML=Object.keys(lureDB).map(x=>`<option ${x===type?'selected':''}>${escapeHtml(x)}</option>`).join('');
  const items=lureDB[t.value]||lureDB['Other']; e.innerHTML=items.map(x=>`<option ${x===exact?'selected':''}>${escapeHtml(x)}</option>`).join('');
  c.innerHTML=lureColors.map(x=>`<option ${x==='Green Pumpkin'?'selected':''}>${escapeHtml(x)}</option>`).join('');
  updateCustomLureVisibility();
}
function updateExactLures(){const type=val('lureType'); const e=document.getElementById('lureExact'); e.innerHTML=(lureDB[type]||lureDB['Other']).map(x=>`<option>${escapeHtml(x)}</option>`).join(''); updateCustomLureVisibility();}
function updateCustomLureVisibility(){const wrap=document.getElementById('customLureWrap'); const isCustom=val('lureExact')==='Other / Custom'; wrap.classList.toggle('hidden',!isCustom);}
function getSelectedLure(){const exact=val('lureExact'); const name= exact==='Other / Custom' ? (val('customLure')||'Custom Lure') : exact; const color=val('lureColor'); return `${name} - ${color}`;}

function handlePhotoFile(file){
  if(!file)return;
  if(!file.type.startsWith('image/')){alert('Please choose an image file.');return;}
  const reader=new FileReader();
  reader.onload=()=>resizeImage(reader.result,900,0.82).then(data=>{
    currentPhotoData=data;
    const img=document.getElementById('photoPreview');
    img.src=data; img.classList.remove('hidden');
    document.getElementById('clearPhoto').classList.remove('hidden');
  });
  reader.readAsDataURL(file);
}
function resizeImage(dataUrl,maxSize=900,quality=.82){return new Promise(resolve=>{const img=new Image(); img.onload=()=>{let {width,height}=img; const scale=Math.min(1,maxSize/Math.max(width,height)); width=Math.round(width*scale); height=Math.round(height*scale); const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height; const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,width,height); resolve(canvas.toDataURL('image/jpeg',quality));}; img.src=dataUrl;});}
function resetPhotoInput(){currentPhotoData=''; const input=document.getElementById('fishPhoto'); if(input)input.value=''; const img=document.getElementById('photoPreview'); if(img){img.src=''; img.classList.add('hidden');} const btn=document.getElementById('clearPhoto'); if(btn)btn.classList.add('hidden');}
function goHotspot(){
  if(!catches.length){map.setView(LAKE_CENTER,15); flashMessage('No catches logged yet.'); return;}
  const recentCut=Date.now()-1000*60*60*24*90;
  const scored=clusterCatches(catches,110).map(g=>{const recent=g.items.filter(c=>new Date(c.date).getTime()>recentCut).length; const big=g.items.filter(c=>/bass/i.test(c.species||'') && (+c.length>=15)).length; return {g,score:g.items.length+(recent*1.5)+(big*2)};}).sort((a,b)=>b.score-a.score)[0];
  map.flyTo(scored.g.center,17,{animate:true,duration:.8});
  flashMessage(`Jumped to hottest area: ${scored.g.items.length} catch(es).`);
  setTimeout(renderMap,900);
}

function fmt(v){return (v===0||v)?v:'—'}
function flashMessage(msg){let el=document.getElementById('toast'); if(!el){el=document.createElement('div'); el.id='toast'; document.body.appendChild(el);} el.textContent=msg; el.className='toast show'; setTimeout(()=>el.className='toast',2200);}
function escapeHtml(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}

document.addEventListener('DOMContentLoaded',()=>{
  initMap(); updateLocationField();
  document.querySelectorAll('.bottomNav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  document.getElementById('quickLog').onclick=()=>switchView('logView'); document.getElementById('cancelLog').onclick=()=>switchView('mapView'); document.getElementById('saveCatch').onclick=saveCatch; populateLureTypes(); document.getElementById('lureType').onchange=updateExactLures; document.getElementById('lureExact').onchange=updateCustomLureVisibility;
  document.getElementById('locateBtn').onclick=()=>navigator.geolocation?.getCurrentPosition(p=>{setManualLocation(p.coords.latitude,p.coords.longitude,true);map.setView(currentLatLng,17);},()=>alert('Location unavailable.'));
  document.getElementById('homeBtn').onclick=goHotspot;
  document.getElementById('fishPhoto').onchange=e=>handlePhotoFile(e.target.files?.[0]); document.getElementById('clearPhoto').onclick=resetPhotoInput;
  document.getElementById('closeSheet').onclick=closeSheet; document.getElementById('editHistoryBtn').onclick=toggleEdit; document.getElementById('deleteSelectedBtn').onclick=deleteSelected; document.getElementById('clearAllBtn').onclick=resetAll; document.getElementById('selectAllCatches').onchange=e=>document.querySelectorAll('.catchCheck').forEach(cb=>cb.checked=e.target.checked); document.getElementById('addLureBtn').onclick=addLure;
});
