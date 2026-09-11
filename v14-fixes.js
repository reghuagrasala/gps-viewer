/* GPS Viewer v14 fixes */
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#039;"}[m]));
  const localGet=(k)=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
  const localSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

  /* The Worker returns flat HERE fields. Read those directly instead of
     requiring an OpenAPI-style nested address object. */
  window.renderPlace=function(d,source="LIVE"){
    if(!d)return;
    $("addressLine2")?.classList.remove("loading-blink");
    $("addressLine3")?.classList.remove("loading-blink");

    const p=(d.primaryLocation&&typeof d.primaryLocation==="object")?d.primaryLocation:{};
    const a=(d.address&&typeof d.address==="object")?d.address:{};
    const currentPlace=typeof d.currentPlace==="string"?d.currentPlace.trim():"";
    const place=typeof d.place==="string"?d.place.trim():"";
    const primaryName=typeof p.name==="string"?p.name.trim():"";
    const label=String(a.label||d.label||d.displayName||"").trim();
    const placeName=primaryName||currentPlace||place||label||"Location identified";

    $("placeName").textContent=placeName;
    $("placeIcon").textContent=(typeof window.placeEmoji==="function")?window.placeEmoji(p.type||p.category||d.resultType||""):"⌖";

    const road=String(a.street||a.road||a.streetName||d.road||"").trim();
    const house=String(a.houseNumber||a.house||d.houseNumber||"").trim();
    const locality=String(a.district||a.subdistrict||a.subDistrict||a.locality||a.neighbourhood||a.neighborhood||d.district||d.county||"").trim();
    const city=String(a.city||a.town||a.county||d.city||"").trim();
    const state=String(a.state||a.stateName||d.state||"").trim();
    const pin=String(a.postalCode||a.postcode||a.postal_code||d.postalCode||"").trim();

    let line2=[house,road].filter(Boolean).join(" ").trim();
    if(!line2&&label){const first=label.split(",")[0]?.trim();if(first&&first!==placeName)line2=first}
    const parts=[locality,city&&city!==locality?city:"",state].filter(Boolean);
    let line3=parts.join(", ");
    if(pin)line3=line3?`${line3} - ${pin}`:pin;

    $("addressLine2").textContent=line2;
    $("addressLine3").textContent=line3||label;

    const po=String(d.postOffice||d.postOfficeName||d.postalOffice||d.postalOfficeName||a.postOffice||a.postOfficeName||"").trim();
    $("postOffice").textContent=po||(pin?"Finding post office…":"—");

    localSet("gpsViewer.lastAddress",{...a,line2,line3,label,postalCode:pin,postOffice:po});
    localSet("gpsViewer.lastPlace",{primaryLocation:{name:placeName},address:{...a,postalCode:pin,postOffice:po}});
    $("addressLine3").title=source+(source==="LIVE"?"":" • OFFLINE CACHE");

    /* Keep the existing India Post lookup as a fallback when the Worker did
       not include a post-office name. */
    if(!po&&pin&&typeof window.fetchPostOffice==="function")window.fetchPostOffice(pin);
  };

  /* On iPhone, window.open(...,"_blank") creates a new Safari tab. Pressing
     Back there can expose Safari's blank start page. Navigate in the current
     tab so Back returns to GPS Viewer. */
  window.openNearbySearch=function(query,provider="google"){
    const q=String(query||"").trim();
    const lat=window.lastPosition?.coords?.latitude;
    const lon=window.lastPosition?.coords?.longitude;
    if(!q)return;
    if(lat==null||lon==null){
      const s=$("placeSearchStatus");if(s){s.textContent="Waiting for GPS location…";s.classList.add("loading-blink")}return;
    }
    const text=encodeURIComponent(`${q} near ${lat},${lon}`);
    const url=provider==="mappls"
      ?`https://mappls.com/${encodeURIComponent(q)}/near/${lat},${lon}`
      :`https://www.google.com/maps/search/?api=1&query=${text}`;
    window.location.assign(url);
  };

  /* HERE result cards should use the same-tab navigation too. */
  window.placeListHTML=function(places){
    const arr=Array.isArray(places)?places:[];
    return '<div class="place-list large">'+arr.slice(0,20).map(x=>{
      const name=esc(x?.name||"Unnamed place");
      const type=esc(x?.category||x?.type||"Place");
      const dist=x?.distanceM!=null?" • "+Math.round(x.distanceM)+" m":"";
      const q=encodeURIComponent(x?.name||"");
      const lat=window.lastPosition?.coords?.latitude,lon=window.lastPosition?.coords?.longitude;
      const href=lat!=null&&lon!=null?`https://www.google.com/maps/search/?api=1&query=${q}%20near%20${lat},${lon}`:"#";
      return `<div class="places-result-card"><b>${name}</b><small>${type}${dist}</small><a href="${href}" style="font-size:11px;color:#0875ed;text-decoration:none">Open on map ›</a></div>`;
    }).join("")+"</div>";
  };

  /* Prevent old fixed-position v13 rules from covering the weather cards.
     The navigation is now a normal block immediately after weather, with the
     footer directly underneath it. The page background continues to the end. */
  const css=document.createElement("style");
  css.textContent=`
    html,body{min-height:100%;height:auto;background:linear-gradient(145deg,#3fb8f0 0%,#8bdcf8 50%,#d7f4ff 100%)!important}
    body{min-height:100dvh;overflow-x:hidden;overflow-y:auto!important}
    .app{height:auto!important;min-height:100dvh!important;overflow:visible!important;padding-bottom:10px!important;background:linear-gradient(145deg,#3fb8f0 0%,#8bdcf8 50%,#d7f4ff 100%)}
    .tabs{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;width:100%!important;height:60px!important;flex:0 0 60px!important;margin:6px 0 0!important;z-index:50!important}
    footer{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;width:100%!important;height:20px!important;flex:0 0 20px!important;margin:2px 0 0!important;font-size:10px!important;line-height:20px!important;z-index:51!important}
    .weather-grid{margin-bottom:0!important}
    .fullscreen-view{z-index:1000!important}
  `;
  document.head.appendChild(css);
})();
