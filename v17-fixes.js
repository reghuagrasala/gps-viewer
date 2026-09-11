/* GPS Viewer v17: home-screen safety + fresh GPS for Maps searches */
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

  async function openFreshGoogleMapsSearch(query){
    const q=String(query||"").trim();
    if(!q)return;
    setPlaceStatus("Getting current GPS position…");
    try{
      const pos=await freshPosition();
      const c=pos.coords;
      const accuracy=Number(c.accuracy);
      if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude))throw new Error("No coordinates");
      /* Never launch Maps from a stale DOM coordinate or a coarse location. */
      if(!Number.isFinite(accuracy)||accuracy>500){
        setPlaceStatus(`GPS accuracy is ${Math.round(accuracy||9999)} m — waiting for a more precise position`);
        return;
      }
      const lat=c.latitude.toFixed(6),lon=c.longitude.toFixed(6);
      setPlaceStatus(`Google Maps search • ${lat}, ${lon} • ±${Math.round(accuracy)} m`);
      const url=`comgooglemaps://?q=${encodeURIComponent(q)}&center=${lat},${lon}&zoom=17`;
      window.location.href=url;
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
