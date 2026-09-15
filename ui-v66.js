/* GPS Viewer v66 address normalization + automatic text/icon fitting + time-aware weather icon. */
(function(){
  function text(id){return (document.getElementById(id)?.textContent||'').trim()}
  function ensureCountryLine(){
    const card=document.querySelector('.address-card'),content=card?.querySelector('.address-content');
    if(!content)return;
    let country=document.getElementById('addressLine4');
    if(!country){country=document.createElement('div');country.id='addressLine4';country.className='address-line';country.textContent='India';content.appendChild(country)}
    let saved=null;try{saved=JSON.parse(localStorage.getItem('gpsViewer.lastAddress')||'null')}catch(e){}
    const house=document.getElementById('addressLine2'),area=document.getElementById('addressLine3');
    let houseText=String(saved?.line2||'').trim();
    if(!houseText){
      const current=text('addressLine2');
      if(current && !/^India$/i.test(current))houseText=current;
    }
    if(house && houseText)house.textContent=houseText;
    if(house)house.style.display=houseText?'block':'none';
    if(area){let s=text('addressLine3').replace(/\s*,\s*India\s*$/i,'').trim();area.textContent=s}
    country.textContent='India';
    country.style.display='block';country.style.visibility='visible';
  }
  function fitElement(el,max,min){
    if(!el)return;
    const computed=getComputedStyle(el), base=parseFloat(computed.fontSize)||max;
    let size=Math.min(max,base);
    el.style.fontSize=size+'px';
    el.style.whiteSpace='nowrap';
    let guard=0;
    while(el.scrollWidth>el.clientWidth+0.5 && size>min && guard++<20){
      size=Math.max(min,size-0.25);
      el.style.fontSize=size+'px';
    }
  }
  function fitDashboardText(){
    document.querySelectorAll('.position-grid .metric-label,.weather-grid .metric-label').forEach(el=>fitElement(el,13.5,10.5));
    document.querySelectorAll('.position-grid .metric strong,.weather-grid .metric strong').forEach(el=>fitElement(el,13.5,10.5));
    document.querySelectorAll('.weather-main .condition').forEach(el=>fitElement(el,14,11));
  }
  function moonPhase(){
    const known=new Date(Date.UTC(2000,0,6,18,14,0));
    const days=(Date.now()-known.getTime())/86400000;
    return ((days%29.530588853)+29.530588853)%29.530588853/29.530588853;
  }
  function moonSVG(phase,cloud){
    const p=Math.round(phase*8)%8;
    const lit=p===0||p===4?0.98:(p===1||p===7?0.62:0.28);
    const waxing=phase<0.5;
    const moonPath=p===0?'M40 8a32 32 0 1 0 0 64A32 32 0 0 0 40 8z':`M40 8a32 32 0 1 0 0 64A32 32 0 0 1 ${waxing?'40 8':'40 72'}z`;
    const cloudPart=cloud?'<path d="M18 63c0-8 6-14 14-14 3-10 12-17 23-17 13 0 23 8 26 20 9 0 16 6 16 14 0 8-7 14-16 14H34c-9 0-16-7-16-17z" fill="#eef3f8" stroke="#cbd5df" stroke-width="2"/>':'';
    return `<svg class="modern-weather-icon" viewBox="0 0 112 92" aria-hidden="true"><defs><radialGradient id="mg" cx="35%" cy="30%"><stop offset="0" stop-color="#fff7b0"/><stop offset="1" stop-color="#e5c95c"/></radialGradient><filter id="ms"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".35"/></filter></defs><g filter="url(#ms)"><path d="${moonPath}" fill="url(#mg)" opacity="${lit}"/></g>${cloudPart}</svg>`;
  }
  function daySVG(cloud){
    const c=cloud?'<circle cx="38" cy="39" r="17" fill="#ffe45b"/><path d="M18 63c0-8 6-14 14-14 3-10 12-17 23-17 13 0 23 8 26 20 9 0 16 6 16 14 0 8-7 14-16 14H34c-9 0-16-7-16-17z" fill="#eef3f8" stroke="#cbd5df" stroke-width="2"/>':'<circle cx="38" cy="38" r="20" fill="#ffe45b"/><g stroke="#ffe45b" stroke-width="4" stroke-linecap="round"><path d="M38 8v9M38 59v9M8 38h9M59 38h9M17 17l7 7M52 52l7 7M59 17l-7 7M24 52l-7 7"/></g>';
    return `<svg class="modern-weather-icon" viewBox="0 0 112 92" aria-hidden="true">${c}</svg>`;
  }
  function updateWeatherIcon(){
    const el=document.getElementById('weatherIcon');
    if(!el)return;
    const condition=text('condition').toLowerCase();
    const h=new Date().getHours();
    const night=h<6||h>=18;
    const cloudy=/cloud|overcast|fog|rain|drizzle|shower|thunder|snow/.test(condition);
    el.innerHTML=night?moonSVG(moonPhase(),cloudy):daySVG(cloudy);
    el.title=night?'Night • moon phase and weather':'Daytime • weather';
  }
  function watchWeatherIcon(){
    updateWeatherIcon();
    setInterval(updateWeatherIcon,60000);
    const condition=document.getElementById('condition');
    if(condition&&window.MutationObserver)new MutationObserver(updateWeatherIcon).observe(condition,{childList:true,characterData:true,subtree:true});
  }
  function start(){
    ensureCountryLine();setInterval(ensureCountryLine,400);fitDashboardText();
    if(window.ResizeObserver){const ro=new ResizeObserver(fitDashboardText);document.querySelectorAll('.position-grid,.weather-grid,.weather-main').forEach(el=>ro.observe(el))}
    setInterval(fitDashboardText,1000);watchWeatherIcon();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
