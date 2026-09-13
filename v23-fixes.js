/* GPS Viewer v23 — based on the stable v13 app. Only requested font/data fixes. */
(function(){
  const $=id=>document.getElementById(id);

  /* Post Office: keep PIN visible on line 1 and office name on line 2. */
  let poBusy=false,lastPORender="";
  function formatPO(){
    const el=$("postOffice"); if(!el||poBusy)return;
    const raw=el.textContent.replace(/\s+/g," ").trim();
    if(!raw||raw==="—"||raw.includes("Finding post office")||raw==="Not available")return;
    let pin=(raw.match(/\b\d{6}\b/)||[])[0]||"";
    const name=raw.replace(/\s*\(?\d{6}\)?\s*/g," ").replace(/\s+/g," ").trim();
    const key=pin+"|"+name;
    if(key===lastPORender)return;
    poBusy=true;
    el.innerHTML=pin?`<span class="po-pin">${pin}</span><span class="po-name">${name}</span>`:`<span class="po-name">${name}</span>`;
    el.title=pin?`${pin} ${name}`:name;
    lastPORender=key;
    poBusy=false;
  }
  const po=$("postOffice");
  if(po){
    const mo=new MutationObserver(()=>{ if(!poBusy)formatPO(); });
    mo.observe(po,{childList:true,characterData:true,subtree:true});
    [300,1000,2500,5000,9000,15000].forEach(t=>setTimeout(formatPO,t));
  }

  /* Visibility and UV: obtain current values directly when the main weather
     response does not provide them. No observer/interval loop is used. */
  async function fillWeatherExtras(){
    if(!navigator.onLine)return;
    const lt=$("lat")?.textContent||"",ln=$("lon")?.textContent||"";
    const la=lt.match(/[-+]?\d+(?:\.\d+)?/),lo=ln.match(/[-+]?\d+(?:\.\d+)?/);
    if(!la||!lo)return;
    try{
      const u=new URL("https://api.open-meteo.com/v1/forecast");
      u.searchParams.set("latitude",la[0]);u.searchParams.set("longitude",lo[0]);
      u.searchParams.set("current","visibility,uv_index");u.searchParams.set("timezone","auto");
      const r=await fetch(u,{cache:"no-store"}); if(!r.ok)return;
      const c=(await r.json())?.current||{};
      if(Number.isFinite(Number(c.visibility))&&$("visibility"))$("visibility").textContent=(Number(c.visibility)/1000).toFixed(1)+" km";
      if(Number.isFinite(Number(c.uv_index))&&$("uv"))$("uv").textContent=String(Math.round(Number(c.uv_index)));
    }catch(e){}
  }
  /* GPS values normally arrive within a few seconds. Try a few times only. */
  [1800,4500,8000].forEach(t=>setTimeout(fillWeatherExtras,t));

  const s=document.createElement("style");
  s.textContent=`
    /* Requested weather typography: date/time a little larger, temperature a little smaller. */
    .weather-top{font-size:10px!important;gap:5px!important}
    .temp-row strong{font-size:34px!important}
    /* PIN first; long office names shrink instead of hiding the PIN. */
    #postOffice{display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:flex-start!important;min-width:0!important;overflow:hidden!important}
    #postOffice .po-pin{display:block!important;font-size:14px!important;line-height:1!important;font-weight:800!important;white-space:nowrap!important}
    #postOffice .po-name{display:block!important;font-size:16px!important;line-height:1.05!important;font-weight:760!important;max-width:100%!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    @media(min-width:700px){#postOffice .po-pin{font-size:16px!important}#postOffice .po-name{font-size:18px!important}}
    @media(max-width:520px){#postOffice .po-pin{font-size:13px!important}#postOffice .po-name{font-size:14px!important}}
  `;
  document.head.appendChild(s);
})();
