/* GPS Viewer v14 fixes */
(function(){
  const $=id=>document.getElementById(id);
  const localGet=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
  const localSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

  function getGPS(done){
    if(!navigator.geolocation){done(null);return}
    navigator.geolocation.getCurrentPosition(p=>done(p.coords),()=>done(null),{enableHighAccuracy:true,maximumAge:3000,timeout:10000});
  }

  async function ensurePostOffice(){
    const el=$("postOffice");
    if(!el)return;
    const state=el.textContent.trim();
    if(state!=="—"&&state!=="Finding post office…"&&state!=="Not available")return;
    const text=[$("addressLine3")?.textContent||"",$("placeName")?.textContent||""].join(" ");
    const m=text.match(/\b(\d{6})\b/);if(!m)return;
    const pin=m[1],key="gpsViewer.postOffice."+pin,cached=localGet(key);
    if(cached?.name){el.textContent=cached.name;return}
    if(!navigator.onLine)return;
    try{
      const r=await fetch(`https://api.postalpincode.in/pincode/${pin}`,{cache:"no-store"});
      const j=await r.json(),rows=Array.isArray(j)&&Array.isArray(j[0]?.PostOffice)?j[0].PostOffice:[];
      if(rows.length){
        const preferred=rows.find(x=>/sub office/i.test(x?.BranchType||""))||rows[0];
        const name=preferred?.Name?`${preferred.Name}${preferred.Pincode?` (${preferred.Pincode})`:""}`:"";
        if(name){el.textContent=name;localSet(key,{name})}
      }
    }catch(e){}
  }
  setInterval(ensurePostOffice,1500);ensurePostOffice();

  /* LOCATION-FIRST GOOGLE MAPS SEARCH
     The search query contains ONLY the requested category/place name.
     The current GPS coordinates are supplied separately as the map center.
     We deliberately do NOT include road name, place name, PIN, or address in
     the query because a long road/locality can make Google choose its distant
     end as the search origin. */
  function currentCoords(done){
    getGPS(coords=>{
      if(coords){
        done({lat:Number(coords.latitude),lon:Number(coords.longitude)});
        return;
      }
      const lat=Number(window.__gpsViewerLastLat),lon=Number(window.__gpsViewerLastLon);
      done(Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null);
    });
  }

  function googleMapsAppUrl(query,coords){
    const q=String(query||"").trim();
    if(!q||!coords||!Number.isFinite(coords.lat)||!Number.isFinite(coords.lon))return "";
    return `comgooglemaps://?q=${encodeURIComponent(q)}&center=${coords.lat.toFixed(6)},${coords.lon.toFixed(6)}&zoom=16`;
  }

  function googleMapsWebUrl(query,coords){
    const q=String(query||"").trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}&center=${coords.lat.toFixed(6)},${coords.lon.toFixed(6)}&zoom=16`;
  }

  function openGoogleMapsCurrentLocation(query){
    const q=String(query||"").trim();
    if(!q)return;
    const status=$("placeSearchStatus");
    currentCoords(coords=>{
      if(!coords){if(status)status.textContent="Waiting for current GPS location…";return}
      if(status)status.textContent=`Google Maps: ${q} — current GPS location`;
      const appUrl=googleMapsAppUrl(q,coords);
      const webUrl=googleMapsWebUrl(q,coords);
      let switched=false;
      const onHide=()=>{if(document.hidden)switched=true};
      document.addEventListener("visibilitychange",onHide);
      window.location.href=appUrl;
      setTimeout(()=>{
        document.removeEventListener("visibilitychange",onHide);
        if(!switched&&!document.hidden)window.location.assign(webUrl);
      },900);
    });
  }

  /* app.js handlers are lexical functions, so intercept Places clicks in the
     capture phase and prevent the original handler from opening its old URL. */
  document.addEventListener("click",e=>{
    const category=e.target.closest?.(".places-category");
    if(category){
      e.preventDefault();e.stopImmediatePropagation();
      const q=category.dataset.q||category.querySelector(".cat-name")?.textContent||"";
      if($("placeSearchStatus"))$("placeSearchStatus").textContent=`Searching Google Maps for ${q} at current GPS location…`;
      openGoogleMapsCurrentLocation(q);
      return;
    }
    const searchButton=e.target.closest?.("#placeSearchBtn");
    if(searchButton){
      e.preventDefault();e.stopImmediatePropagation();
      const input=$("placeSearchInput"),q=input?.value?.trim()||"";
      if(q)openGoogleMapsCurrentLocation(q);
      return;
    }
    const mapLink=e.target.closest?.(".places-result-card a");
    if(mapLink){
      e.preventDefault();e.stopImmediatePropagation();
      const card=mapLink.closest(".places-result-card");
      const q=card?.querySelector("b")?.textContent?.trim()||"";
      if(q)openGoogleMapsCurrentLocation(q);
    }
  },true);

  /* Keep a fresh coordinate copy available even though app.js keeps
     lastPosition private to its script scope. */
  setInterval(()=>{
    if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>{
      window.__gpsViewerLastLat=p.coords.latitude;
      window.__gpsViewerLastLon=p.coords.longitude;
    },()=>{}, {enableHighAccuracy:true,maximumAge:5000,timeout:5000});
  },5000);

  window.openNearbySearch=function(query){openGoogleMapsCurrentLocation(query)};

  const css=document.createElement("style");
  css.textContent=`
    html,body{height:auto!important;min-height:100%!important;background:linear-gradient(145deg,#3fb8f0 0%,#8bdcf8 50%,#d7f4ff 100%)!important}
    body{min-height:100dvh!important;overflow-x:hidden!important;overflow-y:auto!important}
    .app{height:auto!important;min-height:100dvh!important;overflow:visible!important;padding-bottom:8px!important;background:linear-gradient(145deg,#3fb8f0 0%,#8bdcf8 50%,#d7f4ff 100%)!important}
    .tabs{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;width:100%!important;height:60px!important;flex:0 0 60px!important;margin:6px 0 0!important;z-index:50!important}
    footer{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;width:100%!important;height:20px!important;flex:0 0 20px!important;margin:2px 0 0!important;font-size:10px!important;line-height:20px!important;z-index:51!important}
    .fullscreen-view{z-index:1000!important}
  `;
  document.head.appendChild(css);
})();
