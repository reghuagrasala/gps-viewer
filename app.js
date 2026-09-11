const $=id=>document.getElementById(id);
let lastPosition=null, weatherTimer=null, addressTimer=null, lastNetworkLookup=null;
const lastAddressKey="gpsViewer.lastAddress";
const lastPlaceKey="gpsViewer.lastPlace";
const MIN_MOVE_FOR_LOOKUP_M=60;
const LOOKUP_COOLDOWN_MS=15000;
const WEATHER_REFRESH_MS=10*60*1000;
const API_BASE=(window.GPS_VIEWER_CONFIG&&window.GPS_VIEWER_CONFIG.apiBase)||"https://small-sky-cec5.hrcvb7p7r5.workers.dev";

function setGPSState(kind,text){const el=$("gpsStatus");el.classList.remove("warn","off");if(kind)el.classList.add(kind);el.querySelector("b").textContent=text}
function setDataState(online){const el=$("dataStatus");el.classList.toggle("off",!online);el.querySelector("b").textContent=online?"DATA ON":"DATA OFF";el.querySelector(".status-dot").style.background=online?"#16ad4b":"#e93636"}
function formatNum(n,d=6){return Number(n).toFixed(d)}
function kmh(mps){return mps==null||!Number.isFinite(mps)?0:mps*3.6}
function quality(acc){if(!Number.isFinite(acc))return "—";if(acc<=10)return "STRONG";if(acc<=30)return "GOOD";if(acc<=100)return "WEAK";return "POOR"}
function updateGPSQuality(acc){const q=quality(acc);setGPSState((q==="WEAK"||q==="POOR")?"warn":"","GPS ON")}
function localDateTime(){const d=new Date();$("weatherDate").textContent=d.toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"2-digit"});$("weatherTime").textContent=d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})}
function setTimezone(){const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Kolkata";$("timezone").textContent=tz==="Asia/Kolkata"?"Kolkata GMT+5:30":tz.replace("Asia/","")}
function saveLocal(key,data){try{localStorage.setItem(key,JSON.stringify(data))}catch(e){}}
function loadLocal(key){try{return JSON.parse(localStorage.getItem(key))}catch(e){return null}}
function renderPlace(d,source="LIVE"){
  const p=d?.primaryLocation;
  const a=d?.address||{};
  if(p?.name){$("placeName").textContent=p.name; $("placeIcon").textContent=placeEmoji(p.type); }
  else {$("placeName").textContent=a.label||"Location identified"; $("placeIcon").textContent="⌖"}
  const road=a.street||d?.road?.street||"";
  const local=a.district||a.city||"";
  const city=a.city||a.county||"";
  const state=a.state||"";
  const pin=a.postalCode||"";
  const line2=[a.houseNumber,road].filter(Boolean).join(" ");
  const line3=[local,city!==local?city:"",state,pin].filter(Boolean).join(", ").replace(", "+pin," - "+pin);
  $("addressLine2").textContent=line2||"";
  $("addressLine3").textContent=line3||"";
  $("postOffice").textContent=(local||city||"—")+(pin?" ("+pin+")":"");
  saveLocal(lastAddressKey,{...a,line2,line3});
  saveLocal(lastPlaceKey,{primaryLocation:p,address:a});
  const suffix=source==="LIVE"?(p?.distanceM!=null?` ${Math.round(p.distanceM)} m`:""):" • OFFLINE CACHE";
  $("addressLine3").title=source+suffix;
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
  if(d){$("placeName").textContent=p?.primaryLocation?.name||d.label||"Last known location";$("addressLine2").textContent=d.line2||d.street||"";$("addressLine3").textContent=d.line3||"";$("postOffice").textContent=(d.city||d.district||"—")+(d.postalCode?" ("+d.postalCode+")":"")}
}
async function reverseGeocode(lat,lon){
  if(!navigator.onLine)return false;
  const now=Date.now();if(lastNetworkLookup&&now-lastNetworkLookup<LOOKUP_COOLDOWN_MS)return false;lastNetworkLookup=now;setDataState(true);
  try{
    const r=await fetch(`${API_BASE}/api/location?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
    if(!r.ok)throw new Error("location lookup failed");
    const j=await r.json();if(j.ok){renderPlace(j,"LIVE");await gvPut("address",lat,lon,j);return true}
  }catch(e){
    const cached=await gvGetNearby("address",lat,lon,250);
    if(cached){renderPlace(cached.data,"CACHE");return true}
    $("addressLine2").textContent="Online place/address lookup unavailable";$("addressLine3").textContent="";
  }
  return false;
}
function weatherLabel(code){const map={0:["Clear sky","☀️"],1:["Mainly clear","🌤️"],2:["Partly cloudy","⛅"],3:["Overcast","☁️"],45:["Fog","🌫️"],48:["Rime fog","🌫️"],51:["Light drizzle","🌦️"],53:["Drizzle","🌦️"],55:["Heavy drizzle","🌧️"],61:["Light rain","🌦️"],63:["Rain","🌧️"],65:["Heavy rain","🌧️"],71:["Light snow","🌨️"],73:["Snow","🌨️"],75:["Heavy snow","❄️"],80:["Rain showers","🌦️"],81:["Rain showers","🌧️"],82:["Heavy showers","⛈️"],95:["Thunderstorm","⛈️"],96:["Thunderstorm + hail","⛈️"],99:["Thunderstorm + hail","⛈️"]};return map[code]||["Unknown","☁️"]}
function renderWeather(c,j,source="LIVE"){
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
  if(!navigator.onLine){const cached=await gvGetNearby("weather",lat,lon,1000);if(cached)renderWeather(cached.data.current,cached.data,"CACHE");return}
  if(weatherTimer&&!force)return;
  weatherTimer=setTimeout(()=>weatherTimer=null,WEATHER_REFRESH_MS);
  try{
    const r=await fetch(`${API_BASE}/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
    if(!r.ok)throw new Error("weather failed");
    const j=await r.json();renderWeather(j.current||{},j,"LIVE");await gvPut("weather",lat,lon,j);
  }catch(e){
    const cached=await gvGetNearby("weather",lat,lon,1000);
    if(cached)renderWeather(cached.data.current,cached.data,"CACHE");else $("condition").textContent="Weather unavailable";
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
  $("elevation").textContent=Number.isFinite(c.altitude)?Math.round(c.altitude)+" m":"—";
  $("accuracy").textContent=Number.isFinite(c.accuracy)?Math.round(c.accuracy)+" m":"—";
  $("speed").textContent=kmh(c.speed).toFixed(1)+" km/h";
  const hd=Number.isFinite(c.heading)&&c.heading>=0?Math.round(c.heading)+"° ("+compass(c.heading)+")":"—";$("heading").textContent=hd;
  $("movement").textContent=kmh(c.speed)>1.5?"In motion":"Stationary";
  updateGPSQuality(c.accuracy);
  try{$("digipin").textContent=formatDigiPin(getDigiPin(lat,lon))}catch(e){$("digipin").textContent="Outside India"}
  if(navigator.onLine){if(movedEnough(previous,pos)){clearTimeout(addressTimer);addressTimer=setTimeout(()=>reverseGeocode(lat,lon),700);fetchWeather(lat,lon)}}
  else{ $("footerNote").textContent="Offline: GPS + DIGIPIN + cached results";updateOfflineFallback(lat,lon)}
}
function startGPS(){
  if(!("geolocation" in navigator)){setGPSState("off","GPS UNAVAILABLE");return}
  navigator.geolocation.watchPosition(updatePosition,err=>{setGPSState("warn",err.code===1?"GPS DENIED":"GPS WEAK")},{"enableHighAccuracy":true,maximumAge:2000,timeout:15000});
}
$("copyDigipin").addEventListener("click",async e=>{e.stopPropagation();const v=$("digipin").textContent;if(v&&v!=="—"&&navigator.clipboard)try{await navigator.clipboard.writeText(v);$("copyDigipin").textContent="✓";setTimeout(()=>$("copyDigipin").textContent="▣",1200)}catch(e){}});
window.addEventListener("online",()=>{setDataState(true);if(lastPosition){reverseGeocode(lastPosition.coords.latitude,lastPosition.coords.longitude);fetchWeather(lastPosition.coords.latitude,lastPosition.coords.longitude,true)}});
window.addEventListener("offline",()=>{setDataState(false);$("footerNote").textContent="Offline: GPS + DIGIPIN + cached results"});
setTimezone();localDateTime();loadLastAddress();setDataState(navigator.onLine);startGPS();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
setInterval(localDateTime,1000);
