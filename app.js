const LAKE_CENTER=[38.00665,-85.26772];
const STORE='fishlog_v1_catches';
const LURE_STORE='fishlog_v1_lures';
let map, markersLayer, zoneLayer, currentLatLng=[...LAKE_CENTER];
let editMode=false;
let selectedLure='Rage Craw - Green Pumpkin';
let catches=load(STORE, seedCatches());
let lures=load(LURE_STORE,['Rage Craw - Green Pumpkin','Bandit 200 - Chart/Black','Flipping Jig - PB&J','Ned Rig - Green Pumpkin']);

function load(k,fallback){try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}}
function save(){localStorage.setItem(STORE,JSON.stringify(catches));localStorage.setItem(LURE_STORE,JSON.stringify(lures));}
function seedCatches(){return[{id:crypto.randomUUID(),species:'Largemouth Bass',length:18.5,weight:3.2,lure:'Rage Craw - Green Pumpkin',depth:8,waterTemp:68,lat:38.00665,lng:-85.26772,notes:'Sample catch. Tap pin for details.',date:new Date().toISOString()}]}

function initMap(){
  map=L.map('map',{zoomControl:false,tap:true}).setView(LAKE_CENTER,15);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'}).addTo(map);
  markersLayer=L.layerGroup().addTo(map); zoneLayer=L.layerGroup().addTo(map);
  map.on('click',e=>{currentLatLng=[e.latlng.lat,e.latlng.lng]; updateLocationField();});
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
        m.bindPopup(`<b>${escapeHtml(c.species)}</b><br>${c.length||'?'} in · ${c.weight||'?'} lb<br>${escapeHtml(c.lure||'No lure')}`);
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

function showCatchDetail(id){const c=catches.find(x=>x.id===id); if(!c)return; document.getElementById('sheetContent').innerHTML=`<h2 class="detailTitle">${escapeHtml(c.species)}</h2><div class="detailGrid"><div><b>${c.length||'?'} in</b><small>Length</small></div><div><b>${c.weight||'?'} lb</b><small>Weight</small></div><div><b>${escapeHtml(c.lure||'—')}</b><small>Lure</small></div><div><b>${c.depth||'?'} ft</b><small>Depth</small></div><div><b>${c.waterTemp||'?'}°F</b><small>Water temp</small></div><div><b>${new Date(c.date).toLocaleDateString()}</b><small>Date</small></div></div><p>${escapeHtml(c.notes||'')}</p><p class="muted">${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}</p>`; openSheet();}
function showZoneDetail(q,avg){const big=q.reduce((a,b)=>(+b.length||0)>(+a.length||0)?b:a,q[0]); document.getElementById('sheetContent').innerHTML=`<h2 class="detailTitle">Big Fish Zone</h2><p>${q.length} qualifying bass 15 inches or larger.</p><div class="detailGrid"><div><b>${avg.toFixed(1)} in</b><small>Average length</small></div><div><b>${big.length} in</b><small>Largest bass</small></div><div><b>${escapeHtml(bestLure(q))}</b><small>Best lure</small></div><div><b>${q.length}</b><small>Qualifying catches</small></div></div>`; openSheet();}
function bestLure(arr){const m={};arr.forEach(c=>m[c.lure]=(m[c.lure]||0)+1);return Object.entries(m).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'}
function openSheet(){document.getElementById('detailSheet').classList.remove('hidden')}function closeSheet(){document.getElementById('detailSheet').classList.add('hidden')}

function switchView(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('.bottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id)); if(id==='mapView')setTimeout(()=>{map.invalidateSize();renderMap();},150); if(id==='historyView')renderHistory(); if(id==='statsView')renderStats(); if(id==='luresView')renderLures();}
function updateLocationField(){document.getElementById('locationText').value=`${currentLatLng[0].toFixed(5)}, ${currentLatLng[1].toFixed(5)}`;}
function saveCatch(){const c={id:crypto.randomUUID(),species:val('species'),length:+val('length')||0,weight:+val('weight')||0,lure:selectedLure,depth:+val('depth')||0,waterTemp:+val('waterTemp')||0,lat:currentLatLng[0],lng:currentLatLng[1],notes:val('notes'),date:new Date().toISOString()}; catches.push(c); save(); renderMap(); switchView('mapView');}
function val(id){return document.getElementById(id).value}
function renderHistory(){const list=document.getElementById('historyList'); if(!catches.length){list.innerHTML='<div class="catchRow"><p>No catches yet.</p></div>';return;} list.innerHTML=catches.slice().reverse().map(c=>`<div class="catchRow" data-id="${c.id}">${editMode?`<input type="checkbox" class="catchCheck" value="${c.id}">`:''}<div class="pinMini">🐟</div><div><h3>${escapeHtml(c.species)} — ${c.length||'?'} in</h3><p>${new Date(c.date).toLocaleString()} · ${escapeHtml(c.lure||'No lure')}</p></div><button class="rowOpen" data-id="${c.id}">›</button></div>`).join(''); document.querySelectorAll('.rowOpen').forEach(b=>b.onclick=()=>showCatchDetail(b.dataset.id)); document.querySelectorAll('.catchRow').forEach(r=>{r.onclick=e=>{if(e.target.type==='checkbox'||e.target.className==='rowOpen')return; if(editMode){const cb=r.querySelector('.catchCheck'); if(cb)cb.checked=!cb.checked;}else showCatchDetail(r.dataset.id)}});}
function toggleEdit(){editMode=!editMode;document.getElementById('bulkBar').classList.toggle('hidden',!editMode);document.getElementById('editHistoryBtn').textContent=editMode?'Done':'Select';renderHistory();}
function deleteSelected(){const ids=[...document.querySelectorAll('.catchCheck:checked')].map(x=>x.value); if(!ids.length){alert('Select at least one catch.');return;} if(!confirm(`Delete ${ids.length} selected catch(es)?`))return; catches=catches.filter(c=>!ids.includes(c.id)); save(); renderHistory(); renderMap();}
function resetAll(){if(confirm('Delete ALL catches and pins?')){catches=[];save();renderHistory();renderMap();}}
function renderStats(){document.getElementById('statsBox').innerHTML=`<h3>Total catches: ${catches.length}</h3><p>Biggest fish: ${Math.max(0,...catches.map(c=>+c.length||0))} in</p><p>Best lure: ${escapeHtml(bestLure(catches))}</p>`}
function renderLures(){document.getElementById('lureList').innerHTML=lures.map(l=>`<div class="catchRow"><div class="pinMini">🪱</div><div><h3>${escapeHtml(l)}</h3><p>Saved lure</p></div></div>`).join('')}
function addLure(){const l=prompt('Enter new lure name/color'); if(l){lures.push(l);selectedLure=l;save();renderLures();}}
function selectLure(){const pick=prompt('Type lure or add new:', selectedLure); if(pick){selectedLure=pick;if(!lures.includes(pick))lures.push(pick);save();document.getElementById('selectLure').textContent=pick;}}
function escapeHtml(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}

document.addEventListener('DOMContentLoaded',()=>{
  initMap(); updateLocationField();
  document.querySelectorAll('.bottomNav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  document.getElementById('quickLog').onclick=()=>switchView('logView'); document.getElementById('cancelLog').onclick=()=>switchView('mapView'); document.getElementById('saveCatch').onclick=saveCatch; document.getElementById('selectLure').onclick=selectLure;
  document.getElementById('locateBtn').onclick=()=>navigator.geolocation?.getCurrentPosition(p=>{currentLatLng=[p.coords.latitude,p.coords.longitude];map.setView(currentLatLng,17);updateLocationField();},()=>alert('Location unavailable.'));
  document.getElementById('homeBtn').onclick=()=>map.setView(LAKE_CENTER,15);
  document.getElementById('layerBtn').onclick=()=>alert('Topo map removed. Satellite map only.');
  document.getElementById('closeSheet').onclick=closeSheet; document.getElementById('editHistoryBtn').onclick=toggleEdit; document.getElementById('deleteSelectedBtn').onclick=deleteSelected; document.getElementById('clearAllBtn').onclick=resetAll; document.getElementById('selectAllCatches').onchange=e=>document.querySelectorAll('.catchCheck').forEach(cb=>cb.checked=e.target.checked); document.getElementById('addLureBtn').onclick=addLure;
});
