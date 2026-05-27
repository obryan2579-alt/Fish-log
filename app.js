const $=s=>document.querySelector(s);
const panel=$("#panel"), toast=$("#toast");
let catches=JSON.parse(localStorage.getItem("fishlog_catches")||"[]");
let selectedLocation=null, manualMarker=null, markers=[], clusterMarkers=[];
const lureDB={
 "Soft Plastic":["Rage Craw","Bronco Bug","Speed Craw","Brush Hog","Senko","D Bomb","Other"],
 "Jig":["Flipping Jig","Football Jig","Swim Jig","Finesse Jig","Other"],
 "Crankbait":["Bandit 100","Bandit 200","Bandit 300","Rapala DT","Squarebill","Other"],
 "Spinner/Bladed":["ChatterBait","Thunder Cricket","Spinnerbait","Buzzbait","Other"],
 "Topwater":["Popper","Walking Bait","Frog","Whopper Plopper","Other"],
 "Other":["Custom lure"]
};
const colors=["Green Pumpkin","Black/Blue","PB&J","White","Chartreuse/Black","Shad","Craw","Junebug","Other"];
const map=L.map("map",{zoomControl:false,attributionControl:false}).setView([38.03,-85.33],13);
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19}).addTo(map);
setTimeout(()=>map.invalidateSize(),400);
function save(){localStorage.setItem("fishlog_catches",JSON.stringify(catches))}
function msg(t){toast.textContent=t;toast.classList.remove("hidden");setTimeout(()=>toast.classList.add("hidden"),1800)}
function icon(cls){return L.divIcon({className:"",html:`<div class="${cls}"></div>`,iconSize:[32,32],iconAnchor:[16,16]})}
map.on("click",e=>{selectedLocation=e.latlng;if(manualMarker)map.removeLayer(manualMarker);manualMarker=L.marker(e.latlng,{icon:icon("manualMarker")}).addTo(map);msg("Manual catch location set")});
function clearMarkers(){markers.forEach(m=>map.removeLayer(m));clusterMarkers.forEach(m=>map.removeLayer(m));markers=[];clusterMarkers=[]}
function dist(a,b){let R=6371000,p=Math.PI/180,d1=(b.lat-a.lat)*p,d2=(b.lng-a.lng)*p,x=Math.sin(d1/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(d2/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function renderMarkers(){
 clearMarkers();
 const used=new Set(), groups=[];
 catches.forEach((c,i)=>{if(used.has(i)||!c.lat)return;let g=[i];used.add(i);catches.forEach((d,j)=>{if(!used.has(j)&&d.lat&&dist(c,d)<60){g.push(j);used.add(j)}});groups.push(g)});
 groups.forEach(g=>{
   if(g.length>1 && map.getZoom()<16){
     let lat=g.reduce((s,i)=>s+catches[i].lat,0)/g.length, lng=g.reduce((s,i)=>s+catches[i].lng,0)/g.length;
     let cm=L.marker([lat,lng],{icon:L.divIcon({className:"",html:`<div class="clusterMarker">${g.length}</div>`,iconSize:[38,38],iconAnchor:[19,19]})}).addTo(map);
     cm.on("click touchstart",ev=>{L.DomEvent.stop(ev);map.flyTo([lat,lng],17,{duration:.7});});
     clusterMarkers.push(cm);
   }else{
     const biggestIndex=g.reduce((best,i)=>((+catches[i].length||0)>(+catches[best].length||0)?i:best),g[0]);
     g.forEach(i=>addCatchMarker(catches[i],i,i===biggestIndex&&g.length>1));
   }
 });
}
function addCatchMarker(c,i,big=false){
 let m=L.marker([c.lat,c.lng],{icon:icon(big?"fishMarker big":"fishMarker"),riseOnHover:true}).addTo(map);
 m.on("click touchstart",ev=>{L.DomEvent.stop(ev);showDetail(c)});
 markers.push(m);
}
map.on("zoomend moveend",renderMarkers);
function showDetail(c){
 $("#detailTitle").textContent=c.species||"Largemouth Bass";
 const wrap=$("#detailPhotoWrap"), img=$("#detailPhoto");
 if(c.photo){img.src=c.photo;wrap.classList.remove("hidden")}else{wrap.classList.add("hidden")}
 $("#detailBody").innerHTML=[
 ["Length",c.length?`${c.length} in`:"—"],["Weight",c.weight?`${c.weight} lb`:"—"],["Lure",c.lure||"—"],["Color",c.color||"—"],
 ["Depth",c.depth?`${c.depth} ft`:"—"],["Date",c.date?new Date(c.date).toLocaleString():"—"],["Notes",c.notes||"—"]
 ].map(([a,b])=>`<div class="detailCell"><b>${a}</b><span>${b}</span></div>`).join("");
 $("#detailOverlay").classList.remove("hidden");
}
function closeDetail(){ $("#detailOverlay").classList.add("hidden") }
$("#closeDetail").addEventListener("click",closeDetail);
$("#closeDetail").addEventListener("touchstart",e=>{e.preventDefault();closeDetail()},{passive:false});
$("#detailOverlay").addEventListener("click",e=>{if(e.target.id==="detailOverlay")closeDetail()});
$("#gpsBtn").onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{selectedLocation={lat:p.coords.latitude,lng:p.coords.longitude};map.flyTo(selectedLocation,16);if(manualMarker)map.removeLayer(manualMarker);manualMarker=L.marker(selectedLocation,{icon:icon("manualMarker")}).addTo(map);msg("GPS location set")},()=>msg("GPS unavailable")):msg("GPS not supported");
$("#hotBtn").onclick=()=>{if(!catches.length)return msg("No catches yet");let c=[...catches].filter(x=>x.lat).sort((a,b)=>(+b.length||0)-(+a.length||0))[0]; if(c)map.flyTo([c.lat,c.lng],17,{duration:.8})};
document.querySelectorAll(".bottomNav button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".bottomNav button").forEach(x=>x.classList.remove("active"));b.classList.add("active");showTab(b.dataset.tab)});
function showTab(tab){ if(tab==="map"){panel.classList.add("hidden");return} panel.classList.remove("hidden"); if(tab==="log")logForm(); if(tab==="history")historyView(); if(tab==="stats")statsView();}
function logForm(){
 panel.innerHTML=`<h2>Log Catch</h2>
 <label>Species</label><select id="species"><option>Largemouth Bass</option><option>Smallmouth Bass</option><option>Spotted Bass</option><option>Crappie</option><option>Other</option></select>
 <div class="row"><div><label>Length inches</label><input id="length" type="number" inputmode="decimal"></div><div><label>Weight lbs</label><input id="weight" type="number" inputmode="decimal"></div></div>
 <label>Lure Type</label><select id="lureType"></select>
 <label>Exact Lure</label><select id="lureExact"></select>
 <label>Color</label><select id="lureColor">${colors.map(x=>`<option>${x}</option>`).join("")}</select>
 <label>Custom lure if Other</label><input id="customLure" placeholder="Enter custom lure">
 <div class="row"><div><label>Depth ft</label><input id="depth" type="number" inputmode="decimal"></div><div><label>Photo</label><input id="photo" type="file" accept="image/*"></div></div>
 <div id="preview"></div><label>Notes</label><textarea id="notes"></textarea>
 <div class="actions"><button class="secondary" id="cancelLog">Cancel</button><button class="primary" id="saveCatch">Save Catch</button></div>`;
 const lt=$("#lureType"), le=$("#lureExact"); lt.innerHTML=Object.keys(lureDB).map(x=>`<option>${x}</option>`).join("");
 function fill(){le.innerHTML=lureDB[lt.value].map(x=>`<option>${x}</option>`).join("")} lt.onchange=fill; fill();
 let photoData=""; $("#photo").onchange=e=>{const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{photoData=r.result; $("#preview").innerHTML=`<img class="thumb" src="${photoData}">`}; r.readAsDataURL(f)};
 $("#cancelLog").onclick=()=>{panel.classList.add("hidden");document.querySelector('[data-tab="map"]').click()};
 $("#saveCatch").onclick=()=>{let loc=selectedLocation||map.getCenter();let exact=le.value==="Other"||le.value==="Custom lure"?($("#customLure").value||le.value):le.value; let c={id:Date.now(),species:$("#species").value,length:$("#length").value,weight:$("#weight").value,lure:`${lt.value} - ${exact}`,color:$("#lureColor").value,depth:$("#depth").value,notes:$("#notes").value,photo:photoData,lat:loc.lat,lng:loc.lng,date:new Date().toISOString()}; catches.push(c);save();renderMarkers();msg("Catch saved");panel.classList.add("hidden");document.querySelector('[data-tab="map"]').click()};
}
function historyView(){
 panel.innerHTML=`<h2>History</h2><div class="actions"><button class="secondary" id="selectAll">Select all</button><button class="danger" id="deleteSelected">Delete selected</button></div><div id="list"></div>`;
 const list=$("#list"); list.innerHTML=catches.map(c=>`<div class="catchItem"><input type="checkbox" data-id="${c.id}"><img class="thumb" src="${c.photo||''}" onerror="this.style.display='none'"><div class="catchText"><b>${c.species||"Fish"}</b><div class="muted">${c.length||"—"} in • ${c.lure||"—"}</div></div></div>`).join("")||"<p>No catches yet.</p>";
 $("#selectAll").onclick=()=>document.querySelectorAll('#list input[type="checkbox"]').forEach(x=>x.checked=true);
 $("#deleteSelected").onclick=()=>{let ids=[...document.querySelectorAll('#list input:checked')].map(x=>+x.dataset.id);catches=catches.filter(c=>!ids.includes(c.id));save();renderMarkers();historyView();msg("Deleted")};
}
function statsView(){let bass=catches.filter(c=>(c.species||"").includes("Bass")&&(+c.length>=15));panel.innerHTML=`<h2>Stats</h2><p>Total catches: <b>${catches.length}</b></p><p>Qualifying 15”+ bass: <b>${bass.length}</b></p><p>Biggest: <b>${catches.reduce((m,c)=>Math.max(m,+c.length||0),0)} in</b></p>`}
renderMarkers();
