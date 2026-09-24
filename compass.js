/* Full 360° magnetic compass for the GPS Viewer PWA. */
(function(){
  let active=false, magneticHeading=null, needleAngle=null, webkitCompassAvailable=false;
  const getEl=()=>document.getElementById('heading');
  const getCard=()=>getEl()?.closest('.compass-card');
  function normalize(v){v=Number(v);if(!Number.isFinite(v))return null;return ((v%360)+360)%360}
  function rounded(v){return Math.round(v)%360}
  function dir(v){const names=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];return names[Math.round(v/22.5)%16]}
  function updateNeedle(h){const card=getCard();if(!card)return;let target=h;if(needleAngle===null)needleAngle=target;else{let delta=((target-needleAngle+180)%360)-180;needleAngle+=delta}card.style.setProperty('--needle-angle',needleAngle+'deg')}
  function show(v){const raw=normalize(v),el=getEl();if(raw===null||!el)return;const h=rounded(raw);magneticHeading=raw;const text=`${String(h).padStart(3,'0')}° (${dir(raw)})`;if(el.textContent!==text)el.textContent=text;updateNeedle(raw);el.dataset.compass='live';el.dataset.magneticHeading=String(h)}
  function screenAngle(){const a=Number(screen.orientation?.angle);return Number.isFinite(a)?a:(Number(window.orientation)||0)}
  function onOrientation(e){let h=null;const wh=Number(e.webkitCompassHeading);if(Number.isFinite(wh)&&wh>=0){webkitCompassAvailable=true;h=wh}else if(!webkitCompassAvailable&&Number.isFinite(Number(e.alpha))){h=360-Number(e.alpha)+screenAngle()}if(h!==null)show(h)}
  function start(){if(active)return;window.addEventListener('deviceorientation',onOrientation,true);if(!('ontouchstart' in window)||typeof DeviceOrientationEvent==='undefined'||typeof DeviceOrientationEvent.requestPermission!=='function')window.addEventListener('deviceorientationabsolute',onOrientation,true);active=true;document.documentElement.dataset.compassActive='true';const el=getEl();if(el&&!magneticHeading)el.textContent='Move iPhone…'}
  async function activate(){if(active)return true;try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted'){const el=getEl();if(el)el.textContent='Allow Compass';return false}}start();return true}catch(e){const el=getEl();if(el)el.textContent='Compass unavailable';return false}}
  function bind(){const el=getEl(),card=getCard();if(card){card.addEventListener('click',activate);card.addEventListener('touchend',activate,{passive:true});card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')activate()})}if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission!=='function')start();if(el&&!active)el.textContent='Tap to activate'}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.GPSViewerCompass={activate};
})();
