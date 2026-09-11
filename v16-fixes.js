/* GPS Viewer v16 layout + refresh fixes */
(function(){
  const $=id=>document.getElementById(id);
  const API_BASE=(window.GPS_VIEWER_CONFIG&&window.GPS_VIEWER_CONFIG.apiBase)||"https://my-location-here.hrcvb7p7r5.workers.dev";
  let refreshBusy=false,lastWeatherRefresh=0;

  function liveCoords(){
    const lt=$("lat")?.textContent||"",ln=$("lon")?.textContent||"";
    const lm=lt.match(/[-+]?\d+(?:\.\d+)?/),nm=ln.match(/[-+]?\d+(?:\.\d+)?/);
    const lat=lm?Number(lm[0]):NaN,lon=nm?Number(nm[0]):NaN;
    return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
  }

  async function refreshData(){
    if(refreshBusy||document.hidden||!navigator.onLine)return;
    const gpsBtn=$("gpsStatus"),dataBtn=$("dataStatus");
    if(gpsBtn&&gpsBtn.querySelector("b")?.textContent.includes("OFF"))return;
    if(dataBtn&&dataBtn.querySelector("b")?.textContent.includes("OFF"))return;
    const p=liveCoords();
    if(!p||typeof window.reverseGeocode!=="function")return;
    refreshBusy=true;
    try{
      await window.reverseGeocode(p.lat,p.lon);
      const now=Date.now();
      if(typeof window.fetchWeather==="function"&&now-lastWeatherRefresh>=300000){
        lastWeatherRefresh=now;
        await window.fetchWeather(p.lat,p.lon,true);
      }
    }catch(e){}
    refreshBusy=false;
  }

  /* app.js keeps watchPosition as the source of live GPS updates. These timers
     refresh network-derived address data every minute and weather at most every
     five minutes, while skipping background tabs to reduce battery/network use. */
  const scheduleRefresh=()=>{if(!document.hidden)refreshData()};
  setTimeout(scheduleRefresh,45000);
  setInterval(scheduleRefresh,60000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(scheduleRefresh,1200)});
  window.addEventListener("online",()=>setTimeout(scheduleRefresh,1200));

  const css=document.createElement("style");
  css.textContent=`
    html,body{min-height:100dvh!important;background:linear-gradient(145deg,#3fb8f0 0%,#8bdcf8 50%,#d7f4ff 100%)!important}
    body{overflow-x:hidden!important;overflow-y:auto!important}
    .app{height:100dvh!important;min-height:100dvh!important;max-height:none!important;overflow:visible!important;display:flex!important;flex-direction:column!important;padding-bottom:0!important;background:linear-gradient(145deg,#3fb8f0 0%,#8bdcf8 50%,#d7f4ff 100%)!important}

    /* Consistent, taller address typography for one, two or three visible lines. */
    .address-line{font-size:15px!important;line-height:1.18!important;min-height:18px!important;font-weight:500!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    .address-content{display:flex!important;flex-direction:column!important;justify-content:center!important;min-height:0!important}
    .place-name{line-height:1.08!important}

    /* LOCATION: push the three navigation buttons toward the bottom of the page. */
    .tabs{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;width:100%!important;flex:0 0 60px!important;height:60px!important;margin:6px 0 0!important;z-index:50!important}
    .tabs button{min-height:58px!important;justify-content:center!important;align-items:center!important;gap:2px!important;text-align:center!important;line-height:1!important}
    .tabs button span{display:block!important;line-height:1.05!important;text-align:center!important;white-space:nowrap!important}
    footer{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;width:100%!important;flex:0 0 18px!important;height:18px!important;margin:2px 0 0!important;padding:0!important;text-align:center!important;line-height:18px!important;font-size:9px!important;overflow:hidden!important}

    /* MAP + PLACES: the full-screen view itself fills the device viewport. */
    .fullscreen-view{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;min-height:100dvh!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;background:linear-gradient(145deg,#e9f9ff 0%,#bfeeff 100%)!important;padding:0!important}
    .fullscreen-back{position:absolute!important;left:16px!important;top:calc(env(safe-area-inset-top) + 10px)!important;z-index:100!important;min-width:112px!important;height:52px!important;padding:0 17px!important;border:2px solid rgba(255,255,255,.98)!important;border-radius:17px!important;background:#fff!important;color:#10295f!important;box-shadow:0 4px 14px rgba(18,78,130,.25)!important;font:700 19px/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",Arial,sans-serif!important}
    .fullscreen-back:active{transform:scale(.97)!important;background:#eef8ff!important}
    .fullscreen-content{width:100%!important;height:100%!important;min-height:0!important;box-sizing:border-box!important;padding:calc(env(safe-area-inset-top) + 92px) 14px calc(env(safe-area-inset-bottom) + 10px)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
    .fullscreen-content .map-title{flex:0 0 24px!important;height:24px!important;margin:0 0 5px!important}
    .fullscreen-content .map-title h2{margin:0!important;line-height:24px!important}
    .fullscreen-content .map-current{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    .fullscreen-map{flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;border:0!important;border-radius:16px!important;background:#d9f2ff!important;box-shadow:0 3px 12px rgba(18,78,130,.16)!important}
    .map-actions{flex:0 0 auto!important;display:flex!important;align-items:stretch!important;gap:7px!important;margin:8px 0 0!important;padding:8px!important;background:rgba(255,255,255,.72)!important;border:1px solid rgba(255,255,255,.95)!important;border-radius:16px!important;box-shadow:0 3px 10px rgba(18,78,130,.10)!important}
    .map-actions a{flex:1 1 0!important;min-width:0!important;text-align:center!important;white-space:nowrap!important;padding:11px 5px!important;border-radius:12px!important;font-size:12px!important;line-height:1.05!important}

    /* PLACES: category list occupies all remaining vertical space. */
    .places-screen{flex:1 1 auto!important;height:auto!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
    .places-screen .map-title{flex:0 0 24px!important}
    .places-search{flex:0 0 auto!important}
    .places-screen #placeSearchStatus{flex:0 0 auto!important;margin-bottom:6px!important}
    .places-category-list{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;padding:2px 1px 8px!important;-webkit-overflow-scrolling:touch!important}
    .places-category{flex:0 0 auto!important;min-height:68px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;text-align:left!important}
    .places-category .cat-name{line-height:1.1!important;text-align:left!important}
    .places-results{flex:0 0 auto!important;max-height:28dvh!important;overflow:auto!important}

    @media(max-width:600px){
      .fullscreen-content{padding-left:10px!important;padding-right:10px!important}
      .fullscreen-back{left:12px!important;min-width:118px!important;height:54px!important;font-size:20px!important}
      .map-actions{margin-left:-1px!important;margin-right:-1px!important}
      .map-actions a{font-size:11px!important;padding:11px 4px!important}
    }
    @media(max-height:760px){
      .tabs{height:52px!important;flex-basis:52px!important}
      .tabs button{min-height:50px!important}
      footer{height:15px!important;flex-basis:15px!important;line-height:15px!important}
      .fullscreen-content{padding-top:calc(env(safe-area-inset-top) + 82px)!important}
      .fullscreen-back{height:48px!important;min-width:104px!important;font-size:18px!important}
    }
  `;
  document.head.appendChild(css);
})();
