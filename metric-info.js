/* GPS Viewer — tap-to-explain metric overlay */
(function(){
  const INFO={
    digipin:{
      title:"DIGIPIN",
      subtitle:"Digital Postal Index Number",
      body:"DIGIPIN is a location-based digital addressing system. It links a geographic position to a unique digital code, helping identify a precise location digitally.",
      note:"The code shown in GPS Viewer is calculated from your current GPS coordinates."
    },
    lat:{title:"Latitude",subtitle:"North–South position",body:"Latitude tells how far north or south a location is from the Equator. It is expressed in degrees. In India, latitude values are normally north of the Equator.",note:"GPS Viewer displays the latitude received from the iPhone's location system."},
    lon:{title:"Longitude",subtitle:"East–West position",body:"Longitude tells how far east or west a location is from the Prime Meridian. It is expressed in degrees.",note:"Latitude and longitude together identify a position on the Earth's surface."},
    elevation:{title:"Elevation",subtitle:"Height above mean sea level",body:"Elevation is the estimated height of the phone's location above mean sea level. GPS altitude can vary more than horizontal position.",note:"Treat small changes in GPS elevation as estimates rather than precise surveying measurements."},
    heading:{title:"Heading",subtitle:"Direction the phone is pointing",body:"Heading is the direction of travel or orientation, measured clockwise from north. 000° is north, 090° east, 180° south and 270° west.",note:"The compass may need calibration and can be affected by nearby metal, electronics and the way the phone is held."},
    accuracy:{title:"GPS Accuracy",subtitle:"Estimated position uncertainty",body:"The accuracy value in metres is an estimate of how close the reported GPS position is to your actual position. A smaller number generally indicates a more precise fix.",note:"Buildings, trees, satellite visibility and the surrounding environment can change this value."},
    speed:{title:"Speed",subtitle:"GPS-derived movement",body:"Speed is calculated from changes in your GPS position. When you are stationary, tiny GPS position changes can sometimes produce a small non-zero speed.",note:"GPS Viewer displays 0.0 km/h when the calculated movement is effectively stationary."},
    gpsDate:{title:"Date",subtitle:"Device date",body:"This is the date from the iPhone/device clock. It can continue to be displayed without mobile data.",note:"It is not a date supplied by the map or weather service."},
    gpsTime:{title:"Time",subtitle:"Device time",body:"This is the current time from the iPhone/device clock. The GPS Viewer clock continues to work when mobile data is unavailable.",note:"The displayed time follows the device's configured time settings."},
    timezone:{title:"Time Zone",subtitle:"Device time-zone setting",body:"The time zone determines how the device converts time into local clock time. GPS Viewer uses the device/browser time-zone information.",note:"A time-zone name can differ between systems even when the UTC offset is the same."},
    temperature:{title:"Temperature",subtitle:"Current air temperature",body:"Air temperature is the measured or modelled temperature of the surrounding air at the selected location. It is normally shown in degrees Celsius in GPS Viewer.",note:"Weather values come from the configured weather service and may differ slightly from a nearby thermometer."},
    feels:{title:"Feels Like",subtitle:"Apparent temperature",body:"Feels-like temperature estimates how warm or cool the air may feel by considering factors such as temperature, humidity and wind.",note:"It is an estimate, not a separate physical temperature measurement."},
    wind:{title:"Wind",subtitle:"Current wind speed and direction",body:"Wind speed describes how quickly air is moving. The direction shown indicates where the wind is coming from.",note:"Local buildings, trees and terrain can make wind at your exact position different from the weather-service estimate."},
    gusts:{title:"Wind Gusts",subtitle:"Short stronger bursts of wind",body:"Gusts are brief increases in wind speed that can be stronger than the sustained wind.",note:"A gust value is not necessarily the wind speed at every moment."},
    visibility:{title:"Visibility",subtitle:"How far objects can be seen",body:"Visibility estimates the distance at which objects can generally be distinguished in the atmosphere. Fog, rain, dust and haze can reduce it.",note:"Weather-service visibility is an environmental estimate, not a measurement of your phone's camera range."},
    humidity:{title:"Humidity",subtitle:"Moisture in the air",body:"Relative humidity is the amount of water vapour in the air compared with the maximum amount the air could hold at that temperature, expressed as a percentage.",note:"High humidity does not by itself mean that rain is occurring."},
    clouds:{title:"Cloud Cover",subtitle:"Percentage of sky covered",body:"Cloud cover estimates how much of the sky is covered by clouds, expressed as a percentage.",note:"It is a weather-model or observation value for the location and time."},
    uv:{title:"UV Index",subtitle:"Strength of ultraviolet radiation",body:"The UV Index indicates the strength of ultraviolet radiation at the Earth's surface. Higher values mean greater potential for UV exposure.",note:"UV conditions vary with time of day, season, cloud cover, altitude and location."},
    aqi:{title:"AQI",subtitle:"Air Quality Index",body:"AQI is an index used to communicate air pollution conditions in a simpler form than individual pollutant concentrations.",note:"The exact scale and categories depend on the air-quality data source."},
    pressure:{title:"Air Pressure",subtitle:"Atmospheric pressure",body:"Air pressure is the force exerted by the atmosphere. It is commonly reported in hectopascals (hPa). Changes in pressure are useful for understanding weather patterns.",note:"Pressure can vary with elevation and weather conditions."}
  };

  function valueFor(id){
    const el=document.getElementById(id);
    return el ? (el.textContent||"").trim() : "";
  }
  function ensure(){
    if(document.getElementById("metricInfoOverlay"))return;
    const o=document.createElement("div");
    o.id="metricInfoOverlay";
    o.className="metric-info-overlay";
    o.hidden=true;
    o.innerHTML='<div class="metric-info-box" role="dialog" aria-modal="true" aria-labelledby="metricInfoTitle"><div class="metric-info-badge" id="metricInfoBadge" aria-hidden="true"></div><div class="metric-info-title" id="metricInfoTitle"></div><div class="metric-info-subtitle" id="metricInfoSubtitle"></div><div class="metric-info-value" id="metricInfoValue"></div><div class="metric-info-body" id="metricInfoBody"></div><div class="metric-info-note" id="metricInfoNote"></div><div class="metric-info-hint">Tap to close</div></div>';
    document.body.appendChild(o);
    o.addEventListener("click",close);
    o.querySelector(".metric-info-box").addEventListener("click",e=>{e.stopPropagation();close()});
  }
  function open(id){
    const d=INFO[id];
    if(!d)return;
    ensure();
    const o=document.getElementById("metricInfoOverlay");
    const box=o.querySelector(".metric-info-box");
    document.getElementById("metricInfoTitle").textContent=d.title;
    document.getElementById("metricInfoSubtitle").textContent=d.subtitle||"";
    const v=valueFor(id);
    const value=document.getElementById("metricInfoValue");
    value.textContent=v&&v!=="—"?v:"";
    value.style.display=value.textContent?"block":"none";
    document.getElementById("metricInfoBody").textContent=d.body;
    document.getElementById("metricInfoNote").textContent=d.note||"";
    const badge=document.getElementById("metricInfoBadge");
    badge.textContent=id==="digipin"?"✉ INDIA POST":"ⓘ";
    badge.className="metric-info-badge"+(id==="digipin"?" postal":"");
    o.hidden=false;
    document.body.classList.add("metric-info-open");
    box.classList.remove("metric-info-pop");
    void box.offsetWidth;
    box.classList.add("metric-info-pop");
    clearTimeout(window.__metricInfoTimer);
    window.__metricInfoTimer=setTimeout(close,9000);
  }
  function close(){
    const o=document.getElementById("metricInfoOverlay");
    if(!o||o.hidden)return;
    clearTimeout(window.__metricInfoTimer);
    o.hidden=true;
    document.body.classList.remove("metric-info-open");
  }
  function bind(){
    ensure();
    const ids=Object.keys(INFO);
    ids.forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      const metric=el.closest(".metric") || el.closest(".digipin-bar");
      if(!metric || metric.dataset.infoBound)return;
      metric.dataset.infoBound="true";
      metric.classList.add("metric-info-trigger");
      metric.style.touchAction="manipulation";
      metric.setAttribute("role","button");
      metric.setAttribute("tabindex","0");
      metric.setAttribute("aria-label",(INFO[id].title||id)+" — tap for explanation");
      const handler=e=>{
        if(e.target.closest("button,a,input"))return;
        e.stopPropagation();
        open(id);
      };
      metric.addEventListener("click",handler);
      metric.addEventListener("keydown",e=>{
        if(e.key==="Enter"||e.key===" "){e.preventDefault();open(id)}
      });
    });
  }
  window.GPSViewerMetricInfo={open,close,bind};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0),{once:true});
  else setTimeout(bind,0);
})();


/* v82 — direct DIGIPIN touch target.  Bind the capsule itself, not its text span. */
(function(){
  function bindDirect(){
    const bar=document.querySelector('.digipin-bar');
    if(!bar || bar.dataset.directDigiInfo==='1')return;
    bar.dataset.directDigiInfo='1';
    const openDigi=(e)=>{
      if(e.type==='touchend')e.preventDefault();
      e.stopPropagation();
      if(window.GPSViewerMetricInfo?.open) window.GPSViewerMetricInfo.open('digipin');
    };
    bar.addEventListener('pointerup',openDigi,{passive:false});
    bar.addEventListener('touchend',openDigi,{passive:false});
    bar.addEventListener('click',openDigi);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bindDirect,150),{once:true});
  else setTimeout(bindDirect,150);
})();
