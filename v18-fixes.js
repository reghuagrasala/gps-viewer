/* GPS Viewer v18: static LOCATION + clean address + compact PLACES + bottom MAP actions */
(function(){
  const $=id=>document.getElementById(id);
  const API_BASE=(window.GPS_VIEWER_CONFIG&&window.GPS_VIEWER_CONFIG.apiBase)||"https://my-location-here.hrcvb7p7r5.workers.dev";
  let addressBusy=false,lastAddressRefresh=0;

  function coords(){
    const a=$("lat")?.textContent||"",b=$("lon")?.textContent||"";
    const am=a.match(/[-+]?\d+(?:\.\d+)?/),bm=b.match(/[-+]?\d+(?:\.\d+)?/);
    const lat=am?Number(am[0]):NaN,lon=bm?Number(bm[0]):NaN;
    return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
  }
  function isCode(v){
    const s=String(v||"").trim();
    return !s||/^(?:[A-Z]{2,6}[- ]?\d{1,5}|[A-Z]{1,5}\d{1,5})$/i.test(s);
  }
  function text(v){
    if(typeof v==="string")return v.trim();
    if(v&&typeof v==="object")return String(v.name||v.title||v.label||v.currentPlace||v.displayName||"").trim();
    return "";
  }
  function firstNamed(...values){
    for(const v of values){const s=text(v);if(s&&!isCode(s))return s}
    return "";
  }
  function direct(d,k){return text(d?.[k])}

  async function refreshRealAddress(force=false){
    const p=coords();
    if(!p||!navigator.onLine||addressBusy)return;
    const now=Date.now();
    if(!force&&now-lastAddressRefresh<15000)return;
    lastAddressRefresh=now;addressBusy=true;
    try{
      const u=new URL(API_BASE.replace(/\/$/,"")+"/api/reverse");
      u.searchParams.set("lat",p.lat);u.searchParams.set("lon",p.lon);u.searchParams.set("_",String(Date.now()));
      const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),10000);
      const r=await fetch(u.toString(),{cache:"no-store",signal:ctl.signal,headers:{Accept:"application/json"}});clearTimeout(timer);
      if(!r.ok)throw new Error("HTTP "+r.status);
      const d=await r.json();
      const a=d?.address||d?.location?.address||{};

      /* HERE can return a building/area code as the primary address name.
         Prefer its explicit current/named place, but never invent a name. */
      const named=firstNamed(
        d?.currentPlace,d?.currentPlaceName,d?.primaryPlace,d?.primaryLocation,
        d?.place,d?.placeName,a?.place,a?.district,a?.city
      );
      const current=direct(d,"currentPlace");
      const label=direct(d,"label")||text(a?.label);
      const road=direct(d,"road")||text(a?.street)||text(a?.streetName)||text(a?.road);
      const house=direct(d,"houseNumber")||text(a?.houseNumber);
      const district=direct(d,"district")||text(a?.district)||text(a?.locality);
      const city=direct(d,"city")||text(a?.city)||text(a?.town)||text(a?.county);
      const state=direct(d,"state")||text(a?.state)||text(a?.stateName);
      const pin=String(d?.postalCode||a?.postalCode||a?.postcode||"").trim();

      const placeEl=$("placeName");
      if(named&&placeEl)placeEl.textContent=named;

      /* Do not repeat a code as an address line. Use the actual road/house,
         then locality/city/state/PIN. If HERE has no structured road, use its
         label only when it is not merely the same code. */
      let line2=[house,road].filter(Boolean).join(" ").trim();
      if(isCode(line2))line2="";
      if(!line2&&label&&!isCode(label)&&label!==named)line2=label.split(",")[0].trim();
      let line3=[district,city,state].filter((v,i,a)=>v&&a.indexOf(v)===i).join(", ");
      if(pin)line3=line3?`${line3} - ${pin}`:pin;
      if(!line3&&label&&!isCode(label)&&label!==line2)line3=label;

      if($("addressLine2"))$("addressLine2").textContent=line2;
      if($("addressLine3"))$("addressLine3").textContent=line3;
      if(named)placeEl.title=`HERE named place • ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`;
    }catch(e){}finally{addressBusy=false}
  }

  /* First pass after GPS appears, then refresh when the user moves. */
  setTimeout(()=>refreshRealAddress(true),2500);
  setInterval(()=>refreshRealAddress(false),15000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(()=>refreshRealAddress(true),800)});

  const css=document.createElement("style");
  css.textContent=`
    /* LOCATION is a fixed, non-scrolling screen on phones. */
    html,body{height:100%!important;min-height:100%!important;overflow:hidden!important;background:linear-gradient(145deg,#35afe9 0%,#6fd1f4 42%,#dff7ff 100%)!important}
    body{background:linear-gradient(145deg,#35afe9 0%,#6fd1f4 42%,#dff7ff 100%)!important}
    .app{height:100dvh!important;min-height:100dvh!important;max-height:100dvh!important;overflow:hidden!important;background:linear-gradient(145deg,#35afe9 0%,#6fd1f4 42%,#dff7ff 100%)!important}

    /* MAP buttons are pinned to the bottom of the viewport, not below the map. */
    .fullscreen-view .map-actions{position:absolute!important;left:10px!important;right:10px!important;bottom:calc(env(safe-area-inset-bottom) + 10px)!important;z-index:50!important;margin:0!important;padding:8px!important;display:flex!important;gap:7px!important;background:rgba(255,255,255,.82)!important;border:1px solid rgba(255,255,255,.98)!important;border-radius:16px!important;box-shadow:0 -3px 14px rgba(18,78,130,.14)!important}
    .fullscreen-view .map-actions a{flex:1 1 0!important;min-width:0!important;text-align:center!important;padding:11px 5px!important;white-space:nowrap!important}
    .fullscreen-view:has(.fullscreen-map) .fullscreen-content{position:relative!important;padding-bottom:calc(env(safe-area-inset-bottom) + 88px)!important}
    .fullscreen-view:has(.fullscreen-map) .fullscreen-map{flex:1 1 auto!important;min-height:0!important}

    /* Hide the diagnostic line under the PLACES search box. */
    #placeSearchStatus{display:none!important}

    /* Compact Places categories: about half the previous 68px height. */
    .places-category-list{gap:5px!important;padding-top:1px!important}
    .places-category{min-height:34px!important;height:34px!important;padding:4px 10px!important;border-radius:10px!important;gap:8px!important;font-size:14px!important}
    .places-category .cat-icon{width:24px!important;flex-basis:24px!important;font-size:17px!important}
    .places-category .cat-arrow{font-size:16px!important}
    .places-category .cat-name{line-height:1!important}

    /* Places screen uses the same pleasant gradient rather than flat pale blue. */
    .fullscreen-view{background:linear-gradient(145deg,#e5f8ff 0%,#b8e9fa 48%,#dff7ff 100%)!important}
    .fullscreen-content{background:transparent!important}

    @media(max-width:600px){
      .fullscreen-view .map-actions{left:10px!important;right:10px!important}
      .fullscreen-view .map-actions a{font-size:11px!important;padding:11px 4px!important}
    }
  `;
  document.head.appendChild(css);
})();
