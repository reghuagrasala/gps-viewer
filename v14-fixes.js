/* GPS Viewer v14 fixes */
(function(){
  const $=id=>document.getElementById(id);
  const localGet=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
  const localSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

  async function ensurePostOffice(){
    const el=$("postOffice");
    if(!el)return;
    const state=el.textContent.trim();
    if(state!=="—"&&state!=="Finding post office…"&&state!=="Not available")return;
    const text=[$("addressLine3")?.textContent||"",$("placeName")?.textContent||""].join(" ");
    const m=text.match(/\b(\d{6})\b");if(!m)return;
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

  /* Places must use the SAME live GPS position maintained by app.js.
     Never use road/place/locality names as the search location. */
  function getLiveAppPosition(){
    if(typeof lastPosition!=="undefined"&&lastPosition?.coords){
      const lat=Number(lastPosition.coords.latitude),lon=Number(lastPosition.coords.longitude);
      if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
    }
    return null;
  }

  function googleMapsCurrentSearchUrl(query,pos){
    const q=String(query||"").trim();
    if(!q||!pos)return "";
    /* Google Maps search query contains ONLY the category. The map center is
       supplied separately through the center parameter, so a long road name
       can never move the search center. */
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}&center=${pos.lat.toFixed(7)},${pos.lon.toFixed(7)}&zoom=17`;
  }

  function openGoogleMapsCurrentLocation(query){
    const q=String(query||"").trim();if(!q)return;
    const status=$("placeSearchStatus");
    const pos=getLiveAppPosition();
    if(!pos){if(status)status.textContent="Waiting for current GPS location…";return}
    const url=googleMapsCurrentSearchUrl(q,pos);
    if(status)status.textContent=`Google Maps: ${q} • ${pos.lat.toFixed(7)}, ${pos.lon.toFixed(7)}`;
    window.location.assign(url);
  }

  /* Intercept Places controls before the original app.js handlers. */
  document.addEventListener("click",e=>{
    const category=e.target.closest?.(".places-category");
    if(category){
      e.preventDefault();e.stopImmediatePropagation();
      openGoogleMapsCurrentLocation(category.dataset.q||category.querySelector(".cat-name")?.textContent||"");
      return;
    }
    const searchButton=e.target.closest?.("#placeSearchBtn");
    if(searchButton){
      e.preventDefault();e.stopImmediatePropagation();
      openGoogleMapsCurrentLocation($("placeSearchInput")?.value?.trim()||"");
      return;
    }
    const mapLink=e.target.closest?.(".places-result-card a");
    if(mapLink){
      e.preventDefault();e.stopImmediatePropagation();
      const card=mapLink.closest(".places-result-card");
      openGoogleMapsCurrentLocation(card?.querySelector("b")?.textContent?.trim()||"");
    }
  },true);

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
