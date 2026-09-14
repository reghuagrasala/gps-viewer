/* iPhone/iPad compass support for the GPS Viewer PWA. */
(function(){
  let active=false,permissionAsked=false,magneticHeading=null;
  const getEl=()=>document.getElementById('heading');
  const getArrow=()=>document.querySelector('.heading-north');
  function normalize(v){v=Number(v);if(!Number.isFinite(v))return null;return Math.round(((v%360)+360)%360)}
  function dir(v){return ['N','NE','E','SE','S','SW','W','NW'][Math.round(v/45)%8]}
  function show(v){const h=normalize(v),el=getEl(),arrow=getArrow();if(h===null||!el)return;magneticHeading=h;const text=`${h}° (${dir(h)})`;if(el.textContent!==text)el.textContent=text;if(arrow)arrow.style.transform=`rotate(${-h}deg)`;el.dataset.compass='live'}
  function screenAngle(){const a=Number(screen.orientation?.angle);return Number.isFinite(a)?a:(Number(window.orientation)||0)}
  function onOrientation(e){let h=null;if(Number.isFinite(Number(e.webkitCompassHeading)))h=Number(e.webkitCompassHeading);else if(Number.isFinite(Number(e.alpha)))h=360-Number(e.alpha)+screenAngle();if(h!==null)show(h)}
  function start(){if(active)return;window.addEventListener('deviceorientationabsolute',onOrientation,true);window.addEventListener('deviceorientation',onOrientation,true);active=true;document.documentElement.dataset.compassActive='true';const el=getEl();if(el&&!magneticHeading)el.textContent='Move iPhone…'}
  async function activate(){if(active)return true;permissionAsked=true;try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted'){const el=getEl();if(el)el.textContent='Allow Compass';return false}}start();return true}catch(e){const el=getEl();if(el)el.textContent='Compass unavailable';return false}}
  function bind(){const el=getEl(),card=el?.closest('.compass-card');if(card){card.addEventListener('click',activate);card.addEventListener('touchend',activate,{passive:true});card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')activate()})}if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission!=='function')start();if(el){new MutationObserver(()=>{if(magneticHeading&&document.documentElement.dataset.compassActive==='true'){const text=`${magneticHeading}° (${dir(magneticHeading)})`;if(el.textContent!==text)el.textContent=text;const arrow=getArrow();if(arrow)arrow.style.transform=`rotate(${-magneticHeading}deg)`}}).observe(el,{childList:true,characterData:true,subtree:true})}if(el&&!active)el.textContent='Tap to activate'}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.GPSViewerCompass={activate};
})();
