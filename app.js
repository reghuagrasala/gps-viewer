const $=id=>document.getElementById(id);
let lastPosition=null,weatherTimer=null,addressTimer=null,lastNetworkLookup=0,gpsWatchId=null,gpsEnabled=true,dataEnabled=true,currentTab="location",latestPlaces=[];
const API_BASE=(window.GPS_VIEWER_CONFIG&&window.GPS_VIEWER_CONFIG.apiBase)||"https://my-location-here.hrcvb7p7r5.workers.dev";
const API_BASES=Array.from(new Set(((window.GPS_VIEWER_CONFIG&&window.GPS_VIEWER_CONFIG.apiBases)||[API_BASE,"https://small-sky-cec5.hrcvb7p7r5.workers.dev"]).filter(Boolean)));
const WEATHER_REFRESH_MS=10*60*1000,LOOKUP_COOLDOWN_MS=15000,MIN_MOVE_FOR_LOOKUP_M=60;
const lastAddressKey="gpsViewer.lastAddress",lastPlaceKey="gpsViewer.lastPlace";
function setGPSState(kind,text){const e=$("gpsStatus");e.classList.remove("warn","off","weak");if(kind)e.classList.add(kind);e.querySelector("b").textContent=text}
function setDataState(s){const e=$("dataStatus"),strong=s==="strong"||s===true,weak=s==="weak";e.classList.remove("off","weak");if(weak)e.classList.add("weak");if(!strong&&!weak)e.classList.add("off");e.querySelector("b").textContent=strong?"DATA ON":weak?"DATA WEAK":"DATA OFF";e.querySelector(".status-dot").style.background=strong?"#16ad4b":weak?"#e0a600":"#858a94"}
function formatNum(n,d=6){return Number(n).toFixed(d)}
function kmh(x){return Number.isFinite(x)?x*3.6:0}
function compass(d){return Number.isFinite(d)?["N","NE","E","SE","S","SW","W","NW"][Math.round(d/45)%8]:""}
function saveLocal(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function loadLocal(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
function apiUrl(path,p){const u=new URL(API_BASE.replace(/\/$/,"")+path);Object.entries(p||{}).forEach(([k,v])=>u.searchParams.set(k,v));u.searchParams.set("_",Date.now());return u}
async function fetchJSON(url,timeout=12000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{cache:"no-store",signal:c.signal,headers:{Accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(t)}}
function blink(id,t){const e=$(id);if(e){e.textContent=t;e.classList.add("loading-blink")}}
function stopBlink(id){$(id)?.classList.remove("loading-blink")}
function localDateTime(){const d=new Date();$("weatherDate").textContent=d.toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"2-digit"});$("weatherTime").textContent=d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})}
function setTimezone(){const z=Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Kolkata";$("timezone").textContent=z==="Asia/Kolkata"?"Kolkata GMT+5:30":z.replace("Asia/","")}
function distance(a,b){const R=6371000,r=Math.PI/180,d1=(b.coords.latitude-a.coords.latitude)*r,d2=(b.coords.longitude-a.coords.longitude)*r,x=Math.sin(d1/2)**2+Math.cos(a.coords.latitude*r)*Math.cos(b.coords.latitude*r)*Math.sin(d2/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function findAddress(d){return d?.address||d?.location?.address||d?.result?.address||d?.reverse?.address||d?.data?.address||(d?.postalCode||d?.road||d?.label?d:{})}
function findPrimary(d){return d?.primaryLocation||d?.primaryPlace||d?.place||d?.location?.place||d?.result?.primaryLocation||d?.data?.primaryLocation||{}}
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function setPostOfficeDisplay(name,pin=""){const e=$("postOffice");if(!e)return;const n=String(name||"").replace(/\s*\(?\d{6}\)?\s*$/g,"").trim(),p6=String(pin||"").match(/\d{6}/)?.[0]||String(name||"").match(/\d{6}/)?.[0]||"";if(!n){e.textContent=p6?`PIN ${p6}`:"—";return}e.innerHTML=`<span class="po-pin">${p6}</span><span class="po-name">${escapeHTML(n)}</span>`;e.title=p6?`${p6} ${n}`:n}
async function fetchPostOffice(pin){const p=String(pin||"").match(/\d{6}/)?.[0];if(!p)return;const k="gpsViewer.postOffice."+p,cached=loadLocal(k);if(cached?.name){setPostOfficeDisplay(cached.name,cached.pin||p);return}setPostOfficeDisplay("Finding post office…",p);if(!navigator.onLine||!dataEnabled)return;try{const j=await fetchJSON(`https://api.postalpincode.in/pincode/${p}`,10000),rows=Array.isArray(j)&&Array.isArray(j[0]?.PostOffice)?j[0].PostOffice:[];const x=rows.find(v=>String(v?.BranchType||"").toLowerCase().includes("sub office"))||rows[0];if(x?.Name){setPostOfficeDisplay(x.Name,p);saveLocal(k,{name:x.Name,pin:p})}else setPostOfficeDisplay("Not available",p)}catch(e){setPostOfficeDisplay("Not available",p)}}
function placeEmoji(t=""){t=String(t).toLowerCase();if(t.includes("hospital")||t.includes("clinic"))return "🏥";if(t.includes("school")||t.includes("university"))return "🏫";if(t.includes("park"))return "🌳";if(t.includes("hotel"))return "🏨";if(t.includes("station"))return "🚉";if(t.includes("airport"))return "✈️";if(t.includes("temple")||t.includes("church")||t.includes("mosque"))return "🏛️";return "⌖"}
function renderPlace(d,source="LIVE"){stopBlink("addressLine2");stopBlink("addressLine3");const a=findAddress(d),p=findPrimary(d),label=String(a.label||d.label||d.displayName||"").trim();const placeLabel=String(d.currentPlace||p.name||label||"Location identified").trim();$("placeName").textContent=placeLabel;$("placeIcon").textContent=p.name?placeEmoji(p.type||p.category):"⌖";const road=String(d.road||a.road||a.street||a.streetName||"").trim(),house=String(d.houseNumber||a.houseNumber||a.house||"").trim(),district=String(d.district||a.district||"").trim(),county=String(d.county||a.county||"").trim(),city=String(d.city||a.city||d.town||a.town||"").trim(),state=String(d.state||a.state||d.stateName||a.stateName||"").trim(),pin=String(d.postalCode||a.postalCode||a.postcode||a.postal_code||"").trim();let l2=[house,road].filter(Boolean).join(" ").trim();if(!l2&&label){const f=label.split(",")[0]?.trim();if(f&&f!==placeLabel)l2=f}const locality=d.locality||d.neighbourhood||d.neighborhood||a.locality||a.neighbourhood||a.neighborhood||"";let l3=[locality,district,county,city,state].map(x=>String(x||"").trim()).filter((x,i,arr)=>x&&arr.indexOf(x)===i).join(", ");if(pin)l3=l3?`${l3} - ${pin}`:pin;$("addressLine2").textContent=l2;$("addressLine3").textContent=l3||label;const po=d.postOffice||d.postOfficeName||a.postOffice||a.postOfficeName||"";setPostOfficeDisplay(po,pin);saveLocal(lastAddressKey,{...a,road,houseNumber:house,district,county,city,state,postalCode:pin,line2:l2,line3:l3,label});saveLocal(lastPlaceKey,{primaryLocation:p,address:a,currentPlace:d.currentPlace||"",label:d.label||label});if(pin)fetchPostOffice(pin);$("footerNote").textContent=source==="LIVE"?"Location and weather updated automatically":"Offline cache: last available location/weather"}
function loadLastAddress(){const a=loadLocal(lastAddressKey),p=loadLocal(lastPlaceKey);if(!a)return;$("placeName").textContent=p?.currentPlace||p?.primaryLocation?.name||a.label||"Last known location";$("addressLine2").textContent=a.line2||a.street||"";$("addressLine3").textContent=a.line3||"";const pin=a.postalCode||a.postcode||"",po=loadLocal(pin?"gpsViewer.postOffice."+pin:"");setPostOfficeDisplay(po?.name||"",po?.pin||pin)}
async function reverseGeocodeMapbox(lat,lon){
  const token=String(window.GPS_VIEWER_CONFIG?.mapboxAccessToken||"").trim();
  if(!token||!navigator.onLine)return null;
  try{
    const u=new URL("https://api.mapbox.com/search/geocode/v6/reverse");
    u.searchParams.set("longitude",lon);
    u.searchParams.set("latitude",lat);
    u.searchParams.set("country","IN");
    u.searchParams.set("language","en");
    u.searchParams.set("types","address,street,place,locality,neighborhood,district,postcode");
    u.searchParams.set("access_token",token);
    const j=await fetchJSON(u,10000);
    const f=Array.isArray(j?.features)?j.features.find(x=>x?.properties?.full_address||x?.properties?.place_formatted||x?.place_name):null;
    if(!f)return null;
    const p=f.properties||{},ctx=p.context||{};
    const get=(...keys)=>{for(const k of keys){const v=ctx?.[k]?.name??ctx?.[k]?.text??ctx?.[k];if(v)return String(v)}return ""};
    const addressNumber=p.address_number||p.context?.address?.address_number||"";
    const street=p.street||p.context?.street?.name||"";
    const place=p.place_formatted||"";
    const city=get("place","locality","district");
    const district=get("district");
    const state=get("region");
    const pin=get("postcode");
    const country=get("country")||"India";
    const locality=get("locality","neighborhood");
    const label=p.full_address||f.place_name||place||[street,city,state].filter(Boolean).join(", ");
    return {
      address:{label,address_number:addressNumber,houseNumber:addressNumber,road:street,street,city,district,state,postalCode:pin,locality,neighborhood:locality,country},
      label,
      houseNumber:addressNumber,
      road:street,
      city,
      district,
      state,
      postalCode:pin,
      locality,
      country,
      currentPlace:city||locality||p.name||label,
      source:"MAPBOX"
    };
  }catch(e){return null}
}

function reverseGeocode(lat,lon){
  if(!navigator.onLine)return false;
  const now=Date.now();
  if(now-lastNetworkLookup<LOOKUP_COOLDOWN_MS)return false;
  lastNetworkLookup=now;
  blink("addressLine2","Fetching location…");
  blink("addressLine3","Please wait…");
  setDataState("weak");
  try{
    let j=null;
    for(const base of API_BASES){
      try{
        const u=new URL(base.replace(/\/$/,"")+"/api/reverse");
        u.searchParams.set("lat",lat);u.searchParams.set("lon",lon);u.searchParams.set("_",Date.now());
        const candidate=await fetchJSON(u,8000);
        if(candidate&&!candidate.error){j=candidate;break}
      }catch(e){}
    }
    if(j){
      latestPlaces=Array.isArray(j.places)?j.places:(Array.isArray(j.nearbyPlaces)?j.nearbyPlaces:[]);
      renderPlace(j);
      await gvPut("address",lat,lon,j);
      setDataState("strong");
      return true;
    }
    throw Error("Location unavailable");
  }catch(e){
    // HERE is the primary geocoder. If the Worker/HERE service fails (including
    // integration/rate-limit errors), use Mapbox directly from the browser.
    const mb=await reverseGeocodeMapbox(lat,lon);
    if(mb){
      latestPlaces=[];
      renderPlace(mb,"MAPBOX");
      await gvPut("address",lat,lon,mb);
      setDataState("strong");
      return true;
    }
    const c=await gvGetNearby("address",lat,lon,250);
    if(c){renderPlace(c.data,"CACHE");setDataState("weak");return true}
    $("addressLine2").textContent="Location result not fetched";
    $("addressLine3").textContent="Data service unavailable";
    stopBlink("addressLine2");stopBlink("addressLine3");setDataState("weak");
    return false;
  }
}
const weatherMap={0:["Clear sky","☀️"],1:["Mainly clear","🌤️"],2:["Partly cloudy","⛅"],3:["Overcast","☁️"],45:["Fog","🌫️"],48:["Rime fog","🌫️"],51:["Light drizzle","🌦️"],53:["Drizzle","🌦️"],55:["Heavy drizzle","🌧️"],61:["Light rain","🌦️"],63:["Rain","🌧️"],65:["Heavy rain","🌧️"],71:["Light snow","🌨️"],73:["Snow","🌨️"],75:["Heavy snow","❄️"],80:["Rain showers","🌦️"],81:["Rain showers","🌧️"],82:["Heavy showers","⛈️"],95:["Thunderstorm","⛈️"],96:["Thunderstorm + hail","⛈️"],99:["Thunderstorm + hail","⛈️"]};
function renderWeather(c,j,source="LIVE"){const [label,icon]=weatherMap[c.weather_code]||["Unknown","☁️"];$('temperature').textContent=Math.round(c.temperature_2m??0)+"°";$('temperaturePosition').textContent=Math.round(c.temperature_2m??0)+" °C";$('humidity').textContent=c.relative_humidity_2m!=null?Math.round(c.relative_humidity_2m)+"%":"—";$('feels').textContent=Math.round(c.apparent_temperature??0)+"°";$('wind').textContent=`${Math.round(c.wind_speed_10m??0)} km/h ${compass(c.wind_direction_10m)}`;$('gusts').textContent=Math.round(c.wind_gusts_10m??0)+" km/h";$('clouds').textContent=Math.round(c.cloud_cover??0)+"%";$('visibility').textContent=Number.isFinite(Number(c.visibility))?(Number(c.visibility)/1000).toFixed(1)+" km":"—";let uv="—";if(Array.isArray(j?.hourly?.time)&&Array.isArray(j?.hourly?.uv_index)&&c.time){let best=0,min=Infinity,target=new Date(c.time).getTime();j.hourly.time.forEach((t,i)=>{const d=Math.abs(new Date(t).getTime()-target);if(d<min){min=d;best=i}});if(j.hourly.uv_index[best]!=null)uv=Math.round(j.hourly.uv_index[best])}if(c.uv_index!=null)uv=Math.round(c.uv_index);$('uv').textContent=uv;$('condition').textContent=label;$('weatherIcon').textContent=icon;stopBlink("condition");localDateTime();$('footerNote').textContent=source==="LIVE"?"Location and weather updated automatically":"Offline cache: last available location/weather"}
async function fetchWeather(lat,lon,force=false){if(!navigator.onLine){const c=await gvGetNearby("weather",lat,lon,1000);if(c)renderWeather(c.data.current,c.data,"CACHE");return}if(weatherTimer&&!force)return;weatherTimer=setTimeout(()=>weatherTimer=null,WEATHER_REFRESH_MS);try{let j;try{j=await fetchJSON(apiUrl("/api/weather",{lat,lon}))}catch(e){}if(!j?.current){const u=new URL("https://api.open-meteo.com/v1/forecast");u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);u.searchParams.set("current","temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,visibility,uv_index");u.searchParams.set("hourly","uv_index,visibility");u.searchParams.set("timezone","auto");j=await fetchJSON(u)}renderWeather(j.current,j);await gvPut("weather",lat,lon,j);setDataState("strong")}catch(e){const c=await gvGetNearby("weather",lat,lon,1000);if(c)renderWeather(c.data.current,c.data,"CACHE")}}
function updatePosition(pos){const old=lastPosition;lastPosition=pos;const c=pos.coords,lat=c.latitude,lon=c.longitude;$('lat').textContent=formatNum(lat)+"° N";$('lon').textContent=formatNum(lon)+"° E";if(Number.isFinite(c.altitude)){$('elevation').textContent=Math.round(c.altitude)+" m";saveLocal("gpsViewer.lastElevation",Math.round(c.altitude))}else{const e=loadLocal("gpsViewer.lastElevation");$('elevation').textContent=e!=null?e+" m (last known)":"Unavailable"}$('accuracy').textContent=Number.isFinite(c.accuracy)?Math.round(c.accuracy)+" m":"—";$('speed').textContent=kmh(c.speed).toFixed(1)+" km/h";$('heading').textContent=Number.isFinite(c.heading)&&c.heading>=0?Math.round(c.heading)+"° ("+compass(c.heading)+")":"—";$('movement').textContent=kmh(c.speed)>1.5?"In motion":"Stationary";setGPSState(Number.isFinite(c.accuracy)&&c.accuracy>100?"weak":"","GPS ON");try{$('digipin').textContent=formatDigiPin(getDigiPin(lat,lon))}catch(e){$('digipin').textContent="Outside India"}if(dataEnabled&&navigator.onLine&&(old==null||distance(old,pos)>=MIN_MOVE_FOR_LOOKUP_M)){clearTimeout(addressTimer);addressTimer=setTimeout(()=>reverseGeocode(lat,lon),500);fetchWeather(lat,lon)}}
function gpsError(e){setGPSState(e?.code===1?"off":"weak",e?.code===1?"GPS DENIED — allow Location":"GPS waiting…");$('footerNote').textContent=e?.code===1?"Allow Location for this site":"Waiting for GPS location"}
function startGPS(){if(!navigator.geolocation){setGPSState("off","GPS UNAVAILABLE");return}if(gpsWatchId!==null)navigator.geolocation.clearWatch(gpsWatchId);gpsEnabled=true;setGPSState("","GPS ON");navigator.geolocation.getCurrentPosition(updatePosition,gpsError,{enableHighAccuracy:true,maximumAge:0,timeout:15000});gpsWatchId=navigator.geolocation.watchPosition(updatePosition,gpsError,{enableHighAccuracy:true,maximumAge:2000,timeout:20000})}
function stopGPS(){if(gpsWatchId!==null)navigator.geolocation.clearWatch(gpsWatchId);gpsWatchId=null;gpsEnabled=false;setGPSState("off","GPS OFF")}
function toggleGPS(){gpsEnabled?stopGPS():startGPS()}
function toggleData(){dataEnabled=!dataEnabled;setDataState(dataEnabled&&navigator.onLine?"weak":"off");if(dataEnabled&&lastPosition&&navigator.onLine){reverseGeocode(lastPosition.coords.latitude,lastPosition.coords.longitude);fetchWeather(lastPosition.coords.latitude,lastPosition.coords.longitude,true)}}
const PLACE_CATEGORIES=["Accounting","Airport","Amusement park","Aquarium","Art gallery","ATM","Bakery","Bank","Bar","Beauty salon","Bicycle store","Book store","Bowling alley","Bus station","Cafe","Campground","Car dealer","Car rental","Car repair","Car wash","Cemetery","Church","City hall","Clothing store","Convenience store","Dentist","Department store","Doctor","Drugstore","Electrician","Electronics store","Fire station","Florist","Furniture store","Gas station","Gym","Hair care","Hardware store","Hindu temple","Hospital","Insurance agency","Jewelry store","Laundry","Lawyer","Library","Local government office","Locksmith","Lodging","Meal delivery","Meal takeaway","Mosque","Movie theater","Museum","Park","Parking","Pet store","Pharmacy","Physiotherapist","Plumber","Police","Post office","Primary school","Real estate agency","Restaurant","School","Shoe store","Shopping mall","Spa","Stadium","Store","Supermarket","Taxi stand","Train station","Travel agency","University","Veterinary care","Zoo"];
function rememberPlaces(q){try{sessionStorage.setItem("gpsViewer.returnTab","places");sessionStorage.setItem("gpsViewer.returnQuery",q||"")}catch(e){}}
function restorePlaces(){let t="",q="";try{t=sessionStorage.getItem("gpsViewer.returnTab")||"";q=sessionStorage.getItem("gpsViewer.returnQuery")||""}catch(e){}if(t!=="places")return;try{sessionStorage.removeItem("gpsViewer.returnTab");sessionStorage.removeItem("gpsViewer.returnQuery")}catch(e){}showTab("places");if(q&&$("placeSearchInput")){$("placeSearchInput").value=q;renderPlaceCategories(q)}}
function openNearbySearch(q){q=String(q||"").trim();const lat=lastPosition?.coords.latitude,lon=lastPosition?.coords.longitude;if(!q)return;if(lat==null||lon==null){$('placeSearchStatus').textContent="Waiting for GPS location…";return}rememberPlaces(q);window.location.assign(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q+" near "+lat+","+lon)}`)}
function renderPlacesScreen(c){const lat=lastPosition?.coords.latitude;c.innerHTML=`<div class="places-screen"><div class="map-title"><h2>PLACES</h2><span class="map-current">${lat!=null?"GPS position ready":"Waiting for GPS…"}</span></div><div class="search-box places-search"><input id="placeSearchInput" type="search" placeholder="Search categories or a custom place…"><button id="placeSearchBtn" type="button">Search</button></div><div id="placeSearchStatus" class="map-current" style="margin:0 3px 4px">Choose a category or search for any place.</div>${latestPlaces.length?`<div class="places-results"><div class="places-results-title">Nearby places from HERE</div>${placeListHTML(latestPlaces)}</div>`:""}<div id="placeCategoryList" class="places-category-list"></div></div>`;const i=$("placeSearchInput");$("placeSearchBtn").onclick=()=>{const q=i.value.trim();if(q){$("placeSearchStatus").textContent=`Opening search for “${q}”…`;openNearbySearch(q)}};i.addEventListener("keydown",e=>{if(e.key==="Enter")$("placeSearchBtn").click()});i.addEventListener("input",()=>renderPlaceCategories(i.value));renderPlaceCategories("")}
function renderPlaceCategories(filter=""){const b=$("placeCategoryList");if(!b)return;const q=String(filter).toLowerCase();const list=PLACE_CATEGORIES.filter(x=>x.toLowerCase().includes(q));b.innerHTML=list.map(x=>`<button class="places-category" type="button" data-q="${escapeHTML(x)}"><span class="cat-icon">•</span><span class="cat-name">${escapeHTML(x)}</span><span class="cat-arrow">›</span></button>`).join("")||'<div class="no-results">No category found. Use Search for a custom place.</div>';b.querySelectorAll(".places-category").forEach(x=>x.onclick=()=>openNearbySearch(x.dataset.q))}
function placeListHTML(places){return '<div class="place-list large">'+places.slice(0,20).map(x=>`<div class="places-result-card"><b>${escapeHTML(x.name||"Unnamed place")}</b><small>${escapeHTML(x.category||x.type||"Place")}${x.distanceM!=null?" • "+Math.round(x.distanceM)+" m":""}</small><button type="button" class="place-open-map" data-q="${escapeHTML(x.name||"")}">Open on map ›</button></div>`).join("")+"</div>"}
function showTab(tab){currentTab=tab;if(tab==="location"){closeFullScreen();return}const v=$("fullScreenView"),c=$("fullScreenContent");v.hidden=false;if(tab==="map"){const lat=lastPosition?.coords.latitude,lon=lastPosition?.coords.longitude;if(lat==null){c.innerHTML='<h2>MAP</h2><p>Waiting for GPS location…</p>';return}const bbox=`${lon-.008},${lat-.006},${lon+.008},${lat+.006}`;c.innerHTML=`<div class="map-title"><h2>MAP</h2><span class="map-current">Current GPS position</span></div><iframe class="fullscreen-map" title="OpenStreetMap" src="https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}"></iframe><div class="map-actions"><a target="_blank" rel="noopener" href="https://mappls.com/@${lat.toFixed(6)},${lon.toFixed(6)}">Mappls</a><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${lat},${lon}">Google Maps</a><a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}">OpenStreetMap</a></div>`}else renderPlacesScreen(c);if(tab==="places")c.querySelectorAll(".place-open-map").forEach(b=>b.onclick=()=>openNearbySearch(b.dataset.q))}
function closeFullScreen(){$("fullScreenView").hidden=true;currentTab="location";document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("active",b.dataset.tab==="location"))}
$("gpsStatus").onclick=toggleGPS;$("dataStatus").onclick=toggleData;document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");showTab(b.dataset.tab)});$("fullScreenBack").onclick=closeFullScreen;
window.addEventListener("pageshow",restorePlaces);window.addEventListener("focus",restorePlaces);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")restorePlaces()});window.addEventListener("online",()=>{setDataState("strong");if(lastPosition){reverseGeocode(lastPosition.coords.latitude,lastPosition.coords.longitude);fetchWeather(lastPosition.coords.latitude,lastPosition.coords.longitude,true)}});window.addEventListener("offline",()=>{setDataState("off");$("footerNote").textContent="Offline: GPS + DIGIPIN + cached results"});
setTimezone();localDateTime();loadLastAddress();setDataState(dataEnabled&&navigator.onLine?"strong":"off");startGPS();restorePlaces();setInterval(localDateTime,1000);if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
