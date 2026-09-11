/* GPS Viewer v15 fixes */
(function(){
  const $=id=>document.getElementById(id);
  const localGet=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
  const localSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const API_BASE=(window.GPS_VIEWER_CONFIG&&window.GPS_VIEWER_CONFIG.apiBase)||"https://my-location-here.hrcvb7p7r5.workers.dev";

  /* ---------- Post Office ---------- */
  async function lookupPostOffice(){
    const el=$("postOffice");
    if(!el)return;
    const line3=$("addressLine3")?.textContent||"";
    const line2=$("addressLine2")?.textContent||"";
    const place=$("placeName")?.textContent||"";
    const text=[line3,line2,place].join(" ");
    const m=text.match(/\b(\d{6})\b/);
    if(!m)return;
    const pin=m[1], key="gpsViewer.postOffice."+pin;
    const cached=localGet(key);
    if(cached?.name){el.textContent=cached.name;return}
    if(el.textContent.trim()==="—"||el.textContent.trim()==="Not available")el.textContent="Finding post office…";
    if(!navigator.onLine)return;
    try{
      const ctl=new AbortController();
      const timer=setTimeout(()=>ctl.abort(),9000);
      const r=await fetch(`https://api.postalpincode.in/pincode/${pin}`,{cache:"no-store",signal:ctl.signal});
      clearTimeout(timer);
      if(!r.ok)throw new Error("HTTP "+r.status);
      const j=await r.json();
      const rows=Array.isArray(j)&&Array.isArray(j[0]?.PostOffice)?j[0].PostOffice:[];
      if(!rows.length)throw new Error("No post office data");
      const preferred=rows.find(x=>/sub post office/i.test(String(x?.BranchType||"")))||rows.find(x=>/head post office/i.test(String(x?.BranchType||"")))||rows[0];
      const name=preferred?.Name?`${preferred.Name}${preferred.Pincode?` (${preferred.Pincode})`:""}`:"";
      if(!name)throw new Error("No office name");
      el.textContent=name;
      localSet(key,{name});
    }catch(e){
      if(el.textContent.trim()==="Finding post office…")el.textContent="Finding post office…";
    }
  }
  lookupPostOffice();
  setTimeout(lookupPostOffice,2500);
  setTimeout(lookupPostOffice,6000);
  setInterval(lookupPostOffice,15000);

  /* ---------- Prefer the named HERE place over an address/building code ---------- */
  function liveCoords(){
    const lt=$("lat")?.textContent||"", ln=$("lon")?.textContent||"";
    const lm=lt.match(/[-+]?\d+(?:\.\d+)?/), nm=ln.match(/[-+]?\d+(?:\.\d+)?/);
    const lat=lm?Number(lm[0]):NaN, lon=nm?Number(nm[0]):NaN;
    if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
    return null;
  }

  function looksLikeCode(v){
    const s=String(v||"").trim();
    return !s || /^(?:[A-Z]{2,6}[- ]?\d{1,5}|[A-Z]{1,5}\d{1,5})$/i.test(s);
  }
  function valueName(v){
    if(typeof v==="string")return v.trim();
    if(v&&typeof v==="object")return String(v.name||v.title||v.label||v.currentPlace||"").trim();
    return "";
  }

  let lastNamedLookup=0;
  async function refreshNamedPlace(force=false){
    const pos=liveCoords();
    const el=$("placeName");
    if(!pos||!el||!navigator.onLine)return;
    const existing=el.textContent.trim();
    if(!force&&!looksLikeCode(existing))return;
    const now=Date.now();
    if(!force&&now-lastNamedLookup<30000)return;
    lastNamedLookup=now;
    try{
      const ctl=new AbortController();
      const timer=setTimeout(()=>ctl.abort(),9000);
      const u=new URL(API_BASE.replace(/\/$/,"")+"/api/reverse");
      u.searchParams.set("lat",pos.lat);u.searchParams.set("lon",pos.lon);u.searchParams.set("_",String(Date.now()));
      const r=await fetch(u.toString(),{cache:"no-store",signal:ctl.signal,headers:{Accept:"application/json"}});
      clearTimeout(timer);
      if(!r.ok)return;
      const d=await r.json();
      const candidates=[
        valueName(d?.currentPlace),
        valueName(d?.primaryPlace),
        valueName(d?.primaryLocation),
        valueName(d?.place),
        valueName(d?.currentPlaceName),
        valueName(d?.placeName)
      ];
      const named=candidates.find(v=>v&&!looksLikeCode(v));
      if(named){
        el.textContent=named;
        el.title=`HERE place • ${pos.lat.toFixed(6)}, ${pos.lon.toFixed(6)}`;
        const p=localGet("gpsViewer.lastPlace")||{};
        p.primaryLocation={...(p.primaryLocation||{}),name:named};
        localSet("gpsViewer.lastPlace",p);
      }
    }catch(e){}
  }
  setTimeout(()=>refreshNamedPlace(true),3500);
  setInterval(()=>refreshNamedPlace(false),10000);

  /* ---------- Exact live GPS used by Places search ---------- */
  function openGoogleMapsSearch(query){
    const q=String(query||"").trim();
    if(!q)return;
    const pos=liveCoords();
    const status=$("placeSearchStatus");
    if(!pos){if(status)status.textContent="Waiting for current GPS location…";return}
    /* iOS Google Maps officially supports q + center for nearby searches. */
    const url=`comgooglemaps://?q=${encodeURIComponent(q)}&center=${pos.lat.toFixed(6)},${pos.lon.toFixed(6)}&zoom=17`;
    if(status)status.textContent=`Google Maps search • ${pos.lat.toFixed(6)}, ${pos.lon.toFixed(6)}`;
    window.location.href=url;
  }

  document.addEventListener("click",function(e){
    const category=e.target.closest?.(".places-category");
    if(category){
      e.preventDefault();e.stopImmediatePropagation();
      openGoogleMapsSearch(category.dataset.q||category.querySelector(".cat-name")?.textContent||"");
      return;
    }
    const btn=e.target.closest?.("#placeSearchBtn");
    if(btn){
      e.preventDefault();e.stopImmediatePropagation();
      openGoogleMapsSearch($("placeSearchInput")?.value?.trim()||"");
      return;
    }
    const link=e.target.closest?.(".places-result-card a");
    if(link){
      e.preventDefault();e.stopImmediatePropagation();
      const card=link.closest(".places-result-card");
      openGoogleMapsSearch(card?.querySelector("b")?.textContent?.trim()||"");
    }
  },true);
  window.openNearbySearch=openGoogleMapsSearch;

  /* ---------- Mobile layout and map buttons ---------- */
  const css=document.createElement("style");
  css.textContent=`
    html{height:auto!important;min-height:100%!important;background:linear-gradient(145deg,#3fb8f0 0%,#8bdcf8 50%,#d7f4ff 100%)!important}
    body{height:auto!important;min-height:100vh!important;min-height:100dvh!important;overflow-x:hidden!important;overflow-y:auto!important;background:linear-gradient(145deg,#3fb8f0 0%,#8bdcf8 50%,#d7f4ff 100%)!important}
    .app{height:auto!important;min-height:100vh!important;min-height:100dvh!important;max-height:none!important;overflow:visible!important;padding-bottom:8px!important;background:linear-gradient(145deg,#3fb8f0 0%,#8bdcf8 50%,#d7f4ff 100%)!important}
    .tabs{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;width:100%!important;height:60px!important;flex:0 0 60px!important;margin:6px 0 0!important;z-index:50!important}
    .tabs button{min-height:58px!important}
    footer{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;width:100%!important;height:18px!important;flex:0 0 18px!important;margin:1px 0 0!important;padding:0!important;font-size:9px!important;line-height:18px!important;z-index:51!important}
    .fullscreen-view{z-index:1000!important}
    @media(max-width:600px){
      .fullscreen-content{padding-left:10px!important;padding-right:10px!important;padding-bottom:calc(14px + env(safe-area-inset-bottom))!important}
      .fullscreen-map{height:calc(100dvh - 270px)!important;min-height:210px!important}
      .map-actions{position:sticky!important;bottom:0!important;z-index:20!important;display:flex!important;flex-wrap:wrap!important;gap:7px!important;padding:8px!important;margin:8px -2px 0!important;background:rgba(231,249,255,.96)!important;border:1px solid rgba(255,255,255,.95)!important;border-radius:14px!important;box-shadow:0 -3px 10px rgba(18,78,130,.12)!important}
      .map-actions a{flex:1 1 30%!important;min-width:0!important;text-align:center!important;white-space:nowrap!important;padding:10px 6px!important;font-size:12px!important}
    }
    @media(max-height:760px){.tabs{height:52px!important;flex-basis:52px!important}.tabs button{min-height:50px!important}footer{height:15px!important;flex-basis:15px!important;line-height:15px!important}}
  `;
  document.head.appendChild(css);
})();
