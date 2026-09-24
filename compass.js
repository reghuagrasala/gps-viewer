/* Full 360° compass for GPS Viewer.
   Primary: iPhone webkitCompassHeading.
   Fallback: absolute DeviceOrientation alpha when the native heading is unavailable.
   Calibration status is exposed without inventing an artificial heading offset. */
(function(){
  let active=false, magneticHeading=null, needleAngle=null;
  let webkitCompassAvailable=false, lastAccuracy=null, lastSource='none';
  const getEl=()=>document.getElementById('heading');
  const getCard=()=>getEl()?.closest('.compass-card');

  function normalize(v){
    v=Number(v);
    if(!Number.isFinite(v))return null;
    return ((v%360)+360)%360;
  }
  function rounded(v){return Math.round(v)%360}
  function dir(v){
    const names=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return names[Math.round(v/22.5)%16];
  }
  function updateNeedle(h){
    const card=getCard();
    if(!card)return;
    let target=h;
    if(needleAngle===null)needleAngle=target;
    else{
      let delta=((target-needleAngle+180)%360)-180;
      needleAngle+=delta;
    }
    card.style.setProperty('--needle-angle',needleAngle+'deg');
  }
  function setStatus(el,source,accuracy){
    const card=getCard();
    if(!card)return;
    card.dataset.compassSource=source;
    if(Number.isFinite(accuracy)){
      card.dataset.compassAccuracy=String(Math.round(accuracy));
      card.title=accuracy>20
        ? 'Compass needs calibration — move the iPhone in a figure-8'
        : 'Compass active — accuracy ±'+Math.round(accuracy)+'°';
    }else{
      card.dataset.compassAccuracy='unknown';
      card.title=source==='fallback'
        ? 'Fallback compass active — move the iPhone gently in a figure-8'
        : 'Compass active';
    }
  }
  function show(v,source='fallback',accuracy=null){
    const raw=normalize(v),el=getEl();
    if(raw===null||!el)return;
    const h=rounded(raw);
    magneticHeading=raw;
    lastSource=source;
    lastAccuracy=Number.isFinite(accuracy)?accuracy:null;
    const text=`${String(h).padStart(3,'0')}° (${dir(raw)})`;
    if(el.textContent!==text)el.textContent=text;
    updateNeedle(raw);
    el.dataset.compass='live';
    el.dataset.magneticHeading=String(h);
    setStatus(el,source,accuracy);
  }

  function screenAngle(){
    const a=Number(screen.orientation?.angle);
    return Number.isFinite(a)?a:(Number(window.orientation)||0);
  }

  function onOrientation(e){
    const wh=Number(e.webkitCompassHeading);
    const wa=Number(e.webkitCompassAccuracy);

    // Native iPhone compass is the preferred source.
    if(Number.isFinite(wh) && wh>=0 && wh<=360){
      webkitCompassAvailable=true;
      show(wh,'iphone',Number.isFinite(wa)&&wa>=0?wa:null);
      return;
    }

    // True absolute orientation is the fallback when native heading is unavailable.
    if(!webkitCompassAvailable && Number.isFinite(Number(e.alpha))){
      const alpha=Number(e.alpha);
      const h=e.absolute===true ? (360-alpha+screenAngle()) : (360-alpha+screenAngle());
      show(h,'fallback',null);
    }
  }

  function addListeners(){
    window.addEventListener('deviceorientation',onOrientation,true);
    window.addEventListener('deviceorientationabsolute',onOrientation,true);
    active=true;
    document.documentElement.dataset.compassActive='true';
    const el=getEl();
    if(el&&!magneticHeading)el.textContent='Move iPhone…';
  }

  async function activate(){
    if(active)return true;
    try{
      if(typeof DeviceOrientationEvent!=='undefined' &&
         typeof DeviceOrientationEvent.requestPermission==='function'){
        // true requests absolute orientation/magnetometer access where supported.
        let permission;
        try{permission=await DeviceOrientationEvent.requestPermission(true)}
        catch(e){permission=await DeviceOrientationEvent.requestPermission()}
        if(permission!=='granted'){
          const el=getEl();
          if(el)el.textContent='Allow Compass';
          return false;
        }
      }
      addListeners();
      return true;
    }catch(e){
      const el=getEl();
      if(el)el.textContent='Compass unavailable';
      return false;
    }
  }

  function bind(){
    const el=getEl(),card=getCard();
    if(card){
      card.addEventListener('click',activate);
      card.addEventListener('touchend',activate,{passive:true});
      card.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' ')activate();
      });
    }
    // Non-iOS browsers generally do not require an explicit permission request.
    if(typeof DeviceOrientationEvent!=='undefined' &&
       typeof DeviceOrientationEvent.requestPermission!=='function')addListeners();
    if(el&&!active)el.textContent='Tap to activate';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();

  window.GPSViewerCompass={activate};
})();