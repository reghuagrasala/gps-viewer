/* GPS Viewer v19 fixes */
(function(){
  const $=id=>document.getElementById(id);
  let live=null,liveAt=0,lastClean=0;
  function screenPos(){
    const a=$("lat")?.textContent||"",b=$("lon")?.textContent||"",q=$("accuracy")?.textContent||"";
    const x=a.match(/[-+]?\d+(?:\.\d+)?/),y=b.match(/[-+]?\d+(?:\.\d+)?/),z=q.match(/\d+(?:\.\d+)?/);
    if(!x||!y)return null;return {lat:+x[0],lon:+y[0],accuracy:z?+z[0]:999};
  }
  if(navigator.geolocation)navigator.geolocation.watchPosition(p=>{live=p;liveAt=Date.now()},()=>{},{enableHighAccuracy:true,maximumAge:2000,timeout:6000});
  [$("lat"),$("lon"),$("accuracy")].filter(Boolean).forEach(el=>new MutationObserver(()=>{const p=screenPos();if(p){live=p;liveAt=Date.now()}}).observe(el,{childList:true,characterData:true,subtree:true}));
  function good(){
    const p=live||screenPos(); if(!p)return null; const c=p.coords||p;
    return Number.isFinite(c.latitude)&&Number.isFinite(c.longitude)&&Number(c.accuracy)<=100&&(Date.now()-liveAt)<=15000)?{lat:c.latitude,lon:c.longitude,accuracy:Number(c.accuracy)}:null;
  }
  function fresh(){return new Promise((ok,no)=>navigator.geolocation?.getCurrentPosition(ok,no,{enableHighAccuracy:true,maximumAge:0,timeout:7000})||no(new Error("gps")))}
  function ios(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)}
  async function maps(q){
    q=String(q||"").trim();if(!q)return;let p=good();
    if(!p){try{const r=await fresh(),c=r.coords;if(!Number.isFinite(c.accuracy)||c.accuracy>500)return;p={lat:c.latitude,lon:c.longitude,accuracy:c.accuracy}}catch(e){return}}
    const lat=p.lat.toFixed(6),lon=p.lon.toFixed(6);
    if(ios())location.href=`comgooglemaps://?q=${encodeURIComponent(q)}&center=${lat},${lon}&zoom=17`;
    else window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q+" near "+lat+","+lon)}`,"_blank","noopener,noreferrer");
  }
  document.addEventListener("click",e=>{
    const c=e.target.closest?.(".places-category"),b=e.target.closest?.("#placeSearchBtn"),r=e.target.closest?.(".places-result-card a");
    if(c||b||r){e.preventDefault();e.stopImmediatePropagation();maps(c?.dataset.q||b&&$("placeSearchInput")?.value||r?.closest(".places-result-card")?.querySelector("b")?.textContent||"")}
  },true);
  function t(v){if(typeof v==="string")return v.trim();if(v&&typeof v==="object")return String(v.name||v.title||v.label||v.currentPlace||v.displayName||"").trim();return ""}
  function code(v){return !v||/^(?:[A-Z]{2,6}[- ]?\d{1,5}|[A-Z]{1,5}\d{1,5})$/i.test(String(v).trim())}
  async function clean(){
    const p=good()||screenPos();if(!p||!navigator.onLine||Date.now()-lastClean<15000)return;lastClean=Date.now();
    try{
      const u=new URL(((window.GPS_VIEWER_CONFIG&&window.GPS_VIEWER_CONFIG.apiBase)||"https://my-location-here.hrcvb7p7r5.workers.dev").replace(/\/$/,"")+"/api/reverse");u.searchParams.set("lat",p.lat);u.searchParams.set("lon",p.lon);u.searchParams.set("_",Date.now());
      const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),7000),r=await fetch(u,{cache:"no-store",signal:ctl.signal});clearTimeout(tm);if(!r.ok)return;const d=await r.json(),a=d?.address||{};
      const place=[d.currentPlace,d.currentPlaceName,d.primaryPlace,d.primaryLocation,d.place,d.placeName].map(t).find(v=>v&&!code(v));
      const road=t(d.road)||t(a.road)||t(a.street)||t(a.streetName),house=t(d.houseNumber)||t(a.houseNumber);
      const locality=t(d.district)||t(a.district)||t(a.locality)||t(a.neighbourhood)||t(a.neighborhood),city=t(d.city)||t(a.city)||t(a.town)||t(a.county),state=t(d.state)||t(a.state)||t(a.stateName),pin=t(d.postalCode)||t(a.postalCode)||t(a.postcode),label=t(d.label)||t(a.label);
      const l2=code([house,road].filter(Boolean).join(" ").trim())?"": [house,road].filter(Boolean).join(" ").trim();
      let l3=[locality,city,state].filter((v,i,x)=>v&&!code(v)&&x.indexOf(v)===i).join(", ");if(pin)l3=l3?l3+" - "+pin:pin;if(!l3&&!code(label))l3=label;
      if(place&&$("placeName"))$("placeName").textContent=place;if($("addressLine2"))$("addressLine2").textContent=l2;if($("addressLine3"))$("addressLine3").textContent=l3;
    }catch(e){}
  }
  setTimeout(clean,1200);setInterval(clean,15000);
  const s=document.createElement("style");s.textContent=`
html,body{width:100%!important;height:100%!important;min-height:100%!important;background:linear-gradient(145deg,#36b1ea 0%,#72d4f5 45%,#e4f9ff 100%)!important}
body:before{content:""!important;position:fixed!important;inset:0!important;z-index:-10!important;background:linear-gradient(145deg,#36b1ea,#e4f9ff)!important}
body:after{content:""!important;position:fixed!important;inset:0!important;z-index:-11!important;background:linear-gradient(145deg,#36b1ea,#e4f9ff)!important}
.app{width:100%!important;height:100%!important;min-height:100%!important;max-height:none!important;background:transparent!important}
.app>.tabs{position:absolute!important;left:20px!important;right:20px!important;bottom:calc(env(safe-area-inset-bottom) + 20px)!important;width:auto!important;margin:0!important;z-index:60!important}
.app>footer{position:absolute!important;left:20px!important;right:20px!important;bottom:max(2px,env(safe-area-inset-bottom))!important;width:auto!important;margin:0!important;z-index:61!important}
.fullscreen-view{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;min-height:100%!important;background:linear-gradient(145deg,#e8f9ff,#b9ebfa,#e0f8ff)!important}
.fullscreen-content{height:100%!important;min-height:100%!important;background:transparent!important}
.fullscreen-view .map-actions{position:absolute!important;left:10px!important;right:10px!important;bottom:calc(env(safe-area-inset-bottom) + 12px)!important;margin:0!important;z-index:100!important;display:flex!important;gap:7px!important;padding:8px!important;background:rgba(255,255,255,.86)!important;border-radius:16px!important}
.fullscreen-view .map-actions a{flex:1 1 0!important;min-width:0!important;text-align:center!important;white-space:nowrap!important}
.fullscreen-view:has(.fullscreen-map) .fullscreen-content{padding-bottom:90px!important;overflow:hidden!important}
.fullscreen-map{height:auto!important;min-height:0!important;flex:1 1 auto!important}
#placeSearchStatus{display:none!important}
.places-category-list{gap:5px!important;padding-bottom:8px!important}
.places-category{min-height:34px!important;height:34px!important;padding:4px 10px!important;border-radius:10px!important}
.places-category .cat-icon{width:24px!important;flex-basis:24px!important;font-size:17px!important}.places-category .cat-arrow{font-size:16px!important}.places-category .cat-name{line-height:1!important}
`;document.head.appendChild(s);
})();
