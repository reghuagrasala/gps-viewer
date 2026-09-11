const $=id=>document.getElementById(id);
let lastPosition=null, weatherTimer=null, addressTimer=null, lastNetworkLookup=null;
let gpsWatchId=null, gpsEnabled=true, dataEnabled=true, currentTab="location", latestPlaces=[];
const lastAddressKey="gpsViewer.lastAddress";
const lastPlaceKey="gpsViewer.lastPlace";
const MIN_MOVE_FOR_LOOKUP_M=60;
const LOOKUP_COOLDOWN_MS=15000;
const WEATHER_REFRESH_MS=10*60*1000;
const API_BASE=(window.GPS_VIEWER_CONFIG&&window.GPS_VIEWER_CONFIG.apiBase)||"https://small-sky-cec5.hrcvb7p7r5.workers.dev";

function setGPSState(kind,text){const el=$("gpsStatus");el.classList.remove("warn","off","weak");if(kind)el.classList.add(kind);el.querySelector("b").textContent=text}
function setDataState(state){
  const el=$("dataStatus");el.classList.remove("off","weak");
  const strong=state==="strong"||state===true;
  const weak=state==="weak";
  if(weak)el.classList.add("weak");
  if(!strong&&!weak)el.classList.add("off");
  el.querySelector("b").textContent=strong?"DATA ON":weak?"DATA WEAK":"DATA OFF";
  el.querySelector(".status-dot").style.background=strong?"#16ad4b":weak?"#e0a600":"#858a94";
}
function formatNum(n,d=6){return Number(n).toFixed(d)}
function kmh(mps){return mps==null||!Number.isFinite(mps)?0:mps*3.6}
function quality(acc){if(!Number.isFinite(acc))return "—";if(acc<=10)return "STRONG";if(acc<=30)return "GOOD";if(acc<=100)return "WEAK";return "POOR"}
function updateGPSQuality(acc){const q=quality(acc);setGPSState((q==="WEAK"||q==="POOR")?"weak":"","GPS ON")}
function localDateTime(){const d=new Date();$("weatherDate").textContent=d.toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"2-digit"});$("weatherTime").textContent=d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})}
function setTimezone(){const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Kolkata";$("timezone").textContent=tz==="Asia/Kolkata"?"Kolkata GMT+5:30":tz.replace("Asia/","")}
function saveLocal(key,data){try{localStorage.setItem(key,JSON.stringify(data))}catch(e){}}
function loadLocal(key){try{return JSON.parse(localStorage.getItem(key))}catch(e){return null}}
function blink(id,text){const el=$(id);el.textContent=text;el.classList.add("loading-blink")}
function stopBlink(id){$(id)?.classList.remove("loading-blink")}
function apiUrl(path,params){const u=new URL(API_BASE.replace(/\/$/,"")+path);Object.entries(params||{}).forEach(([k,v])=>u.searchParams.set(k,v));u.searchParams.set("_",Date.now().toString());return u.toString()}
async function fetchJSON(url,timeout=15000){const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),timeout);try{const r=await fetch(url,{cache:"no-store",signal:ctl.signal,headers:{Accept:"application/json"}});if(!r.ok)throw new Error("HTTP "+r.status);const type=r.headers.get("content-type")||"";if(!type.includes("json"))throw new Error("Non-JSON response");return await r.json()}finally{clearTimeout(t)}}
function firstObject(...xs){return xs.find(x=>x&&typeof x==="object")||{}}
function normalizeAddress(d){
  return firstObject(
    d?.address,
    d?.location?.address,
    d?.result?.address,
    d?.reverse?.address,
    d?.data?.address
  )
}
function normalizePrimary(d){
  return firstObject(
    d?.primaryLocation,
    d?.primaryPlace,
    d?.place,
    d?.location?.place,
    d?.result?.primaryLocation,
    d?.data?.primaryLocation
  )
}
function findPostOfficeValue(d,a){
  const direct=[
    d?.postOffice,d?.postOfficeName,d?.postalOffice,d?.postalOfficeName,
    a?.postOffice,a?.postOfficeName,a?.postalOffice,a?.postalOfficeName,
    a?.postalName,a?.postalTown
  ].find(v=>typeof v==="string"&&v.trim());
  if(direct)return direct.trim();

  const pool=[
    ...(Array.isArray(d?.places)?d.places:[]),
    ...(Array.isArray(d?.nearbyPlaces)?d.nearbyPlaces:[]),
    ...(Array.isArray(d?.results)?d.results:[])
  ];
  const po=pool.find(x=>{
    const t=String(x?.type||x?.category||x?.categories?.[0]||"").toLowerCase();
    const n=String(x?.name||"").toLowerCase();
    return t.includes("post")||t.includes("postal")||n.includes("post office")||n.includes("postoffice")||n.includes("p.o.");
  });
  return po?.name||"";
}
function renderPlace(d,source="LIVE"){
  stopBlink("addressLine2");stopBlink("addressLine3");
  const p=normalizePrimary(d);
  const a=normalizeAddress(d);
  const label=String(a?.label||d?.label||d?.displayName||"").trim();

  if(p?.name){
    $("placeName").textContent=p.name;
    $("placeIcon").textContent=placeEmoji(p.type||p.category||"");
  }else{
    $("placeName").textContent=label||"Location identified";
    $("placeIcon").textContent="⌖";
  }

  const road=a?.street||a?.road||a?.streetName||d?.road?.street||"";
  const house=a?.houseNumber||a?.house||"";
  const locality=a?.district||a?.subdistrict||a?.subDistrict||a?.locality||a?.neighbourhood||a?.neighborhood||"";
  const city=a?.city||a?.town||a?.county||"";
  const state=a?.state||a?.stateName||"";
  const pin=a?.postalCode||a?.postcode||a?.postal_code||"";

  let line2=[house,road].filter(Boolean).join(" ").trim();
  if(!line2&&label){
    const first=label.split(",")[0]?.trim();
    if(first&&first!==p?.name)line2=first;
  }
  const placeParts=[locality,city!==locality?city:"",state].filter(Boolean);
  let line3=placeParts.join(", ");
  if(pin)line3=line3?`${line3} - ${pin}`:String(pin);

  $("addressLine2").textContent=line2||"";
  $("addressLine3").textContent=line3||label||"";
  const po=findPostOfficeValue(d,a);
  $("postOffice").textContent=po||(pin?"Finding post office…":"—");

  saveLocal(lastAddressKey,{...a,line2,line3,label});
  saveLocal(lastPlaceKey,{primaryLocation:p,address:a});
  const suffix=source==="LIVE"?(p?.distanceM!=null?` ${Math.round(p.distanceM)} m`:""):" • OFFLINE CACHE";
  $("addressLine3").title=source+suffix;

  if(pin) fetchPostOffice(pin);
}
async function fetchPostOffice(pin){
  const p=String(pin||"").trim();
  if(!/^\d{6}$/.test(p))return;
  const cacheKey="gpsViewer.postOffice."+p;
  const cached=loadLocal(cacheKey);
  if(cached?.name){$("postOffice").textContent=cached.name;return}
  if(!navigator.onLine||!dataEnabled)return;
  try{
    const j=await fetchJSON(`https://api.postalpincode.in/pincode/${encodeURIComponent(p)}`,10000);
    const rows=Array.isArray(j)&&Array.isArray(j[0]?.PostOffice)?j[0].PostOffice:[];
    if(rows.length){
      const preferred=rows.find(x=>String(x?.BranchType||"").toLowerCase().includes("sub office"))||rows[0];
      const name=preferred?.Name?`${preferred.Name}${preferred.Pincode?` (${preferred.Pincode})`:""}`:"";
      if(name){$("postOffice").textContent=name;saveLocal(cacheKey,{name})}
    }else if($("postOffice").textContent==="Finding post office…")$("postOffice").textContent="Not available";
  }catch(e){
    if($("postOffice").textContent==="Finding post office…")$("postOffice").textContent="Not available";
  }
}
function placeEmoji(type=""){
  const t=String(type).toLowerCase();
  if(t.includes("stadium")||t.includes("sport"))return "🏟️";
  if(t.includes("school")||t.includes("college")||t.includes("university"))return "🏫";
  if(t.includes("hospital")||t.includes("clinic"))return "🏥";
  if(t.includes("beach"))return "🏖️";
  if(t.includes("park")||t.includes("playground"))return "🌳";
  if(t.includes("hotel")||t.includes("resort"))return "🏨";
  if(t.includes("rail")||t.includes("station"))return "🚉";
  if(t.includes("airport"))return "✈️";
  if(t.includes("church")||t.includes("temple")||t.includes("mosque"))return "🏛️";
  if(t.includes("auditorium")||t.includes("theatre")||t.includes("theater"))return "🏛️";
  return "⌖";
}
function loadLastAddress(){
  const d=loadLocal(lastAddressKey), p=loadLocal(lastPlaceKey);
  if(d){
    $("placeName").textContent=p?.primaryLocation?.name||d.label||"Last known location";
    $("addressLine2").textContent=d.line2||d.street||"";
    $("addressLine3").textContent=d.line3||"";
    const pin=d.postalCode||d.postcode||"";
    const po=loadLocal(pin?"gpsViewer.postOffice."+pin:"");
    $("postOffice").textContent=po?.name||"—";
  }
}
async function reverseGeocode(lat,lon){
  if(!navigator.onLine){setDataState(dataEnabled?"weak":"off");return false}
  const now=Date.now();if(lastNetworkLookup&&now-lastNetworkLookup<LOOKUP_COOLDOWN_MS)return false;lastNetworkLookup=now;
  blink("addressLine2","Fetching location…");blink("addressLine3","Please wait…");setDataState("weak");
  try{
    // The verified my-location-here Worker exposes /api/reverse and returns
    // the location object directly (not an {ok:true,...} wrapper).
    const j=await fetchJSON(apiUrl("/api/reverse",{lat,lon}),12000);
    if(j && !j.error && (j.countryCode || j.road || j.postalCode || j.label || j.place || j.currentPlace)){
      latestPlaces=Array.isArray(j.places)?j.places:(Array.isArray(j.nearbyPlaces)?j.nearbyPlaces:[]);
      renderPlace(j,"LIVE");await gvPut("address",lat,lon,j);setDataState("strong");return true
    }
    throw new Error(j?.error || "Location service unavailable");
  }catch(e){
    const cached=await gvGetNearby("address",lat,lon,250);
    if(cached){renderPlace(cached.data,"CACHE");setDataState("weak");return true}
    $("addressLine2").textContent="Location result not fetched";
    $("addressLine3").textContent="Data service unavailable";
    stopBlink("addressLine2");stopBlink("addressLine3");setDataState("weak");
  }
  return false
}
function weatherLabel(code){const map={0:["Clear sky","☀️"],1:["Mainly clear","🌤️"],2:["Partly cloudy","⛅"],3:["Overcast","☁️"],45:["Fog","🌫️"],48:["Rime fog","🌫️"],51:["Light drizzle","🌦️"],53:["Drizzle","🌦️"],55:["Heavy drizzle","🌧️"],61:["Light rain","🌦️"],63:["Rain","🌧️"],65:["Heavy rain","🌧️"],71:["Light snow","🌨️"],73:["Snow","🌨️"],75:["Heavy snow","❄️"],80:["Rain showers","🌦️"],81:["Rain showers","🌧️"],82:["Heavy showers","⛈️"],95:["Thunderstorm","⛈️"],96:["Thunderstorm + hail","⛈️"],99:["Thunderstorm + hail","⛈️"]};return map[code]||["Unknown","☁️"]}
function renderWeather(c,j,source="LIVE"){
  stopBlink("condition");
  const [label,icon]=weatherLabel(c.weather_code);
  $("temperature").textContent=Math.round(c.temperature_2m??0)+"°";
  $("temperaturePosition").textContent=Math.round(c.temperature_2m??0)+" °C";
  $("humidity").textContent=c.relative_humidity_2m!=null?Math.round(c.relative_humidity_2m)+"%":"—";
  $("feels").textContent=Math.round(c.apparent_temperature??0)+"°";
  $("wind").textContent=`${Math.round(c.wind_speed_10m??0)} km/h ${compass(c.wind_direction_10m)}`;
  $("gusts").textContent=Math.round(c.wind_gusts_10m??0)+" km/h";
  $("clouds").textContent=Math.round(c.cloud_cover??0)+"%";
  $("visibility").textContent=c.visibility!=null?(c.visibility/1000).toFixed(1)+" km":"—";
  const idx=j.hourly?.time?.findIndex(t=>t===c.time);
  $("uv").textContent=idx>=0&&j.hourly.uv_index?.[idx]!=null?Math.round(j.hourly.uv_index[idx]):"—";
  $("condition").textContent=label;$("weatherIcon").textContent=icon;localDateTime();
  $("footerNote").textContent=source==="LIVE"?"Location and weather updated automatically":"Offline cache: last available location/weather";
}
async function fetchWeather(lat,lon,force=false){
  if(!navigator.onLine){setDataState(dataEnabled?"weak":"off");const cached=await gvGetNearby("weather",lat,lon,1000);if(cached)renderWeather(cached.data.current,cached.data,"CACHE");return}
  if(weatherTimer&&!force)return;
  weatherTimer=setTimeout(()=>weatherTimer=null,WEATHER_REFRESH_MS);
  blink("condition","Fetching weather…");setDataState("weak");
  try{
    let j=null;
    try{j=await fetchJSON(apiUrl("/api/weather",{lat,lon}),12000)}catch(e){}
    // Direct Open-Meteo fallback: weather data can still work if the Worker is temporarily unavailable.
    if(!j?.current){
      const u=new URL("https://api.open-meteo.com/v1/forecast");
      u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);
      u.searchParams.set("current","temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover");
      u.searchParams.set("hourly","uv_index,visibility");u.searchParams.set("timezone","auto");
      j=await fetchJSON(u.toString(),12000);
    }
    if(!j?.current)throw new Error("Weather unavailable");
    renderWeather(j.current,j,"LIVE");await gvPut("weather",lat,lon,j);setDataState("strong");stopBlink("condition");
  }catch(e){
    const cached=await gvGetNearby("weather",lat,lon,1000);
    if(cached){renderWeather(cached.data.current,cached.data,"CACHE");setDataState("weak")}
    else{$("condition").textContent="Weather result not fetched";stopBlink("condition");setDataState("weak")}
  }
}
function compass(deg){if(!Number.isFinite(deg))return "";return ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg/45)%8]}
function movedEnough(a,b){if(!a||!b)return true;return gvDistanceM(a.coords.latitude,a.coords.longitude,b.coords.latitude,b.coords.longitude)>=MIN_MOVE_FOR_LOOKUP_M}
function gvDistanceM(aLat,aLon,bLat,bLon){const R=6371000,rad=Math.PI/180,dLat=(bLat-aLat)*rad,dLon=(bLon-aLon)*rad,x=Math.sin(dLat/2)**2+Math.cos(aLat*rad)*Math.cos(bLat*rad)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
async function updateOfflineFallback(lat,lon){
  const cached=await gvGetNearby("address",lat,lon,250);if(cached)renderPlace(cached.data,"CACHE");
  const wc=await gvGetNearby("weather",lat,lon,1000);if(wc)renderWeather(wc.data.current,wc.data,"CACHE");
}
function updatePosition(pos){
  const previous=lastPosition;lastPosition=pos;const c=pos.coords,lat=c.latitude,lon=c.longitude;
  $("lat").textContent=formatNum(lat)+"° N";$("lon").textContent=formatNum(lon)+"° E";
  if(Number.isFinite(c.altitude)){ $("elevation").textContent=Math.round(c.altitude)+" m"; saveLocal("gpsViewer.lastElevation",Math.round(c.altitude)); } else { const le=loadLocal("gpsViewer.lastElevation"); $("elevation").textContent=le!=null?le+" m (last known)":"Unavailable"; }
  $("accuracy").textContent=Number.isFinite(c.accuracy)?Math.round(c.accuracy)+" m":"—";
  $("speed").textContent=kmh(c.speed).toFixed(1)+" km/h";
  const hd=Number.isFinite(c.heading)&&c.heading>=0?Math.round(c.heading)+"° ("+compass(c.heading)+")":"—";$("heading").textContent=hd;
  $("movement").textContent=kmh(c.speed)>1.5?"In motion":"Stationary";
  updateGPSQuality(c.accuracy);
  try{$("digipin").textContent=formatDigiPin(getDigiPin(lat,lon))}catch(e){$("digipin").textContent="Outside India"}
  if(dataEnabled&&navigator.onLine){if(movedEnough(previous,pos)){clearTimeout(addressTimer);addressTimer=setTimeout(()=>reverseGeocode(lat,lon),700);fetchWeather(lat,lon)}}
  else{ $("footerNote").textContent="Offline: GPS + DIGIPIN + cached results";updateOfflineFallback(lat,lon)}
}
function gpsError(err){
  const msg=err?.code===1
    ?"GPS DENIED — allow Location for this site"
    :err?.code===2
      ?"GPS UNAVAILABLE — check Windows Location Services"
      :"GPS TIMEOUT — waiting for a position";
  setGPSState(err?.code===1?"off":"weak",msg);
  $("footerNote").textContent=msg;
}
function startGPS(){
  if(!("geolocation" in navigator)){gpsEnabled=false;setGPSState("off","GPS UNAVAILABLE");$("footerNote").textContent="This browser does not provide GPS/location access";return}
  if(gpsWatchId!==null)navigator.geolocation.clearWatch(gpsWatchId);
  gpsEnabled=true;setGPSState("","GPS ON");
  navigator.geolocation.getCurrentPosition(updatePosition,gpsError,{enableHighAccuracy:true,maximumAge:0,timeout:15000});
  gpsWatchId=navigator.geolocation.watchPosition(updatePosition,gpsError,{enableHighAccuracy:true,maximumAge:2000,timeout:20000});
}
function stopGPS(){
  if(gpsWatchId!==null){navigator.geolocation.clearWatch(gpsWatchId);gpsWatchId=null}
  gpsEnabled=false;setGPSState("off","GPS OFF");
}
function toggleGPS(){gpsEnabled?stopGPS():startGPS()}
function toggleData(){
  dataEnabled=!dataEnabled;
  setDataState(dataEnabled&&navigator.onLine?"weak":"off");
  if(dataEnabled&&lastPosition&&navigator.onLine){
    reverseGeocode(lastPosition.coords.latitude,lastPosition.coords.longitude);
    fetchWeather(lastPosition.coords.latitude,lastPosition.coords.longitude,true);
  } else if(!dataEnabled){
    $("footerNote").textContent="DATA OFF: GPS, DIGIPIN and cached results still work";
  }
  if(currentTab!=="location") showTab(currentTab);
}
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function showTab(tab){
  currentTab=tab;
  if(tab==="location"){closeFullScreen();return}
  const view=$("fullScreenView"),c=$("fullScreenContent");
  view.hidden=false;
  if(tab==="map"){
    const lat=lastPosition?.coords.latitude,lon=lastPosition?.coords.longitude;
    if(lat==null){c.innerHTML='<h2>MAP</h2><p class="loading-blink">Waiting for GPS location…</p>';return}
    const bbox=`${lon-0.008},${lat-0.006},${lon+0.008},${lat+0.006}`;
    c.innerHTML=`<div class="map-title"><h2>MAP</h2><span class="map-current">Current GPS position</span></div><iframe class="fullscreen-map" title="OpenStreetMap" src="https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}"></iframe><div class="map-actions"><a target="_blank" rel="noopener" href="https://mappls.com/@${lat.toFixed(6)},${lon.toFixed(6)}">Mappls</a><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${lat},${lon}">Google Maps</a><a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}">OpenStreetMap</a></div>`;
  }else if(tab==="places"){
    renderPlacesScreen(c);
  }
}
function closeFullScreen(){
  $("fullScreenView").hidden=true;
  currentTab="location";
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("active",b.dataset.tab==="location"));
}
const PLACE_CATEGORIES=[{"name":"Accounting","icon":"📊"},{"name":"Airport","icon":"✈️"},{"name":"Amusement park","icon":"🎢"},{"name":"Aquarium","icon":"🐠"},{"name":"Art gallery","icon":"🖼️"},{"name":"ATM","icon":"🏧"},{"name":"Bakery","icon":"🥐"},{"name":"Bank","icon":"🏦"},{"name":"Bar","icon":"🍸"},{"name":"Beauty salon","icon":"💄"},{"name":"Bicycle store","icon":"🚲"},{"name":"Book store","icon":"📚"},{"name":"Bowling alley","icon":"🎳"},{"name":"Bus station","icon":"🚌"},{"name":"Cafe","icon":"☕"},{"name":"Campground","icon":"⛺"},{"name":"Car dealer","icon":"🚗"},{"name":"Car rental","icon":"🚙"},{"name":"Car repair","icon":"🔧"},{"name":"Car wash","icon":"🚿"},{"name":"Casino","icon":"🎰"},{"name":"Cemetery","icon":"⚰️"},{"name":"Church","icon":"⛪"},{"name":"City hall","icon":"🏛️"},{"name":"Clothing store","icon":"👕"},{"name":"Convenience store","icon":"🏪"},{"name":"Dentist","icon":"🦷"},{"name":"Department store","icon":"🏬"},{"name":"Doctor","icon":"🩺"},{"name":"Drugstore","icon":"💊"},{"name":"Electrician","icon":"⚡"},{"name":"Electronics store","icon":"📱"},{"name":"Embassy","icon":"🏳️"},{"name":"Fire station","icon":"🚒"},{"name":"Florist","icon":"💐"},{"name":"Funeral home","icon":"🕊️"},{"name":"Furniture store","icon":"🛋️"},{"name":"Gas station","icon":"⛽"},{"name":"Gym","icon":"🏋️"},{"name":"Hair care","icon":"✂️"},{"name":"Hardware store","icon":"🔨"},{"name":"Hindu temple","icon":"🛕"},{"name":"Home goods store","icon":"🪑"},{"name":"Hospital","icon":"🏥"},{"name":"Insurance agency","icon":"🛡️"},{"name":"Jewelry store","icon":"💍"},{"name":"Laundry","icon":"🧺"},{"name":"Lawyer","icon":"⚖️"},{"name":"Library","icon":"📖"},{"name":"Light rail station","icon":"🚊"},{"name":"Liquor store","icon":"🍾"},{"name":"Local government office","icon":"🏢"},{"name":"Locksmith","icon":"🔑"},{"name":"Lodging","icon":"🏨"},{"name":"Meal delivery","icon":"🛵"},{"name":"Meal takeaway","icon":"🥡"},{"name":"Mosque","icon":"🕌"},{"name":"Movie theater","icon":"🍿"},{"name":"Moving company","icon":"📦"},{"name":"Museum","icon":"🏛️"},{"name":"Night club","icon":"🕺"},{"name":"Painter","icon":"🎨"},{"name":"Park","icon":"🌳"},{"name":"Parking","icon":"🅿️"},{"name":"Pet store","icon":"🐾"},{"name":"Pharmacy","icon":"💊"},{"name":"Physiotherapist","icon":"🧘"},{"name":"Plumber","icon":"🔧"},{"name":"Police","icon":"👮"},{"name":"Post office","icon":"📮"},{"name":"Primary school","icon":"🏫"},{"name":"Real estate agency","icon":"🏠"},{"name":"Restaurant","icon":"🍽️"},{"name":"Roofing contractor","icon":"🏠"},{"name":"RV park","icon":"🚐"},{"name":"School","icon":"🎒"},{"name":"Secondary school","icon":"🏫"},{"name":"Shoe store","icon":"👞"},{"name":"Shopping mall","icon":"🛍️"},{"name":"Spa","icon":"💆"},{"name":"Stadium","icon":"🏟️"},{"name":"Storage","icon":"🗄️"},{"name":"Store","icon":"🛒"},{"name":"Subway station","icon":"🚇"},{"name":"Supermarket","icon":"🛒"},{"name":"Synagogue","icon":"🕍"},{"name":"Taxi stand","icon":"🚕"},{"name":"Train station","icon":"🚉"},{"name":"Transit station","icon":"🚏"},{"name":"Travel agency","icon":"✈️"},{"name":"University","icon":"🎓"},{"name":"Veterinary care","icon":"🐕"},{"name":"Zoo","icon":"🦁"}];
function openNearbySearch(query,provider="google"){
  const q=String(query||"").trim(),lat=lastPosition?.coords.latitude,lon=lastPosition?.coords.longitude;
  if(!q)return;
  if(lat==null||lon==null){$("placeSearchStatus").textContent="Waiting for GPS location…";$("placeSearchStatus").classList.add("loading-blink");return}
  const text=encodeURIComponent(`${q} near ${lat},${lon}`);
  const url=provider==="mappls"
    ?`https://mappls.com/${encodeURIComponent(q)}/near/${lat},${lon}`
    :`https://www.google.com/maps/search/?api=1&query=${text}`;
  window.open(url,"_blank","noopener");
}
function renderPlacesScreen(c){
  const lat=lastPosition?.coords.latitude,lon=lastPosition?.coords.longitude;
  c.innerHTML=`<div class="places-screen">
    <div class="map-title"><h2>PLACES</h2><span class="map-current">${lat!=null?"GPS position ready":"Waiting for GPS…"}</span></div>
    <div class="search-box places-search">
      <input id="placeSearchInput" type="search" placeholder="Search categories or a custom place…">
      <button id="placeSearchBtn" type="button">Search</button>
    </div>
    <div id="placeSearchStatus" class="map-current" style="margin:0 3px 4px">Choose a category or search for any place.</div>
    ${latestPlaces.length?`<div class="places-results"><div class="places-results-title">Nearby places from HERE</div>${placeListHTML(latestPlaces)}</div>`:""}
    <div id="placeCategoryList" class="places-category-list"></div>
  </div>`;
  const input=$("placeSearchInput");
  $("placeSearchBtn").onclick=()=>{
    const q=input.value.trim();
    if(q){$("placeSearchStatus").textContent=`Opening search for “${q}”…`;openNearbySearch(q,"google")}
  };
  input.addEventListener("keydown",e=>{if(e.key==="Enter")$("placeSearchBtn").click()});
  renderPlaceCategories("");
}
function renderPlaceCategories(filter=""){
  const box=$("placeCategoryList");if(!box)return;
  const q=String(filter||"").toLowerCase();
  const list=PLACE_CATEGORIES.filter(x=>x.name.toLowerCase().includes(q));
  box.innerHTML=list.length?list.map(x=>`<button class="places-category" type="button" data-q="${escapeHTML(x.name)}"><span class="cat-icon">${x.icon}</span><span class="cat-name">${escapeHTML(x.name)}</span><span class="cat-arrow">›</span></button>`).join(""):'<div class="no-results">No category found. Use Search for a custom place.</div>';
  box.querySelectorAll(".places-category").forEach(b=>b.addEventListener("click",()=>{
    $("placeSearchStatus").textContent=`Searching for ${b.dataset.q}…`;
    $("placeSearchStatus").classList.add("loading-blink");
    openNearbySearch(b.dataset.q,"google");
    setTimeout(()=>$("placeSearchStatus")?.classList.remove("loading-blink"),900);
  }));
  box.querySelectorAll(".places-category").forEach(b=>b.addEventListener("contextmenu",e=>e.preventDefault()));
  const input=$("placeSearchInput");
  if(input&&!input.dataset.boundFilter){input.dataset.boundFilter="1";input.addEventListener("input",()=>renderPlaceCategories(input.value))}
}
function placeListHTML(places){
  return '<div class="place-list large">'+places.slice(0,20).map(x=>{
    const name=escapeHTML(x.name||"Unnamed place");
    const type=escapeHTML(x.category||x.type||"Place");
    const dist=x.distanceM!=null?" • "+Math.round(x.distanceM)+" m":"";
    const q=encodeURIComponent(x.name||"");
    const lat=lastPosition?.coords.latitude,lon=lastPosition?.coords.longitude;
    const href=lat!=null&&lon!=null?`https://www.google.com/maps/search/?api=1&query=${q}%20near%20${lat},${lon}`:"#";
    return `<div class="places-result-card"><b>${name}</b><small>${type}${dist}</small><a target="_blank" rel="noopener" href="${href}" style="font-size:11px;color:#0875ed;text-decoration:none">Open on map ›</a></div>`;
  }).join("")+"</div>"
}
$("gpsStatus").addEventListener("click",()=>toggleGPS());
$("dataStatus").addEventListener("click",()=>toggleData());

document.querySelectorAll(".tabs button").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  showTab(btn.dataset.tab);
}));
$("fullScreenBack").addEventListener("click",closeFullScreen);

$("copyDigipin").addEventListener("click",async e=>{
  e.stopPropagation();
  const v=$("digipin").textContent;
  if(v&&v!=="—"&&navigator.clipboard)try{
    await navigator.clipboard.writeText(v);
    $("copyDigipin").textContent="✓";
    setTimeout(()=>$("copyDigipin").textContent="▣",1200);
  }catch(e){}
});
window.addEventListener("online",()=>{
  setDataState(dataEnabled?"strong":"off");
  if(lastPosition){
    reverseGeocode(lastPosition.coords.latitude,lastPosition.coords.longitude);
    fetchWeather(lastPosition.coords.latitude,lastPosition.coords.longitude,true);
  }
});
window.addEventListener("offline",()=>{
  setDataState("off");
  $("footerNote").textContent="Offline: GPS + DIGIPIN + cached results";
});
setTimezone();localDateTime();loadLastAddress();setDataState(dataEnabled&&navigator.onLine?"strong":"off");startGPS();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
setInterval(localDateTime,1000);
