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
async function load(){try{const d=await api("get_data");db={props:d.props,rem:d.rem};prof=d.me||prof;sync="Synced at "+new Date().toLocaleTimeString([],{timeStyle:"short"})}catch(e){sync="Could not reach server"}
 const s=st().s;if(!s)render();else if(s.t=="d")redraw();
 if(startHash!==null){const h=startHash;startHash=null;route(h)}
 refreshAlerts()}
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
// ---- UI helpers ------------------------------------------------------------------
const I={home:"M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",list:"M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
 map:"M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",bell:"M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
 user:"M20 21a8 8 0 1 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",plus:"M12 5v14M5 12h14",search:"M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
 pin:"M12 22s7-7.6 7-13a7 7 0 1 0-14 0c0 5.4 7 13 7 13zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",go:"M3 11l19-9-9 19-2-8-8-2z",
 phone:"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
 chat:"M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z",share:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
 copy:"M9 9h11v11H9zM5 15H4V4h11v1",edit:"M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
 back:"M15 18l-6-6 6-6",gps:"M12 2v3M12 19v3M2 12h3M19 12h3M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z",
 camera:"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
 compare:"M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7",refresh:"M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",download:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
 upload:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",logout:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
 ext:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3",sun:"M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
 moon:"M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",monitor:"M2 3h20v14H2zM8 21h8M12 17v4",image:"M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21",
 ruler:"M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2",rupee:"M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 0 0 0-10",note:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8",
 info:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01",gear:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"};
const ic=(n,s=20)=>`<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${I[n]}"/></svg>`;
const TYPES=["Vacant Land","Agricultural Land","Residential Land","House","Apartment","Commercial Property","Industrial Property","Farm Property","Other"];
const FACES=["North","South","East","West","North East","North West","South East","South West"];
const PUNITS=["Total","Per Cent","Per Sq.ft","Per Acre","Per Ground"];
const fmt=n=>(+n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const dims=p=>p.len&&p.wid?`${fmt(p.len)} × ${fmt(p.wid)} ft`:"";
const areaTxt=p=>p.area?`${fmt(p.area)} ${p.unit}`:"";
const thumb=(p,s=84)=>p.photos&&p.photos[0]?`<img class="thumb" src="${esc(p.photos[0].d)}" alt="" loading="lazy">`:`<div class="thumb">${ic("image",28)}</div>`;
const opts=(arr,v)=>arr.map(t=>`<option ${v==t?"selected":""}>${t}</option>`).join("");
let prof={};
const initials=()=>{const n=(prof.full_name||prof.email||"?").trim().split(/\s+/);return esc(((n[0]||"?")[0]+(n.length>1?n[n.length-1][0]:"")).toUpperCase())};
const avatar=(s=36)=>prof.image?`<img class="av" src="${esc(prof.image)}" width="${s}" height="${s}" alt="" style="width:${s}px;height:${s}px">`:`<span class="av" style="width:${s}px;height:${s}px;font-size:${Math.round(s*.4)}px">${initials()}</span>`;
const dueCount=()=>db.rem.filter(r=>!r.done&&new Date(r.due)<=new Date(Date.now()+864e5)).length;
const head=(t,sub="")=>`<header class="top"><div><h1>${t}</h1>${sub?`<p>${sub}</p>`:""}</div><button class="avbtn" onclick="nav('more')" aria-label="Account">${avatar(36)}</button></header>`;
const sheetHead=(t,sub="",right="")=>`<div class="shead"><button class="iconbtn" onclick="closeS()" aria-label="Back">${ic("back")}</button><div><h1>${t}</h1>${sub?`<div class="mut ell">${sub}</div>`:""}</div>${right}</div>`;
const greet=()=>{const h=new Date().getHours();return h<12?"Good morning":h<17?"Good afternoon":"Good evening"};
// ---- navigation: every screen is a history entry, so phone/browser Back works ----
// state = {v: tab, f: status filter, s: open sheet {t:"d"|"e"|"a"|"c", id}, d: depth from Home}
let startHash=location.hash;
const st=()=>history.state||{v:"home",d:0};
function urlFor(s){const x=s.s;if(x)return x.t=="d"?`#p/${x.id}`:x.t=="e"?`#p/${x.id}/edit`:x.t=="a"?"#add":"#compare";return s.v=="home"?location.pathname:`#${s.v}`}
function setState(s,replace){history[replace?"replaceState":"pushState"](s,"",urlFor(s))}
// ---- location ------------------------------------------------------------------
// Phones answer first with a rough network fix, then GPS improves it. Keep watching and
// keep the most accurate reading until it is good enough (goal metres) or time runs out.
let gpsWatch=null,gpsTimer=null,gpsTok=null; // gpsTok identifies the active request; callbacks from stopped ones are ignored
// Inside the Android app, use the phone's native GPS (Capacitor Geolocation plugin). It works even when
// the Frappe site is opened over http:// on the local network, where browsers block location.
const nativeGeo=()=>{try{const C=window.Capacitor;return C&&C.isNativePlatform&&C.isNativePlatform()&&C.Plugins&&C.Plugins.Geolocation||null}catch(e){return null}};
function stopGps(){if(gpsWatch!=null){const w=gpsWatch,N=nativeGeo();if(typeof w=="string"){N&&N.clearWatch({id:w}).catch(()=>{})}else if(w&&w.then){/* cleared when its id arrives */}else navigator.geolocation.clearWatch(w)}clearTimeout(gpsTimer);gpsWatch=gpsTimer=gpsTok=null}
function gpsError(e){
 if(!nativeGeo()&&!window.isSecureContext)return "Location is blocked because this site is opened over http://"+(location.hostname?" ("+location.hostname+")":"")+". Use https://, open it at http://localhost on this computer, the Property Tracker Android app, or allow this address in Chrome (see README).";
 if(!navigator.geolocation)return "This browser does not support location.";
 if(e&&e.code==1)return "Location permission is off. Allow Location for this site (or the Property Tracker app) in your phone settings, then try again.";
 if(e&&e.code==2)return "Location unavailable. Turn on Location (GPS) on your phone and try again.";
 return "Could not get a GPS fix. Move to open sky and try again.";
}
function locate({onFix,onDone,onFail,goal=20,wait=30000}){
 stopGps();const N=nativeGeo();
 if(!N&&(!window.isSecureContext||!navigator.geolocation))return onFail(gpsError());
 let best=null,lastErr={code:3};const tok=gpsTok={};
 const finish=()=>{stopGps();best?onDone(best):onFail(gpsError(lastErr))};
 const onPos=r=>{if(gpsTok!==tok||!r||!r.coords)return;
   if(!best||r.coords.accuracy<best.coords.accuracy){best=r;onFix&&onFix(r)}
   if(r.coords.accuracy<=goal)finish()};
 const onErr=e=>{if(gpsTok!==tok)return;lastErr=e;if(e.code==1&&!best){stopGps();onFail(gpsError(e))}}; // other errors are often transient: keep waiting, the timer decides
 if(N){ // native plugin reports errors as text
   const nErr=err=>{const m=String(err&&(err.message||err)||"");onErr({code:/denied|permission/i.test(m)?1:/not enabled|disabled|services/i.test(m)?2:3})};
   const pr=Promise.resolve(N.watchPosition({enableHighAccuracy:true,maximumAge:0,timeout:wait},(r,err)=>{if(err)nErr(err);else onPos(r)}));
   gpsWatch=pr;
   pr.then(id=>{if(gpsTok===tok)gpsWatch=id;else N.clearWatch({id}).catch(()=>{})}).catch(nErr);
 }else gpsWatch=navigator.geolocation.watchPosition(onPos,onErr,{enableHighAccuracy:true,maximumAge:0,timeout:wait});
 gpsTimer=setTimeout(finish,wait);
}
const accTxt=a=>a>1000?`±${(a/1000).toFixed(1)} km`:`±${Math.round(a)} m`;
function gps(){const g=$("gps");if(!g)return;
 const show=(r,final)=>{const la=$("lat"),ln=$("lng"),st=$("gps");if(!la||!st)return stopGps();
  la.value=r.coords.latitude.toFixed(6);ln.value=r.coords.longitude.toFixed(6);const a=r.coords.accuracy;pickTo(r.coords.latitude,r.coords.longitude,false,a);
  st.innerHTML=final?`✔ GPS captured ${accTxt(a)} · ${dt(now())}`+(a>1000?`<br><b>Only approximate location.</b> Turn on “Precise location” for this site/app for an exact fix.`:a>50?" · weak signal, recapture in the open for better accuracy":"")
   :`Improving GPS… ${accTxt(a)} <button class="btn" style="padding:4px 10px" onclick="stopGps();gpsStop()">Use this</button>`};
 window.gpsStop=()=>{const st=$("gps");if(st&&$("lat").value)st.textContent=`✔ GPS captured · ${dt(now())}`};
 g.textContent="Getting GPS… (allow location if asked)";
 locate({goal:15,wait:30000,onFix:r=>show(r,false),onDone:r=>show(r,true),onFail:m=>{const st=$("gps");if(st)st.innerHTML=`<b style="color:#c0392b">${esc(m)}</b> You can type the coordinates instead.`}})}
function near(){toast("Finding your location…");locate({goal:100,wait:15000,onDone:g=>{const d=p=>hav(g.coords.latitude,g.coords.longitude,p.lat,p.lng);db.props.sort((a,b)=>d(a)-d(b));render();toast("Sorted nearest first")},onFail:m=>alert(m)})}
function me(){toast("Finding your location…");locate({goal:50,wait:15000,onFix:g=>showMe(window.ptMap,g.coords,false),onDone:g=>{showMe(window.ptMap,g.coords,true);toast(`You are here (${accTxt(g.coords.accuracy)})`)},onFail:m=>alert(m)})}
function nav(v,f=""){const s=st();view=v;flt=f;
 if(v=="home"){if(s.d>0)return history.go(-s.d);setState({v,f,d:0},true)}
 else setState({v,f,d:1},s.d>0); // Home→tab adds an entry; tab→tab replaces it, so Back always returns Home
 render()}
function setF(f){flt=f;setState({...st(),f},true);render()}
function openS(x){const s=st();setState({v:s.v,f:s.f,s:x,d:s.d+1});drawS(x)}
function drawS(x){stopGps();dropSheetMaps();if(!x)return;if(x.t=="d")drawDetail(x.id);else if(x.t=="e")drawEdit(x.id);else if(x.t=="a")drawAdd();else drawCompare()}
function redraw(){drawS(st().s)}
function dropSheetMaps(){["ptMini","ptPick"].forEach(k=>{if(window[k]){window[k].remove();window[k]=null}})}
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
 if(x)drawS(x);else{stopGps();dropSheetMaps();$("sh").innerHTML="";render()}});
// Android APK: hardware Back walks the in-app history and only leaves the app from Home.
try{const C=window.Capacitor,A=C&&C.Plugins&&C.Plugins.App;if(A&&C.isNativePlatform&&C.isNativePlatform())A.addListener("backButton",()=>{if(st().d>0)history.back();else A.exitApp()})}catch(e){}
function render(){
 const due=dueCount();
 $("nav").innerHTML=`<div class="brand"><img src="/assets/property_tracker/images/logo.svg" alt="">Property Tracker</div>`
  +[["home","home","Home"],["list","list","Properties"],["map","map","Map"],["rem","bell","Reminders"],["more","user","Account"]].map(([v,i,t])=>
   `<button class="${view==v?"on":""}" onclick="nav('${v}')" aria-label="${t}"${view==v?' aria-current="page"':""}>${v=="more"&&prof.user?avatar(view==v?24:22):ic(i)}<span>${t}</span>${v=="rem"&&due?`<i class="badge">${due}</i>`:""}</button>`).join("")
  +`<button class="chip" onclick="nav('more')">${avatar(32)}<div class="ell"><b class="ell">${esc(prof.full_name||"")}</b><span class="ell">${esc(prof.email||"")}</span></div></button>`;
 if(window.ptMap){window.ptMap.remove();window.ptMap=null}
 $("m").innerHTML=({home,list,map,rem,more})[view]()+(view=="more"?"":`<button class="fab" onclick="edit()">${ic("plus")}<span>Add property</span></button>`);
 if(view=='map')setTimeout(initMap,0);
 if(view=='rem')setTimeout(updateAlertsCard,0);
}
function home(){const t=new Date(),wk=new Date(Date.now()-6048e5),c=f=>db.props.filter(f).length,s=x=>c(p=>p.status==x),due=dueCount();
 const tile=(n,l,f,k)=>`<button class="card stat" style="--c:${k?col(k):"var(--ac)"}" onclick="nav('list','${f}')"><b>${n}</b><span>${l}</span></button>`;
 const pr=db.props.filter(p=>total(p)),avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
 const loc={};db.props.forEach(p=>{const k=p.locality||p.district||"Unknown";loc[k]=(loc[k]||0)+1});
 return head(`${greet()}${prof.first_name?", "+esc(prof.first_name):""}`,`${db.props.length} propert${db.props.length==1?"y":"ies"} · ${esc(sync)}`)
 +(due?`<button class="card alert" onclick="nav('rem')">${ic("bell",24)}<div><b>${due} follow-up${due>1?"s":""} due</b><span>Overdue or due in the next 24 hours</span></div></button>`:"")
 +`<div class="grid">${tile(c(p=>same(p.created,t)),"Visited today","")}${tile(c(p=>new Date(p.created)>wk),"This week","")}${tile(s("Shortlisted"),"Shortlisted","Shortlisted","Shortlisted")}${tile(s("Negotiating"),"Negotiating","Negotiating","Negotiating")}${tile(s("Document Verification"),"Document check","Document Verification","Document Verification")}${tile(s("Revisit Required"),"Site revisit","Revisit Required","Revisit Required")}${tile(s("Purchased"),"Purchased","Purchased","Purchased")}${tile(s("Rejected"),"Rejected","Rejected","Rejected")}${tile(db.props.length,"Total","","")}<button class="card stat" style="--c:var(--warn)" onclick="nav('rem')"><b>${due}</b><span>Follow-ups due</span></button></div>
 <h2>Average prices</h2><div class="card kpis"><div><span>Total</span><b>${inr(avg(pr.map(total)))}</b></div><div><span>Per cent</span><b>${inr(avg(pr.map(pc).filter(x=>x)))}</b></div><div><span>Per sq.ft</span><b>${inr(avg(pr.map(psf).filter(x=>x)))}</b></div></div>
 <h2>By location</h2>${Object.keys(loc).length?`<div class="chips">${Object.entries(loc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span class="chip">${ic("pin",14)} ${esc(k)} <small>${v}</small></span>`).join("")}</div>`:'<div class="card mut">No data yet</div>'}
 <h2>Recent visits</h2><div class="items">${db.props.slice(-6).reverse().map(item).join("")||`<div class="card empty">${ic("pin",32)}<div>Tap <b>Add property</b> at your first site.</div></div>`}</div>`}
function item(p){const sub=[p.name?p.id:"",p.locality||p.type].filter(Boolean).map(esc).join(" · ");
 return `<div class="card item" onclick="detail('${p.id}')">${thumb(p)}<div class="it"><div class="t1">${esc(p.name||p.id)}</div><div class="t2">${pill(p.status)}<span class="mut ell">${sub}</span></div>${p.addr?`<div class="mut ell">${ic("pin",13)} ${esc(p.addr)}</div>`:""}<div class="t3"><b>${inr(total(p))}</b><span class="mut">${[areaTxt(p),dims(p)].filter(Boolean).join(" · ")}</span></div></div></div>`}
const matchQ=(p,s)=>!s||JSON.stringify([p.id,p.name,p.locality,p.district,p.addr,p.owner,p.phone,p.type]).toLowerCase().includes(s.toLowerCase());
function listItems(){const r=db.props.filter(p=>(!flt||p.status==flt)&&matchQ(p,q)).reverse();
 return r.map(p=>cmpMode?`<div class="selrow"><input type="checkbox" aria-label="Select ${p.id} to compare" ${cmp.includes(p.id)?"checked":""} onchange="tgl('${p.id}')">${item(p)}</div>`:item(p)).join("")||`<div class="card empty">${ic("search",28)}<div>No properties match.</div></div>`}
function list(){const n={};db.props.forEach(p=>n[p.status]=(n[p.status]||0)+1);
 return head("Properties",`${db.props.length} total`)
 +`<div class="search">${ic("search",18)}<input type="search" placeholder="Search name, address, owner, ID…" value="${esc(q)}" oninput="q=this.value;$('results').innerHTML=listItems()"></div>
 <div class="chips"><button class="chip ${!flt?"on":""}" onclick="setF('')">All <small>${db.props.length}</small></button>${ST.filter(s=>n[s]||s==flt).map(s=>`<button class="chip ${s==flt?"on":""}" style="--c:${col(s)}" onclick="setF('${s}')"><i class="dot"></i>${s} <small>${n[s]||0}</small></button>`).join("")}</div>
 <div class="toolbar"><button class="btn sm ${cmpMode?"on":""}" onclick="cmpMode=!cmpMode;if(!cmpMode)cmp=[];render()">${ic("compare",16)} ${cmpMode?"Cancel":"Select to compare"}</button>${cmpMode?`<button class="btn sm p" id="cmpbtn" onclick="compare()">Compare (${cmp.length})</button>`:""}<button class="btn sm" onclick="near()">${ic("gps",16)} Nearest first</button></div>
 <div id="results">${listItems()}</div>`}
let cmpMode=false;
function tgl(id){cmp=cmp.includes(id)?cmp.filter(x=>x!=id):[...cmp,id].slice(-5);const b=$("cmpbtn");if(b)b.textContent=`Compare (${cmp.length})`}
function hav(a,b,c,d){if(c==null||c==="")return 1e9;const r=x=>x*Math.PI/180,h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 12742*Math.asin(Math.sqrt(h))}
function map(){const ps=db.props.filter(p=>p.lat!==""&&p.lat!=null);
 if(!ps.length)return head("Map")+`<div class="card empty">${ic("map",32)}<div>No located properties yet. Capture GPS when you add a property.</div></div>`;
 const f=flt;return head("Map",`${ps.length} located`)+`<div class="search">${ic("search",18)}<input type="search" placeholder="Search pins…" value="${esc(mq)}" oninput="mq=this.value;updateMap()"></div>
 <div class="chips"><button class="chip ${!f?"on":""}" onclick="setF('')">All</button>${["Visited","Shortlisted","Negotiating","Purchased","Rejected"].map(s=>`<button class="chip ${f==s?"on":""}" style="--c:${col(s)}" onclick="setF('${s}')"><i class="dot"></i>${s}</button>`).join("")}</div>
 ${layerSeg()}<div class="card mapcard"><div id="lmap"></div><div class="mapbtns"><button class="iconbtn" onclick="me()" aria-label="My location" title="My location">${ic("gps")}</button><button class="iconbtn" onclick="fitAll()" aria-label="Show all pins" title="Show all pins">${ic("compare")}</button></div></div><div class="mut" style="margin-top:8px">Tap a pin for details, directions or Street View.</div>`}


// ---- maps ------------------------------------------------------------------------
// Free base maps (no API keys): OpenStreetMap, CARTO, Esri satellite imagery and OpenTopoMap.
const isDark=()=>{const t=document.documentElement.getAttribute("data-theme");return t?t=="dark":matchMedia("(prefers-color-scheme: dark)").matches};
const ESRI="https://server.arcgisonline.com/ArcGIS/rest/services/";
const LAYERS={
 street:{name:"Street",icon:"map",tiles:()=>[["https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,className:"inv",attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'}]]},
 clean:{name:"Clean",icon:"list",tiles:()=>[[`https://{s}.basemaps.cartocdn.com/${isDark()?"dark_all":"rastertiles/voyager"}/{z}/{x}/{y}{r}.png`,{maxZoom:20,subdomains:"abcd",attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank">CARTO</a>'}]]},
 sat:{name:"Satellite",icon:"image",tiles:()=>[[ESRI+"World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:20,maxNativeZoom:19,attribution:'Imagery © <a href="https://www.esri.com" target="_blank">Esri</a>, Maxar, Earthstar Geographics'}],
  [ESRI+"Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",{maxZoom:20,maxNativeZoom:19,opacity:.85}],[ESRI+"Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{maxZoom:20,maxNativeZoom:19}]]},
 topo:{name:"Terrain",icon:"ruler",tiles:()=>[["https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{maxZoom:17,subdomains:"abc",className:"inv",attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>, SRTM | © <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a> (CC-BY-SA)'}]]}};
let mapLayer=(()=>{try{return localStorage.getItem("mapLayer")||"street"}catch(e){return "street"}})();
if(!LAYERS[mapLayer])mapLayer="street";
const liveMaps=()=>[window.ptMap,window.ptMini,window.ptPick].filter(Boolean);
function setBase(m){if(m._base)m.removeLayer(m._base);m._base=L.layerGroup(LAYERS[mapLayer].tiles().map(([u,o])=>L.tileLayer(u,o))).addTo(m);m.setMaxZoom(mapLayer=="topo"?17:20)}
function setLayer(k){mapLayer=k;try{localStorage.setItem("mapLayer",k)}catch(e){}liveMaps().forEach(setBase);document.querySelectorAll(".layerseg button").forEach(b=>b.classList.toggle("on",b.dataset.k==k))}
const layerSeg=()=>`<div class="seg layerseg" role="group" aria-label="Map style">${Object.entries(LAYERS).map(([k,l])=>`<button type="button" data-k="${k}" class="${k==mapLayer?"on":""}" onclick="setLayer('${k}')">${ic(l.icon,15)} ${l.name}</button>`).join("")}</div>`;
function newMap(id,o={}){const m=L.map(id,{zoomControl:true,attributionControl:true,...o});m.attributionControl.setPrefix(false);setBase(m);setTimeout(()=>{if(m._mapPane&&m.getContainer().isConnected)m.invalidateSize()},250);return m} // the map may be gone if the user navigated away
const pinIcon=(c,big)=>L.divIcon({className:"",html:`<span class="mk${big?" big":""}" style="--c:${c}"></span>`,iconSize:big?[34,34]:[28,28],iconAnchor:big?[17,34]:[14,28],popupAnchor:[0,big?-32:-26]});
const svUrl=p=>`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${p.lat},${p.lng}`;
const navUrl=p=>`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
function popup(p){return `<div class="pop">${p.photos&&p.photos[0]?`<img src="${esc(p.photos[0].d)}" alt="">`:""}<b>${esc(p.name||p.id)}</b><div class="pmeta">${pill(p.status)}<span class="mut">${p.id}</span></div>${p.addr?`<div class="mut">${esc(p.addr)}</div>`:""}<div class="pprice"><b>${inr(total(p))}</b> <span class="mut">${[areaTxt(p),dims(p)].filter(Boolean).join(" · ")}</span></div>
 <div class="pact"><button class="btn sm p" onclick="detail('${p.id}')">Details</button><a class="btn sm" href="${navUrl(p)}" target="_blank" rel="noopener">${ic("go",14)} Go</a><a class="btn sm" href="${svUrl(p)}" target="_blank" rel="noopener">${ic("user",14)} Street View</a></div></div>`}
// "You are here" dot with accuracy circle
function showMe(m,c,fly){if(!m)return;const ll=[c.latitude,c.longitude];if(m._me){m._me.setLatLng(ll);m._acc.setLatLng(ll).setRadius(c.accuracy)}else{m._acc=L.circle(ll,{radius:c.accuracy,color:"#2b7cff",weight:1,fillOpacity:.12,interactive:false}).addTo(m);m._me=L.marker(ll,{icon:L.divIcon({className:"",html:'<span class="me"></span>',iconSize:[18,18],iconAnchor:[9,9]}),interactive:false,zIndexOffset:1000}).addTo(m)}if(fly)m.flyTo(ll,Math.max(m.getZoom()||0,16),{duration:.8})}
function initMap(){const m=$("lmap");if(!m)return;if(window.ptMap){window.ptMap.remove();window.ptMap=null}window.ptMap=newMap('lmap');window.ptMap.setView([20.6,78.9],5);updateMap(true)}
function updateMap(fit){const M=window.ptMap;if(!M)return;if(window.ptMarkers)M.removeLayer(window.ptMarkers);
 const ps=db.props.filter(p=>p.lat!==""&&p.lat!=null&&(!flt||p.status==flt)&&matchQ(p,mq));
 window.ptMarkers=L.featureGroup(ps.map(p=>L.marker([p.lat,p.lng],{icon:pinIcon(col(p.status)),title:p.name||p.id,riseOnHover:true}).bindPopup(popup(p),{maxWidth:280,minWidth:230}))).addTo(M);
 if(fit&&ps.length)M.fitBounds(window.ptMarkers.getBounds(),{padding:[40,40],maxZoom:17})}
function fitAll(){const M=window.ptMap;if(M&&window.ptMarkers&&window.ptMarkers.getLayers().length)M.fitBounds(window.ptMarkers.getBounds(),{padding:[40,40],maxZoom:17})}
// Property page: small map of the site
function miniMap(p){if(window.ptMini){window.ptMini.remove();window.ptMini=null}if(!$("dmap")||!p.lat)return;
 const m=window.ptMini=newMap("dmap",{scrollWheelZoom:false,dragging:!L.Browser.mobile,tap:false});m.setView([p.lat,p.lng],17);L.marker([p.lat,p.lng],{icon:pinIcon(col(p.status),true)}).addTo(m)}
// Add/edit form: draggable pin to fine-tune the GPS position (or tap the map to place it)
function pickMap(){if(window.ptPick){window.ptPick.remove();window.ptPick=null}if(!$("pmap"))return;
 const la=parseFloat($("lat").value),ln=parseFloat($("lng").value),has=isFinite(la)&&isFinite(ln);
 const ref=db.props.find(p=>p.lat);const m=window.ptPick=newMap("pmap",{scrollWheelZoom:false,tap:false});
 m.setView(has?[la,ln]:ref?[ref.lat,ref.lng]:[20.6,78.9],has?18:ref?13:5);
 if(has)pickTo(la,ln);
 m.on("click",e=>{stopGps();pickTo(e.latlng.lat,e.latlng.lng,true);gpsMsg("📍 Pin placed on the map")})}
function pickTo(la,ln,fromMap,acc){const m=window.ptPick;if(!m)return;
 if(!m._pin){m._pin=L.marker([la,ln],{draggable:true,icon:pinIcon("var(--ac)",true),autoPan:true}).addTo(m);
  m._pin.on("dragend",()=>{stopGps();const q=m._pin.getLatLng();setLL(q.lat,q.lng);gpsMsg("📍 Pin moved by hand")})}
 else m._pin.setLatLng([la,ln]);
 if(fromMap)setLL(la,ln);else m.setView([la,ln],Math.max(m.getZoom(),acc&&acc>200?15:18));
 if(m._acc)m.removeLayer(m._acc);m._acc=acc?L.circle([la,ln],{radius:acc,color:"#2b7cff",weight:1,fillOpacity:.1,interactive:false}).addTo(m):null}
function setLL(la,ln){if($("lat"))$("lat").value=la.toFixed(6);if($("lng"))$("lng").value=ln.toFixed(6)}
function gpsMsg(t){const e=$("gps");if(e)e.textContent=t}
function pickFromInputs(){const la=parseFloat($("lat").value),ln=parseFloat($("lng").value);if(isFinite(la)&&isFinite(ln))pickTo(la,ln)}
// ---- reminder alerts -----------------------------------------------------------
// Android app: native alarms scheduled on the phone (ring at the due time, even offline / app closed).
// Browser or installed web app: Web Push sent by the Frappe scheduler (needs https:// or localhost).
const LN=()=>{try{const C=window.Capacitor;return C&&C.isNativePlatform&&C.isNativePlatform()&&C.Plugins&&C.Plugins.LocalNotifications||null}catch(e){return null}};
const pushSupported=()=>!LN()&&window.isSecureContext&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
let alertsOn=false,alertsRefreshed=false,chanMade=false;
const nid=k=>{let h=0;for(const c of String(k))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)%2147483000+1};
const remUrl=r=>r.p?`/property-tracker#p/${r.p}`:"/property-tracker#rem";
const b64uBytes=t=>{t=t.replace(/-/g,"+").replace(/_/g,"/");t+="=".repeat((4-t.length%4)%4);return Uint8Array.from(atob(t),c=>c.charCodeAt(0))};
const sameKey=(a,b)=>{if(!a)return false;a=new Uint8Array(a);return a.length==b.length&&a.every((x,i)=>x==b[i])};
const swReg=()=>navigator.serviceWorker.getRegistration("/property-tracker");
function pushHelp(){return !window.isSecureContext?"Alerts need https:// (or localhost). On this http:// address, use the Property Tracker Android app, which rings its own alarms.":"This browser can't receive push alerts. On iPhone, add Property Tracker to the Home Screen first (iOS 16.4 or later)."}
async function alertsState(){ // "on" | "off" | "blocked" | "unsupported"
 const N=LN();if(N){const p=await N.checkPermissions();return p.display=="granted"?"on":p.display=="denied"?"blocked":"off"}
 if(!pushSupported())return "unsupported";
 if(Notification.permission=="denied")return "blocked";
 const reg=await swReg(),sub=reg&&await reg.pushManager.getSubscription();
 return sub&&Notification.permission=="granted"?"on":"off"}
async function updateAlertsCard(){const el=$("alerts");if(!el)return;const s=await alertsState().catch(()=>"off"),n=!!LN();alertsOn=s=="on";if(!$("alerts"))return;
 const txt={on:n?"🔔 <b>Alarms are on.</b> Reminders ring on this phone at their due time, even when the app is closed.":"🔔 <b>Alerts are on for this device.</b> You'll get a notification when a reminder is due, even when the app is closed.",
  off:n?"🔕 Turn on alarms so reminders ring on this phone at their due time.":"🔕 Turn on alerts to get a notification on this device when a reminder is due.",
  blocked:n?"🚫 Notifications are blocked. Allow them in Android Settings → Apps → Property Tracker → Notifications.":"🚫 Notifications are blocked for this site. Allow them in the browser's site settings, then reload.",
  unsupported:esc(pushHelp())}[s];
 el.innerHTML=`<div>${txt}</div><div class="row wrap" style="margin-top:8px">${s=="off"||(s=="blocked"&&n)?`<button class="btn p" onclick="enableAlerts()">Turn on</button>`:""}${s=="on"?`<button class="btn" onclick="testAlert()">Send test</button>${n?"":`<button class="btn" onclick="disableAlerts()">Turn off</button>`}`:""}</div>`}
async function enableAlerts(){try{const N=LN();
 if(N){let p=await N.checkPermissions();if(p.display!="granted")p=await N.requestPermissions();
  if(p.display!="granted")toast("Notifications are blocked. Allow them for Property Tracker in Android settings.");else{await syncAlarms();toast("Reminder alarms are on")}}
 else{if(!pushSupported())return alert(pushHelp());
  if(await Notification.requestPermission()!="granted"){toast("Notifications were not allowed");return updateAlertsCard()}
  const {public_key}=await api("get_push_config"),key=b64uBytes(public_key);
  await navigator.serviceWorker.register("/property-tracker-sw.js",{scope:"/property-tracker"});const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(sub&&!sameKey(sub.options.applicationServerKey,key)){await sub.unsubscribe();sub=null} // server keys changed
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  await api("save_push_subscription",{subscription:sub.toJSON(),user_agent:navigator.userAgent});toast("Reminder alerts are on for this device")}
 }catch(e){console.error(e);toast("Could not turn on alerts: "+(e.message||e))}
 updateAlertsCard()}
async function disableAlerts(){try{const reg=await swReg(),sub=reg&&await reg.pushManager.getSubscription();
 if(sub){await api("delete_push_subscription",{endpoint:sub.endpoint});await sub.unsubscribe()}toast("Alerts are off for this device")}catch(e){}updateAlertsCard()}
async function testAlert(){const N=LN();
 if(N){await N.schedule({notifications:[{id:999999,title:"🔔 Property Tracker",body:"Reminder alarms are working on this phone.",schedule:{at:new Date(Date.now()+3000),allowWhileIdle:true},channelId:"reminders"}]});return toast("Test alarm in 3 seconds…")}
 const r=await api("send_test_push");
 toast(r.sent?"Test alert sent. It should appear in a moment.":r.removed?"This device's alert registration expired. Turn alerts on again.":"Could not send the test alert. See Error Log in Desk.");if(r.removed)updateAlertsCard()}
// Android: (re)schedule a native alarm for every open reminder. Called after data loads or reminders change.
async function syncAlarms(){const N=LN();if(!N)return;try{
 if((await N.checkPermissions()).display!="granted")return;
 if(!chanMade){await N.createChannel({id:"reminders",name:"Reminders",description:"Property reminder alarms",importance:5,visibility:1,vibration:true});chanMade=true}
 const pend=((await N.getPending()).notifications||[]).filter(n=>n.id!=999999);if(pend.length)await N.cancel({notifications:pend.map(n=>({id:n.id}))});
 const now=Date.now(),list=db.rem.filter(r=>!r.done&&new Date(r.due).getTime()>now+1000).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,60)
  .map(r=>({id:nid(r.k),title:"⏰ Reminder",body:r.t+(r.p?" · "+r.p:""),schedule:{at:new Date(r.due),allowWhileIdle:true},channelId:"reminders",autoCancel:true,extra:{url:remUrl(r)}}));
 if(list.length)await N.schedule({notifications:list})}catch(e){console.error("alarms",e)}}
// After loading: keep this browser's push registration current on the server, or the phone's alarms in sync.
async function refreshAlerts(){try{if(LN())return syncAlarms();if(alertsRefreshed||!pushSupported()||Notification.permission!="granted")return;alertsRefreshed=true;
 const reg=await swReg(),sub=reg&&await reg.pushManager.getSubscription();alertsOn=!!sub;
 if(sub)await api("save_push_subscription",{subscription:sub.toJSON(),user_agent:navigator.userAgent})}catch(e){}}
// Tapping a notification opens the reminder's property (or the Reminders screen).
function openHash(h){if(!h)return;if(h=="#rem"){if(st().s)history.go(-st().d);setTimeout(()=>nav("rem"),50)}else route(h)}
try{const N=LN();if(N)N.addListener("localNotificationActionPerformed",a=>{const u=a&&a.notification&&a.notification.extra&&a.notification.extra.url;if(u)openHash(new URL(u,location.origin).hash)})}catch(e){}
if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",e=>{if(e.data&&e.data.type=="pt-open")openHash(e.data.hash)});
function rem(){const rs=[...db.rem].sort((a,b)=>a.due.localeCompare(b.due)),nowD=new Date();
 const row=r=>{const od=!r.done&&new Date(r.due)<nowD;return `<div class="rem ${r.done?"done":""}"><input type="checkbox" aria-label="Done" ${r.done?"checked":""} onchange="remDone('${r.k}',this.checked)"><div style="flex:1;min-width:0"><div class="t">${esc(r.t)}</div><div class="mut">${ic("bell",13)} ${dt(r.due)}${od?` · <span class="overdue">Overdue</span>`:""} ${r.p?`<button class="linkchip" onclick="detail('${r.p}')">${r.p}</button>`:""}</div></div></div>`};
 const open=rs.filter(r=>!r.done),done=rs.filter(r=>r.done).reverse();
 return head("Reminders",`${open.length} open`)+`<div class="card" id="alerts">…</div>
 <section class="card"><h3>${ic("plus",18)} New reminder</h3><label for="rt">What</label><input id="rt" placeholder="Call owner, check EC, revisit…"><div class="row"><div><label for="rd">When</label><input id="rd" type="datetime-local"></div><div><label for="rp">Property</label><select id="rp"><option value="">—</option>${db.props.map(p=>`<option value="${p.id}">${p.id}${p.name?" · "+esc(p.name):""}</option>`).join("")}</select></div></div><button class="btn p" style="margin-top:12px;width:100%" onclick="addRem()">Add reminder</button></section>
 <h2>Upcoming</h2>${open.length?`<div class="card">${open.map(row).join("")}</div>`:`<div class="card empty">${ic("bell",28)}<div>No open reminders.</div></div>`}
 ${done.length?`<h2>Done</h2><div class="card">${done.slice(0,20).map(row).join("")}</div>`:""}`}
async function addRem(){const t=$("rt").value.trim(),d=$("rd").value;if(!t||!d)return alert("Enter text and date");
 db.rem.push(await api("add_reminder",{reminder:t,due_on:new Date(d).toISOString(),property:$("rp").value}));render();syncAlarms();if((await alertsState().catch(()=>""))=="off")enableAlerts()}
async function remDone(k,d){const r=await api("set_reminder_done",{name:k,done:d?1:0});db.rem=db.rem.map(x=>x.k==k?r:x);render();syncAlarms()}
const shown=new Set();
setInterval(()=>{try{if(LN()||alertsOn||!("Notification" in window)||Notification.permission!="granted")return; // page-open fallback when push is off
 db.rem.filter(r=>!r.done&&!shown.has(r.k)&&new Date(r.due)<=new Date()&&new Date(r.due)>new Date(Date.now()-864e5)).forEach(r=>{shown.add(r.k);swReg().then(reg=>reg?reg.showNotification("⏰ Reminder",{body:r.t,tag:r.k,data:{url:remUrl(r)}}):new Notification("⏰ Reminder",{body:r.t,tag:r.k}))})}catch(e){}},30000);
// ---- install as an app (PWA) -----------------------------------------------------
let installPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;if(view=="more"&&!st().s)render()});
window.addEventListener("appinstalled",()=>{installPrompt=null;toast("Property Tracker is installed");if(view=="more"&&!st().s)render()});
const isInstalled=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true||!!LN();
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent);
async function installApp(){if(!installPrompt)return;installPrompt.prompt();const r=await installPrompt.userChoice.catch(()=>({}));installPrompt=null;if(r.outcome!="accepted")toast("Install cancelled");render()}
function installCard(){if(isInstalled())return "";
 let body;
 if(installPrompt)body=`<div>Install Property Tracker on this device. It opens full screen with its own icon, like a regular app.</div><button class="btn p" style="margin-top:10px;width:100%" onclick="installApp()">${ic("download",18)} Install app</button>`;
 else if(!window.isSecureContext)body=`<div>Installing needs a secure page. This one is opened over <b>http://${esc(location.host)}</b>, so the browser only offers a shortcut.</div>
  <ol class="steps"><li><b>Android app (APK)</b>: works on a local http:// address, with GPS and alarms.</li><li>Open the site over <b>https://</b> (for example Frappe Cloud or your own domain).</li><li>For testing in Chrome: open <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>, add <code>${esc(location.origin)}</code>, relaunch, then come back here.</li></ol>
  <div class="mut">Meanwhile, Chrome's menu → <b>Add to Home screen → Create shortcut</b> puts an icon on your home screen (it opens in Chrome).</div>`;
 else if(isIOS())body=`<div>In Safari, tap <b>Share</b> → <b>Add to Home Screen</b>.</div>`;
 else body=`<div>Use the browser menu → <b>Install app</b> (or <b>Add to Home screen</b>). If you don't see it, reload this page once.</div>`;
 return `<h2>Install app</h2><section class="card">${body}</section>`}
function more(){const thm=getTheme(),p=prof,mine=db.props.filter(x=>x.by==p.user).length,openRem=db.rem.filter(r=>!r.done).length;
 return head("Account")+`<section class="card"><div class="profile">${avatar(64)}<div style="min-width:0"><h3 class="ell">${esc(p.full_name||"…")}</h3><div class="mut ell">${esc(p.email||"")}</div><div class="roles">${(p.roles||[]).map(r=>`<span class="role">${esc(r)}</span>`).join("")}</div></div></div>
 <div class="pstats"><div><b>${p.added??mine}</b><span>Added by you</span></div><div><b>${db.props.length}</b><span>All properties</span></div><div><b>${openRem}</b><span>Open reminders</span></div></div>
 <div class="mut" style="margin-top:12px">${p.last_login?`Last sign-in ${dt(p.last_login)}`:""}${p.member_since?` · Member since ${new Date(p.member_since).toLocaleDateString([],{month:"short",year:"numeric"})}`:""}</div>
 <div class="list" style="margin-top:8px">${p.desk?`<a href="/app/property">${ic("ext",18)} Open in Desk</a><a href="/app/user/${encodeURIComponent(p.user||"")}">${ic("gear",18)} Profile & password</a>`:`<a href="/update-password">${ic("gear",18)} Change password</a>`}<button class="d" onclick="logout()">${ic("logout",18)} Log out</button></div></section>
 ${installCard()}
 <h2>Appearance</h2><div class="seg" role="group" aria-label="Theme"><button class="${thm=='light'?'on':''}" onclick="setTheme('light')">${ic("sun",16)} Light</button><button class="${thm=='dark'?'on':''}" onclick="setTheme('dark')">${ic("moon",16)} Dark</button><button class="${thm=='auto'?'on':''}" onclick="setTheme('auto')">${ic("monitor",16)} System</button></div>
 <h2>Data</h2><section class="card"><div class="mut">${ic("info",14)} ${esc(sync)}. Data is stored on your Frappe site and shared with your team.</div>
 <div class="list" style="margin-top:6px"><button onclick="load()">${ic("refresh",18)} Refresh</button><button onclick="csv()">${ic("download",18)} Export CSV (Excel)</button><button onclick="bak()">${ic("download",18)} Backup JSON</button><label>${ic("upload",18)} Import backup<input type="file" accept=".json" hidden onchange="rest(this)"></label></div></section>
 <h2>Status colours</h2><div class="card" style="display:flex;gap:6px;flex-wrap:wrap">${ST.map(pill).join("")}</div>`}
async function logout(){if(!confirm("Log out of Property Tracker?"))return;try{await fetch("/api/method/logout",{method:"POST",credentials:"same-origin",headers:{"X-Frappe-CSRF-Token":window.csrf_token||""}})}catch(e){}location.href="/login?redirect-to=/property-tracker"}
function setTheme(t){try{localStorage.setItem("theme",t)}catch(e){}if(t==="auto")document.documentElement.removeAttribute("data-theme");else document.documentElement.setAttribute("data-theme",t);render()}
function dl(n,t,m){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click()}
function bak(){dl("backup.json",JSON.stringify(db),"application/json")}
function rest(i){const f=i.files[0];if(!f)return;i.value="";f.text().then(async t=>{let d;try{d=JSON.parse(t)}catch(e){return alert("Invalid file")}
 if(!confirm(`Import ${(d.props||[]).length} properties and ${(d.rem||[]).length} reminders as new records?`))return;
 const r=await api("import_backup",{data:d});toast(`Imported ${r.properties} properties and ${r.reminders} reminders`);load()})}
function csv(){const h=["ID","Name","Type","Address / Landmark","Locality","District","Status","Area","Unit","Length (ft)","Width (ft)","Road width (ft)","Facing","Owner","Phone","Price","PriceUnit","TotalPrice","PerCent","PerSqft","Lat","Lng","Map","Notes"];
 const r=db.props.map(p=>[p.id,p.name,p.type,p.addr,p.locality,p.district,p.status,p.area,p.unit,p.len,p.wid,p.road,p.facing,p.owner,p.phone,p.price,p.punit,Math.round(total(p)),Math.round(pc(p)),Math.round(psf(p)),p.lat,p.lng,gm(p),p.notes]);
 dl("properties.csv","﻿"+[h,...r].map(a=>a.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n"),"text/csv")}
function compare(){if(cmp.length<2)return alert("Select 2–5 properties");openS({t:"c"})}
function drawCompare(){const ps=cmp.map(P).filter(Boolean);
 const rows=[["Name",p=>p.name],["Address / Landmark",p=>p.addr],["Location",p=>p.locality],["Type",p=>p.type],["Area",p=>areaTxt(p)],["Length (ft)",p=>p.len],["Width (ft)",p=>p.wid],["Road width (ft)",p=>p.road],["Facing",p=>p.facing],["Price",p=>inr(total(p))],["Per cent",p=>inr(pc(p))],["Per sq.ft",p=>inr(psf(p))],["Owner",p=>p.owner],["Rating",p=>p.rating?"★".repeat(p.rating):""],["Status",p=>p.status],["Notes",p=>p.notes]];
 sheet(sheetHead("Compare",`${ps.length} properties`)+`<div class="scroll"><table><tr><th></th>${ps.map(p=>`<th>${p.id}</th>`).join("")}</tr>${rows.map(([l,f])=>{const v=ps.map(f),d=new Set(v.map(String)).size>1;return `<tr><td>${l}</td>${v.map(x=>`<td class="${d?"diff":""}">${esc(x)}</td>`).join("")}</tr>`}).join("")}</table></div><p class="mut">Highlighted rows differ between properties.</p>`)}
function sheet(h){$("sh").innerHTML=`<div class="sheet"><div class="in">${h}</div></div>`}
let draft;
function propForm(p){p=p||{};const V=k=>esc(p[k]??"");
 return `<section class="card fs"><h3>${ic("pin",18)} Location</h3>
 <div id="gps" class="gps mut">${p.id?`Saved: ${p.lat||"—"}, ${p.lng||"—"}`:"Getting GPS…"}</div>
 <div class="pmapwrap"><div id="pmap" class="pmap"></div></div><div class="mut" style="margin:6px 0 2px">Drag the pin or tap the map to adjust the position.</div>${layerSeg()}
 <div class="row"><div><label for="lat">Latitude</label><input id="lat" type="number" step="any" inputmode="decimal" value="${V("lat")}" oninput="stopGps();pickFromInputs()"></div><div><label for="lng">Longitude</label><input id="lng" type="number" step="any" inputmode="decimal" value="${V("lng")}" oninput="stopGps();pickFromInputs()"></div></div>
 <button class="btn sm" type="button" style="margin-top:10px" onclick="gps()">${ic("gps",16)} ${p.id?"Capture GPS here":"Recapture GPS"}</button>
 <label for="addr">Address / Landmark</label><textarea id="addr" rows="2" placeholder="Door no., street, near temple / school / bus stop…">${V("addr")}</textarea>
 <div class="row"><div><label for="loc">Locality / village</label><input id="loc" value="${V("locality")}"></div><div><label for="dist">District</label><input id="dist" value="${V("district")}"></div></div></section>
 <section class="card fs"><h3>${ic("home",18)} Basics</h3><label for="stitle">Site title / name</label><input id="stitle" value="${V("name")}" placeholder="e.g. Anna Nagar corner plot"><label for="type">Property type</label><select id="type">${opts(TYPES,p.type)}</select></section>
 <section class="card fs"><h3>${ic("camera",18)} Photos</h3><div id="pv" class="ph2"></div></section>
 <section class="card fs"><h3>${ic("ruler",18)} Size</h3>
 <div class="row"><div><label for="len">Length (ft)</label><input id="len" type="number" step="any" inputmode="decimal" value="${V("len")}" oninput="sizeHint()"></div><div><label for="wid">Width (ft)</label><input id="wid" type="number" step="any" inputmode="decimal" value="${V("wid")}" oninput="sizeHint()"></div><div><label for="road">Road width (ft)</label><input id="road" type="number" step="any" inputmode="decimal" value="${V("road")}"></div></div>
 <div class="row"><div><label for="area">Area</label><input id="area" type="number" step="any" inputmode="decimal" value="${V("area")}" placeholder="Auto from L × W" oninput="sizeHint()"></div><div><label for="unit">Unit</label><select id="unit" onchange="sizeHint()">${opts(Object.keys(U),p.unit||"Sq.ft")}</select></div></div>
 <div id="szh" class="hint"></div>
 <label for="face">Facing</label><select id="face"><option value="">—</option>${opts(FACES,p.facing)}</select></section>
 <section class="card fs"><h3>${ic("user",18)} Owner</h3><div class="row"><div><label for="own">Owner name</label><input id="own" value="${V("owner")}" autocomplete="off"></div><div><label for="tel">Phone</label><input id="tel" type="tel" inputmode="tel" value="${V("phone")}"></div></div></section>
 <section class="card fs"><h3>${ic("rupee",18)} Price</h3><div class="row"><div><label for="pr">Expected price (₹)</label><input id="pr" type="number" step="any" inputmode="decimal" value="${V("price")}" oninput="sizeHint()"></div><div><label for="pu">Price unit</label><select id="pu" onchange="sizeHint()">${opts(PUNITS,p.punit||"Total")}</select></div></div></section>
 <section class="card fs"><h3>${ic("note",18)} Notes</h3><textarea id="nt" rows="3" placeholder="Water, EB, approvals, neighbourhood…">${V("notes")}</textarea></section>`}
function formVals(){const v=i=>(($(i)||{}).value||"").trim();return {name:v("stitle"),type:v("type"),addr:v("addr"),locality:v("loc"),district:v("dist"),lat:v("lat"),lng:v("lng"),area:v("area"),unit:v("unit"),len:v("len"),wid:v("wid"),road:v("road"),facing:v("face"),owner:v("own"),phone:v("tel"),price:v("pr"),punit:v("pu"),notes:v("nt"),photos:draft.photos}}
// Live summary: area from length × width (feet), conversions and the total price.
function sizeHint(){const e=$("szh");if(!e)return;const f=formVals(),x={...f,len:+f.len||0,wid:+f.wid||0,price:+f.price||0};
 const auto=!(+f.area)&&x.len&&x.wid;x.area=+f.area||(auto?x.len*x.wid/(U[f.unit]||1):0);const s=sqft(x);
 e.innerHTML=s?`${auto?`${fmt(x.len)} × ${fmt(x.wid)} ft = `:""}<b>${fmt(Math.round(s))} sq.ft</b> · ${fmt(s/435.6)} cent${s>=43560?` · ${fmt(s/43560)} acre`:""}${total(x)?` · total <b>${inr(total(x))}</b>`:""}`:""}
function drawPh(){const e=$("pv");if(!e)return;e.innerHTML=draft.photos.map((x,i)=>`<div class="phw"><img src="${esc(x.d)}" alt=""><button type="button" class="phx" onclick="rmPh(${i})" aria-label="Remove photo">×</button></div>`).join("")+`<label class="addph">${ic("camera",24)}<span>Add photo</span><input id="ph" type="file" accept="image/*" capture="environment" multiple hidden onchange="photos(this)"></label>`}
function rmPh(i){draft.photos.splice(i,1);drawPh()}
function edit(){openS({t:"a"})}
function drawAdd(){draft={photos:[],lat:"",lng:""};
 sheet(sheetHead("Add property","GPS is captured automatically")+propForm()+`<div class="savebar"><button class="btn" onclick="closeS()">Cancel</button><button class="btn p" onclick="saveP()">Save property</button></div>`);drawPh();sizeHint();pickMap();gps()}
function photos(i){[...i.files].forEach(f=>{const im=new Image(),u=URL.createObjectURL(f);im.onload=()=>{const s=Math.min(1,800/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=im.width*s;c.height=im.height*s;c.getContext("2d").drawImage(im,0,0,c.width,c.height);draft.photos.push({d:c.toDataURL("image/jpeg",.6),at:f.lastModified?new Date(f.lastModified).toISOString():now()});URL.revokeObjectURL(u);drawPh()};im.src=u})}
async function saveP(){if(busy)return;stopGps();put(await api("save_property",{data:{...formVals(),status:"Visited"}}));toast("Property saved");closeS()}
function editP(id){if(P(id))openS({t:"e",id})}
function drawEdit(id){const p=P(id);if(!p)return;draft={photos:[...p.photos],lat:p.lat,lng:p.lng};
 sheet(sheetHead(`Edit ${p.id}`,esc(p.name||""))+propForm(p)+`<div class="savebar"><button class="btn" onclick="history.back()">Cancel</button><button class="btn p" onclick="saveEdit('${id}')">Save changes</button></div>`);drawPh();sizeHint();pickMap()}
async function saveEdit(id){if(busy||!P(id))return;stopGps();put(await api("save_property",{name:id,data:formVals()}));toast("Changes saved");history.back()}
function detail(id){if(P(id))openS({t:"d",id})}
function drawDetail(id){const p=P(id);if(!p)return;const ph=p.photos||[];
 const fact=(l,v,s="")=>`<div><span>${l}</span><b>${v||"—"}</b>${s?`<small>${s}</small>`:""}</div>`;
 const act=(icn,l,on)=>`<button class="act" onclick="${on}">${ic(icn)}${l}</button>`;
 sheet(sheetHead(`<span class="pid">${p.id}</span> ${esc(p.name||"")}`,esc([p.type,p.locality].filter(Boolean).join(" · ")),`<button class="iconbtn" onclick="editP('${id}')" aria-label="Edit">${ic("edit")}</button>`)
 +(ph.length?`<div class="gallery">${ph.map(x=>`<img class="${ph.length==1?"one":""}" src="${esc(x.d)}" alt="" loading="lazy">`).join("")}</div>`:`<div class="hero-ph">${ic("image",40)}</div>`)
 +`<div class="meta">${pill(p.status)}<span class="mut">Added ${dt(p.created)}</span>${p.rating?`<span class="mut">· ${"★".repeat(p.rating)}</span>`:""}</div>
 ${p.addr?`<div class="addr">${ic("pin",16)}<span>${esc(p.addr)}${p.locality?`, ${esc(p.locality)}`:""}${p.district?`, ${esc(p.district)}`:""}</span></div>`:""}
 <div class="actions">${p.lat?act("map","Maps",`window.open('${gm(p)}','_blank')`)+act("user","Street View",`window.open('${svUrl(p)}','_blank')`)+act("go","Navigate",`window.open('https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}','_blank')`):""}${p.phone?act("phone","Call",`window.location.href='tel:${esc(p.phone)}'`)+act("chat","WhatsApp",`window.open('https://wa.me/${esc(p.phone.replace(/\D/g,""))}','_blank')`):""}${act("share","Share",`share('${id}')`)}${p.lat?act("copy","Copy pin",`navigator.clipboard&&navigator.clipboard.writeText(gm(P('${id}'))).then(()=>toast('Location copied'))`):""}</div>
 ${p.lat?`<div class="card mapcard minimap"><div id="dmap"></div></div>${layerSeg()}`:""}
 <div class="facts" style="margin-top:12px">${fact("Area",areaTxt(p),sqft(p)?`${fmt(Math.round(sqft(p)))} sq.ft · ${fmt(sqft(p)/435.6)} cent`:"")}${fact("Length × width",dims(p))}${fact("Road width",p.road?`${fmt(p.road)} ft`:"")}${fact("Facing",esc(p.facing))}${fact("Price",inr(total(p)),p.price&&p.punit!="Total"?`${inr(p.price)} ${p.punit.toLowerCase()}`:"")}${fact("Per cent",inr(pc(p)),psf(p)?`${inr(psf(p))} per sq.ft`:"")}</div>
 ${p.owner||p.phone?`<h2>Owner</h2><div class="card"><b>${esc(p.owner||"—")}</b>${p.phone?` <span class="mut">· ${esc(p.phone)}</span>`:""}</div>`:""}
 ${p.notes?`<h2>Notes</h2><div class="card" style="white-space:pre-wrap">${esc(p.notes)}</div>`:""}
 <h2>Deal</h2><section class="card"><div class="row"><div><label for="neg">Negotiated total (₹)</label><input id="neg" type="number" inputmode="decimal" value="${p.neg||""}"></div><div><label for="rt2">Rating</label><select id="rt2"><option value="">—</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${p.rating==n?"selected":""}>${"★".repeat(n)}</option>`).join("")}</select></div></div><button class="btn" style="margin-top:10px" onclick="deal('${id}')">Save deal</button></section>
 <h2>Status</h2><section class="card"><div class="row"><select id="ns" aria-label="New status">${opts(ST,p.status)}</select><button class="btn p" style="flex:none" onclick="setS('${id}')">Update</button></div><input id="sn" placeholder="Note (optional)" style="margin-top:8px">
 <ul class="tl">${[...p.history].reverse().map(h=>`<li><time>${dt(h.at)}</time>${h.from?`${esc(h.from)} → `:""}<b>${esc(h.to)}</b>${h.note?` · ${esc(h.note)}`:""}</li>`).join("")}</ul></section>
 <h2>Visits (${p.visits.length})</h2><section class="card"><textarea id="vn" rows="2" placeholder="What was discussed, new price, follow-up…"></textarea><button class="btn" style="margin-top:8px" onclick="visit('${id}')">${ic("plus",16)} Log visit</button>
 ${p.visits.length?`<ul class="tl">${[...p.visits].reverse().map(v=>`<li><time>${dt(v.at)}</time>${esc(v.note)}</li>`).join("")}</ul>`:""}</section>
 <div class="danger"><button class="btn" onclick="editP('${id}')">${ic("edit",16)} Edit details</button><button class="btn d" onclick="delP('${id}')">${ic("trash",16)} Delete</button></div>`);setTimeout(()=>miniMap(p),0)}
async function setS(id){const p=P(id),to=$("ns").value;if(to!=p.status)put(await api("set_status",{name:id,status:to,note:$("sn").value}));redraw()}
async function deal(id){put(await api("update_deal",{name:id,negotiated_price:$("neg").value,rating:$("rt2").value}));redraw()}
async function delP(id){if(!confirm(`Delete ${id}?`))return;await api("delete_property",{name:id});db.props=db.props.filter(x=>x.id!=id);db.rem.forEach(r=>{if(r.p==id)r.p=""});cmp=cmp.filter(x=>x!=id);closeS()}
async function visit(id){const n=$("vn").value.trim();if(!n)return;put(await api("log_visit",{name:id,note:n}));redraw()}
function share(id){const p=P(id),t=`${p.name?p.name+" ("+p.id+")":p.id} · ${p.type}${p.locality?" · "+p.locality:""}${p.addr?"\n"+p.addr:""}\n${[areaTxt(p),dims(p),p.road?"road "+fmt(p.road)+" ft":"",p.facing?p.facing+" facing":""].filter(Boolean).join(", ")||"—"}\nPrice ${inr(total(p))} · ${p.status}${p.lat?"\n"+gm(p):""}${p.notes?"\n"+p.notes:""}`;navigator.share?navigator.share({text:t}).catch(()=>{}):navigator.clipboard?.writeText(t).then(()=>toast("Summary copied (owner details excluded)"))}
history.replaceState({v:"home",d:0},"",location.pathname);render();load();
