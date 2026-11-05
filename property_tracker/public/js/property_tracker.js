const getTheme=()=>{try{return localStorage.getItem("theme")||"auto"}catch(e){return "auto"}};const thm=getTheme();if(thm!=="auto")document.documentElement.setAttribute("data-theme",thm);
const ST=["New","Visited","Shortlisted","Follow-up","Negotiating","Revisit Required","Document Verification","Final Discussion","Purchased","Rejected","On Hold"];
const SC={New:[210,10],Visited:[210,60],Shortlisted:[45,90],"Follow-up":[280,50],Negotiating:[25,85],"Revisit Required":[330,60],"Document Verification":[190,70],"Final Discussion":[260,50],Purchased:[145,60],Rejected:[0,70],"On Hold":[0,0]};
const SI={New:"○",Visited:"●",Shortlisted:"★",Purchased:"✔",Rejected:"✖",Negotiating:"₹","On Hold":"⏸"};
const col=s=>{const c=SC[s]||[0,0];return `hsl(${c[0]} ${c[1]}% 38%)`};
const pill=s=>`<span class="pill" style="--c:${col(s)}">${SI[s]||"•"} ${s}</span>`;
const U={"Sq.ft":1,Cent:435.6,Acre:43560,Ground:2400,"Sq.m":10.764};
let db={props:[],rem:[]},view="home",flt="",q="",mq="",cmp=[],sync="Loading…",busy=0;
// ---- Frappe API -------------------------------------------------------------
async function api(m,args={}){busy++;loadBar();
 try{const r=await fetch("/api/method/property_tracker.api."+m,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json",Accept:"application/json","X-Frappe-CSRF-Token":window.csrf_token||""},body:JSON.stringify(args)});
  const j=await r.json().catch(()=>({}));if(r.status==401||(r.status==403&&(j.exc_type=="CSRFTokenError"||/(^|; )user_id=Guest/.test(document.cookie)))){location.reload();return new Promise(()=>{})}if(!r.ok)throw new Error(errMsg(j)||r.statusText||"Request failed");return j.message}
 catch(e){toast(e.message||"Request failed");throw e}finally{busy--;loadBar()}}
function errMsg(j){try{return JSON.parse(j._server_messages).map(m=>JSON.parse(m).message).join("\n").replace(/<[^>]+>/g,"")}catch(e){return j.exc_type||""}}
function loadBar(){const e=document.getElementById("ld");if(e)e.className=busy?"loading":""}
function toast(t){const e=document.getElementById("toast");e.textContent=t;e.hidden=false;clearTimeout(window.tt);window.tt=setTimeout(()=>e.hidden=true,4000)}
function put(p){const i=db.props.findIndex(x=>x.id==p.id);if(i<0)db.props.push(p);else db.props[i]=p;return p}
async function load(){try{const d=await api("get_data");db={props:d.props,rem:d.rem};sync="Synced at "+new Date().toLocaleTimeString([],{timeStyle:"short"})}catch(e){sync="Could not reach server"}
 const s=st().s;if(!s)render();else if(s.t=="d")redraw();
 if(startHash!==null){const h=startHash;startHash=null;route(h)}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!document.getElementById("sh").innerHTML)load()});
const $=id=>document.getElementById(id),P=id=>db.props.find(p=>p.id==id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const inr=n=>n?"₹"+Math.round(n).toLocaleString("en-IN"):"—";
const sqft=p=>p.area?p.area*(U[p.unit]||1):(p.len&&p.wid?p.len*p.wid:0);
const total=p=>{if(!p.price)return 0;if(p.punit=="Total")return +p.price;const f={"Per Cent":435.6,"Per Sq.ft":1,"Per Acre":43560,"Per Ground":2400}[p.punit];return p.price*sqft(p)/f};
const psf=p=>sqft(p)&&total(p)?total(p)/sqft(p):0,pc=p=>psf(p)*435.6;
const gm=p=>`https://www.google.com/maps?q=${p.lat},${p.lng}`;
const now=()=>new Date().toISOString();const dt=s=>s?new Date(s).toLocaleString([],{dateStyle:"medium",timeStyle:"short"}):"—";
const same=(s,d)=>s&&new Date(s).toDateString()==d.toDateString();
// ---- navigation: every screen is a history entry, so phone/browser Back works ----
// state = {v: tab, f: status filter, s: open sheet {t:"d"|"e"|"a"|"c", id}, d: depth from Home}
let startHash=location.hash;
const st=()=>history.state||{v:"home",d:0};
function urlFor(s){const x=s.s;if(x)return x.t=="d"?`#p/${x.id}`:x.t=="e"?`#p/${x.id}/edit`:x.t=="a"?"#add":"#compare";return s.v=="home"?location.pathname:`#${s.v}`}
function setState(s,replace){history[replace?"replaceState":"pushState"](s,"",urlFor(s))}
// ---- location ------------------------------------------------------------------
// Phones answer first with a rough network fix, then GPS improves it. Keep watching and
// keep the most accurate reading until it is good enough (goal metres) or time runs out.
let gpsWatch=null,gpsTimer=null;
function stopGps(){if(gpsWatch!=null)navigator.geolocation.clearWatch(gpsWatch);clearTimeout(gpsTimer);gpsWatch=gpsTimer=null}
function gpsError(e){
 if(!window.isSecureContext)return "Location is blocked because this site is opened over http://. Open it with https:// to use GPS.";
 if(!navigator.geolocation)return "This browser does not support location.";
 if(e&&e.code==1)return "Location permission is off. Allow Location for this site (or the Property Tracker app) in your phone settings, then try again.";
 if(e&&e.code==2)return "Location unavailable. Turn on Location (GPS) on your phone and try again.";
 return "Could not get a GPS fix. Move to open sky and try again.";
}
function locate({onFix,onDone,onFail,goal=20,wait=30000}){
 stopGps();if(!window.isSecureContext||!navigator.geolocation)return onFail(gpsError());
 let best=null,lastErr={code:3};
 const finish=()=>{stopGps();best?onDone(best):onFail(gpsError(lastErr))};
 gpsWatch=navigator.geolocation.watchPosition(r=>{
   if(!best||r.coords.accuracy<best.coords.accuracy){best=r;onFix&&onFix(r)}
   if(r.coords.accuracy<=goal)finish()},
  e=>{lastErr=e;if(e.code==1&&!best){stopGps();onFail(gpsError(e))}}, // other errors are often transient: keep waiting, the timer decides
  {enableHighAccuracy:true,maximumAge:0,timeout:wait});
 gpsTimer=setTimeout(finish,wait);
}
const accTxt=a=>a>1000?`±${(a/1000).toFixed(1)} km`:`±${Math.round(a)} m`;
function gps(){const g=$("gps");if(!g)return;
 const show=(r,final)=>{const la=$("lat"),ln=$("lng"),st=$("gps");if(!la||!st)return stopGps();
  la.value=r.coords.latitude.toFixed(6);ln.value=r.coords.longitude.toFixed(6);const a=r.coords.accuracy;
  st.innerHTML=final?`✔ GPS captured ${accTxt(a)} · ${dt(now())}`+(a>1000?`<br><b>Only approximate location.</b> Turn on “Precise location” for this site/app for an exact fix.`:a>50?" · weak signal, recapture in the open for better accuracy":"")
   :`Improving GPS… ${accTxt(a)} <button class="btn" style="padding:4px 10px" onclick="stopGps();gpsStop()">Use this</button>`};
 window.gpsStop=()=>{const st=$("gps");if(st&&$("lat").value)st.textContent=`✔ GPS captured · ${dt(now())}`};
 g.textContent="Getting GPS… (allow location if asked)";
 locate({goal:15,wait:30000,onFix:r=>show(r,false),onDone:r=>show(r,true),onFail:m=>{const st=$("gps");if(st)st.innerHTML=`<b style="color:#c0392b">${esc(m)}</b> You can type the coordinates instead.`}})}
function near(){toast("Finding your location…");locate({goal:100,wait:15000,onDone:g=>{const d=p=>hav(g.coords.latitude,g.coords.longitude,p.lat,p.lng);db.props.sort((a,b)=>d(a)-d(b));render();toast("Sorted nearest first")},onFail:m=>alert(m)})}
function me(){toast("Finding your location…");locate({goal:50,wait:15000,onDone:g=>window.open(`https://www.google.com/maps?q=${g.coords.latitude},${g.coords.longitude}`),onFail:m=>alert(m)})}
function nav(v,f=""){const s=st();view=v;flt=f;
 if(v=="home"){if(s.d>0)return history.go(-s.d);setState({v,f,d:0},true)}
 else setState({v,f,d:1},s.d>0); // Home→tab adds an entry; tab→tab replaces it, so Back always returns Home
 render()}
function setF(f){flt=f;setState({...st(),f},true);render()}
function openS(x){const s=st();setState({v:s.v,f:s.f,s:x,d:s.d+1});drawS(x)}
function drawS(x){stopGps();if(!x)return;if(x.t=="d")drawDetail(x.id);else if(x.t=="e")drawEdit(x.id);else if(x.t=="a")drawAdd();else drawCompare()}
function redraw(){drawS(st().s)}
function closeS(){if(st().s)history.back();else{$("sh").innerHTML="";render()}}
function route(h){h=decodeURIComponent((h||"").replace(/^#/,""));let m;
 if(["list","map","rem","more"].includes(h))nav(h);
 else if((m=h.match(/^(?:p\/)?(P\d+)(\/edit)?$/))&&P(m[1])){openS({t:"d",id:m[1]});if(m[2])openS({t:"e",id:m[1]})}
 else if(h=="add")openS({t:"a"})}
window.addEventListener("popstate",e=>{
 if(!e.state&&location.hash){const h=location.hash;history.replaceState({v:"home",d:0},"",location.pathname);view="home";flt="";$("sh").innerHTML="";render();return route(h)} // link to #p/P0001 etc.
 const s=e.state||{v:"home",d:0},x=s.s;view=s.v||"home";flt=s.f||"";
 if(x&&(x.t=="d"||x.t=="e")&&!P(x.id))return history.back(); // property was deleted
 if(x&&x.t=="c"&&cmp.length<2)return history.back();
 if(x)drawS(x);else{stopGps();$("sh").innerHTML="";render()}});
// Android APK: hardware Back walks the in-app history and only leaves the app from Home.
try{const C=window.Capacitor,A=C&&C.Plugins&&C.Plugins.App;if(A&&C.isNativePlatform&&C.isNativePlatform())A.addListener("backButton",()=>{if(st().d>0)history.back();else A.exitApp()})}catch(e){}
function render(){
 $("nav").innerHTML=[["home","⌂","Home"],["list","☰","Properties"],["map","⌖","Map"],["rem","⏰","Reminders"],["more","⋯","More"]].map(([v,i,t])=>`<button class="${view==v?"on":""}" onclick="nav('${v}')"><b>${i}</b>${t}</button>`).join("");
 if(window.ptMap){window.ptMap.remove();window.ptMap=null}
 $("m").innerHTML=({home,list,map,rem,more})[view]()+`<button class="fab" onclick="edit()">+ ADD PROPERTY</button>`;
 if(view=='map')setTimeout(initMap,0);
}
function home(){const t=new Date(),wk=new Date(Date.now()-6048e5),c=f=>db.props.filter(f).length,s=x=>c(p=>p.status==x);
 const due=db.rem.filter(r=>!r.done&&new Date(r.due)<=new Date(Date.now()+864e5)).length;
 const card=(n,l,f)=>`<div class="card stat" onclick="nav('list','${f}')"><b>${n}</b><span>${l}</span></div>`;
 const pr=db.props.filter(p=>total(p)),avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
 const loc={};db.props.forEach(p=>{const k=p.locality||p.district||"Unknown";loc[k]=(loc[k]||0)+1});
 return `<h1>Site Visits</h1><div class="grid">${card(c(p=>same(p.created,t)),"Visited Today","")}${card(c(p=>new Date(p.created)>wk),"This Week","")}${card(s("Shortlisted"),"Shortlisted","Shortlisted")}${card(s("Negotiating"),"Negotiating","Negotiating")}${card(s("Document Verification"),"Document Verification","Document Verification")}${card(s("Revisit Required"),"Site Revisit","Revisit Required")}${card(s("Purchased"),"Purchased","Purchased")}${card(s("Rejected"),"Rejected","Rejected")}<div class="card stat" onclick="nav('rem')"><b>${due}</b><span>Follow-ups Due</span></div><div class="card stat"><b>${db.props.length}</b><span>Total Visited</span></div></div>
 <h2>Averages</h2><div class="card">Price: <b>${inr(avg(pr.map(total)))}</b> · per cent: <b>${inr(avg(pr.map(pc).filter(x=>x)))}</b> · per sq.ft: <b>${inr(avg(pr.map(psf).filter(x=>x)))}</b></div>
 <h2>By Location</h2><div class="card">${Object.entries(loc).map(([k,v])=>`${esc(k)}: <b>${v}</b>`).join(" · ")||'<span class="mut">No data yet</span>'}</div>
 <h2>Recent Visits</h2>${db.props.slice(-5).reverse().map(item).join("")||'<div class="card mut">Tap + ADD PROPERTY at your first site.</div>'}`}
function item(p){return `<div class="card item" onclick="detail('${p.id}')">${p.photos?.[0]?`<img src="${p.photos[0].d}">`:'<div class="ph">🏞</div>'}<div style="flex:1;min-width:0"><b>${p.id}</b> ${esc(p.name||"")} ${pill(p.status)}<div class="mut">${esc(p.locality||"")} ${esc(p.type)} · ${p.area||"—"} ${p.unit} · ${p.facing||""}</div><div>${inr(total(p))} <span class="mut">${psf(p)?"· "+inr(pc(p))+"/cent":""}</span></div><div class="mut">Last visit ${dt(p.visits.length?p.visits.at(-1).at:p.created)}</div></div></div>`}
function list(){let r=db.props.filter(p=>(!flt||p.status==flt)&&(!q||JSON.stringify([p.id,p.name,p.locality,p.district,p.owner,p.broker,p.type]).toLowerCase().includes(q.toLowerCase())));
 return `<h1>Properties</h1><div class="row"><input placeholder="Search location, owner, ID…" value="${esc(q)}" oninput="q=this.value;clearTimeout(window.t);window.t=setTimeout(render,300)"><select onchange="setF(this.value)"><option value="">All statuses</option>${ST.map(s=>`<option ${s==flt?"selected":""}>${s}</option>`).join("")}</select></div>
 <div class="row wrap" style="margin-bottom:10px"><button class="btn" onclick="compare()">⇄ Compare selected (${cmp.length})</button><button class="btn" onclick="near()">📍 Nearest first</button></div>
 ${r.map(p=>`<div style="display:flex;gap:6px;align-items:flex-start"><input type="checkbox" style="width:22px;margin-top:30px" ${cmp.includes(p.id)?"checked":""} onchange="tgl('${p.id}')"><div style="flex:1">${item(p)}</div></div>`).join("")||'<div class="card mut">No properties match.</div>'}`}
function tgl(id){cmp=cmp.includes(id)?cmp.filter(x=>x!=id):[...cmp,id].slice(-5)}
function hav(a,b,c,d){if(c==null||c==="")return 1e9;const r=x=>x*Math.PI/180,h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 12742*Math.asin(Math.sqrt(h))}
function map(){const ps=db.props.filter(p=>p.lat!==""&&p.lat!=null);
 if(!ps.length)return `<h1>Map</h1><div class="card mut">No located properties yet.</div>`;
 const f=flt;return `<h1>Map</h1><div class="row wrap" style="margin-bottom:8px"><input placeholder="Search pins..." value="${esc(mq)}" oninput="mq=this.value; updateMap()"></div><div class="row wrap" style="margin-bottom:8px"><button class="btn ${!f?'p':''}" onclick="setF('')">All</button>${["Visited","Shortlisted","Negotiating","Purchased","Rejected"].map(s=>`<button class="btn ${f==s?'p':''}" onclick="setF('${s}')">${SI[s]} ${s}</button>`).join("")}<button class="btn" onclick="me()">My location</button></div><div class="card" style="padding:0; overflow:hidden"><div id="lmap" style="height:60vh; z-index:1;"></div></div><div class="mut" style="margin-top:8px">Tap a pin for details.</div>`}
function initMap(){const m=$("lmap");if(!m)return;if(window.ptMap){window.ptMap.remove();window.ptMap=null}window.ptMap=L.map('lmap');L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(window.ptMap);updateMap(true)}
function updateMap(fit){if(!window.ptMap)return;if(window.ptMarkers)window.ptMap.removeLayer(window.ptMarkers);const ps=db.props.filter(p=>p.lat!==""&&p.lat!=null&&(!flt||p.status==flt)&&(!mq||JSON.stringify([p.id,p.name,p.locality,p.type]).toLowerCase().includes(mq.toLowerCase())));window.ptMarkers=L.featureGroup(ps.map(p=>{const c=col(p.status);const m=L.circleMarker([p.lat,p.lng],{color:c,fillColor:c,fillOpacity:0.8,radius:10}).bindTooltip(`<b>${p.id}</b> ${SI[p.status]}<br>${esc(p.name||"")}`);m.on('click',()=>detail(p.id));return m})).addTo(window.ptMap);if(fit&&ps.length)window.ptMap.fitBounds(window.ptMarkers.getBounds(),{padding:[20,20]})}
function rem(){const rs=[...db.rem].sort((a,b)=>a.due.localeCompare(b.due));
 return `<h1>Reminders</h1><div class="card"><label>Reminder</label><input id="rt" placeholder="Call owner, check EC…"><div class="row"><div><label>Due</label><input id="rd" type="datetime-local"></div><div><label>Property</label><select id="rp"><option value="">—</option>${db.props.map(p=>`<option>${p.id}</option>`).join("")}</select></div></div><button class="btn p" onclick="addRem()">Add reminder</button></div><h2>Upcoming</h2>
 ${rs.map(r=>`<div class="card" style="margin-bottom:8px;opacity:${r.done?.5:1}"><label style="display:flex;gap:8px;align-items:center;color:var(--ink);font-size:15px"><input type="checkbox" style="width:22px;margin:0" ${r.done?"checked":""} onchange="remDone('${r.k}',this.checked)"> ${esc(r.t)}</label><div class="mut">${dt(r.due)} ${r.p?"· "+r.p:""} ${!r.done&&new Date(r.due)<new Date()?"· <b style='color:#c0392b'>Overdue</b>":""}</div></div>`).join("")||'<div class="mut">None yet.</div>'}`}
async function addRem(){const t=$("rt").value.trim(),d=$("rd").value;if(!t||!d)return alert("Enter text and date");
 db.rem.push(await api("add_reminder",{reminder:t,due_on:new Date(d).toISOString(),property:$("rp").value}));render();try{Notification.requestPermission()}catch(e){}}
async function remDone(k,d){const r=await api("set_reminder_done",{name:k,done:d?1:0});db.rem=db.rem.map(x=>x.k==k?r:x);render()}
const shown=new Set();
setInterval(()=>{try{db.rem.filter(r=>!r.done&&!shown.has(r.k)&&new Date(r.due)<=new Date()&&new Date(r.due)>new Date(Date.now()-864e5)).forEach(r=>{shown.add(r.k);if(Notification.permission=="granted")new Notification("Reminder",{body:r.t})})}catch(e){}},30000);
function more(){const thm=getTheme();return `<h1>More</h1><h2>Appearance</h2><div class="row wrap" style="margin-bottom:14px"><button class="btn ${thm=='light'?'p':''}" onclick="setTheme('light')">☀️ Light</button><button class="btn ${thm=='dark'?'p':''}" onclick="setTheme('dark')">🌙 Dark</button><button class="btn ${thm=='auto'?'p':''}" onclick="setTheme('auto')">⚙️ System</button></div><div class="card"><b>Data & sync</b><p class="mut">Status: <b>${sync}</b> — data is stored on your Frappe site, so it is shared across devices and your team. Manage records in <a href="/app/property" style="color:var(--ac)">Desk</a>.</p>
 <div class="row wrap"><button class="btn" onclick="csv()">Export CSV (Excel)</button><button class="btn" onclick="bak()">Backup JSON</button><button class="btn" onclick="load()">↻ Refresh</button><label class="btn">Import backup<input type="file" accept=".json" hidden onchange="rest(this)"></label></div></div>
 <h2>Account</h2><div class="row wrap"><a class="btn" href="/app/property" style="text-decoration:none;text-align:center">Open Desk</a><button class="btn d" onclick="logout()">Log out</button></div>
 <h2>Status colour key</h2><div class="card">${ST.map(pill).join(" ")}</div>`}
async function logout(){if(!confirm("Log out of Property Tracker?"))return;try{await fetch("/api/method/logout",{method:"POST",credentials:"same-origin",headers:{"X-Frappe-CSRF-Token":window.csrf_token||""}})}catch(e){}location.href="/login?redirect-to=/property-tracker"}
function setTheme(t){try{localStorage.setItem("theme",t)}catch(e){}if(t==="auto")document.documentElement.removeAttribute("data-theme");else document.documentElement.setAttribute("data-theme",t);render()}
function dl(n,t,m){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click()}
function csv(){const h=["ID","Name","Type","Locality","District","Status","Area","Unit","Length","Width","RoadWidth","Facing","Owner","Phone","Price","PriceUnit","TotalPrice","PerCent","PerSqft","Lat","Lng","Map","Notes"];
 const r=db.props.map(p=>[p.id,p.name,p.type,p.locality,p.district,p.status,p.area,p.unit,p.len,p.wid,p.road,p.facing,p.owner,p.phone,p.price,p.punit,Math.round(total(p)),Math.round(pc(p)),Math.round(psf(p)),p.lat,p.lng,gm(p),p.notes]);
 dl("properties.csv",[h,...r].map(a=>a.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n"),"text/csv")}
function bak(){dl("backup.json",JSON.stringify(db),"application/json")}
function rest(i){const f=i.files[0];if(!f)return;i.value="";f.text().then(async t=>{let d;try{d=JSON.parse(t)}catch(e){return alert("Invalid file")}
 if(!confirm(`Import ${(d.props||[]).length} properties and ${(d.rem||[]).length} reminders as new records?`))return;
 const r=await api("import_backup",{data:d});toast(`Imported ${r.properties} properties and ${r.reminders} reminders`);load()})}
function compare(){if(cmp.length<2)return alert("Select 2–5 properties");openS({t:"c"})}
function drawCompare(){const ps=cmp.map(P).filter(Boolean);
 const rows=[["Location",p=>p.locality],["Type",p=>p.type],["Area",p=>p.area?p.area+" "+p.unit:""],["Length",p=>p.len],["Width",p=>p.wid],["Road width",p=>p.road],["Facing",p=>p.facing],["Price",p=>inr(total(p))],["Per cent",p=>inr(pc(p))],["Per sq.ft",p=>inr(psf(p))],["Owner",p=>p.owner],["Rating",p=>p.rating||""],["Status",p=>p.status],["Notes",p=>p.notes]];
 sheet(`<h1>Compare</h1><div class="scroll"><table><tr><th></th>${ps.map(p=>`<th>${p.id}</th>`).join("")}</tr>${rows.map(([l,f])=>{const v=ps.map(f),d=new Set(v.map(String)).size>1;return `<tr><td><b>${l}</b></td>${v.map(x=>`<td class="${d?"diff":""}">${esc(x)}</td>`).join("")}</tr>`}).join("")}</table></div><p class="mut">Highlighted rows differ between properties.</p><button class="btn" onclick="closeS()">Close</button>`)}
function sheet(h){$("sh").innerHTML=`<div class="sheet"><div class="in">${h}</div></div>`}
let draft;
function edit(){openS({t:"a"})}
function drawAdd(){draft={photos:[],lat:"",lng:""};
 sheet(`<h1>Quick add</h1><div class="card"><div id="gps" class="mut">Getting GPS…</div><div class="row"><div><label>Latitude</label><input id="lat" type="number" step="any" oninput="stopGps()"></div><div><label>Longitude</label><input id="lng" type="number" step="any" oninput="stopGps()"></div></div><button class="btn" onclick="gps()">↻ Recapture GPS</button></div>
 <div class="card" style="margin-top:10px"><label>Property type</label><select id="type">${["Vacant Land","Agricultural Land","Residential Land","House","Apartment","Commercial Property","Industrial Property","Farm Property","Other"].map(t=>`<option>${t}</option>`).join("")}</select>
 <label>Site Title / Name</label><input id="stitle" placeholder="e.g. Anna Nagar Corner Plot"><label>Locality / village</label><input id="loc"><label>Photos</label><input id="ph" type="file" accept="image/*" capture="environment" multiple onchange="photos(this)"><div id="pv" class="ph2"></div>
 <div class="row"><div><label>Area</label><input id="area" type="number" step="any" inputmode="decimal"></div><div><label>Unit</label><select id="unit">${Object.keys(U).map(u=>`<option>${u}</option>`).join("")}</select></div></div>
 <div class="row"><div><label>Length</label><input id="len" type="number" inputmode="decimal"></div><div><label>Width</label><input id="wid" type="number" inputmode="decimal"></div><div><label>Road width</label><input id="road" type="number" inputmode="decimal"></div></div>
 <label>Facing</label><select id="face"><option value="">—</option>${["North","South","East","West","North East","North West","South East","South West"].map(t=>`<option>${t}</option>`).join("")}</select>
 <div class="row"><div><label>Owner</label><input id="own"></div><div><label>Phone</label><input id="tel" type="tel"></div></div>
 <div class="row"><div><label>Expected price</label><input id="pr" type="number" inputmode="decimal"></div><div><label>Price unit</label><select id="pu">${["Total","Per Cent","Per Sq.ft","Per Acre","Per Ground"].map(t=>`<option>${t}</option>`).join("")}</select></div></div>
 <label>Notes</label><textarea id="nt" rows="3"></textarea></div>
 <div class="row" style="margin-top:12px"><button class="btn" onclick="closeS()">Cancel</button><button class="btn p" onclick="saveP()">SAVE</button></div>`);gps()}
function photos(i){[...i.files].forEach(f=>{const im=new Image(),u=URL.createObjectURL(f);im.onload=()=>{const s=Math.min(1,800/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=im.width*s;c.height=im.height*s;c.getContext("2d").drawImage(im,0,0,c.width,c.height);const d=c.toDataURL("image/jpeg",.6);draft.photos.push({d,at:f.lastModified?new Date(f.lastModified).toISOString():now()});$("pv").innerHTML+=`<img src="${d}">`};im.src=u})}
async function saveP(){if(busy)return;stopGps();const v=i=>$(i).value.trim();
 const p={name:v("stitle"),type:v("type"),locality:v("loc"),lat:v("lat"),lng:v("lng"),area:v("area"),unit:$("unit").value,len:v("len"),wid:v("wid"),road:v("road"),facing:$("face").value,owner:v("own"),phone:v("tel"),price:v("pr"),punit:$("pu").value,notes:v("nt"),photos:draft.photos,status:"Visited"};
 put(await api("save_property",{data:p}));closeS()}
function editP(id){if(P(id))openS({t:"e",id})}
function drawEdit(id){const p=P(id);if(!p)return;draft={photos:[...p.photos],lat:p.lat,lng:p.lng};
 const typOpts=["Vacant Land","Agricultural Land","Residential Land","House","Apartment","Commercial Property","Industrial Property","Farm Property","Other"].map(t=>`<option ${p.type==t?"selected":""}>${t}</option>`).join("");
 const unitOpts=Object.keys(U).map(u=>`<option ${p.unit==u?"selected":""}>${u}</option>`).join("");
 const faceOpts=["North","South","East","West","North East","North West","South East","South West"].map(t=>`<option ${p.facing==t?"selected":""}>${t}</option>`).join("");
 const puOpts=["Total","Per Cent","Per Sq.ft","Per Acre","Per Ground"].map(t=>`<option ${p.punit==t?"selected":""}>${t}</option>`).join("");
 const photoPreview=p.photos.map(x=>`<img src="${x.d}">`).join("");
 sheet(`<button class="btn" onclick="history.back()">← Back</button><h1>Edit ${p.id}</h1>
 <div class="card"><div id="gps" class="mut">Coordinates: ${p.lat||"—"}, ${p.lng||"—"}</div><div class="row"><div><label>Latitude</label><input id="lat" type="number" step="any" value="${esc(p.lat)}" oninput="stopGps()"></div><div><label>Longitude</label><input id="lng" type="number" step="any" value="${esc(p.lng)}" oninput="stopGps()"></div></div><button class="btn" onclick="gps()">↻ Recapture GPS</button></div>
 <div class="card" style="margin-top:10px"><label>Property type</label><select id="type">${typOpts}</select>
 <label>Site Title / Name</label><input id="stitle" value="${esc(p.name||'')}"><label>Locality / village</label><input id="loc" value="${esc(p.locality)}"><label>Photos</label><input id="ph" type="file" accept="image/*" capture="environment" multiple onchange="photos(this)"><div id="pv" class="ph2">${photoPreview}</div>
 <div class="row"><div><label>Area</label><input id="area" type="number" step="any" inputmode="decimal" value="${esc(p.area)}"></div><div><label>Unit</label><select id="unit">${unitOpts}</select></div></div>
 <div class="row"><div><label>Length</label><input id="len" type="number" inputmode="decimal" value="${esc(p.len)}"></div><div><label>Width</label><input id="wid" type="number" inputmode="decimal" value="${esc(p.wid)}"></div><div><label>Road width</label><input id="road" type="number" inputmode="decimal" value="${esc(p.road)}"></div></div>
 <label>Facing</label><select id="face"><option value="">—</option>${faceOpts}</select>
 <div class="row"><div><label>Owner</label><input id="own" value="${esc(p.owner)}"></div><div><label>Phone</label><input id="tel" type="tel" value="${esc(p.phone)}"></div></div>
 <div class="row"><div><label>Expected price</label><input id="pr" type="number" inputmode="decimal" value="${esc(p.price)}"></div><div><label>Price unit</label><select id="pu">${puOpts}</select></div></div>
 <label>Notes</label><textarea id="nt" rows="3">${esc(p.notes)}</textarea></div>
 <div class="row" style="margin-top:12px"><button class="btn" onclick="history.back()">Cancel</button><button class="btn p" onclick="saveEdit('${id}')">SAVE CHANGES</button></div>`)}
async function saveEdit(id){if(busy||!P(id))return;stopGps();const v=i=>$(i).value.trim();
 const p={name:v("stitle"),type:v("type"),locality:v("loc"),lat:v("lat"),lng:v("lng"),area:v("area"),unit:$("unit").value,len:v("len"),wid:v("wid"),road:v("road"),facing:$("face").value,owner:v("own"),phone:v("tel"),price:v("pr"),punit:$("pu").value,notes:v("nt"),photos:draft.photos};
 put(await api("save_property",{name:id,data:p}));history.back()}
function detail(id){if(P(id))openS({t:"d",id})}
function drawDetail(id){const p=P(id);if(!p)return;
 sheet(`<button class="btn" onclick="closeS()">← Back</button><h1>${p.id} ${pill(p.status)}</h1><div class="mut">${esc(p.locality)} · ${esc(p.type)} · added ${dt(p.created)}</div>
 <div class="ph2" style="margin:10px 0">${p.photos.map(x=>`<img src="${x.d}">`).join("")}</div>
 <div class="row wrap" style="margin-bottom:10px">${p.lat?`<button class="btn" onclick="window.open('${gm(p)}', '_blank')">Open in Maps</button><button class="btn" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}', '_blank')">Navigate</button>`:""}<button class="btn" onclick="navigator.clipboard?.writeText(gm(P('${id}')))">Copy location</button><button class="btn" onclick="share('${id}')">Share</button>${p.phone?`<button class="btn" onclick="window.location.href='tel:${esc(p.phone)}'">Call</button><button class="btn" onclick="window.open('https://wa.me/${esc(p.phone.replace(/\D/g,""))}', '_blank')">WhatsApp</button>`:""}</div>
 <div class="card"><table><tr><td>Area</td><td>${p.area||"—"} ${p.unit} (${Math.round(sqft(p))} sq.ft)</td></tr><tr><td>Size</td><td>${p.len||"—"} × ${p.wid||"—"} · road ${p.road||"—"} · ${p.facing||"—"}</td></tr><tr><td>Price</td><td>${p.price||"—"} ${p.punit} → <b>${inr(total(p))}</b></td></tr><tr><td>Per cent / sq.ft</td><td>${inr(pc(p))} / ${inr(psf(p))}</td></tr><tr><td>Owner</td><td>${esc(p.owner)} ${esc(p.phone)}</td></tr><tr><td>Notes</td><td>${esc(p.notes)}</td></tr></table></div>
 <h2>Negotiated price & rating</h2><div class="row"><input id="neg" type="number" placeholder="Negotiated total ₹" value="${p.neg||""}"><select id="rt2"><option value="">Rating</option>${[1,2,3,4,5].map(n=>`<option ${p.rating==n?"selected":""}>${n}</option>`).join("")}</select><button class="btn" onclick="deal('${id}')">Save</button></div>
 <h2>Change status</h2><div class="row"><select id="ns">${ST.map(s=>`<option ${s==p.status?"selected":""}>${s}</option>`).join("")}</select><input id="sn" placeholder="Note"><button class="btn p" onclick="setS('${id}')">Update</button></div>
 <div class="mut">${p.history.map(h=>`${dt(h.at)}: ${h.from||"—"} → ${h.to} ${esc(h.note||"")}`).join("<br>")}</div>
 <h2>Visits (${p.visits.length})</h2><textarea id="vn" rows="2" placeholder="What was discussed, new price, follow-up…"></textarea><button class="btn" onclick="visit('${id}')">Log new visit</button>
 <div class="mut" style="margin-top:8px">${p.visits.map(v=>`<b>${dt(v.at)}</b> ${esc(v.note)}`).join("<br>")}</div>
 <h2></h2><div class="row wrap"><button class="btn" onclick="editP('${id}')">✏️ Edit Details</button><button class="btn d" onclick="delP('${id}')">Delete property</button></div>`)}
async function setS(id){const p=P(id),to=$("ns").value;if(to!=p.status)put(await api("set_status",{name:id,status:to,note:$("sn").value}));redraw()}
async function deal(id){put(await api("update_deal",{name:id,negotiated_price:$("neg").value,rating:$("rt2").value}));redraw()}
async function delP(id){if(!confirm(`Delete ${id}?`))return;await api("delete_property",{name:id});db.props=db.props.filter(x=>x.id!=id);db.rem.forEach(r=>{if(r.p==id)r.p=""});cmp=cmp.filter(x=>x!=id);closeS()}
async function visit(id){const n=$("vn").value.trim();if(!n)return;put(await api("log_visit",{name:id,note:n}));redraw()}
function share(id){const p=P(id),t=`${p.id} · ${p.locality} ${p.type}\n${p.area||"—"} ${p.unit}, ${p.len||"—"}×${p.wid||"—"}, road ${p.road||"—"}, ${p.facing||"—"} facing\nPrice ${inr(total(p))} · ${p.status}\n${p.lat?gm(p):""}\n${p.notes||""}`;navigator.share?navigator.share({text:t}).catch(()=>{}):navigator.clipboard?.writeText(t).then(()=>alert("Summary copied (owner details excluded)"))}
history.replaceState({v:"home",d:0},"",location.pathname);render();load();
