/* GPS Viewer v17: Home Screen safety + fresh GPS for Maps searches */
(function(){
  const $=id=>document.getElementById(id);

  /* V16 used display:flex!important on the modal itself, which overrides the
     HTML hidden attribute. That made the Home Screen app open on the Back page. */
  const css=document.createElement("style");
  css.textContent=`
    .fullscreen-view[hidden]{display:none!important}
    .fullscreen-view:not([hidden]){display:flex!important}
  `;
  document.head.appendChild(css);

  /* Register the existing offline shell explicitly. */
  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }

  function setPlaceStatus(text){
    const el=$("placeSearchStatus");
    if(el)el.textContent=text;
  }

  function freshPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation){reject(new Error("Geolocation unavailable"));return}
      navigator.geolocation.getCurrentPosition(resolve,reject,{
        enableHighAccuracy:true,
        maximumAge:0,
        timeout:10000
      });
    });
  }

  function isIOS(){
    return /iPad|iPhone|iPod/.test(navigator.userAgent)||
      (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  }

  async function openFreshGoogleMapsSearch(query){
    const q=String(query||"").trim();
    if(!q)return;
    setPlaceStatus("Getting current GPS position…");
    try{
      const pos=await freshPosition();
      const c=pos.coords;
      const accuracy=Number(c.accuracy);
      if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude))throw new Error("No coordinates");
      /* Do not send a kilometre-away laptop/IP position to Maps. */
      if(!Number.isFinite(accuracy)||accuracy>500){
        setPlaceStatus(`GPS accuracy is ${Math.round(accuracy||9999)} m — no map opened`);
        return;
      }
      const lat=c.latitude.toFixed(6),lon=c.longitude.toFixed(6);
      setPlaceStatus(`Google Maps search • ${lat}, ${lon} • ±${Math.round(accuracy)} m`);
      if(isIOS()){
        /* iOS Google Maps app scheme. */
        window.location.href=`comgooglemaps://?q=${encodeURIComponent(q)}&center=${lat},${lon}&zoom=17`;
      }else{
        /* Desktop/laptop: exact live coordinates are included in the query. */
        const search=`${q} near ${lat},${lon}`;
        const url=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(search)}`;
        window.open(url,"_blank","noopener,noreferrer");
      }
    }catch(e){
      const code=e?.code;
      setPlaceStatus(code===1?"Location permission denied — allow Location for GPS Viewer":code===2?"Current GPS position unavailable on this device":code===3?"GPS request timed out — try again":"Current GPS position unavailable");
    }
  }

  /* Loaded before V15, so this capture handler takes precedence over V15's
     older DOM-coordinate Maps handler. */
  document.addEventListener("click",function(e){
    const category=e.target.closest?.(".places-category");
    if(category){
      e.preventDefault();e.stopImmediatePropagation();
      openFreshGoogleMapsSearch(category.dataset.q||category.querySelector(".cat-name")?.textContent||"");
      return;
    }
    const btn=e.target.closest?.("#placeSearchBtn");
    if(btn){
      e.preventDefault();e.stopImmediatePropagation();
      openFreshGoogleMapsSearch($("placeSearchInput")?.value?.trim()||"");
      return;
    }
    const link=e.target.closest?.(".places-result-card a");
    if(link){
      e.preventDefault();e.stopImmediatePropagation();
      const card=link.closest(".places-result-card");
      openFreshGoogleMapsSearch(card?.querySelector("b")?.textContent?.trim()||"");
    }
  },true);
})();
