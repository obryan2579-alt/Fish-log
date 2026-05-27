const LAKE_CENTER=[38.00665,-85.26772];
const STORE='fishlog_v1_catches';
const LURE_STORE='fishlog_v1_lures';
const DEFAULT_BASS_IMG=`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 420">
  <defs>
    <linearGradient id="water" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#12323a"/>
      <stop offset="1" stop-color="#07191d"/>
    </linearGradient>
    <linearGradient id="bass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7fb34d"/>
      <stop offset="0.52" stop-color="#426f37"/>
      <stop offset="1" stop-color="#263f29"/>
    </linearGradient>
  </defs>
  <rect width="900" height="420" rx="34" fill="url(#water)"/>
  <path d="M42 300 C180 250 300 284 455 260 C600 236 740 270 860 220" fill="none" stroke="#1e5865" stroke-width="14" opacity=".45"/>
  <path d="M70 334 C230 280 360 320 530 288 C665 262 760 294 850 260" fill="none" stroke="#58a9b8" stroke-width="5" opacity=".32"/>
  <ellipse cx="444" cy="212" rx="267" ry="92" fill="url(#bass)" stroke="#d7ef9b" stroke-width="8"/>
  <path d="M210 205 C145 164 95 154 48 126 C73 190 70 232 42 294 C105 266 151 260 211 223 Z" fill="#355e3a" stroke="#d7ef9b" stroke-width="8"/>
  <path d="M650 183 C713 154 768 142 838 156 C785 182 784 232 837 263 C770 275 710 264 650 238 C693 224 692 198 650 183 Z" fill="#6aa03f" stroke="#d7ef9b" stroke-width="8"/>
  <path d="M336 127 C396 73 514 88 575 136 C493 128 414 129 336 127 Z" fill="#2c5131" stroke="#d7ef9b" stroke-width="6"/>
  <path d="M364 294 C413 350 519 350 586 284 C503 295 434 296 364 294 Z" fill="#2c5131" stroke="#d7ef9b" stroke-width="6"/>
  <ellipse cx="615" cy="199" rx="112" ry="70" fill="#88bd4e" opacity=".55"/>
  <circle cx="694" cy="187" r="18" fill="#061015"/>
  <circle cx="700" cy="181" r="6" fill="white"/>
  <path d="M724 220 C755 227 777 222 800 206 C782 242 750 258 713 248" fill="#162a20"/>
  <path d="M240 206 C330 160 435 170 604 196" fill="none" stroke="#1d321f" stroke-width="14" stroke-linecap="round" opacity=".65"/>
  <path d="M268 177 L312 203 L357 174 L405 206 L452 174 L506 207 L554 181" fill="none" stroke="#c9ea72" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
  <text x="450" y="386" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="800" fill="#e8f9d8">Largemouth Bass</text>
</svg>`)}`;
let map, markersLayer, zoneLayer, manualLayer, currentLatLng=[...LAKE_CENTER];
let editMode=false;
let currentPhotoData='';
let selectedLure='Rage Craw - Green Pumpkin';
let catches=load(STORE, seedCatches());
let lures=load(LURE_STORE,['Soft Plastics | Rage Craw - Green Pumpkin','Crankbaits | Bandit 200 - Chartreuse Black Back','Jigs | Flipping Jig - PB&J','Soft Plastics | Bronco Bug - Green Pumpkin']);

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
        m.bindPopup(`<b>${escapeHtml(c.species)}</b><br>${fmt(c.length)} in · ${fmt(c.weight)} lb<br>${escapeHtml(c.lure||'No lure')}`);
        const open=()=>showCatchDetail(c.id);
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

function speciesImage(c){return c.photo || (/largemouth bass/i.test(c.species||'') ? DEFAULT_BASS_IMG : '');}
function showCatchDetail(id){const c=catches.find(x=>x.id===id); if(!c)return; const hero=speciesImage(c)?`<div class="fishHero"><img src="${speciesImage(c)}" alt="${escapeHtml(c.species)}"><div class="fishHeroLabel">${escapeHtml(c.species)}</div></div>`:`<h2 class="detailTitle">${escapeHtml(c.species)}</h2>`; document.getElementById('sheetContent').innerHTML=`${hero}<div class="detailGrid"><div><b>${fmt(c.length)} in</b><small>Length</small></div><div><b>${fmt(c.weight)} lb</b><small>Weight</small></div><div><b>${escapeHtml(c.lure||'—')}</b><small>Lure</small></div><div><b>${fmt(c.depth)} ft</b><small>Depth</small></div><div><b>${fmt(c.waterTemp)}°F</b><small>Water temp</small></div><div><b>${new Date(c.date).toLocaleDateString()}</b><small>Date</small></div></div><p>${escapeHtml(c.notes||'')}</p><p class="muted">${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}</p>`; openSheet();}
function showZoneDetail(q,avg){const big=q.reduce((a,b)=>(+b.length||0)>(+a.length||0)?b:a,q[0]); document.getElementById('sheetContent').innerHTML=`<h2 class="detailTitle">Big Fish Zone</h2><p>${q.length} qualifying bass 15 inches or larger.</p><div class="detailGrid"><div><b>${avg.toFixed(1)} in</b><small>Average length</small></div><div><b>${big.length} in</b><small>Largest bass</small></div><div><b>${escapeHtml(bestLure(q))}</b><small>Best lure</small></div><div><b>${q.length}</b><small>Qualifying catches</small></div></div>`; openSheet();}
function bestLure(arr){const m={};arr.forEach(c=>m[c.lure]=(m[c.lure]||0)+1);return Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'}
function openSheet(){document.getElementById('detailSheet').classList.remove('hidden')}function closeSheet(){document.getElementById('detailSheet').classList.add('hidden')}

function switchView(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('.bottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id)); if(id==='mapView')setTimeout(()=>{map.invalidateSize();renderMap();},150); if(id==='historyView')renderHistory(); if(id==='statsView')renderStats(); if(id==='luresView')renderLures();}
function updateLocationField(){const el=document.getElementById('locationText'); if(el) el.value=`${currentLatLng[0].toFixed(5)}, ${currentLatLng[1].toFixed(5)}`;}
function setManualLocation(lat,lng,showToast=false){currentLatLng=[lat,lng]; updateLocationField(); if(manualLayer){manualLayer.clearLayers(); L.circleMarker(currentLatLng,{radius:10,color:'#168cff',fillColor:'#168cff',fillOpacity:.35,weight:3}).addTo(manualLayer); L.marker(currentLatLng,{icon:L.divIcon({className:'',html:'<div class=\"dropPin\">＋</div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(manualLayer);} if(showToast) flashMessage('Catch location set. Tap Log Catch to save fish here.');}
function numVal(id){const el=document.getElementById(id); const raw=(el?.value||el?.placeholder||'').trim(); return raw===''?'':Number(raw);}
function saveCatch(){const c={id:crypto.randomUUID(),species:val('species')||'Largemouth Bass',length:numVal('length'),weight:numVal('weight'),lure:getSelectedLure()||selectedLure||'No lure selected',depth:numVal('depth'),waterTemp:numVal('waterTemp'),lat:currentLatLng[0],lng:currentLatLng[1],notes:val('notes'),photo:currentPhotoData||'',date:new Date().toISOString()}; catches.push(c); save(); resetPhotoInput(); if(manualLayer)manualLayer.clearLayers(); renderMap(); switchView('mapView'); flashMessage('Catch saved. Tap the pin to view details.');}
function val(id){return document.getElementById(id).value}
function renderHistory(){const list=document.getElementById('historyList'); if(!catches.length){list.innerHTML='<div class="catchRow"><p>No catches yet.</p></div>';return;} list.innerHTML=catches.slice().reverse().map(c=>`<div class="catchRow" data-id="${c.id}">${editMode?`<input type="checkbox" class="catchCheck" value="${c.id}">`:''}${speciesImage(c)?`<img class="thumbMini" src="${speciesImage(c)}" alt="Fish photo">`:`<div class="pinMini">🐟</div>`}<div><h3>${escapeHtml(c.species)} — ${fmt(c.length)} in</h3><p>${new Date(c.date).toLocaleString()} · ${escapeHtml(c.lure||'No lure')}</p></div><button class="rowOpen" data-id="${c.id}">›</button></div>`).join(''); document.querySelectorAll('.rowOpen').forEach(b=>b.onclick=()=>showCatchDetail(b.dataset.id)); document.querySelectorAll('.catchRow').forEach(r=>{r.onclick=e=>{if(e.target.type==='checkbox'||e.target.className==='rowOpen')return; if(editMode){const cb=r.querySelector('.catchCheck'); if(cb)cb.checked=!cb.checked;}else showCatchDetail(r.dataset.id)}});}
function toggleEdit(){editMode=!editMode;document.getElementById('bulkBar').classList.toggle('hidden',!editMode);document.getElementById('editHistoryBtn').textContent=editMode?'Done':'Select';renderHistory();}
function deleteSelected(){const ids=[...document.querySelectorAll('.catchCheck:checked')].map(x=>x.value); if(!ids.length){alert('Select at least one catch.');return;} if(!confirm(`Delete ${ids.length} selected catch(es)?`))return; catches=catches.filter(c=>!ids.includes(c.id)); save(); renderHistory(); renderMap();}
function resetAll(){if(confirm('Delete ALL catches and pins?')){catches=[];save();renderHistory();renderMap();}}
function renderStats(){document.getElementById('statsBox').innerHTML=`<h3>Total catches: ${catches.length}</h3><p>Biggest fish: ${Math.max(0,...catches.map(c=>+c.length||0))} in</p><p>Best lure: ${escapeHtml(bestLure(catches))}</p>`}
function renderLures(){document.getElementById('lureList').innerHTML=lures.map(l=>`<div class="catchRow"><div class="pinMini">🪱</div><div><h3>${escapeHtml(l)}</h3><p>Saved lure</p></div></div>`).join('')}
function addLure(){const l=prompt('Enter new lure name/color'); if(l){lures.push(l);selectedLure=l;save();renderLures();}}

function initLureSelectors(){
  const type=document.getElementById('lureType'), exact=document.getElementById('lureExact'), color=document.getElementById('lureColor');
  if(!type||!exact||!color)return;
  type.innerHTML=Object.keys(LURE_DB).map(t=>`<option>${escapeHtml(t)}</option>`).join('');
  type.value='Soft Plastics';
  type.onchange=()=>populateExact(); exact.onchange=()=>populateColors(); color.onchange=()=>{selectedLure=getSelectedLure();};
  populateExact();
}
function populateExact(){
  const type=document.getElementById('lureType'), exact=document.getElementById('lureExact');
  const items=LURE_DB[type.value]||LURE_DB.Other;
  exact.innerHTML=items.map(x=>`<option>${escapeHtml(x.name)}</option>`).join('');
  exact.value=items[0].name;
  populateColors();
}
function populateColors(){
  const type=document.getElementById('lureType'), exact=document.getElementById('lureExact'), color=document.getElementById('lureColor');
  const item=(LURE_DB[type.value]||[]).find(x=>x.name===exact.value) || LURE_DB.Other[0];
  color.innerHTML=item.colors.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
  color.value=item.colors[0];
  selectedLure=getSelectedLure();
}
function getSelectedLure(){
  const type=document.getElementById('lureType')?.value||'';
  const exact=document.getElementById('lureExact')?.value||'';
  const color=document.getElementById('lureColor')?.value||'';
  if(!exact)return selectedLure;
  return color && color!=='Custom / Other' ? `${exact} - ${color}` : exact;
}
function addCustomLureFromForm(){
  const type=prompt('Lure category/type?', document.getElementById('lureType')?.value || 'Other') || 'Other';
  const name=prompt('Exact lure name?', 'Custom Lure'); if(!name)return;
  const color=prompt('Color?', 'Custom / Other') || 'Custom / Other';
  if(!LURE_DB[type]) LURE_DB[type]=[];
  LURE_DB[type].push({name,colors:[color,'Custom / Other']});
  const formatted=`${type} | ${name} - ${color}`;
  if(!lures.includes(formatted)) lures.push(formatted);
  save(); initLureSelectors();
  document.getElementById('lureType').value=type; populateExact();
  document.getElementById('lureExact').value=name; populateColors();
  document.getElementById('lureColor').value=color; selectedLure=getSelectedLure();
}


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
  initMap(); updateLocationField(); initLureSelectors();
  document.querySelectorAll('.bottomNav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  document.getElementById('quickLog').onclick=()=>switchView('logView'); document.getElementById('cancelLog').onclick=()=>switchView('mapView'); document.getElementById('saveCatch').onclick=saveCatch; document.getElementById('addCustomLure').onclick=addCustomLureFromForm;
  document.getElementById('locateBtn').onclick=()=>navigator.geolocation?.getCurrentPosition(p=>{setManualLocation(p.coords.latitude,p.coords.longitude,true);map.setView(currentLatLng,17);},()=>alert('Location unavailable.'));
  document.getElementById('homeBtn').onclick=goHotspot;
  document.getElementById('fishPhoto').onchange=e=>handlePhotoFile(e.target.files?.[0]); document.getElementById('clearPhoto').onclick=resetPhotoInput;
  document.getElementById('closeSheet').onclick=closeSheet; document.getElementById('editHistoryBtn').onclick=toggleEdit; document.getElementById('deleteSelectedBtn').onclick=deleteSelected; document.getElementById('clearAllBtn').onclick=resetAll; document.getElementById('selectAllCatches').onchange=e=>document.querySelectorAll('.catchCheck').forEach(cb=>cb.checked=e.target.checked); document.getElementById('addLureBtn').onclick=addLure;
});
