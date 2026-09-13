/* GPS Viewer v21: requested font/order/weather-data fixes only */
(function(){
  const $=id=>document.getElementById(id);

  /* Guarantee DIGIPIN + POST OFFICE row is above latitude/longitude. */
  function movePostalRow(){
    const app=document.querySelector("main.app"),digi=$("digipin"),address=document.querySelector(".address-card");
    if(!app||!digi||!address)return;
    const row=digi.closest("section.two-col");
    if(row)address.insertAdjacentElement("afterend",row);
  }
  movePostalRow();

  /* PIN is always a separate first line; office name is second. */
  let poBusy=false;
  function formatPostOffice(){
    const el=$("postOffice");if(!el||poBusy)return;
    const raw=el.textContent.trim();
    if(!raw||raw==="—"||raw.includes("Finding")||raw==="Not available")return;
    let pin="",name=raw;
    const m=raw.match(/\b(\d{6})\b/);
    if(m){pin=m[1];name=raw.replace(/\s*\(?\d{6}\)?\s*/g," ").replace(/[()]/g," ").replace(/\s+/g," ").trim();}
    if(!pin){const line=$("addressLine3")?.textContent||"";const p=line.match(/\b(\d{6})\b/);if(p)pin=p[1];}
    poBusy=true;
    el.innerHTML=pin?`<span class="po-pin">${pin}</span><span class="po-name">${name}</span>`:`<span class="po-name solo">${name}</span>`;
    el.classList.toggle("po-long",name.length>16);poBusy=false;
  }
  const po=$("postOffice");
  if(po)new MutationObserver(formatPostOffice).observe(po,{childList:true,characterData:true,subtree:true});
  setTimeout(formatPostOffice,100);

  /* Ask Open-Meteo directly for current visibility and UV. Retry while the
     weather card is still empty, because the main weather request can finish
     before the extras request has a GPS coordinate to use. */
  let busy=false,lastAttempt=0;
  async function fillWeatherExtras(force=false){
    if(!navigator.onLine||busy)return;
    if(!force&&Date.now()-lastAttempt<60000)return;
    const lt=$("lat")?.textContent||"",ln=$("lon")?.textContent||"";
    const la=lt.match(/[-+]?\d+(?:\.\d+)?/),lo=ln.match(/[-+]?\d+(?:\.\d+)?/);
    if(!la||!lo)return;
    lastAttempt=Date.now();busy=true;
    try{
      const u=new URL("https://api.open-meteo.com/v1/forecast");
      u.searchParams.set("latitude",la[0]);u.searchParams.set("longitude",lo[0]);
      u.searchParams.set("current","visibility,uv_index");u.searchParams.set("timezone","auto");
      const r=await fetch(u,{cache:"no-store"});
      if(!r.ok)return;
      const c=(await r.json())?.current||{};
      if(Number.isFinite(Number(c.visibility))&&$("visibility"))$("visibility").textContent=(Number(c.visibility)/1000).toFixed(1)+" km";
      if(Number.isFinite(Number(c.uv_index))&&$("uv"))$("uv").textContent=String(Math.round(Number(c.uv_index)));
    }catch(e){}finally{busy=false}
  }
  const retry=setInterval(()=>{
    const v=$("visibility")?.textContent?.trim(),u=$("uv")?.textContent?.trim();
    if((!v||v==="—")||(!u||u==="—"))fillWeatherExtras(true);
    else clearInterval(retry);
  },3000);
  setTimeout(()=>fillWeatherExtras(true),1200);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)fillWeatherExtras(true)});

  const s=document.createElement("style");s.textContent=`
    #postOffice{display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:flex-start!important;min-width:0!important;overflow:hidden!important}
    #postOffice .po-pin{display:block!important;font-size:16px!important;line-height:1.05!important;font-weight:800!important;white-space:nowrap!important}
    #postOffice .po-name{display:block!important;max-width:100%!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;font-size:17px!important;line-height:1.05!important;font-weight:760!important}
    #postOffice.po-long .po-name{font-size:14px!important}
    @media(min-width:700px){#postOffice .po-pin{font-size:17px!important}#postOffice .po-name{font-size:18px!important}#postOffice.po-long .po-name{font-size:16px!important}}
    @media(max-width:520px){#postOffice .po-pin{font-size:14px!important}#postOffice .po-name{font-size:15px!important}#postOffice.po-long .po-name{font-size:12px!important}}
    @media(max-height:760px){#postOffice .po-pin{font-size:13px!important}#postOffice .po-name{font-size:14px!important}#postOffice.po-long .po-name{font-size:12px!important}}
  `;document.head.appendChild(s);
})();
