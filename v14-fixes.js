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

  /* On iPhone, Google Maps' native URL supports an explicit search viewport:
     q = what to find, center = the CURRENT GPS position. This is more precise
     than putting coordinates into the text query, which can make Google treat
     the coordinates as part of the place name search. */
  function googleMapsAppUrl(query,coords){
    const q=String(query||"").trim();
    const lat=Number(coords?.latitude),lon=Number(coords?.longitude);
    if(!q||!Number.isFinite(lat)||!Number.isFinite(lon))return "";
    return `comgooglemaps://?q=${encodeURIComponent(q)}&center=${lat},${lon}&zoom=16`;
  }
  window.googleMapsAppUrl=googleMapsAppUrl;

  function googleMapsWebFallback(query,coords){
    const q=String(query||"").trim();
    const lat=Number(coords?.latitude),lon=Number(coords?.longitude);
    const place=String($("placeName")?.textContent||"").trim();
    const address=String($("addressLine3")?.textContent||"").trim();
    const context=[place,address].filter(Boolean).join(", ");
    const text=context?`${q} near ${context}`:`${q} near ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
  }

  function openGoogleMapsSearch(query){
    const q=String(query||"").trim();if(!q)return;
    const status=$("placeSearchStatus");
    getGPS(coords=>{
      if(!coords){if(status)status.textContent="Waiting for GPS location…";return}
      const nativeUrl=googleMapsAppUrl(q,coords);
      const fallback=googleMapsWebFallback(q,coords);
      if(status)status.textContent=`Opening Google Maps near your current location…`;
      let returned=false;
      const onHide=()=>{returned=true;document.removeEventListener("visibilitychange",onHide)};
      document.addEventListener("visibilitychange",onHide);
      window.location.href=nativeUrl;
      setTimeout(()=>{
        document.removeEventListener("visibilitychange",onHide);
        if(!returned)window.location.assign(fallback);
      },1200);
    });
  }

  window.openNearbySearch=openGoogleMapsSearch;
  window.openGooglePlace=openGoogleMapsSearch;

  /* HERE result cards: every Google Maps action uses fresh current GPS as the
     map center, so tapping a result cannot silently use an old/random area. */
  window.placeListHTML=function(places){
    const arr=Array.isArray(places)?places:[];
    return '<div class="place-list large">'+arr.slice(0,20).map(x=>{
      const name=String(x?.name||"Unnamed place").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#039;"}[m]));
      const jsName=String(x?.name||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");
      const type=String(x?.category||x?.type||"Place");
      const dist=x?.distanceM!=null?" • "+Math.round(x.distanceM)+" m":"";
      return `<div class="places-result-card"><b>${name}</b><small>${type}${dist}</small><a href="#" onclick="event.preventDefault();openGooglePlace('${jsName}')" style="font-size:11px;color:#0875ed;text-decoration:none">Open in Google Maps ›</a></div>`;
    }).join("")+"</div>";
  };

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
