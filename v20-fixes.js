/* GPS Viewer v20: small data/font fixes only */
(function(){
  const $=id=>document.getElementById(id);

  /* Post Office: always show PIN first, then the office name. */
  function formatPostOffice(){
    const el=$("postOffice"); if(!el)return;
    const raw=el.textContent.trim(); if(!raw||raw==="—"||raw.includes("Finding")||raw==="Not available")return;
    let pin="",name=raw;
    const m=raw.match(/(\d{6})/); if(m){pin=m[1];name=raw.replace(/\s*\(?\d{6}\)?\s*/g," ").trim().replace(/[()]/g,"").trim()}
    if(!pin){const line=$("addressLine3")?.textContent||"",p=line.match(/\b\d{6}\b/);if(p){pin=p[0];}}
    if(pin)el.innerHTML=`<span class="po-pin">${pin}</span><span class="po-name">${name}</span>`;
    else el.innerHTML=`<span class="po-name solo">${name}</span>`;
    el.classList.toggle("po-long",name.length>16);
  }
  const po=$("postOffice");
  if(po)new MutationObserver(formatPostOffice).observe(po,{childList:true,characterData:true,subtree:true});
  setTimeout(formatPostOffice,50);

  /* Weather: fill the two fields that the existing Worker may omit.
     Open-Meteo supplies current visibility and UV index for the exact GPS point. */
  let lastWeatherFix=0;
  async function fillWeatherExtras(){
    if(!navigator.onLine||Date.now()-lastWeatherFix<10*60*1000)return;
    const latText=$("lat")?.textContent||"",lonText=$("lon")?.textContent||"";
    const la=latText.match(/[-+]?\d+(?:\.\d+)?/),lo=lonText.match(/[-+]?\d+(?:\.\d+)?/);
    if(!la||!lo)return;
    lastWeatherFix=Date.now();
    try{
      const u=new URL("https://api.open-meteo.com/v1/forecast");
      u.searchParams.set("latitude",la[0]);u.searchParams.set("longitude",lo[0]);
      u.searchParams.set("current","visibility,uv_index");u.searchParams.set("timezone","auto");
      const r=await fetch(u,{cache:"no-store"});if(!r.ok)return;const j=await r.json(),c=j?.current||{};
      if(c.visibility!=null&&$("visibility"))$("visibility").textContent=(Number(c.visibility)/1000).toFixed(1)+" km";
      if(c.uv_index!=null&&$("uv"))$("uv").textContent=String(Math.round(Number(c.uv_index)));
    }catch(e){}
  }
  setTimeout(fillWeatherExtras,1800);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)fillWeatherExtras()});

  const s=document.createElement("style");s.textContent=`
    /* DIGIPIN/Post Office are the first coordinate-information row. */
    .metric .po-pin{display:block;font-size:12px;line-height:1;font-weight:700;letter-spacing:.1px;margin-bottom:2px;}
    .metric .po-name{display:block;font-size:17px;line-height:1.02;font-weight:760;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
    .metric .po-name.solo{font-size:17px;}
    .metric.po-long .po-name{font-size:14px;}
    #postOffice{display:flex!important;flex-direction:column!important;justify-content:center!important;min-width:0;}
    @media(max-height:760px){.metric .po-pin{font-size:10px}.metric .po-name,.metric .po-name.solo{font-size:14px}.metric.po-long .po-name{font-size:12px}}
  `;document.head.appendChild(s);
})();
