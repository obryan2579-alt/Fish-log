const STORE_KEYS = { catches:'fishlog.catches.v1', lures:'fishlog.lures.v1' };
const defaultLures = [
  {id:crypto.randomUUID(),category:'Craw',brand:'Strike King',name:'Rage Craw',color:'Green Pumpkin',size:'3.5 in',runDepth:'N/A',notes:'Good flipping bait around wood and grass.'},
  {id:crypto.randomUUID(),category:'Crankbait',brand:'Bandit',name:'Bandit 200',color:'Chartreuse/Black Back',size:'2 in',runDepth:'4-8 ft',notes:'Good small crankbait for pressured fish.'},
  {id:crypto.randomUUID(),category:'Jig',brand:'Generic',name:'Flipping Jig',color:'PB&J',size:'1/2 oz',runDepth:'Bottom',notes:'Pitch to cover and channel banks.'},
  {id:crypto.randomUUID(),category:'Worm',brand:'Yamamoto',name:'Senko',color:'Green Pumpkin',size:'5 in',runDepth:'N/A',notes:'Skipping docks or slow fall.'},
  {id:crypto.randomUUID(),category:'Other',brand:'Custom',name:'Other / Manual Entry',color:'',size:'',runDepth:'',notes:'Use this if your lure is not listed.'}
];
const sampleCatches = [
  {species:'Largemouth Bass', length:18.5, weight:4.26, lureName:'Rage Craw', lureCategory:'Craw', lureColor:'Green Pumpkin', depth:8, waterTemp:68, lat:38.0089, lng:-85.3148, weather:'Cloudy', wind:'NE 6 mph', pressure:'30.12', notes:'Outside grass line near dock.', date:'2026-05-18T09:41:00'},
  {species:'Largemouth Bass', length:19.0, weight:3.85, lureName:'Rage Craw', lureCategory:'Craw', lureColor:'Green Pumpkin', depth:7, waterTemp:68, lat:38.0091, lng:-85.3142, weather:'Cloudy', wind:'NE 6 mph', pressure:'30.12', notes:'Same cove stretch.', date:'2026-05-17T07:23:00'},
  {species:'Largemouth Bass', length:16.25, weight:2.91, lureName:'Rage Craw', lureCategory:'Craw', lureColor:'Green Pumpkin', depth:9, waterTemp:67, lat:38.0084, lng:-85.3152, weather:'Cloudy', wind:'NE 5 mph', pressure:'30.10', notes:'Near laydown.', date:'2026-05-15T18:15:00'},
  {species:'Largemouth Bass', length:17.75, weight:3.40, lureName:'Flipping Jig', lureCategory:'Jig', lureColor:'PB&J', depth:10, waterTemp:69, lat:38.0015, lng:-85.3102, weather:'Partly cloudy', wind:'E 7 mph', pressure:'30.05', notes:'Rocky point.', date:'2026-05-14T10:08:00'},
  {species:'Spotted Bass', length:14.75, weight:1.9, lureName:'Bandit 200', lureCategory:'Crankbait', lureColor:'Chartreuse/Black', depth:6, waterTemp:70, lat:38.004, lng:-85.319, weather:'Sunny', wind:'S 5 mph', pressure:'29.98', notes:'Small crankbait fish.', date:'2026-05-13T18:42:00'}
].map(c=>({id:crypto.randomUUID(),...c}));
let map, catchLayer=L.layerGroup(), zoneLayer=L.layerGroup(), userLatLng=null, selectedLure=null, currentFilter='All';
let catches = load(STORE_KEYS.catches, sampleCatches);
let lures = load(STORE_KEYS.lures, defaultLures);
function load(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function show(pageId){
  const app = document.getElementById('app');
  app.classList.toggle('mapActive', pageId === 'mapPage');
  app.dataset.page = pageId;
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active', p.id===pageId));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.page===pageId));
  if(pageId==='historyPage') renderHistory();
  if(pageId==='statsPage') renderStats();
  if(pageId==='luresPage') renderLures();
  setTimeout(()=>map?.invalidateSize(),150);
}
function initMap(){
  map = L.map('map', { zoomControl:false }).setView([38.005,-85.315], 14);
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution:'Tiles © Esri' }).addTo(map);
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { opacity:.38, attribution:'Map data © OpenStreetMap, SRTM | OpenTopoMap' }).addTo(map);
  catchLayer.addTo(map); zoneLayer.addTo(map);
  map.on('click', e=>{ userLatLng=e.latlng; document.getElementById('locationText').value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`; });
  renderMap();
}
function distMeters(a,b){ const R=6371000, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180; const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
function makeFishIcon(c, biggest=false){ return L.divIcon({ className:'', html: biggest?'<div class="biggest-marker"><span>🏆</span></div>':'<div class="fish-marker"><span>🐟</span></div>', iconSize: biggest?[52,52]:[34,34], iconAnchor: biggest?[26,52]:[17,34] }); }
function makeClusterIcon(count){ return L.divIcon({ className:'', html:`<div class="cluster-marker">${count}</div>`, iconSize:[54,54], iconAnchor:[27,27] }); }
function groupCatches(radius=90){
  const groups=[];
  catches.forEach(c=>{ const point={lat:+c.lat,lng:+c.lng}; let g=groups.find(g=>distMeters(g.center,point)<radius); if(!g){ g={items:[],center:point}; groups.push(g); } g.items.push(c); g.center={lat:g.items.reduce((s,i)=>s+i.lat,0)/g.items.length,lng:g.items.reduce((s,i)=>s+i.lng,0)/g.items.length}; });
  return groups;
}
function qualifyingBass(c){ return /bass/i.test(c.species) && Number(c.length)>=15; }
function buildZones(){ return groupCatches(75).map(g=>({ ...g, qualifying:g.items.filter(qualifyingBass) })).filter(g=>g.qualifying.length>=3); }
function renderMap(expandedGroup=null){
  catchLayer.clearLayers(); zoneLayer.clearLayers();
  buildZones().forEach((z,idx)=>{
    const count=z.qualifying.length; const color=count>=10?'#df5b36':count>=6?'#f59b28':'#ffd24a';
    L.circle([z.center.lat,z.center.lng], {radius:95+(count*8), color, fillColor:color, fillOpacity:.22, weight:2}).addTo(zoneLayer).bindPopup(zonePopup(z));
  });
  const groups = expandedGroup ? [expandedGroup] : groupCatches();
  groups.forEach(g=>{
    if(!expandedGroup && g.items.length>1){
      L.marker([g.center.lat,g.center.lng], {icon:makeClusterIcon(g.items.length)}).addTo(catchLayer).on('click',()=>{ map.setView([g.center.lat,g.center.lng],17,{animate:true}); renderMap(g); });
    } else {
      const biggest = [...g.items].sort((a,b)=>(Number(b.weight)||0)-(Number(a.weight)||0))[0];
      g.items.forEach(c=> L.marker([c.lat,c.lng], {icon:makeFishIcon(c, c.id===biggest.id && g.items.length>1)}).addTo(catchLayer).bindPopup(catchPopup(c, c.id===biggest.id && g.items.length>1)) );
    }
  });
  updateSuggestion(); updateStatsMini();
}
function catchPopup(c,big){ return `<div class="popup"><strong>${big?'🏆 Biggest in Area<br>':''}${c.species}</strong><br>${c.length || '—'} in • ${c.weight || '—'} lb<br>${c.lureName || 'No lure'}<br>${new Date(c.date).toLocaleString()}</div>`; }
function zonePopup(z){ const biggest=[...z.qualifying].sort((a,b)=>b.weight-a.weight)[0]; const avg=(z.qualifying.reduce((s,c)=>s+Number(c.length),0)/z.qualifying.length).toFixed(1); const best=bestLure(z.qualifying); return `<div class="zoneInfo"><strong>Big Fish Zone</strong><br>Qualifying bass: ${z.qualifying.length}<br>Average length: ${avg} in<br>Largest: ${biggest.length} in / ${biggest.weight} lb<br>Best lure: ${best || '—'}<br><small>Bass 15 in or larger only</small></div>`; }
function bestLure(list){ const counts={}; list.forEach(c=>{ const k=c.lureName||'Unknown'; counts[k]=(counts[k]||0)+1; }); return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]; }
function updateSuggestion(){
  if(catches.length<3){ return; }
  const bass = catches.filter(c=>/bass/i.test(c.species)); const pool = bass.length?bass:catches; const lure=bestLure(pool); const similar=pool.filter(c=>c.lureName===lure).length; const conf=Math.min(92, 45 + similar*9);
  document.getElementById('suggestedLure').textContent = lure || 'No pattern yet';
  document.getElementById('suggestedReason').textContent = `${conf}% confidence based on ${similar} matching catches. Best current pattern: ${lure}.`;
}
function renderLures(){
  const cats=['All',...new Set(lures.map(l=>l.category))]; document.getElementById('lureChips').innerHTML=cats.map(c=>`<button class="chip ${c===currentFilter?'active':''}" data-cat="${c}">${c}</button>`).join('');
  const q=document.getElementById('lureSearch').value.toLowerCase();
  const shown=lures.filter(l=>(currentFilter==='All'||l.category===currentFilter) && `${l.brand} ${l.name} ${l.color}`.toLowerCase().includes(q));
  document.getElementById('lureList').innerHTML=shown.map(l=>`<div class="listItem" data-lure="${l.id}"><div><strong>${l.name}</strong><small>${l.brand} • ${l.category} • ${l.color || 'No color'}</small></div><span>›</span></div>`).join('') || '<div class="listItem"><div>No lures found.</div></div>';
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{currentFilter=b.dataset.cat; renderLures();});
  document.querySelectorAll('[data-lure]').forEach(row=>row.onclick=()=>{ selectedLure=lures.find(l=>l.id===row.dataset.lure); document.getElementById('lureUsed').value=selectedLure.id; document.getElementById('chooseLureBtn').textContent=`${selectedLure.name} (${selectedLure.color || selectedLure.category}) →`; show('logPage'); });
}
function saveNewLure(){
  const l={ id:crypto.randomUUID(), category:val('newLureCategory'), brand:val('newLureBrand')||'Custom', name:val('newLureName')||'Unnamed Lure', color:val('newLureColor'), size:val('newLureSize'), runDepth:val('newLureRunDepth'), notes:val('newLureNotes') };
  lures.unshift(l); save(STORE_KEYS.lures,lures); selectedLure=l; document.getElementById('lureUsed').value=l.id; document.getElementById('chooseLureBtn').textContent=`${l.name} (${l.color || l.category}) →`; show('logPage');
}
function val(id){ return document.getElementById(id).value.trim(); }
function saveCatch(){
  const latLng = userLatLng || map.getCenter(); const lure=selectedLure || lures.find(l=>l.id===val('lureUsed')) || {name:'Manual/Other',category:'Other',color:''};
  const c={ id:crypto.randomUUID(), species:val('species'), length:+val('length')||0, weight:+val('weight')||0, lureName:lure.name, lureCategory:lure.category, lureColor:lure.color, depth:+val('depth')||0, waterTemp:+val('waterTemp')||0, lat:latLng.lat, lng:latLng.lng, weather:document.getElementById('weatherDesc').textContent.trim(), wind:document.getElementById('windNow').textContent, pressure:document.getElementById('pressureNow').textContent, notes:val('notes'), date:new Date().toISOString() };
  catches.unshift(c); save(STORE_KEYS.catches,catches); document.getElementById('catchForm').reset(); selectedLure=null; document.getElementById('chooseLureBtn').textContent='Select lure →'; show('mapPage'); renderMap();
}
function renderHistory(){ document.getElementById('historyList').innerHTML=catches.map(c=>`<div class="listItem"><div><strong>${c.species}</strong><small>${c.length} in • ${c.weight} lb • ${new Date(c.date).toLocaleDateString()}<br>${c.lureName} (${c.lureColor||c.lureCategory})</small></div><span>📍</span></div>`).join('') || '<div class="listItem">No catches yet.</div>'; }
function renderStats(){ const zones=buildZones(); document.getElementById('statTotal').textContent=catches.length; document.getElementById('statZones').textContent=zones.length; const biggest=catches.filter(c=>/bass/i.test(c.species)).sort((a,b)=>b.length-a.length)[0]; document.getElementById('statLargest').textContent=biggest?`${biggest.length} in`:'—'; document.getElementById('zoneList').innerHTML=zones.map((z,i)=>`<div class="listItem"><div><strong>Big Fish Zone ${i+1}</strong><small>${z.qualifying.length} bass 15 in+ • Best lure: ${bestLure(z.qualifying)} • Avg ${ (z.qualifying.reduce((s,c)=>s+c.length,0)/z.qualifying.length).toFixed(1)} in</small></div><span>🏆</span></div>`).join('') || '<div class="listItem"><div><strong>No Big Fish Zones yet</strong><small>Need 3+ bass at least 15 inches within about 75 meters.</small></div></div>'; }
function updateStatsMini(){ document.getElementById('statTotal') && renderStats(); }
async function fetchWeather(lat,lng){
  try{ const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`); const d=await r.json(); const c=d.current; document.getElementById('tempNow').textContent=Math.round(c.temperature_2m)+'°F'; document.getElementById('weatherDesc').textContent=c.cloud_cover>60?' Cloudy':c.cloud_cover>25?' Partly Cloudy':' Clear'; document.getElementById('windNow').textContent=`${windDir(c.wind_direction_10m)} ${Math.round(c.wind_speed_10m)} mph`; document.getElementById('pressureNow').textContent=(c.pressure_msl*0.02953).toFixed(2)+' inHg'; } catch(e){ console.warn('Weather unavailable',e); }
}
function windDir(deg){ const dirs=['N','NE','E','SE','S','SW','W','NW']; return dirs[Math.round(deg/45)%8]; }
function bind(){
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>show(t.dataset.page)); document.querySelectorAll('.backToMap').forEach(b=>b.onclick=()=>show('mapPage')); document.querySelectorAll('.backToLog').forEach(b=>b.onclick=()=>show('logPage')); document.querySelectorAll('.backToLures').forEach(b=>b.onclick=()=>show('luresPage'));
  document.getElementById('floatingLogBtn').onclick=()=>show('logPage'); document.getElementById('chooseLureBtn').onclick=()=>show('luresPage'); document.getElementById('addLureBtn').onclick=()=>show('addLurePage'); document.getElementById('addLureTopBtn').onclick=()=>show('addLurePage'); document.getElementById('saveLureBtn').onclick=saveNewLure; document.getElementById('saveCatchBtn').onclick=saveCatch; document.getElementById('lureSearch').oninput=renderLures;
  document.getElementById('clearDataBtn').onclick=()=>{ if(confirm('Reset all test catches and lures?')){ localStorage.removeItem(STORE_KEYS.catches); localStorage.removeItem(STORE_KEYS.lures); location.reload(); } };
  document.getElementById('locateBtn').onclick=()=> navigator.geolocation?.getCurrentPosition(pos=>{ userLatLng={lat:pos.coords.latitude,lng:pos.coords.longitude}; map.setView(userLatLng,15); fetchWeather(userLatLng.lat,userLatLng.lng); L.circleMarker(userLatLng,{radius:12,color:'#1688ff',fillColor:'#1688ff',fillOpacity:.35}).addTo(catchLayer); },()=>alert('GPS permission denied or unavailable.'));
  document.getElementById('zonesBtn').onclick=()=>{ const zones=buildZones(); if(zones[0]) map.setView(zones[0].center,16); else alert('No Big Fish Zones yet. Need 3+ bass 15 inches or larger in the same area.'); };
}
bind(); initMap(); renderLures(); fetchWeather(38.005,-85.315);
